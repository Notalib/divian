import { LitElement, TemplateResult, css, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import DivianNavigator from '../DivianNavigator';

@customElement('divian-renderer')
export default class DivianRenderer extends LitElement {
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
  public showCaption = false;

  @property()
  public highlightBalloon = false;

  @query('#divina')
  public divinaEl: DivianNavigator;

  private buttonControlClasses(enabled: boolean, iconClass: string) {
    return classMap({
      disabled: !enabled,
      [iconClass]: true,
    });
  }

  private renderBook(): TemplateResult | typeof nothing {
    const divinaJsonUrl = `/books/nofret-gravroeverne/manifest.json`;

    return html`<divian-navigator
      id="divina"
      show-caption=${this.showCaption}
      highlight-balloon=${this.highlightBalloon}
      @position-changed="${this.positionChanged}"
      manifest="${divinaJsonUrl}"
    ></divian-navigator>`;
  }

  public readonly positionChanged = () => {
    this.canGoBack = !!this.divinaEl?.canGoBack;
    this.canGoForward = !!this.divinaEl?.canGoForward;
    this.currentPageNumber = this.divinaEl?.currentPageNumber ?? 0;
    this.numberOfPages = this.divinaEl?.numberOfPages ?? 0;
    this.isPlaying = !!this.divinaEl?.isPlaying;
  };

  private _renderControlButton(click: (e: Event) => void, isEnabled: boolean, label: string, iconClass: string): TemplateResult {
    return html`
      <div class="${classMap({ 'ui-icon': true, disabled: !isEnabled })}">
        <i @click="${click}" class="${this.buttonControlClasses(isEnabled, iconClass)}" ?disabled="${!isEnabled}" title="${label}"></i>
      </div>
    `;
  }

  private _renderControls() {
    return html`
      <div class="book-controls">
        <!-- Go back button -->
        ${this._renderControlButton(this._goBackEvent, this.canGoBack, 'Go back', 'icofont-ui-previous')}

        <!-- play / pause button -->
        ${this._renderPlayPauseButtons()}

        <!-- Go Forward button -->
        ${this._renderControlButton(this._goForwardEvent, this.canGoForward, 'Go forward', 'icofont-ui-next')}

        <div class="nav-idx"><span>Page ${this.currentPageNumber ?? 0} / ${this.numberOfPages ?? 0}</span></div>

        ${this._renderControlButton(this._toggleShowCaptionEvent, this.showCaption, 'Toggle caption', 'icofont-ui-text-chat')}
        ${this._renderControlButton(this._toggleHighlightBalloonsEvent, this.highlightBalloon, 'Toggle balloon highlighting', 'icofont-speech-comments')}
      </div>
    `;
  }

  private _renderPlayPauseButtons() {
    if (this.isPlaying) {
      return html`${this._renderControlButton(this._pause, true, 'Pause', 'icofont-ui-pause')}`;
    }

    return html`${this._renderControlButton(this._play, true, 'Play', 'icofont-ui-play')}`;
  }

  override render(): TemplateResult {
    return html`
      <!-- Workaround to make icofonts work inside the shadow dom. -->
      <link href="assets/icofont/icofont.min.css" rel="stylesheet" />

      ${this._renderControls()}

      <section class="content-viewer">${this.renderBook()}</section>
    `;
  }

  private readonly _goBackEvent = () => this.divinaEl?.GoBack();

  private readonly _goForwardEvent = () => this.divinaEl?.GoForward();

  private readonly _toggleShowCaptionEvent = () => {
    this.showCaption = !this.showCaption;

    this.requestUpdate();
  };

  private readonly _toggleHighlightBalloonsEvent = () => {
    this.highlightBalloon = !this.highlightBalloon;

    this.requestUpdate();
  };

  private readonly _play = () => this.divinaEl?.play();

  private readonly _pause = () => this.divinaEl?.pause();

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
      justify-content: left;
      padding: 0.2em;
    }

    .book-controls :is(.nav-idx, .ui-icon) {
      line-height: calc(50px - 0.2em * 2);
      margin: 0 2em;
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
    }

    .book-controls .ui-icon :is(.icofont-ui-text-chat, .icofont-speech-comments).disabled {
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

    .content-viewer,
    .placeholder {
      flex-grow: 1;
      flex-shrink: 0;
    }

    .content-viewer {
      overflow: hidden;
      display: flex;
      border-bottom: 0.8em solid var(--background-color);
    }

    .content-viewer divian-navigator {
      flex-grow: 1;
    }
  `;
}
