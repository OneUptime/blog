# Separate First-Party JavaScript Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Browser Monitoring, JavaScript Errors, CORS, Browser Extensions, Error Triage

Description: Classify browser errors by owned stack frames, release artifacts, extension schemes, and cross-origin evidence without hiding real failures.

---

Production browser error streams mix several origins: application bundles, npm dependencies compiled into those bundles, remote widgets, browser extensions, injected enterprise software, and cross-origin scripts whose details the browser deliberately withholds. Filtering by error message alone either leaves a noisy queue or deletes customer-impacting failures.

Classify evidence before deciding ownership. Preserve the raw event in a restricted stream long enough to improve the classifier, mark stack frames by deployed artifact identity, and separate “where the exception was thrown” from “whether our code participated.” A third-party library error reached through an application call path can still be actionable, while an extension-only stack usually is not.

## Capture Both Synchronous Errors and Rejections

An `error` listener on `window` receives uncaught synchronous script exceptions and, when registered in the capture phase, can also observe resource load failures dispatched at elements; those events have different shapes. Unhandled promise rejections use `unhandledrejection`; MDN also notes that cross-origin promise rejections may not dispatch this event because the reason could leak data.

~~~javascript
window.addEventListener('error', (event) => {
  if (event instanceof ErrorEvent) {
    reportBrowserFailure({
      kind: 'exception',
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack,
    });
    return;
  }

  const element = event.target;
  reportBrowserFailure({
    kind: 'resource',
    tag: element?.tagName,
    url: element?.currentSrc || element?.src || element?.href,
  });
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  reportBrowserFailure({
    kind: 'unhandled-rejection',
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});
~~~

Sanitize messages, stack traces, URLs, and rejection values before transmission; arbitrary thrown values can contain personal data or secrets. In production, prefer a maintained SDK for cross-browser stack parsing and duplicate suppression, but retain these event-type distinctions in the schema.

## Define “First Party” from the Build

Origin alone is too weak. Your bundles may come from `cdn.example.net`, and third-party packages are often bundled into the same file. Create an allowlist from the release manifest:

~~~json
{
  "release": "frontend@6d4b2a1",
  "artifacts": [
    "https://cdn.example.net/assets/app.4f8c29a1.js",
    "https://cdn.example.net/assets/checkout.a741c092.js",
    "https://cdn.example.net/assets/worker.729ba5ef.js"
  ]
}
~~~

After source-map processing, mark original files owned by the application separately from vendored dependencies. A practical event classification is:

- `first_party_only`: every meaningful frame belongs to a known release artifact and owned source;
- `mixed_owned_and_vendor`: at least one owned frame and at least one dependency or remote frame;
- `bundled_dependency_only`: frames map to dependencies inside an owned artifact;
- `remote_third_party_only`: frames resolve only to non-owned HTTP(S) assets;
- `extension_or_injected`: frames use extension schemes or match known injection evidence;
- `opaque_cross_origin`: the browser withheld useful details;
- `unknown`: evidence is insufficient.

Do not equate `node_modules` with “someone else's problem.” Your selected version and integration code are part of your delivered application. Route dependency-only clusters to the owning team or upgrade workflow, not directly to deletion.

## Recognize Extension Evidence Carefully

Chrome extension resources commonly use `chrome-extension://`; Firefox uses `moz-extension://`; other environments may expose additional non-HTTP schemes. Chrome documents that content scripts normally execute in isolated worlds, but they share the page's DOM and extensions can choose a main-world execution mode. They can therefore change DOM, intercept interactions, or inject code that eventually causes an application exception.

~~~javascript
const extensionSchemes = new Set([
  'chrome-extension:',
  'moz-extension:',
  'safari-web-extension:',
]);

function classifyFrame(rawUrl) {
  if (!rawUrl) return 'unknown-frame';
  try {
    const url = new URL(rawUrl);
    if (extensionSchemes.has(url.protocol)) return 'extension-frame';
    if (releaseArtifacts.has(url.href.split('?')[0])) return 'release-artifact';
    if (url.protocol === 'http:' || url.protocol === 'https:') return 'remote-frame';
    return 'other-frame';
  } catch {
    return 'unparseable-frame';
  }
}
~~~

Never try to enumerate a user's installed extensions. It is unreliable, creates fingerprinting risk, and is unnecessary for error triage. The frame URL visible in an error is enough to assign a confidence level. Suppress the extension identifier if retaining it offers no operational value. If cross-event aggregation is necessary, use a keyed, access-controlled pseudonym rather than a plain hash.

Use a label such as `probable_extension` rather than asserting certainty when only the message resembles a known extension error. If an event has both extension and owned frames, keep it: the extension may merely have exposed a bug in a first-party handler.

## Understand the Literal “Script error.”

Browsers intentionally restrict details for exceptions from cross-origin classic scripts loaded without CORS-enabled error reporting. Instead of the real message, file, line, column, and `Error` object, `window.onerror` may receive only the generic `Script error.` signal. This is a security boundary, not evidence that the monitoring SDK is broken.

For a script you control on another origin, request it in CORS mode and configure the asset response to permit the application origin:

~~~html
<script
  src="https://cdn.example.net/assets/app.4f8c29a1.js"
  crossorigin="anonymous"
></script>
~~~

~~~http
Access-Control-Allow-Origin: https://www.example.com
Vary: Origin
~~~

The HTML `crossorigin` attribute determines the request mode; the server response must also grant access. Use `*` only when appropriate for a truly public, credential-free asset. Test the final CDN response, including cached variants and redirects, rather than only the origin server.

For a third-party script you do not control, you cannot force its server to grant detailed error access. Ask the vendor to support CORS, isolate the integration, or instrument the boundary you own. Do not fabricate a stack trace for opaque events.

## Separate Remote Third-Party Code from First-Party Use

Inventory every runtime-loaded external script with an owner, purpose, version strategy, and fallback behavior. Common categories include payment widgets, tag managers, consent tools, support chat, and experimentation platforms. Attribute by frame URL and loading element, then consider impact:

| Evidence | Classification | Default action |
| --- | --- | --- |
| only known vendor frames | remote third party | aggregate by vendor and escalate if impactful |
| vendor throw plus owned caller | mixed | keep and inspect integration boundary |
| owned handler fails after vendor callback | first party | route to application owner |
| only extension-scheme frames | extension | suppress from paging, retain count |
| `Script error.` with known external resource nearby | opaque cross-origin | aggregate separately; do not merge by message alone |
| no stack, no URL, rare message | unknown | retain a bounded diagnostic sample |

An allowlist such as Sentry's `allowUrls` can reduce noise, but for captured exceptions it matches only the top stack-frame file URL and can therefore discard a mixed stack whose throw site is external. Sentry's `thirdPartyErrorFilterIntegration` instead uses build-time application-key marking so the browser SDK can make per-frame decisions at runtime. Choose a mode that tags events, or drops only events whose frames are exclusively outside application code. Validate the effect on a shadow stream before deleting anything.

## Use Confidence and Impact, Not a Binary Filter

Store bounded classification fields:

~~~text
code_ownership = first_party | dependency | remote_vendor | extension | opaque | unknown
ownership_confidence = high | medium | low
owned_frame_count = 0..N
external_frame_count = 0..N
user_impact = crash | blocked_action | degraded | unknown
release = immutable build ID
~~~

Page and alert on high-confidence first-party errors with customer impact. Keep lower-confidence events in trend dashboards and sample their full diagnostics. An extension-only error can be excluded from an application error-rate SLO while still appearing in an “environment noise” counter.

Fingerprint after symbolication using exception type plus stable owned frames. Grouping every opaque event under the literal message `Script error.` creates one meaningless super-cluster. Because an opaque event does not expose the throwing script URL, use a script host only when separate load or integration telemetry identifies a candidate; otherwise split by observable dimensions such as page route and release. Treat temporal proximity to resource failures as correlation evidence rather than proof, and keep every dimension bounded or normalized.

## Validate the Classifier

Create controlled tests in supported browsers:

1. Throw from a first-party source-mapped bundle.
2. Throw from a bundled dependency through an owned call site.
3. Load a test cross-origin script without `crossorigin` and observe the opaque error.
4. Repeat with `crossorigin="anonymous"` plus an appropriate CORS response.
5. Use a locally developed test extension to throw from an isolated-world and, separately, a main-world script.
6. Trigger a rejected promise and a failed script resource.
7. Confirm sensitive query strings and arbitrary rejection values are scrubbed.

Measure classification coverage, false-drop rate from the shadow stream, unsymbolicated-frame rate, and volume by ownership class. Re-run the suite after SDK, bundler, CDN, or browser-policy changes.

## Official Documentation

- [MDN `Window` error event](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event)
- [MDN `unhandledrejection` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)
- [MDN `crossorigin` HTML attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin)
- [MDN Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [WHATWG HTML error reporting](https://html.spec.whatwg.org/multipage/webappapis.html#report-the-error)
- [Chrome extension content scripts and isolated worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Sentry JavaScript error filtering](https://docs.sentry.io/platforms/javascript/configuration/filtering/)

## Conclusion

Reliable browser-error ownership comes from frames and release artifacts, not message blocklists. Capture the correct event types, symbolicate before classifying, recognize extension schemes with an explicit confidence level, and treat `Script error.` as an opaque cross-origin signal. Tag mixed stacks and bundled dependencies instead of discarding them, reserve hard drops for well-tested extension-only or external-only cases, and keep a bounded shadow stream so the classifier can be audited as the application changes.
