import * as fs from 'fs';
import * as path from 'path';
import { TaJson } from 'ta-json-x';
import { promisify } from 'util';
import { MediaOverlayNode } from 'r2-shared-js/dist/es8-es2017/src/models/media-overlay';
import SyncMedia from '../Model/SyncMedia/SyncMedia';
import SyncMediaPublication from '../Model/SyncMedia/SyncMediaPublication';
import { Link } from 'r2-shared-js/dist/es8-es2017/src/models/publication-link';
import DivianPublication from 'src/Model/Divian/DivianPublication';

const fsReadFile = promisify(fs.readFile);
const fsWriteFile = promisify(fs.writeFile);
const [, , inputFile, outputDir] = process.argv;

async function writeJsonFile<T>(obj: T, filename: string) {
  const filepath = path.resolve(outputDir, filename);
  await fsWriteFile(filepath, TaJson.stringify(obj));
}

async function worker() {
  const divianManifest = TaJson.parse(await fsReadFile(inputFile, 'utf-8'), DivianPublication);

  const syncMediaPublication = new SyncMediaPublication();
  syncMediaPublication.Metadata = divianManifest.Metadata;
  (syncMediaPublication.Metadata as any).ConformsTo = undefined;

  syncMediaPublication.Metadata.Duration = divianManifest.Spine?.map((l) => l.Duration ?? 0).reduce((v, c) => v + c, 0) ?? 0;

  const selfLink = new Link();
  selfLink.AddRel('self');
  selfLink.Href = 'https://notalib.github.io/divian/books/nofret-gravroeverne/sync-manifest.json';

  syncMediaPublication.Links ??= [];
  syncMediaPublication.Links.push(selfLink);

  syncMediaPublication.Spine ??= [];
  divianManifest.Spine ??= [];

  for (const link of divianManifest.Spine) {
    const spineLink = new Link();
    spineLink.Href = link.Href;
    spineLink.TypeLink = link.TypeLink;
    spineLink.Duration = link.Duration;
    spineLink.Title = link.Title;
    syncMediaPublication.Spine.push(spineLink);

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const idx = `${divianManifest.Spine?.findIndex((l) => l === link)}`.padStart(4, '0');
    const syndFilename = `sync-media-${idx}.json`;
    const syncLink = new Link();
    syncLink.Href = syndFilename;
    syncLink.Title = link.Title;
    syncLink.Duration = link.Duration;
    syncMediaPublication.SyncMedia.push(syncLink);

    if (link.Properties?.MediaOverlay) {
      const mediaOverlayPath = path.resolve(path.dirname(inputFile), link.Properties?.MediaOverlay);
      const mediaOverlay = TaJson.parse(await fsReadFile(mediaOverlayPath, 'utf-8'), MediaOverlayNode);

      const syncMedia = new SyncMedia();
      syncMedia.role = mediaOverlay.Role;
      syncMedia.textRef = mediaOverlay.Children?.[0]?.Text;
      syncMedia.children = mediaOverlay.Children?.[0]?.Children.map((c) => {
        const child = new SyncMedia();
        child.textRef = c.Text;
        child.audioRef = c.Audio;
        return child;
      });

      await writeJsonFile(syncMedia, syndFilename);

      continue;
    }

    const navItem = divianManifest.Narration.find((n) => n.Href === link.Href);
    if (navItem) {
      const syncMedia = new SyncMedia();
      syncMedia.role = ['panel-group'];
      syncMedia.imageRef = navItem.Href;
      syncMedia.children = navItem.Panels.map((p) => {
        const panel = new SyncMedia();
        panel.role = ['panel'];
        panel.audioRef = p.Audio;
        panel.imageRef = `${navItem.Href}${p.Fragment ?? ''}`;
        const audioFile = p.Audio?.replace(/#.*$/, '') ?? '';

        panel.children = p.Texts?.map((t) => {
          const text = new SyncMedia();
          let fragment = t.Fragment?.replace('#', '');
          if (t.ClipPath) {
            fragment = [
              'xyn=percent:',
              t.ClipPath.substring('polygon('.length, t.ClipPath.length - 2)
                .replace(/%/g, '')
                .replace(/\s/g, ','),
            ].join('');
          }

          text.imageRef = [navItem.Href, '#', fragment].join('');
          if (t.AudioFragment) {
            text.audioRef = [audioFile, '#', t.AudioFragment].join('');
          }

          switch (t.Type) {
            case 'caption': {
              text.role = ['text-area'];
              break;
            }
            case 'sound': {
              text.role = ['sound-area'];
              break;
            }
            default: {
              text.role = ['balloon'];
              break;
            }
          }

          return text;
        });

        return panel;
      });

      await writeJsonFile(syncMedia, syndFilename);
      continue;
    }

    throw new Error('No match');
  }

  await writeJsonFile(syncMediaPublication, 'sync-manifest.json');
}

void worker();
