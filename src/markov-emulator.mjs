import { html, LitElement } from 'lit'
import style from './markov-emulator.css'
import 'prismjs';
import 'lit-code';

const CODE_MARKOV = "*a -> A\n*b -> B\nAa -> aA\nAb -> bA\nBa -> aB\nBb -> bB\nA |-> a\nB |-> b\n* |-> \n -> *";

class MarkovEmulator extends LitElement {
  static styles = [ style ];

  static properties = {
    input: { type: String },
    history: { type: Array },
    running: { type: Boolean },
  };

  constructor() {
    super();
    this.history = [{}];
    this.lines = [];
    this.curStep = 0;
    this.input = "aboba";

    this.shortcuts = {
      "Digit1": this.step,
      "Digit2": this.play,
      "Digit3": this.reset
    };

    window.addEventListener("keydown", (e) => {
      if (!e.ctrlKey) return;

      if (this.shortcuts[e.code] !== undefined) {
        e.preventDefault(); 
        this.shortcuts[e.code].bind(this)();
      }
    });

    Prism.languages.markov = {
      operator: /(?:->|\|->)/
    };
  }

  firstUpdated() {
    this.editor = this.shadowRoot.getElementById('editor');
    this._lineHl = this.shadowRoot.getElementById('current-rule');
  }

  render() {
    return html`
      <div id="editor-wrap">
        <lit-code
            id="editor"
            language="markov"
            code=${CODE_MARKOV}
            @update=${this.codeUpdate}
            linenumbers
            ?running=${this.running}
            ?completed=${this.needReset}
        ></lit-code>
        <div id="current-rule"></div>
      </div>

      <div id="controls">
        <input type="text" spellcheck="false"
               id="string"
               .value=${this.input}
               placeholder="Enter something"
               @input=${({target}) => this.input = target.value }
               ?disabled=${this.running}
        >
        <div id="buttons">
          <button id="step" @click=${this.step}>Step</button>
          <button id="play" @click=${this.play}>Play</button>
          <button id="reset" @click=${this.hardReset}>Reset</button>
        </div>
      </div>

      <div id="history" ?completed=${this.needReset}>
        <div id="terminated">S T O P</div>
        ${this.history.map((his, i) => html`
          <div class='line'>${i}</div>
          <div class='rule'>${his.change}</div>

          ${!(i > 0) ? html`` : html`
            <div class='empty-line'></div>
            <div class='change'>${his.rule}</div>
          `}
        `).reverse()}
      </div>
    `;
  }

  setLineHighlite(lineNumber) {
    const ta = this.editor.elTextarea;
    const ed = this.editor.elContainer;
    const [ lineHeight ] = document.defaultView.
      getComputedStyle(ed).
      getPropertyValue('line-height').
      split('px');

    const jump = lineNumber * lineHeight;
    if (jump - ed.scrollTop > this.editor.clientHeight || jump < ed.scrollTop)
      ed.scrollTop = jump;
    const endHeight = ta.offsetHeight - this.editor.clientHeight;

    const linesAbove = Math.floor(ed.scrollTop / lineHeight);
    const offset = (endHeight && jump > endHeight ? -7 : 4);
    const position = offset + (lineNumber - linesAbove) * lineHeight;

    this._lineHl.style.top = `${position}px`;
  }

  play() {
    this.running = true;
    const LIMIT = 1000;
    let i = 0;
    while (i < LIMIT && this.step()) i++;

    if (i === LIMIT) {
      console.log('Too many operations!');
    }

    this.running = false;
    this.needReset = true;
  }

  step(showCurrent = true) {
    if (this.needReset) { this.reset(); return true; }

    this.running = true;
    let step = 0, notReplaced = true, terminal = false;
    let before = '', rule = '';

    while (notReplaced && step < this.code.length) {
      rule = this.code[step].replace(/ +/g, '');
      if (rule.length === 0) { step++; continue; }

      let [ alpha, beta ] = rule.split('|->');
      terminal = (beta !== undefined);

      if (!terminal)
        [ alpha, beta ] = rule.split('->');

      //if (beta === undefined) console.log('Syntax error');

      before = this.input;
      this.input = this.input.replace(alpha, beta);
      notReplaced = (before === this.input);

      step++;
    }

    if (showCurrent) this.setLineHighlite(step - 1);

    this.history.push({ change: before, rule: this.code[step - 1] });
    if (notReplaced || terminal) {
      this.running = false;
      this.needReset = true;
      return false;
    }

    return true;
  }

  hardReset() {
    this.reset();
  }

  reset() {
    this.history = [ { change: this.input, rule: ' ' } ];
    this.running = false;
    this.needReset = false;
  }

  codeUpdate({ detail: code }) {
    this.code = code.split('\n');
  }
};

customElements.define('markov-emulator', MarkovEmulator);
