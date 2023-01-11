import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { TaJson } from 'ta-json-x';
import DivianPublication from './DivianPublication';

@customElement('divian-element')
export default class DivianElement extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      padding: 0;
      margin: 0;
      position: relative;
      height: inherit;
    }

    :host > div.container {
      margin: 0 auto;
    }

    :host > div.container {
      display: flex;
      flex-grow: 1;
      flex-shrink: 1;
      height: 100%;
      min-height: 0;
    }

    :host > div.container > div:is(.page, .panel-highlight, .balloon-highlight) {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: center;
      height: var(--rendered-height);
      width: var(--rendered-width);
      transform: translate(var(--panel-translate-x), var(--panel-translate-y));
    }

    :host > div.container > div:is(.page, .panel-highlight, .balloon-highlight) > img {
      height: var(--rendered-height);
      width: var(--rendered-width);
    }

    :host div.balloon-highlight {
      background-color: rgba(116, 116, 116, 0.4);
    }

    :host div.balloon-highlight img {
      clip-path: var(--balloon-clip-path);
    }

    :host div.panel-highlight {
      background-color: rgba(30, 30, 30, 0.45);
    }

    :host div.panel-highlight img {
      clip-path: var(--panel-clip-path);
    }

    :host > div.container > div.caption {
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
  private publication?: DivianPublication;

  private _divinaJsonUrl?: string;

  public get divinaJsonUrl() {
    return this._divinaJsonUrl;
  }

  @property({ attribute: 'divina' })
  public set divinaJsonUrl(value: string) {
    if (this._divinaJsonUrl !== value) {
      this._divinaJsonUrl = new URL(value, location.href).href;

      this._loadComic().catch((e) => console.error(e));
    }
  }

  @property()
  public pageIdx = 0;

  private get hasPrevPage() {
    return this.pageIdx > 0;
  }

  private get hasNextPage() {
    return !!this.publication?.Narration?.[this.pageIdx + 1];
  }

  private get currentPage() {
    return this.publication?.Narration?.[this.pageIdx];
  }

  private get readingItem() {
    if (!this.publication?.Spine) {
      return null;
    }

    const currentPage = this.currentPage;

    for (const item of this.publication?.Spine) {
      if (item.Href === currentPage.Href) {
        return item;
      }
    }

    return null;
  }

  private get comicPageUrl() {
    const path = this.currentPage?.Href;
    if (!path) {
      return null;
    }

    return new URL(path, this.divinaJsonUrl).href;
  }

  @property()
  public panelIdx = 0;

  private get currentPanel() {
    return this.currentPage?.Panels?.[this.panelIdx];
  }

  private get hasPrevPanel() {
    return this.panelIdx > 0;
  }

  private get hasNextPanel() {
    return !!this.currentPage?.Panels?.[this.panelIdx + 1];
  }

  @property()
  public balloonIdx = 0;

  private get pageHeight(): number | void {
    return this.readingItem?.Height;
  }

  private get pageWidth(): number | void {
    return this.readingItem?.Width;
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
    this.pageIdx = (this.publication?.Narration?.length ?? 0) - 1;
    this.panelIdx = (this.currentPage?.Panels?.length ?? 0) - 1;
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

    if (this.hasPrevPage) {
      this.pageIdx -= 1;
      this.panelIdx = Math.max(0, (this.currentPage?.Panels?.length ?? 0) - 1);
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

    if (this.hasNextPage) {
      this.pageIdx += 1;
      this.panelIdx = 0;
      this.balloonIdx = 0;
    }
  }

  public get canGoBack() {
    return this.hasPrevBalloon || this.hasPrevPanel || this.hasPrevPage;
  }

  public get canGoForward() {
    return this.hasNextBalloon || this.hasNextPanel || this.hasNextPage;
  }

  public get numberOfPages() {
    return this.publication?.Spine?.length ?? 0;
  }

  public get currentPageNumber() {
    return this.publication?.Spine?.indexOf(this.readingItem) + 1;
  }

  private async _loadComic() {
    const response = await fetch(this._divinaJsonUrl);
    this.publication = TaJson.parse(await response.text(), DivianPublication);
  }

  override render() {
    const comicPageUrl = this.comicPageUrl;
    if (!comicPageUrl) {
      return html`<div>Loading</div>`;
    }

    this.positionChanged();

    return html`
      <div class="container" style=${styleMap(this.containerStyles)}>
        ${this.renderImage('page')} ${this.renderImage('panel-highlight', !!this.panelClipPath)}
        ${this.renderImage('balloon-highlight', !!this.balloonClipPath)} ${this.renderCaption()}
      </div>
    `;
  }

  private renderImage(imageClass: string, enabled = true) {
    if (!enabled) {
      return nothing;
    }

    return html`
      <div class="${imageClass}">
        <img src="${this.comicPageUrl}" />
      </div>
    `;
  }

  private renderCaption() {
    const caption = this.currentBalloon?.Text;
    if (!caption) {
      return nothing;
    }

    return html`<div class="caption">${caption}</div>`;
  }

  private positionChanged() {
    const event = new CustomEvent('position-changed');
    this.dispatchEvent(event);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'divian-element': DivianElement;
  }
}
