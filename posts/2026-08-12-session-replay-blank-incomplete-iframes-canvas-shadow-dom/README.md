# Why Is Session Replay Blank or Incomplete? Iframes, Canvas, Shadow DOM, and Browser Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Session Replay, Browser Monitoring, Iframes, Canvas, Shadow DOM

Description: Diagnose missing replay content by separating recorder startup, upload, privacy, DOM boundaries, dynamic graphics, assets, and browser support.

---

A session replay is usually a reconstruction of serialized DOM snapshots and mutations, not a video of the user's pixels. That distinction explains why the timeline can exist while a payment iframe is empty, a canvas chart is frozen, a closed shadow-root component is missing, or an old stylesheet no longer renders correctly.

Diagnose the pipeline in order: selection and consent, recorder startup, event generation, upload and ingestion, then playback fidelity. Only after proving those stages should you attribute the gap to iframe, canvas, Shadow DOM, or browser compatibility. A privacy rule that intentionally blocks a panel can look identical to a recorder limitation unless configuration is part of the evidence.

## Classify the Failure Before Changing Settings

Use the smallest matching category:

| Symptom | First checks |
| --- | --- |
| no replay ID or session record | sampling, consent, SDK initialization |
| session exists with zero segments | recorder start/stop, upload endpoint, CSP, ad blocker |
| first screen exists; later activity stops | uncaught recorder error, page lifecycle, quota, network loss |
| gray placeholders | privacy blocking or masked media |
| empty iframe rectangle | origin boundary, frame instrumentation, sandbox |
| blank or static canvas | canvas capture or playback disabled/unsupported, tainted canvas |
| custom element shell only | closed/dynamic shadow root or SDK version |
| layout present but fonts/images absent | expired assets, authentication, CORS, replay sandbox |
| only one browser family affected | API and SDK compatibility, build target, extension blocking |

Preserve the SDK version, privacy-rule version, sampling mode, browser family/major version, page route, and recorder health counters with the session. Do not attach full URLs or user-entered values just to debug replay.

## Prove the Recorder Started

There are often three separate states: selected for replay, recorder initialized, and at least one segment accepted by the backend. Instrument each with a bounded diagnostic event:

~~~javascript
const replayHealth = {
  eligible: false,
  initialized: false,
  emittedSegments: 0,
  attemptedBytes: 0,
  acceptedSegments: 0,
  stopReason: 'not_started',
};

function noteReplaySegment(byteLength) {
  replayHealth.emittedSegments += 1;
  replayHealth.attemptedBytes += byteLength;
}
~~~

Do not assume selection means recording. A manually started recorder may never receive its start call; a consent promise may reject; an SPA route exclusion may stop capture; or the replay sampling rate may be a percentage of a broader RUM sample. Use the vendor's documented diagnostic logger in a synthetic environment, not verbose production logging that could expose replay data.

Initialize early enough to capture the state you need, but only after required privacy and consent gates. rrweb's current guide documents `recordAfter` choices for `DOMContentLoaded` and `load`; a late dynamic import can snapshot the current DOM state but cannot recover mutations or interactions that occurred before recording started.

## Verify Upload and Ingestion

In browser developer tools, filter network requests to the configured replay intake and check:

- the actual destination and HTTPS status;
- response status and CORS headers;
- Content Security Policy `connect-src` violations;
- request cancellation during navigation or tab close;
- rate-limit and payload-size responses;
- ad/privacy extension blocking;
- service worker or proxy interference.

Compare `emittedSegments`, attempted requests, successful responses, and backend-accepted segments. A player problem cannot explain zero accepted data. Conversely, accepted segments with sequence gaps point to batching, retry, or lifecycle loss.

Avoid `unload`-dependent delivery. Use the SDK's supported batching and page-lifecycle implementation. The Page Visibility API is generally a better signal for flushing small telemetry than relying on unload, but do not replace a vendor transport with an untested `sendBeacon` wrapper.

## Iframes Are Separate Documents

An iframe owns another browsing context and document. A same-origin parent may be able to access a same-origin frame's DOM, but cross-origin access is restricted by the same-origin policy. A sandboxed iframe is forced into an opaque origin unless its sandbox includes `allow-same-origin`; that token preserves the embedded document's normal origin rather than making a cross-origin URL same-origin with its parent.

Therefore, a parent recorder cannot simply traverse an arbitrary payment, identity, or advertising iframe. The safe options are:

1. Leave the frame blocked and record only its dimensions plus application-level milestones.
2. If you own the frame, install a compatible recorder inside it and use the replay product's supported parent-child coordination.
3. Emit sanitized business events such as `payment_widget_opened` and `payment_confirmed`, without field values.

rrweb documents `recordCrossOriginIframes`, but explicitly requires rrweb to be injected in each child iframe. That option coordinates participating recorders; it does not bypass the same-origin policy. In a normal in-page deployment, the frame owner must cooperate. Configure privacy rules separately inside each child recorder and restrict which sites may embed it; rrweb warns that an untrusted parent can receive the child's events.

For same-origin frames, check that `srcdoc`, `about:blank`, sandbox flags, delayed navigation, and frame replacement do not change the effective origin or destroy the instrumented document. Datadog's troubleshooting documentation notes that embedding iframe replays directly into parent windows is not supported by its replay model; follow the behavior of the chosen product rather than assuming all recorders recurse identically.

