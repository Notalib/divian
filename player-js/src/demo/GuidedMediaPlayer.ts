import { LitElement, TemplateResult, css, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { Link } from 'r2-shared-js/dist/es8-es2017/src/models/publication-link';
import DivianNavigator from '../DivianNavigator';

@customElement('guided-media-player')
export default class GuidedMediaPlayer extends LitElement {
  @property()
  private canGoBack = false;

  @property()
  private canGoForward = false;

  @property()
  private currentPageNumber = 0;

  @property()
  private numberOfPages = 0;

  @property()
  private isPlaying = false;

  @property()
  public showCaption = true;

  @property()
  public highlightBalloon = true;

  @property()
  public infoBoxOpen = false;

  @property()
  public tocOpen = false;

  @property()
  public spine?: Link[];

  @property()
  public currentSpineItem?: Link;

  @property()
  public duration?: number;

  @property()
  public currentTime?: number;

  @query('#syncMedia')
  public syncMediaEl: DivianNavigator;

  private buttonControlClasses(enabled: boolean, iconClass: string) {
    return classMap({
      disabled: !enabled,
      [iconClass]: true,
    });
  }

  private _renderBook() {
    const syncManifestUrl = `/divian/books/nofret-gravroeverne/guided-manifest.json`;

    return html`<guided-publication-navigator
      id="syncMedia"
      show-caption=${this.showCaption}
      highlight-balloon=${this.highlightBalloon}
      @position-changed="${this._positionChangedEvent}"
      manifest="${syncManifestUrl}"
    ></guided-publication-navigator>`;
  }

  private readonly _positionChangedEvent = () => {
    this.canGoBack = !!this.syncMediaEl?.canGoBack;
    this.canGoForward = !!this.syncMediaEl?.canGoForward;
    this.currentPageNumber = this.syncMediaEl?.currentPageNumber ?? 0;
    this.numberOfPages = this.syncMediaEl?.numberOfPages ?? 0;
    this.isPlaying = !!this.syncMediaEl?.isPlaying;
    this.spine = this.syncMediaEl?.spine;
    this.currentSpineItem = this.syncMediaEl?.currentSpineItem;
    this.currentTime = this.syncMediaEl?.currentTime;
    this.duration = this.syncMediaEl?.duration;
  };

  private _renderControlButton(click: (e: Event) => void, isEnabled: boolean, label: string, iconClass: string): TemplateResult {
    return html`
      <div class="${classMap({ 'ui-icon': true, disabled: !isEnabled, [`ui-icon-${iconClass}`]: true })}" role="button" @click="${click}">
        <i class="${this.buttonControlClasses(isEnabled, iconClass)}" title="${label}"></i>
      </div>
    `;
  }

  private _renderControls() {
    return html`
      <nav class="book-controls">
        <!-- Go back button -->
        ${this._renderControlButton(this._goBackEvent, this.canGoBack, 'Go back', 'icofont-ui-previous')}

        <!-- play / pause button -->
        ${this._renderPlayPauseButtons()}

        <!-- Go Forward button -->
        ${this._renderControlButton(this._goForwardEvent, this.canGoForward, 'Go forward', 'icofont-ui-next')}

        <div class="nav-idx" title="Page ${this.currentPageNumber ?? 0} / ${this.numberOfPages ?? 0}">
          <span>Page ${this.currentPageNumber ?? 0} / ${this.numberOfPages ?? 0}</span>
        </div>

        ${this._renderControlButton(this._toggleShowCaptionEvent, this.showCaption, 'Toggle caption', 'icofont-ui-text-chat')}
        ${this._renderControlButton(this._toggleHighlightBalloonsEvent, this.highlightBalloon, 'Toggle balloon highlighting', 'icofont-speech-comments')}
        ${this._renderProgressBar()}

        <!-- menus -->
        <div class="menus">
          ${this._renderControlButton(this._toggleTOCEvent, this.tocOpen, 'Open Table of Content', 'icofont-navigation-menu')}
          ${this._renderControlButton(this._toggleInfoBoxEvent, this.infoBoxOpen, 'Open information box', 'icofont-info-square')}
        </div>
      </nav>
    `;
  }

  private _formatTime(time: number, showMilliseconds = true) {
    if (Number.isNaN(time)) {
      return '00:00';
    }

    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time - hours * 60) / 60);
    const seconds = Math.floor(time % 60);

    const d = hours > 0 ? [hours, minutes, seconds] : [minutes, seconds];

    const res = d.map((v: number): string => `000${v}`.slice(-2)).join(':');

    if (showMilliseconds) {
      const ms = `${time - Math.floor(time)}000`.slice(2, 5);
      return `${res}.${ms}`;
    }

    return res;
  }

  private _renderProgressBar() {
    const currentTime = this._formatTime(this.currentTime ?? 0);
    const duration = this._formatTime(Math.ceil(this.duration ?? 0), false);
    const progression = ((this.currentTime ?? 0) / (this.duration ?? 1)) * 100;

    return html`
      <div class="progress-container">
        <div class="time-box" title="Current time: ${currentTime}">${currentTime}</div>
        <div class="progress-bar">
          <progress value="${progression}" max="100"></progress>
        </div>
        <div class="time-box" title="Duration ${duration}">${duration}</div>
      </div>
    `;
  }

  private _renderPlayPauseButtons() {
    let clickEvent = this._play;
    let label = 'Play';
    let iconClass = 'icofont-ui-play';
    if (this.isPlaying) {
      clickEvent = this._pause;
      label = 'Pause';
      iconClass = 'icofont-ui-pause';
    }

    return html`${this._renderControlButton(clickEvent, true, label, iconClass)}`;
  }

  private _renderInfoSideMenu() {
    if (!this.infoBoxOpen) {
      return nothing;
    }

    return this._renderSideMenu(
      html`
        <section class="side-bar-info-text">
          <p>This is a demo of the WebPublication profile for Digital Visual Audible Narratives (<em>DiViAN</em>).</p>
          <p>This particular comic "Nofret: Gravrøverne" is from <a href="https://nota.dk">Nota's</a> free collection.</p>
          The full Divian profile can be found <a href="/divian" target="_blank">her</a>.
        </section>
      `,
      this._toggleInfoBoxEvent,
    );
  }

  private _renderTOCSideMenu() {
    if (!this.tocOpen) {
      return nothing;
    }

    const spine = this.spine;
    if (!spine) {
      return nothing;
    }

    const currentSpineItem = this.currentSpineItem;
    if (!currentSpineItem) {
      return nothing;
    }

    return this._renderSideMenu(
      html`${spine.map(
        (s, i) =>
          html`<div
            role="button"
            tabindex=${i}
            aria-pressed="false"
            class="${classMap({
              'side-menu-toc-item': true,
              active: s === currentSpineItem,
            })}"
            @click="${() => this.syncMediaEl?.goToSpineItem(s)}"
          >
            ${s.Title}
          </div>`,
      )}`,
      this._toggleTOCEvent,
    );
  }

  private _renderSideMenu(content: TemplateResult, click: (e: Event) => void) {
    return html`
      <aside class="side-menu">
        <div><i class="icofont-close" title="Close" @click="${click}"></i></div>
        <div class="side-menu-content">${content}</div>
      </aside>
    `;
  }

  override render(): TemplateResult {
    return html`
      <!-- Workaround to make icofonts work inside the shadow dom. -->
      <link href="/divian/assets/icofont/icofont.min.css" rel="stylesheet" />

      ${this._renderControls()}

      <section class="content-viewer">${this._renderBook()}</section>

      <!-- Info sidebar box -->
      ${this._renderInfoSideMenu()}

      <!-- TOC sidebar box -->
      ${this._renderTOCSideMenu()}
    `;
  }

  private readonly _goBackEvent = () => this.syncMediaEl?.GoBack();

  private readonly _goForwardEvent = () => this.syncMediaEl?.GoForward();

  private readonly _toggleShowCaptionEvent = () => {
    this.showCaption = !this.showCaption;

    this.requestUpdate();
  };

  private readonly _toggleHighlightBalloonsEvent = () => {
    this.highlightBalloon = !this.highlightBalloon;

    this.requestUpdate();
  };

  private readonly _toggleTOCEvent = () => {
    this.tocOpen = !this.tocOpen;

    this.requestUpdate();
  };

  private readonly _toggleInfoBoxEvent = () => {
    this.infoBoxOpen = !this.infoBoxOpen;

    this.requestUpdate();
  };

  private readonly _play = () => this.syncMediaEl?.play();

  private readonly _pause = () => this.syncMediaEl?.pause();

  private readonly _onWindowResize = () => this.requestUpdate();

  override connectedCallback() {
    super.connectedCallback();

    window.addEventListener('resize', this._onWindowResize);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();

    window.removeEventListener('resize', this._onWindowResize);
  }

  // Define scoped styles right with your component, in plain CSS
  public static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      --background-color: #212121;
    }

    .book-controls {
      display: flex;
      flex-direction: row;
      background-color: var(--background-color);
      height: 50px;
      padding: 0.2em;
    }

    .book-controls :is(.nav-idx, .ui-icon, .progress-container) {
      line-height: calc(50px - 0.2em * 2);
      margin: 0 2em;
    }

    .book-controls .progress-container {
      display: flex;
      flex-grow: 1;
      flex-direction: row;

      color: white;
    }

    .book-controls .progress-container .progress-bar {
      flex-grow: 1;
      margin: 0 1em;
    }

    .book-controls .progress-container .progress-bar progress {
      width: 100%;
    }

    .book-controls > .nav-idx > span {
      display: inline-block;
      vertical-align: middle;
      line-height: normal;
      color: white;
      font-weight: bolder;
    }

    .book-controls .ui-icon {
      margin: 0 0.2em;
      display: inline-block;
    }

    .book-controls > .menus {
      flex: 1;
      justify-content: flex-end;
      display: flex;
    }

    .book-controls .ui-icon :is(.icofont-ui-text-chat, .icofont-speech-comments, .icofont-navigation-menu, .icofont-info-square).disabled {
      background-color: var(--background-color);
      color: white;
      cursor: pointer;
      opacity: 1;
    }

    .book-controls .ui-icon i {
      cursor: pointer;
      display: inline-block;
      background-color: grey;
      padding: 1em;
      border-radius: 1.5em;
    }

    .ui-icon.disabled {
      opacity: 0.5;
    }

    .ui-icon.disabled,
    .ui-icon.disabled i {
      cursor: not-allowed;
    }

    .content-viewer {
      flex-grow: 1;
      flex-shrink: 0;
      overflow: hidden;
      display: flex;
      border-bottom: 0.8em solid var(--background-color);
    }

    .content-viewer guided-publication-navigator {
      flex-grow: 1;
    }

    .side-menu {
      position: absolute;
      background-color: var(--background-color);
      color: white;
      border-left: 1px solid grey;
      top: 0;
      bottom: 0;
      right: 0;
      width: 300px;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .side-menu .icofont-close {
      font-size: 2em;
      cursor: pointer;
    }

    .side-menu .side-menu-content {
      flex-shrink: 1;
      flex-grow: 1;
      padding: 0.2em;
      overflow-x: hidden;
      overflow-y: auto;
    }

    .side-menu-toc-item {
      padding: 0.8em 0.2em;
      margin: 0;
      cursor: pointer;
      white-space: nowrap;

      --item-background-color: --background-color;
      --item-text-color: white;

      background-color: var(--item-background-color);
      color: var(--item-text-color);
    }

    .side-menu-toc-item:hover {
      --item-text-color: var(--background-color);
      --item-background-color: white;
      opacity: 0.8;
      font-weight: bolder;
    }

    .side-menu-toc-item.active {
      --item-text-color: var(--background-color);
      --item-background-color: white;
    }

    .side-menu .side-bar-info-text {
      font-size: 1.2em;
    }

    .side-menu .side-bar-info-text a {
      color: white;
      font-weight: bold;
      text-decoration: underline;
    }
  `;
}
