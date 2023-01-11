import { LitElement, TemplateResult, css, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import DivianElement from '../DivianElement';

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

  @query('#divina')
  public divinaEl: DivianElement;

  private buttonControlClasses(enabled: boolean, iconClass: string) {
    return classMap({
      disabled: !enabled,
      [iconClass]: true,
    });
  }

  protected renderBook(): TemplateResult | typeof nothing {
    let divinaJsonUrl = `/books/nofret-gravroeverne/manifest.json`;
    if (window.location.pathname === 'player') {
      divinaJsonUrl = `../${divinaJsonUrl}`;
    }

    return html`<divian-element id="divina" @position-changed="${this.positionChanged}" divina="${divinaJsonUrl}"></divian-element>`;
  }

  public readonly positionChanged = () => {
    this.canGoBack = this.divinaEl?.canGoBack ?? false;
    this.canGoForward = this.divinaEl?.canGoForward ?? false;
    this.currentPageNumber = this.divinaEl?.currentPageNumber ?? 0;
    this.numberOfPages = this.divinaEl?.numberOfPages ?? 0;
  };

  protected renderControlButton(click: (e: Event) => void, isEnabled: boolean, label: string, iconClass: string): TemplateResult {
    return html`
      <div class="${classMap({ 'ui-icon': true, disabled: !isEnabled })}">
        <i @click="${click}" class="${this.buttonControlClasses(isEnabled, iconClass)}" ?disabled="${!isEnabled}" alt="${label}"></i>
      </div>
    `;
  }

  protected renderControls(): TemplateResult | typeof nothing {
    return html`
      <div class="book-controls">
        ${this.renderControlButton(this.prevSegmentEvent, this.canGoBack, 'PREV', 'icofont-ui-previous')}
        <div class="nav-idx"><span>${this.currentPageNumber ?? 0} / ${this.numberOfPages ?? 0}</span></div>
        ${this.renderControlButton(this.nextSegmentEvent, this.canGoForward, 'NEXT', 'icofont-ui-next')}
      </div>
    `;
  }

  protected render(): TemplateResult {
    return html`
      <link href="/assets/icofont/icofont.min.css" rel="stylesheet" />

      ${this.renderControls()}

      <section class="content-viewer">${this.renderBook()}</section>

      <footer>DEMO</footer>
    `;
  }

  private readonly prevSegmentEvent = () => {
    this.divinaEl?.GoBack();
  };

  private readonly nextSegmentEvent = () => {
    this.divinaEl?.GoForward();
  };

  // Define scoped styles right with your component, in plain CSS
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    :host .book-selector,
    :host .book-controls {
      display: flex;
      flex-direction: row;
      background-color: #212121;
      height: 50px;
      justify-content: center;
    }

    :host .book-controls :is(.nav-idx, .ui-icon) {
      line-height: 50px;
      margin: 0 2em;
    }

    :host .book-controls > .nav-idx > span {
      display: inline-block;
      vertical-align: middle;
      line-height: normal;
      color: white;
      font-weight: bolder;
    }

    :host .book-controls .ui-icon i {
      cursor: pointer;
      display: inline-block;
      background-color: grey;
      padding: 1em;
      border-radius: 1.5em;
    }

    :host .ui-icon[disabled],
    :host .ui-icon.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    :host .content-viewer,
    :host .placeholder {
      flex-grow: 1;
      flex-shrink: 0;
    }

    :host .content-viewer {
      overflow: hidden;
      display: flex;
    }

    :host .content-viewer divian-element {
      flex-grow: 1;
    }

    :host footer {
      background-color: yellow;
      display: block;
      text-align: center;
      justify-content: flex-end;
    }
  `;
}

export interface MediaOverlay {
  role: string;
  narration: MediaOverlayNarration[];
}

export interface MediaOverlayNarration {
  narration: MediaOverlayNarrationNode[];
}

export interface MediaOverlayNarrationNode {
  text: string;
  audio: string;
}
