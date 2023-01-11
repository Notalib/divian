import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import NarratedPage from 'Model/NarratedPage';
import { MediaOverlayNode } from 'r2-shared-js/dist/es8-es2017/src/models/media-overlay';
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
  `;

  @property()
  private _publication?: DivianPublication;

  private _divinaJsonUrl?: string;

  public get manifestUrl() {
    return this._divinaJsonUrl;
  }

  @property({ attribute: 'manifest' })
  public set manifestUrl(value: string) {
    if (this._divinaJsonUrl !== value) {
      this._divinaJsonUrl = new URL(value, location.href).href;

      this._loadComic().catch((e) => console.error(e));
    }
  }

  @property()
  public pageIdx = 0;

  private get _hasPrevPage() {
    return this.pageIdx > 0;
  }

  private get _hasNextPage() {
    return !!this._publication?.Spine?.[this.pageIdx + 1];
  }

  private get _currentNarratedPage() {
    const readingItem = this._readingItem;
    if (!readingItem) {
      return null;
    }

    for (const item of this._publication?.Narration) {
      if (item.Href === readingItem.Href) {
        return item;
      }
    }

    return null;
  }

  private get _readingItem() {
    return this._publication?.Spine?.[this.pageIdx];
  }

  private get comicPageUrl() {
    const path = this._currentNarratedPage?.Href;
    if (!path) {
      return null;
    }

    return new URL(path, this.manifestUrl).href;
  }

  @property()
  public panelIdx = 0;

  private get currentPanel() {
    return this._currentNarratedPage?.Panels?.[this.panelIdx];
  }

  private get hasPrevPanel() {
    return this.panelIdx > 0;
  }

  private get hasNextPanel() {
    return !!this._currentNarratedPage?.Panels?.[this.panelIdx + 1];
  }

  @property()
  public balloonIdx = 0;

  private get pageHeight(): number | void {
    return this._readingItem?.Height;
  }

  private get pageWidth(): number | void {
    return this._readingItem?.Width;
  }

  private get currentBalloon() {
    return this.currentPanel?.Balloons?.[this.balloonIdx];
  }

  private get hasPrevBalloon() {
    return !!this.currentPanel?.Balloons?.[this.balloonIdx - 1];
  }

  private get hasNextBalloon() {
    return !!this.currentPanel?.Balloons?.[this.balloonIdx + 1];
  }

  private get balloonClipPath() {
    return this.currentBalloon?.ClipPath;
  }

  private get panelClipPath() {
    const pageHeight = this.pageHeight;
    const pageWidth = this.pageWidth;

    const panel = this.currentPanel;
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

  private get containerStyles() {
    const pageStyles = this.pageStyles;

    return {
      '--balloon-clip-path': this.balloonClipPath,
      '--panel-clip-path': this.panelClipPath,
      '--panel-translate-x': `${pageStyles?.translateX ?? ''}`,
      '--panel-translate-y': `${pageStyles?.translateY ?? ''}`,
      '--rendered-width': pageStyles?.renderedWidth,
      '--rendered-height': pageStyles?.renderedHeight,
    };
  }

  private get pageStyles() {
    const padding = 20;
    const pageHeight = this.pageHeight;
    const pageWidth = this.pageWidth;

    if (!pageHeight || !pageWidth) {
      return null;
    }

    // Panel position and size
    const panelXOffset = this.currentPanel?.X ?? 0;
    const panelYOffset = this.currentPanel?.Y ?? 0;
    const realPanelWidth = this.currentPanel?.Width ?? pageWidth;
    const realPanelHeight = this.currentPanel?.Height ?? pageHeight;

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

  public GoFirst() {
    this.pageIdx = 0;
    this.panelIdx = 0;
    this.balloonIdx = 0;
  }

  public GoLast() {
    this.pageIdx = (this._publication?.Narration?.length ?? 0) - 1;
    this.panelIdx = (this._currentNarratedPage?.Panels?.length ?? 0) - 1;
    this.balloonIdx = (this.currentPanel?.Balloons?.length ?? 0) - 1;
  }

  public GoBack() {
    if (this.hasPrevBalloon) {
      this.balloonIdx -= 1;
      return;
    }

    if (this.hasPrevPanel) {
      this.panelIdx -= 1;
      this.balloonIdx = Math.max(0, (this.currentPanel.Balloons?.length ?? 0) - 1);
      return;
    }

    if (this._hasPrevPage) {
      this.pageIdx -= 1;
      this.panelIdx = Math.max(0, (this._currentNarratedPage?.Panels?.length ?? 0) - 1);
      this.balloonIdx = Math.max(0, (this.currentPanel.Balloons?.length ?? 0) - 1);
      return;
    }
  }

  public GoForward() {
    if (this.hasNextBalloon) {
      this.balloonIdx += 1;
      return;
    }

    if (this.hasNextPanel) {
      this.panelIdx += 1;
      this.balloonIdx = 0;
      return;
    }

    if (this._hasNextPage) {
      this.pageIdx += 1;
      this.panelIdx = 0;
      this.balloonIdx = 0;
    }
  }

  public get canGoBack() {
    return this.hasPrevBalloon || this.hasPrevPanel || this._hasPrevPage;
  }

  public get canGoForward() {
    return this.hasNextBalloon || this.hasNextPanel || this._hasNextPage;
  }

  public get numberOfPages() {
    return this._publication?.Spine?.length ?? 0;
  }

  public get currentPageNumber() {
    return this._publication?.Spine?.indexOf(this._readingItem) + 1;
  }

  private async _loadComic() {
    this._audioPlaylist = null;
    this._publication = null;

    const publication = await this._loadJsonFile(this._divinaJsonUrl, DivianPublication);

    const audioPlaylist = new Set<string>();
    const narrationMap = new Map<string, NarratedPage>();

    for (const n of publication.Narration) {
      narrationMap.set(n.Href, n);

      for (const p of n.Panels) {
        if (p.Audio) {
          p.Audio = new URL(p.Audio, this._divinaJsonUrl).href;
        }
      }
    }

    for (const link of publication.Spine) {
      if (link.Properties?.MediaOverlay) {
        const mediaOverlayNode = await this._loadJsonFile(new URL(link.Properties?.MediaOverlay, this._divinaJsonUrl), MediaOverlayNode);
        for (const m of mediaOverlayNode.Children) {
          m.Text = new URL(m.Text, this._divinaJsonUrl).href;
          for (const c of m.Children ?? []) {
            const audio = new URL(c.Audio, this._divinaJsonUrl);
            c.Audio = audio.href;

            audio.hash = '';
            audioPlaylist.add(audio.href);
          }
        }

        link.MediaOverlays = mediaOverlayNode;

        continue;
      }

      if (link.TypeLink?.startsWith('image/')) {
        const n = narrationMap.get(link.Href);

        for (const p of n.Panels) {
          const audio = new URL(p.Audio);
          audio.hash = '';
          audioPlaylist.add(audio.href);
        }

        continue;
      }
    }

    this._audioPlaylist = audioPlaylist;

    this._publication = publication;
  }

  private _audioPlaylist: Set<string> | void;

  private async _loadJsonFile<T>(url: string | URL, type: new (value?: any) => T) {
    const response = await fetch(url);
    return TaJson.parse(await response.text(), type);
  }

  override render() {
    if (!this._publication) {
      return html`<div>Loading</div>`;
    }

    this._positionChanged();

    if (!this._readingItem.TypeLink?.startsWith('image/')) {
      return html`<div>Nothing</div>`;
    }

    return html`
      <div class="container" style=${styleMap(this.containerStyles)}>
        <!-- Page -->
        ${this._renderImage('page')}

        <!-- Highlight panel box -->
        ${this._renderImage('panel-highlight', !!this.panelClipPath)}

        <!-- Highlight balloon box -->
        ${this._renderImage('balloon-highlight', !!this.balloonClipPath)}

        <!-- caption box - if enabled -->
        ${this._renderCaption()}
      </div>
    `;
  }

  private _renderImage(imageClass: string, enabled = true) {
    if (!enabled) {
      return nothing;
    }

    return html`
      <div class="${imageClass}">
        <img src="${this.comicPageUrl}" />
      </div>
    `;
  }

  private _renderCaption() {
    const caption = this.currentBalloon?.Text;
    if (!caption) {
      return nothing;
    }

    return html`<div class="caption">${caption}</div>`;
  }

  private _positionChanged() {
    const event = new CustomEvent('position-changed');
    this.dispatchEvent(event);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'divian-navigator': DivianNavigator;
  }
}
