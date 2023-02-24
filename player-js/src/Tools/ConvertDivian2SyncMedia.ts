import * as fs from 'fs';
import * as path from 'path';
import DivianPublication from '../Model/DivianPublication';
import { TaJson } from 'ta-json-x';
import { promisify } from 'util';
import { MediaOverlayNode } from 'r2-shared-js/dist/es8-es2017/src/models/media-overlay';
import SyncMedia from '../Model/SyncMedia';
import SyncMediaPublication from '../Model/SyncMediaPublication';
import { Link } from 'r2-shared-js/dist/es8-es2017/src/models/publication-link';

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

  // syncMediaPublication.Spine ??= [];
  divianManifest.Spine ??= [];

  for (const link of divianManifest.Spine) {
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
      syncMedia.Role = mediaOverlay.Role;
      syncMedia.TextRef = mediaOverlay.Children?.[0]?.Text;
      syncMedia.Children = mediaOverlay.Children?.[0]?.Children.map((c) => {
        const child = new SyncMedia();
        child.TextRef = c.Text;
        child.AudioRef = c.Audio;
        return child;
      });

      await writeJsonFile(syncMedia, syndFilename);

      continue;
    }

    const navItem = divianManifest.Narration.find((n) => n.Href === link.Href);
    if (navItem) {
      const syncMedia = new SyncMedia();
      syncMedia.Role = ['panel-group'];
      syncMedia.ImageRef = navItem.Href;
      syncMedia.Children = navItem.Panels.map((p) => {
        const panel = new SyncMedia();
        panel.Role = ['panel'];
        panel.AudioRef = p.Audio;
        panel.ImageRef = `${navItem.Href}${p.Fragment ?? ''}`;
        const audioFile = p.Audio?.replace(/#.*$/, '') ?? '';

        panel.Children = p.Texts?.map((t) => {
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

          text.ImageRef = [navItem.Href, '#', fragment].join('');
          if (t.AudioFragment) {
            text.AudioRef = [audioFile, '#', t.AudioFragment].join('');
          }

          switch (t.Type) {
            case 'caption': {
              text.Role = ['text-area'];
              break;
            }
            case 'sound': {
              text.Role = ['sound-area'];
              break;
            }
            default: {
              text.Role = ['balloon'];
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
