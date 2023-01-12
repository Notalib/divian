import { LitElement, css, html, nothing, TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import NarratedPage from 'Model/NarratedPage';
import Panel from 'Model/Panel';
import TextElement from 'Model/TextElement';
import { MediaOverlayNode } from 'r2-shared-js/dist/es8-es2017/src/models/media-overlay';
import { Link } from 'r2-shared-js/dist/es8-es2017/src/models/publication-link';
import { TaJson } from 'ta-json-x';
import DivianPublication from './Model/DivianPublication';

@customElement('divian-navigator')
export default class DivianNavigator extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      padding: 0;
      margin: 0;
      position: relative;
      height: inherit;
      background-color: rgba(10, 10, 10, 0.15);
    }

    iframe {
      margin: 0 auto;
      flex-grow: 1;
      flex-shrink: 1;
      height: 100%;
      min-height: 0;
      max-width: 1024px;
      border: 0;
    }

    div.container {
      margin: 0 auto;
      display: flex;
      flex-grow: 1;
      flex-shrink: 1;
      height: 100%;
      min-height: 0;
    }

    div.container > div:is(.page, .panel-highlight, .balloon-highlight) {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: center;
      height: var(--rendered-height);
      width: var(--rendered-width);
      transform: translate(var(--panel-translate-x), var(--panel-translate-y));
    }

    div.container > div:is(.page, .panel-highlight, .balloon-highlight) > img {
      height: var(--rendered-height);
      width: var(--rendered-width);
    }

    div.balloon-highlight {
      background-color: rgba(116, 116, 116, 0.4);
    }

    div.balloon-highlight img {
      clip-path: var(--balloon-clip-path);
    }

    div.panel-highlight {
      background-color: rgba(30, 30, 30, 0.45);
    }

    div.panel-highlight img {
      clip-path: var(--panel-clip-path);
    }

    div.container > div.caption {
      position: absolute;
      left: unset;
      top: unset;
      right: 0;
      bottom: 0;
      font-weight: bold;
      margin: 2em;
      padding: 1em;
      background-color: rgba(200, 200, 200, 0.9);
      border-radius: 1rem;
    }

    #audio {
      height: 0;
      width: 0;
    }
  `;

  @property()
  private _publication?: DivianPublication;

  @query('#audio')
  private audio?: HTMLAudioElement;

  @query('#iframe')
  private iframe?: HTMLIFrameElement;

  @property()
  private _imageLoading = true;

  private _manifestUrl?: string;

  public get manifestUrl() {
    return this._manifestUrl;
  }

  @property({ attribute: 'manifest' })
  public set manifestUrl(value: string) {
    if (this._manifestUrl !== value) {
      this._manifestUrl = new URL(value, location.href).href;

      this._loadComic().catch((e) => console.error(e));
    }
  }

  @property()
  private _currentPositionIdx = -1;

  private _playlist?: PlaylistItem[];

  private get _prevPosition() {
    if (this._currentPositionIdx > 0) {
      return this._playlist?.[this._currentPositionIdx - 1];
    }
  }

  private get _currentPosition() {
    return this._playlist?.[this._currentPositionIdx];
  }

  private get _nextPosition() {
    return this._playlist?.[this._currentPositionIdx + 1];
  }

  private get _spineIdx() {
    return this._publication?.Spine.indexOf(this._readingItem);
  }

  private get _hasPrevPage() {
    return this._spineIdx > 0;
  }

  private get _hasNextPage() {
    return this._spineIdx <= this._publication?.Spine.length;
  }

  private get _currentNarratedPage() {
    return this._currentPosition?.narratedPage;
  }

  private get _readingItem() {
    return this._currentPosition?.readingItem;
  }

  private get _comicPageUrl() {
    const path = this._currentNarratedPage?.Href;
    if (!path) {
      return null;
    }

    return new URL(path, this.manifestUrl).href;
  }

  private get _currentPanel() {
    return this._currentPosition?.panel;
  }

  private get _pageHeight(): number | void {
    return this._readingItem?.Height;
  }

  private get _pageWidth(): number | void {
    return this._readingItem?.Width;
  }

  private get _currentBalloon() {
    return this._currentPosition?.text;
  }

  private get _balloonClipPath() {
    return this._currentBalloon?.ClipPath;
  }

  private get _panelClipPath() {
    const pageHeight = this._pageHeight;
    const pageWidth = this._pageWidth;

    const panel = this._currentPanel;
    if (!panel?.Fragment || !pageHeight || !pageWidth) {
      return null;
    }

    const hash = panel.Fragment;

    const pxRegexp = /#xywh=([\d]+),([\d]+),([\d]+),([\d]+)/;
    const m = pxRegexp.exec(hash);
    if (!m) {
      return null;
    }

    const [, x, y, width, height] = m.map((v) => Number(v));

    const topPct = (y / pageHeight) * 100;
    const rightPct = 100 - ((x + width) / pageWidth) * 100;
    const leftPct = (x / pageWidth) * 100;
    const bottomPct = 100 - ((y + height) / pageHeight) * 100;

    return `inset(
      ${topPct}%
      ${rightPct}%
      ${bottomPct}%
      ${leftPct}%
    )`;
  }

  private get _containerStyles() {
    const pageStyles = this._pageStyles;

    return {
      '--balloon-clip-path': this._balloonClipPath,
      '--panel-clip-path': this._panelClipPath,
      '--panel-translate-x': `${pageStyles?.translateX ?? ''}`,
      '--panel-translate-y': `${pageStyles?.translateY ?? ''}`,
      '--rendered-width': pageStyles?.renderedWidth,
      '--rendered-height': pageStyles?.renderedHeight,
    };
  }

  private get _pageStyles() {
    const padding = 20;
    const pageHeight = this._pageHeight;
    const pageWidth = this._pageWidth;

    if (!pageHeight || !pageWidth) {
      return null;
    }

    if (this._imageLoading) {
      return {
        renderedWidth: '1px',
        renderedHeight: '1px',
      };
    }

    const currentPanel = this._currentPanel;

    // Panel position and size
    const panelXOffset = currentPanel?.X ?? 0;
    const panelYOffset = currentPanel?.Y ?? 0;
    const realPanelWidth = currentPanel?.Width ?? pageWidth;
    const realPanelHeight = currentPanel?.Height ?? pageHeight;

    // Available viewport size
    const availableHeight = this.clientHeight - padding;
    const availableWidth = this.clientWidth - padding;

    // How much should the image be scaled for the panel to fit inside the viewport?
    const heightScaling = availableHeight / realPanelHeight;
    const widthScaling = availableWidth / realPanelWidth;

    // The lowest scaling factor fits the whole panel inside the viewport.
    const scaling = Math.min(heightScaling, widthScaling);

    const renderedPanelWidth = realPanelWidth * scaling;
    const renderedPanelHeight = realPanelHeight * scaling;

    // Rendered page size for fitting the panel inside the viewport.
    const renderedWidth = scaling * pageWidth;
    const renderedHeight = scaling * pageHeight;

    // Translate X and Y to move the panel into view.
    const translateX = -(panelXOffset * scaling - (availableWidth - renderedPanelWidth + padding) / 2);
    const translateY = -(panelYOffset * scaling - (availableHeight - renderedPanelHeight + padding) / 2);

    return {
      translateX: `${translateX}px`,
      translateY: `${translateY}px`,
      renderedWidth: `${renderedWidth}px`,
      renderedHeight: `${renderedHeight}px`,
    };
  }

  public GoBack() {
    if (!this.canGoBack) {
      return;
    }

    const currentPosition = this._currentPosition;
    const prevPosition = this._prevPosition;

    this._currentPositionIdx -= 1;

    const isPlaying = this.isPlaying;
    this.pause();
    this.currentTime = prevPosition.start;
    if (currentPosition.audio !== prevPosition.audio) {
      this.audio.src = prevPosition.audio;
    }
    this.audio.currentTime = prevPosition.start;

    this._positionChanged();

    if (isPlaying) {
      this.play();
    }
  }

  public GoForward() {
    if (!this.canGoBack) {
      return;
    }

    const currentPosition = this._currentPosition;
    const nextPosition = this._nextPosition;

    this._currentPositionIdx += 1;

    const isPlaying = this.isPlaying;
    this.currentTime = nextPosition.start;
    this.audio.currentTime = nextPosition.start;
    if (currentPosition.audio !== nextPosition.audio) {
      this.audio.src = nextPosition.audio;
    }

    this._positionChanged();

    if (isPlaying) {
      this.play();
    }
  }

  private _nextPage() {
    if (!this._hasNextPage) {
      return;
    }

    const readingItem = this._publication.Spine[this._spineIdx + 1];

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let idx = 0; idx < this._playlist.length; idx += 1) {
      const playlistItem = this._playlist[idx];
      if (playlistItem.readingItem === readingItem) {
        this._currentPositionIdx += 1;
        break;
      }
    }

    this._imageLoading = true;
    this._positionChanged();
  }

  public get canGoBack() {
    return this._currentPositionIdx > 0;
  }

  public get canGoForward() {
    return this._currentPositionIdx < this._playlist.length - 1;
  }

  public get numberOfPages() {
    return this._publication?.Spine?.length ?? 0;
  }

  public get currentPageNumber() {
    return this._publication?.Spine?.indexOf(this._readingItem) + 1;
  }

  public get isPlaying() {
    return this.audio?.paused === false;
  }

  public play() {
    requestAnimationFrame(() => void this.audio?.play().then(() => this._positionChanged()));
  }

  public pause() {
    this.audio?.pause();
    this._positionChanged();
  }

  @property()
  public currentTime = -1;

  private async _loadComic() {
    this._publication = null;
    this._playlist = null;

    const publication = await this._loadJsonFile(this._manifestUrl, DivianPublication);

    const narrationMap = new Map<string, NarratedPage>();

    const playlist = new Array<PlaylistItem>();

    function parseAudio(href: string) {
      const url = new URL(href);
      const m = /#t=(([0-9]+\.[0-9]+)|[0])?,([0-9]+\.[0-9]+)/.exec(url.hash);
      if (!m) {
        throw new Error(href);
      }

      const [, start, , end] = m;

      return {
        start: Number(start),
        end: Number(end),
      };
    }

    for (const n of publication.Narration) {
      n.Href = new URL(n.Href, this._manifestUrl).href;
      narrationMap.set(n.Href, n);

      for (const p of n.Panels) {
        if (p.Audio) {
          p.Audio = new URL(p.Audio, this._manifestUrl).href;
        }
      }
    }

    for (const link of publication.Spine) {
      link.Href = new URL(link.Href, this._manifestUrl).href;

      if (link.Properties?.MediaOverlay) {
        const mediaOverlayNode = await this._loadJsonFile(new URL(link.Properties?.MediaOverlay, this._manifestUrl), MediaOverlayNode);
        for (const m of mediaOverlayNode.Children) {
          m.Text = new URL(m.Text, this._manifestUrl).href;
          for (const c of m.Children ?? []) {
            const audio = new URL(c.Audio, this._manifestUrl);
            const { start, end } = parseAudio(audio.href);
            c.Audio = audio.href;

            audio.hash = '';

            const playlistItem = new PlaylistItem();
            playlistItem.audio = audio.href;
            playlistItem.start = start;
            playlistItem.end = end;
            playlistItem.textId = new URL(c.Text, this._manifestUrl).hash;
            playlistItem.readingItem = link;
            playlist.push(playlistItem);
          }
        }

        link.MediaOverlays = mediaOverlayNode;

        continue;
      }

      if (link.TypeLink?.startsWith('image/')) {
        const n = narrationMap.get(link.Href);

        for (const p of n.Panels) {
          const audio = new URL(p.Audio);
          const { start, end } = parseAudio(audio.href);
          audio.hash = '';

          const playlistItem = new PlaylistItem();
          playlistItem.audio = audio.href;
          playlistItem.start = start;
          playlistItem.end = end;
          playlistItem.readingItem = link;
          playlistItem.narratedPage = n;
          playlistItem.panel = p;
          playlist.push(playlistItem);

          if (p.Texts?.length === 1) {
            playlistItem.text = p.Texts[0];
          } else {
            for (const t of p.Texts ?? []) {
              if (!t.AudioFragment) {
                continue;
              }

              const tUrl = new URL(audio.href);
              tUrl.hash = t.AudioFragment;

              const { start: tStart, end: tEnd } = parseAudio(tUrl.href);

              const tPlaylistItem = new PlaylistItem();
              tPlaylistItem.audio = audio.href;
              tPlaylistItem.start = tStart;
              tPlaylistItem.end = tEnd;
              tPlaylistItem.readingItem = link;
              tPlaylistItem.narratedPage = n;
              tPlaylistItem.panel = p;
              tPlaylistItem.text = t;
              playlist.push(tPlaylistItem);
            }
          }
        }

        continue;
      }
    }

    this._playlist = playlist;
    this._publication = publication;
    this._currentPositionIdx = 0;

    this.currentTime = this._currentPosition?.start ?? 0;

    this._positionChanged();
  }

  private get _currentAudio() {
    return this._currentPosition?.audio;
  }

  private async _loadJsonFile<T>(url: string | URL, type: new (value?: any) => T) {
    const response = await fetch(url);
    return TaJson.parse(await response.text(), type);
  }

  private get _isNarratedPage() {
    return this._readingItem.TypeLink?.startsWith('image/');
  }

  override render() {
    if (!this._publication) {
      return html`<div>Loading</div>`;
    }

    this._positionChanged();

    let content: TemplateResult;

    if (!this._isNarratedPage) {
      content = html`<iframe id="iframe" src="${this._readingItem.Href}" @load=${this._highlightTextElement}></iframe>`;
    } else {
      content = html`
        <!-- Page -->
        ${this._renderImage('page')}

        <!-- Highlight panel box -->
        ${this._renderImage('panel-highlight', !!this._panelClipPath)}

        <!-- Highlight balloon box -->
        ${this._renderImage('balloon-highlight', !!this._balloonClipPath)}

        <!-- caption box - if enabled -->
        ${this._renderCaption()}
      `;
    }

    return html`
      <div class="container" style=${styleMap(this._containerStyles)}>
        ${content}

        <!-- add audio element -->
        ${this._renderAudio()}
      </div>
    `;
  }

  private _setImageLoaded = () => {
    this._imageLoading = false;
  };

  private _renderImage(imageClass: string, enabled = true) {
    if (!enabled) {
      return nothing;
    }

    return html`
      <div class="${imageClass}">
        <img src="${this._comicPageUrl}" @load=${this._setImageLoaded} />
      </div>
    `;
  }

  private _renderCaption() {
    const caption = this._currentBalloon?.Text;
    if (!caption) {
      return nothing;
    }

    return html`<div class="caption">${caption}</div>`;
  }

  private _renderAudio() {
    const audio = this._currentAudio;
    if (!audio) {
      return nothing;
    }

    return html`<audio
      id="audio"
      @loadeddata="${this._loadedAudioData}"
      @timeupdate=${this._timeupdateEvent}
      @ended=${this._endedEvent}
      src="${audio}"
    ></audio>`;
  }

  private _positionChanged() {
    const event = new CustomEvent('position-changed');
    this.dispatchEvent(event);
  }

  private _highlightTextElement = () => {
    const currentPosition = this._currentPosition;
    if (!currentPosition) {
      return;
    }

    if (currentPosition.textId && this.iframe) {
      const highlightClassName = 'readiumCSS-mo-active-default';
      const currentElement = this.iframe.contentDocument.body.querySelector(currentPosition.textId);
      const els = this.iframe.contentDocument.body.querySelectorAll(`.${highlightClassName}`);
      els?.forEach((e) => e !== currentElement && e.classList.remove(highlightClassName));

      currentElement?.classList.add(highlightClassName);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _timeupdateEvent = (evt: Event) => {
    const currentPosition = this._currentPosition;
    if (!currentPosition) {
      return;
    }

    this._highlightTextElement();

    const currentTime = (this.currentTime = this.audio?.currentTime);
    if (currentPosition.start <= currentTime && currentTime < currentPosition.end) {
      return;
    }

    if (this.canGoForward && currentPosition.audio === this._nextPosition?.audio) {
      const audio = this._currentAudio;

      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let idx = 0; idx < this._playlist.length; idx += 1) {
        const item = this._playlist[idx];
        if (item.audio !== audio) {
          continue;
        }

        if (item.isWithinOffset(currentTime)) {
          this._currentPositionIdx = idx;
        }
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _loadedAudioData = (evt: Event) => {
    this.audio.currentTime = this.currentTime;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _endedEvent = (evt: Event) => {
    if (this.canGoForward) {
      this._nextPage();

      requestAnimationFrame(() => this.play());
    }
  };
}

class PlaylistItem {
  public audio: string;

  public start: number;

  public end: number;

  public readingItem: Link;

  public textId?: string;

  public narratedPage?: NarratedPage;

  public panel?: Panel;

  public text?: TextElement;

  public isWithinOffset(offset: number) {
    return this.start <= offset && offset < this.end;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'divian-navigator': DivianNavigator;
  }
}