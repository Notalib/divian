import { LitElement, css, html, nothing, TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { Link } from 'r2-shared-js/dist/es8-es2017/src/models/publication-link';
import { TaJson } from 'ta-json-x';
import GuidedMedia from './Model/SyncMedia/GuidedMedia';
import GuidedPublication from './Model/SyncMedia/GuidedPublication';
import { classMap } from 'lit/directives/class-map.js';

@customElement('guided-publication-navigator')
export default class GuidedPublicationNavigator extends LitElement {
  @property()
  private _publication?: GuidedPublication;

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
  public set manifestUrl(value: string | undefined) {
    if (!value) {
      this._manifestUrl = undefined;
      return;
    }

    if (this._manifestUrl !== value) {
      this._manifestUrl = new URL(value, location.href).href;

      this._loadComic().catch((e) => console.error(e));
    }
  }

  private _showCaption = false;
  public get showCaption() {
    return this._showCaption;
  }

  @property({ attribute: 'show-caption' })
  public set showCaption(value) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    this._showCaption = `${value}` === 'true';

    // Why is this needed here?
    this.requestUpdate();
  }

  private _highlightBalloon = false;
  public get highlightBalloon() {
    return this._highlightBalloon;
  }

  @property({ attribute: 'highlight-balloon' })
  public set highlightBalloon(value) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    this._highlightBalloon = `${value}` === 'true';

    // Why is this needed here?
    this.requestUpdate();
  }

  private _blackWhiteRendering = false;
  public get blackWhiteRendering() {
    return this._blackWhiteRendering;
  }

  @property({ attribute: 'black-white-rendering' })
  public set blackWhiteRendering(value) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    this._blackWhiteRendering = `${value}` === 'true';

    // Why is this needed here?
    this.requestUpdate();
  }

  @property()
  private _currentPositionIdx = -1;

  private _playlist?: PlaylistItem[];

  private get _prevPosition() {
    for (let i = this._currentPositionIdx - 1; i >= 0; i -= 1) {
      const item = this._playlist?.[i];
      if (!this.highlightBalloon && item?.text) {
        continue;
      }

      return item;
    }
  }

  private get _currentPosition() {
    return this._playlist?.[this._currentPositionIdx];
  }

  private get _nextPosition() {
    const playlist = this._playlist;
    if (!playlist) {
      return;
    }

    for (let i = this._currentPositionIdx + 1; i < playlist.length; i += 1) {
      const item = playlist[i];
      if (!this.highlightBalloon && item.text) {
        continue;
      }

      return item;
    }
  }

  private get _spineIdx() {
    const spine = this._publication?.Spine;
    const readingItem = this.currentSpineItem;
    if (!readingItem || !spine) {
      return -1;
    }

    return spine.indexOf(readingItem);
  }

  private get _hasPrevPage() {
    return this._spineIdx > 0;
  }

  private get _hasNextPage() {
    return this._spineIdx <= (this._publication?.Spine?.length ?? 0);
  }

  private get _currentComicPage() {
    return this._currentPosition?.comicPage;
  }

  public get currentSpineItem() {
    return this._currentPosition?.readingItem;
  }

  private get _comicPageUrl() {
    return this._currentComicPage?.imageRef;
  }

  private get _currentPanel() {
    return this._currentPosition?.panel;
  }

  private get _pageHeight(): number | void {
    return this.currentSpineItem?.Height;
  }

  private get _pageWidth(): number | void {
    return this.currentSpineItem?.Width;
  }

  private get _currentBalloon() {
    return this._currentPosition?.text;
  }

  private get _balloonClipPath() {
    return this._currentBalloon?.clipPath;
  }

  private get _panelClipPath() {
    const pageHeight = this._pageHeight;
    const pageWidth = this._pageWidth;

    const panel = this._currentPanel;
    const sizeInfo = panel?.sizeInfo;
    if (!sizeInfo || !pageHeight || !pageWidth) {
      return null;
    }

    const { x, y, height, width, isPercent } = sizeInfo;
    if (x == null || y == null || height == null || width == null) {
      return null;
    }

    const topPct = isPercent ? y : (y / pageHeight) * 100;
    const rightPct = 100 - (isPercent ? x + width : (x + width) / pageWidth) * 100;
    const leftPct = isPercent ? x : (x / pageWidth) * 100;
    const bottomPct = 100 - (isPercent ? y + height : (y + height) / pageHeight) * 100;

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
        renderedWidth: '-1px',
        renderedHeight: '1px',
      };
    }

    const currentPanel = this._currentPanel;
    const sizeInfo = currentPanel?.sizeInfo;

    const x = sizeInfo?.x ?? 0;
    const y = sizeInfo?.y ?? 0;
    const height = sizeInfo?.height ?? pageWidth;
    const width = sizeInfo?.width ?? pageHeight;
    const isPercent = !!sizeInfo?.isPercent;

    // Panel position and size
    const panelXOffset = isPercent ? (x / 100) * pageWidth : x;
    const panelYOffset = isPercent ? (y / 100) * pageHeight : y;
    const realPanelWidth = isPercent ? (width / 100) * pageWidth : width;
    const realPanelHeight = isPercent ? (height / 100) * pageHeight : height;

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
    const audio = this.audio;
    if (!audio || !currentPosition || !prevPosition) {
      return;
    }

    this._currentPositionIdx = this._playlist?.indexOf(prevPosition) ?? 0;

    const isPlaying = this.isPlaying;
    this.pause();
    this.currentTime = prevPosition.start;
    if (currentPosition.audio !== prevPosition.audio) {
      audio.src = prevPosition.audio;
    }

    audio.currentTime = prevPosition.start;

    this._positionChanged();

    if (isPlaying) {
      this.play();
    }
  }

  public GoForward() {
    if (!this.canGoForward) {
      return;
    }

    const currentPosition = this._currentPosition;
    const nextPosition = this._nextPosition;
    const audio = this.audio;
    if (!audio || !currentPosition || !nextPosition) {
      return;
    }

    this._currentPositionIdx = this._playlist?.indexOf(nextPosition) ?? 0;

    const isPlaying = this.isPlaying;
    this.currentTime = nextPosition.start;
    if (currentPosition.audio !== nextPosition.audio) {
      audio.src = nextPosition.audio;
    }
    audio.currentTime = nextPosition.start;

    this._positionChanged();

    if (isPlaying) {
      this.play();
    }
  }

  private _nextPage() {
    if (!this._hasNextPage) {
      return;
    }

    const readingItem = this._publication?.Spine?.[this._spineIdx + 1];
    if (!readingItem) {
      return;
    }

    this.goToSpineItem(readingItem);
  }

  public goToSpineItem(spineItem: Link) {
    const idx = this.getFirstPlaylistIdxFromSpineItem(spineItem);
    if (idx == null || Number.isNaN(idx)) {
      return;
    }

    const resumePlaying = this.isPlaying;

    this._currentPositionIdx = idx;

    this._imageLoading = true;
    this._positionChanged();

    if (resumePlaying) {
      this.audio?.addEventListener('loadeddata', () => this.play(), { once: true });
    }
  }

  private getFirstPlaylistIdxFromSpineItem(spineItem: Link) {
    const playlist = this._playlist;
    if (!playlist) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let idx = 0; idx < playlist.length; idx += 1) {
      const playlistItem = playlist[idx];
      if (playlistItem.readingItem === spineItem) {
        return idx;
      }
    }
  }

  public get canGoBack() {
    return !!this._prevPosition;
  }

  public get canGoForward() {
    return !!this._nextPosition;
  }

  public get numberOfPages() {
    return this._publication?.Spine?.length ?? 0;
  }

  public get currentPageNumber() {
    const readingItem = this.currentSpineItem;
    if (!readingItem) {
      return -1;
    }

    return (this._publication?.Spine?.indexOf(readingItem) ?? 0) + 1;
  }

  public get isPlaying() {
    return this.audio?.paused === false;
  }

  public get spine() {
    return this._publication?.Spine;
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

  public get duration() {
    return this.audio?.duration ?? 0;
  }

  private async _loadComic() {
    this._publication = undefined;
    this._playlist = undefined;

    const publication = await this._loadJsonFile(this._manifestUrl, GuidedPublication);

    const playlist = new Array<PlaylistItem>();

    const rootSyncMedia = new GuidedMedia();
    rootSyncMedia.children = [];

    const fullHref = (href: string) => new URL(href, this._manifestUrl).href;

    function fixSyncMediaHref(syncMedia: GuidedMedia) {
      if (syncMedia.audioRef) {
        syncMedia.audioRef = fullHref(syncMedia.audioRef);
      }

      if (syncMedia.textRef) {
        syncMedia.textRef = fullHref(syncMedia.textRef);
      }

      if (syncMedia.imageRef) {
        syncMedia.imageRef = fullHref(syncMedia.imageRef);
      }

      if (syncMedia.description) {
        if (syncMedia.description.audioRef) {
          syncMedia.description.audioRef = fullHref(syncMedia.description.audioRef);
        }

        if (syncMedia.description.imageRef) {
          syncMedia.description.imageRef = fullHref(syncMedia.description.imageRef);
        }
      }

      syncMedia.children?.forEach(fixSyncMediaHref);
    }

    for (const n of publication.GuidedNavigation ?? []) {
      n.Href = fullHref(n.Href);

      const nSyncMedia = await this._loadJsonFile(n.Href, GuidedMedia);
      fixSyncMediaHref(nSyncMedia);
      rootSyncMedia.children.push(nSyncMedia);
    }

    for (const link of publication.Spine ?? []) {
      link.Href = fullHref(link.Href);
    }

    for (const sm of rootSyncMedia.children) {
      const readingItem = publication.Spine?.find((i) => i.Href === sm.imageRef || i.Href === sm.textRef);
      if (!readingItem) {
        throw new Error('Reading item not found');
      }

      if (sm.textRef) {
        for (const c of sm.children ?? []) {
          const textFragment = c.textFragment;
          if (!textFragment || !c.audioFile) {
            continue;
          }

          const playlistItem = new PlaylistItem();
          playlistItem.audio = c.audioFile;
          playlistItem.start = c.audioStart ?? 0;
          playlistItem.end = c.audioEnd ?? 0;
          playlistItem.readingItem = readingItem;
          playlistItem.textId = textFragment;
          playlist.push(playlistItem);
        }

        continue;
      }

      if (sm.imageRef) {
        for (const c of sm.children ?? []) {
          if (!c.audioFile) {
            continue;
          }

          const playlistItem = new PlaylistItem();
          playlistItem.audio = c.audioFile;
          playlistItem.start = c.audioStart ?? 0;
          playlistItem.end = c.audioEnd ?? 0;
          playlistItem.readingItem = readingItem;
          playlistItem.comicPage = sm;
          playlistItem.panel = c;
          playlist.push(playlistItem);

          const texts = c.children;
          if (texts) {
            const textLength = texts.filter((t) => !t.audioRef).reduce((length, t) => length + (t.children?.length ?? 0), texts.length);

            const textDuration = texts.filter((t) => !!t.audioFile).reduce((res, item) => res + ((item.audioEnd ?? 0) - (item.audioStart ?? 0)), 0);

            const panelDuration = playlistItem.end - playlistItem.start - textDuration;

            let lastEnd = playlistItem.start;
            for (const t of texts) {
              const pctLength = (texts?.length ?? 0) / textLength;
              if (!t.audioRef) {
                const tAudioUrl = new URL(c.audioFile);
                tAudioUrl.hash = `#t=${lastEnd},${lastEnd + panelDuration * pctLength}`;
                t.audioRef = tAudioUrl.href;
              }

              if (!t.audioFile) {
                continue;
              }

              const tStart = t.audioStart ?? 0;
              const tEnd = t.audioEnd ?? 0;

              lastEnd = tEnd;

              if (playlistItem.end > tStart) {
                playlistItem.end = tStart;
              }

              const tPlaylistItem = new PlaylistItem();
              tPlaylistItem.audio = t.audioFile;
              tPlaylistItem.start = tStart;
              tPlaylistItem.end = tEnd;
              tPlaylistItem.readingItem = readingItem;
              tPlaylistItem.comicPage = sm;
              tPlaylistItem.panel = c;
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
    this._currentPositionIdx = 12;
  }

  private get _currentAudio() {
    return this._currentPosition?.audio;
  }

  private async _loadJsonFile<T>(url: string | URL | undefined, type: new (value?: any) => T) {
    if (!url) {
      throw new Error('url cannot be undefined');
    }

    const response = await fetch(url);
    return TaJson.parse(await response.text(), type);
  }

  private get _isNarratedPage() {
    return !!this.currentSpineItem?.TypeLink?.startsWith('image/');
  }

  override render() {
    const readingItem = this.currentSpineItem;
    if (!this._publication || !readingItem) {
      return html`<div>Loading</div>`;
    }

    this._positionChanged();

    let content: TemplateResult;

    if (!this._isNarratedPage) {
      content = html`<iframe id="iframe" src="${readingItem.Href}" @load=${this._highlightTextElement}></iframe>`;
    } else {
      content = html`
        <!-- Page -->
        ${this._renderImage('page')}

        <!-- Highlight panel box -->
        ${this._renderImage('panel-highlight', !!this._panelClipPath)}

        <!-- Highlight balloon box -->
        ${this._renderImage('balloon-highlight', !!this._balloonClipPath && this.highlightBalloon)}

        <!-- caption box - if enabled -->
        ${this._renderCaption()}
      `;
    }

    return html`
      <div class="container" style=${styleMap(this._containerStyles)}>
        ${content}

        <!-- add audio element -->
        ${this._renderAudio()}

        <div class="preload-images" aria-hidden="true">${this._renderPreload()}</div>
      </div>
    `;
  }

  private _setImageLoaded = () => {
    this._imageLoading = false;

    this.requestUpdate();
  };

  private readonly _preloadedImages = new Set<string>();

  private _renderImage(imageClass: string, enabled = true) {
    const url = this._comicPageUrl;
    if (!enabled || !url) {
      return nothing;
    }

    if (this._preloadedImages.has(url)) {
      this._imageLoading = false;
    }

    const classNames = {
      [imageClass]: true,
      'black-white-rendering': this.blackWhiteRendering,
    };

    return html`
      <div class="${classMap(classNames)}">
        <img src="${url}" @load=${this._setImageLoaded} />
      </div>
    `;
  }

  private _renderPreload() {
    const spine = this.spine;
    if (!spine) {
      return nothing;
    }

    const idx = this._spineIdx;
    if (idx == null) {
      return nothing;
    }

    return spine
      .slice(idx, idx + 5)
      .filter((s) => !!s.TypeLink?.startsWith('image/') && !this._preloadedImages.has(s.Href))
      .map((s) => html`<img src="${s.Href}" @load="${() => this._preloadedImages.add(s.Href)}" />`);
  }

  private _renderCaption() {
    if (!this.showCaption) {
      return nothing;
    }

    const caption = this._currentBalloon?.text;
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
      ?autoplay=${this.isPlaying}
      @loadeddata="${this._loadedAudioDataEvent}"
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
    const iframe = this.iframe;
    if (!currentPosition || !iframe?.contentDocument) {
      return;
    }

    if (currentPosition.textId && iframe.contentDocument.body) {
      const highlightClassName = 'readiumCSS-mo-active-default';
      const currentElement = iframe.contentDocument.body.querySelector(currentPosition.textId);
      const els = iframe.contentDocument.body.querySelectorAll(`.${highlightClassName}`);
      els?.forEach((e) => e !== currentElement && e.classList.remove(highlightClassName));

      currentElement?.classList.add(highlightClassName);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _timeupdateEvent = (evt: Event) => {
    try {
      const playlist = this._playlist;
      if (!playlist) {
        return;
      }

      const currentPosition = this._currentPosition;
      if (!currentPosition) {
        return;
      }

      const currentTime = (this.currentTime = this.audio?.currentTime ?? 0);
      if (currentPosition.isWithinOffset(currentTime)) {
        return;
      }

      const audio = this._currentAudio;

      let positionIdx = this._currentPositionIdx;

      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let idx = 0; idx < playlist.length; idx += 1) {
        const item = playlist[idx];
        if (item !== currentPosition && item.audio !== audio) {
          continue;
        }

        if (!this._highlightBalloon && item.text) {
          continue;
        }

        if (item.isWithinOffset(currentTime)) {
          positionIdx = idx;
        }
      }

      if (this._currentPositionIdx !== positionIdx) {
        this._currentPositionIdx = positionIdx;

        this.requestUpdate();
      }

      this._positionChanged();
    } catch (e) {
      console.error(e);
    } finally {
      this._highlightTextElement();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _loadedAudioDataEvent = (evt: Event) => {
    const audio = this.audio;
    if (audio) {
      audio.currentTime = this.currentTime;
    }

    this._positionChanged();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _endedEvent = (evt: Event) => {
    if (!this.canGoForward) {
      return;
    }

    this._nextPage();
  };

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

    div.container > div.black-white-rendering > img {
      filter: grayscale(1) contrast(255) brightness(1);
      mix-blend-mode: hard-light;
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

    .preload-images {
      width: 1px;
      height: 1px;
      opacity: 0;
      overflow: hidden;
    }

    .preload-images img {
      width: 1px;
      height: 1px;
      opacity: 0;
    }
  `;
}

class PlaylistItem {
  public audio: string;

  public start: number;

  public end: number;

  public readingItem: Link;

  public textId?: string;

  public comicPage?: GuidedMedia;

  public panel?: GuidedMedia;

  public text?: GuidedMedia;

  public isWithinOffset(offset: number) {
    const roundingErrorFactor = 0.001; // we need to handle rounding issues with numbers in JS.
    return this.start - roundingErrorFactor <= offset && offset < this.end + roundingErrorFactor;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'guided-publication-navigator': GuidedPublicationNavigator;
  }
}
