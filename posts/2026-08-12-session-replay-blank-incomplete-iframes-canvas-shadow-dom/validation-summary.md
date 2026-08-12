# Validation Summary: Why Is Session Replay Blank or Incomplete? Iframes, Canvas, Shadow DOM, and Browser Compatibility

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Session replay and browser monitoring
- rrweb recording and replay
- Datadog Browser Session Replay
- JavaScript
- HTML iframes and the same-origin policy
- Canvas, WebGL, OffscreenCanvas, and CORS
- Shadow DOM and constructable stylesheets
- Content Security Policy and browser page-lifecycle APIs

## Sources Consulted

- [rrweb guide and recording/replay option reference](https://github.com/rrweb-io/rrweb/blob/main/guide.md)
- [rrweb canvas recording and replay recipe](https://github.com/rrweb-io/rrweb/blob/main/docs/recipes/canvas.md)
- [rrweb cross-origin iframe recipe and security considerations](https://github.com/rrweb-io/rrweb/blob/main/docs/recipes/cross-origin-iframes.md)
- [Datadog Session Replay troubleshooting](https://docs.datadoghq.com/session_replay/troubleshooting/)
- [Datadog open Shadow DOM support](https://docs.datadoghq.com/real_user_monitoring/guide/shadow-dom/)
- [MDN same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)
- [MDN `<iframe>` reference and sandbox behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)
- [MDN cross-origin images and tainted canvases](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [MDN `Element.shadowRoot`](https://developer.mozilla.org/en-US/docs/Web/API/Element/shadowRoot)
- [MDN `Element.attachShadow()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow)
- [MDN Shadow DOM guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)
- [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [MDN `visibilitychange` event](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)
- [MDN `unload` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/unload_event)
- [MDN `navigator.sendBeacon()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
- [MDN CSP `connect-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)

## Issues Found

1. The canvas diagnostic covered recording but omitted rrweb's separate replay-side gate. Added playback to the symptom table and documented that `UNSAFE_replayCanvas: true` is required to replay canvas-mutation events and relaxes rrweb's replay-iframe script sandbox.
2. The cross-origin iframe discussion stated unconditionally that the frame owner must cooperate. rrweb also documents browser-extension, Puppeteer, and Electron injection, so the statement now applies specifically to normal in-page deployments. The text also now makes clear that child recorders require separate privacy configuration and that participating child frames must restrict untrusted embedders.
3. The sandbox explanation could be read as saying that `allow-same-origin` makes a cross-origin frame same-origin with its parent. Clarified that it preserves the framed document's normal origin; it does not change a genuinely cross-origin URL into the parent's origin.
4. The Shadow DOM timing explanation implied that late initialization inherently prevents capture of pre-existing open roots. Open roots remain accessible through `element.shadowRoot`; interception timing is critical for recorders attempting to retain closed roots, while support for pre-existing and dynamically created open roots is SDK-specific. Updated the explanation accordingly and noted that code retaining the `ShadowRoot` returned by `attachShadow()` can access a closed root.
5. The canvas CORS remediation mentioned only configuring the source resource. Keeping a canvas origin-clean also requires loading the resource in CORS mode, so the guidance now states both the client request-mode and server `Access-Control-Allow-Origin` requirements. It also clarifies that recorder options cannot bypass the browser's origin-clean readback check.
6. The recorder-startup explanation could imply that late initialization cannot capture the current DOM. Clarified that a late recorder can take a snapshot of current state but cannot recover earlier mutations or interactions.

## Review Notes

- The JavaScript health-counter example is syntactically valid and uses only standard JavaScript constructs.
- rrweb's current guide still defines `recordAfter` values `DOMContentLoaded` and `load`, and lists both `recordCanvas` and `recordCrossOriginIframes` as disabled by default.
- Datadog's current documentation still states that automatic open Shadow DOM support begins with Browser SDK 4.31.0 and lists closed Shadow DOM, dynamic Shadow DOM, and dynamic CSS-style changes as unsupported.
- Datadog documents separately instrumented iframe content as separate pages in the same session; directly embedding an iframe replay into its parent replay is unsupported.
- The post's Datadog troubleshooting URL redirects to the current canonical troubleshooting page and remains functional.
- All external documentation links in the post resolved successfully to the intended official pages during review.
