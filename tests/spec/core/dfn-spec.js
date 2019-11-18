"use strict";

import {
  flushIframes,
  makeBasicConfig,
  makeDefaultBody,
  makeRSDoc,
  makeStandardOps,
} from "../SpecHelper.js";

describe("Core — Definitions", () => {
  afterAll(flushIframes);
  it("processes definitions", async () => {
    const ops = {
      config: makeBasicConfig(),
      body: `${makeDefaultBody()}<section id='dfn'><dfn>text</dfn><a>text</a></section>`,
    };
    const doc = await makeRSDoc(ops);
    const sec = doc.getElementById("dfn");
    expect(sec.querySelector("dfn").id).toBe("dfn-text");
    expect(sec.querySelector("a").getAttribute("href")).toBe("#dfn-text");
  });

  it("makes links <code> when their definitions are <code>", async () => {
    const ops = {
      config: makeBasicConfig(),
      body: `${makeDefaultBody()}<section id='dfn'>
          <code><dfn>outerCode</dfn></code>
          <pre><dfn>outerPre</dfn></pre>
          <dfn><code>innerCode</code></dfn>
          <dfn><code>partial</code> inner code</dfn>
          <a>outerCode</a>
          <a>outerPre</a>
          <a>innerCode</a>
          <a>partial inner code</a>
        </section>`,
    };

    const doc = await makeRSDoc(ops);
    const sec = doc.getElementById("dfn");
    const anchors = [...sec.children].filter(node => node.localName === "a");
    expect(anchors[0].childNodes[0].textContent).toBe("outerCode");
    expect(anchors[0].childNodes[0].nodeName).toBe("CODE");
    expect(anchors[1].childNodes[0].textContent).toBe("outerPre");
    expect(anchors[1].childNodes[0].nodeName).toBe("CODE");
    expect(anchors[2].childNodes[0].textContent).toBe("innerCode");
    expect(anchors[2].childNodes[0].nodeName).toBe("CODE");
    expect(anchors[3].childNodes[0].textContent).toBe("partial inner code");
    expect(anchors[3].childNodes[0].nodeName).toBe("#text");
  });

  it("doesn't add redundant lt when not needed", async () => {
    const ops = {
      config: makeBasicConfig(),
      body: `${makeDefaultBody()}
      <section>
        <dfn id="test1">test</dfn>
        <dfn id="test2" data-lt="I'm an lt">test</dfn>
      </section>`,
    };
    const doc = await makeRSDoc(ops);

    const test1 = doc.getElementById("test1");
    expect(Object.keys(test1.dataset)).not.toContain("lt");

    const test2 = doc.getElementById("test2");
    expect(test2.dataset.lt).toBeTruthy();
    expect(test2.dataset.lt).toBe("I'm an lt|test");
  });

  it("links <code> for IDL, but not when text doesn't match", async () => {
    const ops = {
      config: makeBasicConfig(),
      body: `${makeDefaultBody()}
          <pre class="idl">
            interface Test {};
          </pre>
          <p id="t1"><a>Test</a>
          <p id="t2"><a data-lt="Test">not wrapped in code</a>
      `,
    };
    const doc = await makeRSDoc(ops);
    const code = doc.querySelector("#t1 code");
    expect(code.textContent).toBe("Test");
    const t2 = doc.getElementById("t2");
    expect(t2.querySelector("code")).toBe(null);
    expect(t2.querySelector("a").textContent).toBe("not wrapped in code");
    expect(t2.querySelector("a").getAttribute("href")).toBe("#idl-def-test");
  });

  it("processes aliases", async () => {
    const ops = {
      config: makeBasicConfig(),
      body: `${makeDefaultBody()}<section id='dfn'>
          <dfn data-lt='text|text 1|text  2|text 3 '>text</dfn>
          <a>text</a>
        </section>`,
    };
    const doc = await makeRSDoc(ops);
    const dfn = doc.querySelector("dfn[data-lt]");
    expect(dfn.dataset.lt).toBe("text|text 1|text 2|text 3");
  });

  it("distinguishes between definition types", async () => {
    const body = `
      <pre class="idl">
      [Exposed=Window]
      interface Foo {
        attribute DOMString bar;
      };
      </pre>
      <p>
        The <dfn data-dfn-for="Foo" data-dfn-type="dfn">bar</dfn> concept.
        The <dfn>bar</dfn> attribute, returns 🍺.
      </p>
      <p id="concept-link">
        Links to the concept of [=Foo/bar=].
      </p>
      <p id="idl-link">
        Links to the attribute {{Foo/bar}}.
      </p>
    `;
    const ops = makeStandardOps({}, body);
    const doc = await makeRSDoc(ops);
    const conceptLink = doc.querySelector("#concept-link a[href='#dfn-bar']");
    const idlLink = doc.querySelector("#idl-link a[href='#dom-foo-bar']");
    expect(conceptLink).toBeTruthy();
    expect(idlLink).toBeTruthy();
  });
});