## Canvas Has Pixels, Not Replayable DOM Children

The DOM records a `<canvas>` element's size and attributes, not the drawing commands or final pixel bitmap. rrweb therefore disables canvas recording by default and exposes `recordCanvas` as an explicit option. Its replayer also ignores canvas-mutation events unless `UNSAFE_replayCanvas: true` is enabled; rrweb warns that this adds `allow-scripts` to the replay iframe and opts out of its sandbox script-execution protection. Replay vendors may capture 2D/WebGL commands, take snapshots, or provide a separate integration, each with compatibility, privacy, CPU, and payload tradeoffs.

Before enabling canvas capture globally:

- identify which routes and canvas elements need it;
- determine whether the canvas contains signatures, documents, maps, faces, or account data;
- measure main-thread and network overhead;
- set event or frame-rate limits where supported;
- test 2D, WebGL, OffscreenCanvas, and worker rendering separately;
- keep a kill switch.

A canvas that draws an image or video from another origin without appropriate CORS permission becomes tainted. MDN documents that readback methods such as `getImageData()`, `toBlob()`, and `toDataURL()` then throw a `SecurityError`. No recorder option can make pixel readback bypass that browser security check. If you own the resource, load it in CORS mode and return an appropriate `Access-Control-Allow-Origin` response; otherwise, leave the canvas blocked and add sanitized semantic events.

## Shadow DOM Depends on Mode and Timing

Open shadow roots are reachable through `element.shadowRoot`; for closed roots, that property returns `null`, although code that retained the `ShadowRoot` returned by `attachShadow()` can still access it. A recorder that relies on intercepting `attachShadow()` to observe closed roots must initialize before those roots are created. Support for pre-existing or dynamically created open roots is SDK-specific.

Check:

- whether the root was created with `mode: 'open'` or `mode: 'closed'`;
- whether it existed before recorder initialization;
- whether the SDK version supports open and dynamically created roots;
- whether adopted stylesheets and dynamic CSS are reconstructed;
- whether privacy selectors cross the shadow boundary as expected.

Datadog documents automatic support for open Shadow DOM from Browser SDK 4.31.0, while explicitly listing closed Shadow DOM, dynamic Shadow DOM, and dynamic CSS-style changes as unsupported in that guide. This is a product/version statement, not a universal web-platform guarantee. Build a compatibility fixture using the exact SDK you deploy.

Do not change a security-sensitive component from closed to open solely for replay. Prefer explicit, sanitized custom events that describe state transitions.

## Assets Can Disappear After Recording

Because playback reconstructs HTML in a sandbox later, it may request fonts, images, and stylesheets after the production release has changed. Datadog's troubleshooting guide documents failures when resources no longer exist, require authentication, or are blocked by CORS. Preserve content-hashed public assets for the replay retention window, and allow the replay origin only where that access is appropriate.

Do not make private authenticated images public to improve playback. Block the element or use a safe placeholder. Similarly, a strict CSP is a security control; update it only with the minimum documented replay endpoints after review, rather than adding broad wildcards.

If styles are wrong, check cross-origin stylesheet access, `@font-face` CORS, CSS custom properties, constructable stylesheets, and whether the player recorded or can retrieve the exact release asset. Store the application release with the replay so asset-retention gaps are visible.

## Test Browser Compatibility with a Fixture Page

Create a non-production fixture containing:

- initial and delayed DOM mutations;
- an input and explicitly masked subtree;
- same-origin and cooperating cross-origin frames;
- 2D and WebGL canvases with non-sensitive shapes;
- open, closed, and dynamically created shadow roots;
- adopted stylesheets, web fonts, responsive images, and SPA navigation;
- background/foreground transitions and bfcache navigation.

Run it across the browsers and versions in your support matrix. For each feature, record whether capture is supported, intentionally blocked, degraded, or unsupported. Feature-detect required APIs before initialization and keep error monitoring functional if replay cannot start.

Do not label every unsupported browser as a “replay failure.” Track `replay_capability` separately from `replay_delivery_status`. That distinction prevents a browser-mix shift from looking like an ingestion outage.

## Official Documentation

- [rrweb recording options for canvas and cross-origin iframes](https://github.com/rrweb-io/rrweb/blob/main/guide.md)
- [rrweb canvas recording recipe](https://github.com/rrweb-io/rrweb/blob/main/docs/recipes/canvas.md)
- [Datadog Session Replay troubleshooting](https://docs.datadoghq.com/session_replay/browser/troubleshooting/)
- [Datadog Shadow DOM replay support](https://docs.datadoghq.com/real_user_monitoring/guide/shadow-dom/)
- [MDN same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)
- [MDN `<iframe>` element and sandbox behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)
- [MDN using cross-origin images in canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [MDN Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)

## Conclusion

Blank replay is a symptom, not a root cause. First prove that the session was eligible, the recorder initialized, segments were emitted, and the backend accepted them. Then inspect intentional privacy blocking and web-platform boundaries: iframes require cooperation, canvas needs explicit and potentially expensive capture, closed shadow roots are not generally observable, and playback assets must remain accessible. A versioned fixture page and per-stage health counters turn replay completeness from guesswork into a supported compatibility contract.
