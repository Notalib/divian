import { LitElement, TemplateResult, css, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import DivianElement from '../DivianElement';

@customElement('divian-renderer')
export default class DivianRenderer extends LitElement {
  @property()
  public books = ['tts'];

  @property()
  public selectedBook?: string = 'tts';

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

  private buttonControlClasses(enabled: boolean) {
    return classMap({
      disabled: !enabled,
    });
  }

  protected renderBook(): TemplateResult | typeof nothing {
    if (!this.selectedBook) {
      return nothing;
    }

    const divinaJsonUrl = `/divina/${this.selectedBook}/manifest.json`;

    return html`<divian-element id="divina" @position-changed="${this.positionChanged}" divina="${divinaJsonUrl}"></divian-element>`;
  }

  public positionChanged = () => {
    this.canGoBack = this.divinaEl?.canGoBack ?? false;
    this.canGoForward = this.divinaEl?.canGoForward ?? false;
    this.currentPageNumber = this.divinaEl?.currentPageNumber ?? 0;
    this.numberOfPages = this.divinaEl?.numberOfPages ?? 0;
  };

  protected renderControlButton(click: (e: Event) => void, isEnabled: boolean, label: string): TemplateResult {
    return html` <button @click="${click}" class="${this.buttonControlClasses(isEnabled)}" ?disabled="${!isEnabled}">${label}</button> `;
  }

  protected renderControls(): TemplateResult | typeof nothing {
    if (!this.selectedBook) {
      return nothing;
    }

    return html`
      <div class="book-controls">
        ${this.renderControlButton(this.prevSegmentEvent, this.canGoBack, 'PREV')}
        <div class="nav-idx"><span>${this.currentPageNumber ?? 0} / ${this.numberOfPages ?? 0}</span></div>
        ${this.renderControlButton(this.nextSegmentEvent, this.canGoForward, 'NEXT')}
      </div>
    `;
  }

  protected render(): TemplateResult {
    return html`
      <link href="/assets/icofont/icofont.min.css" rel="stylesheet" />

      <header class="book-selector">${this.books.map((book) => html`<button data-book="${book}" @click="${this.selectBookEvent}">${book}</button>`)}</header>

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

  private readonly selectBookEvent = (e: MouseEvent) => {
    this.selectedBook = (e.target as HTMLButtonElement).dataset.book;
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
      background-color: blue;
      height: 50px;
      justify-content: center;
    }

    :host .book-controls > .nav-idx {
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

    :host button {
      cursor: pointer;
    }

    :host button[disabled],
    :host button.disabled {
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
