# How to Measure Hydration Delay When Content Appears Before the Page Becomes Interactive

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Hydration, Server-Side Rendering, Browser Monitoring, INP, User Timing, Web Performance

Description: Measure the gap between server-rendered content and usable controls with explicit hydration milestones, early interaction evidence, and field performance APIs.

---

Server-rendered HTML can paint quickly while its buttons, menus, and forms are still inert. The browser has pixels to show, but the client framework has not downloaded, evaluated, reconciled, and attached the behavior needed to respond. A good LCP can therefore coexist with a long and frustrating hydration delay.

There is no standardized browser entry named `hydration-complete`. The browser understands paints, tasks, events, resources, and developer-defined marks; only the application knows when its server-rendered controls become usable. Measuring hydration accurately means combining those two kinds of evidence instead of inventing a new meaning for LCP or INP.

## Define the Gaps Separately

"Hydration time" often conflates several intervals. Split it into stages so a change points toward a cause.

| Interval | Start | End | What it indicates |
| --- | --- | --- | --- |
| Boot delay | Navigation start or HTML paint | Client hydration code starts | Script discovery, download, scheduling, or prior main-thread work |
| Hydration work | Framework hydration starts | Required component boundary commits | Framework reconciliation and component initialization |
| Visible-to-ready gap | Relevant content paint | Its interaction boundary becomes ready | Time the UI looked usable but was not |
| Early interaction wait | User input timestamp | Next paint after the handler runs | The actual user penalty, measured by Event Timing/INP |
| Action completion | User intent | Meaningful result is visibly ready | End-to-end product responsiveness |

Do not reduce all five to one number. A 700 ms hydration-work measure may be harmless if it occurs before content is presented; a 300 ms visible-to-ready gap can be severe if users immediately click a prominent control.

The old lab concept of Time to Interactive attempted to summarize readiness heuristically. It is not a current Core Web Vital and should not be relabeled as field hydration delay. Use explicit application milestones and actual interaction evidence.

## Mark Hydration at Application-Owned Boundaries

User Timing lets an application add high-resolution marks and measures to the browser's performance timeline. Place the start mark immediately before the framework begins hydration. Place an end mark in a framework lifecycle that means the required boundary has committed and its event behavior is installed.

```js
performance.mark("hydration:start", {
  detail: { release: window.APP_RELEASE },
});

startFrameworkHydration({
  onRequiredBoundaryCommitted() {
    performance.mark("hydration:primary-ready");
    const measure = performance.measure(
      "hydration.primary",
      "hydration:start",
      "hydration:primary-ready",
    );

    report({
      metric: measure.name,
      value: measure.duration,
      route: routeTemplate(location.pathname),
      release: window.APP_RELEASE,
    });
  },
});
```

`startFrameworkHydration` and its callback are placeholders for your framework integration. Do not assume that calling a hydration function returns a promise for all descendants, or that a generic DOM mutation means handlers are ready. Verify the lifecycle guarantee in the framework version you deploy.

Large applications should mark multiple boundaries:

```text
hydration:header-ready
hydration:checkout-form-ready
hydration:recommendations-ready
```

This works particularly well with streaming HTML and selective or progressive hydration. A global "all hydrated" mark can be dominated by a below-the-fold widget that does not block the primary journey.

## Determine When the Content Became Visible

The end is application-defined; the start of the visible-to-ready gap should come from a browser paint signal where possible.

Options include:

- **LCP entry:** useful when the server-rendered primary boundary is the LCP element. LCP may produce multiple candidate entries, so retain the relevant/final value using the official `web-vitals` library.
- **Element Timing:** useful for a deliberately annotated hero or primary component in supporting browsers. It is not universally available, so feature-detect it.
- **Paint Timing:** first contentful paint is a broad lower bound, not proof the particular control appeared.
- **A framework render mark:** useful as an application boundary, but it is not itself a browser-observed paint.

Never use `DOMContentLoaded` as "content visible" or `load` as "interactive." Those events reflect document parsing and resource lifecycle, not whether a specific control has painted and gained behavior.

A field collector can retain the latest LCP candidate and compare it with the readiness mark when the LCP element belongs to the hydrated boundary:

```js
let lastLcp;

if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
  new PerformanceObserver((list) => {
    lastLcp = list.getEntries().at(-1) ?? lastLcp;
  }).observe({ type: "largest-contentful-paint", buffered: true });
}

function reportPrimaryReady() {
  const readyAt = performance.now();
  report({
    metric: "hydration.visible_to_primary_ready",
    value: lastLcp ? Math.max(0, readyAt - lastLcp.startTime) : null,
    paint_source: lastLcp ? "lcp_candidate" : "unavailable",
  });
}
```

Label this precisely as a gap from the observed LCP candidate, not as a new Web Vital. If the LCP candidate changes after readiness, the computed interval is no longer the intended visible boundary; the official Web Vitals callback and lifecycle handling can help you retain the right page-level LCP, while component-specific Element Timing or an explicit visual milestone may be a better fit.

## Capture Early User Attempts

The strongest evidence of an interactivity gap is a user trying to use the page before the relevant boundary is ready. Install a tiny, first-party capture listener early in the document, before the framework bundle executes. It should observe rather than change behavior.

```html
<script nonce="{{cspNonce}}">
  window.__earlyInputs = [];
  document.addEventListener("pointerdown", (event) => {
    window.__earlyInputs.push({
      time: event.timeStamp,
      target: event.target?.closest?.("[data-interaction-boundary]")?.dataset
        .interactionBoundary || "other",
    });
  }, { capture: true, passive: true });
</script>
```

When a boundary becomes ready, consume only allowlisted boundary names and report:

- attempts before readiness;
- time from the earliest attempt to readiness;
- whether the expected action ultimately ran;
- the Event Timing/INP attribution for slow qualifying interactions.

Do not serialize DOM text, input values, arbitrary selectors, or coordinates. Do not call `preventDefault()` merely to improve measurement; changing the interaction changes the experience being measured. If your framework deliberately queues and replays early events, instrument the queue and replay outcome directly.

An early `pointerdown` does not prove the subsequent click was lost. Treat it as an attempted interaction and correlate it with framework handling. Keyboard users also matter, so cover relevant `keydown` interactions with the same privacy controls.

## Use Event Timing and INP for the Actual Penalty

The Event Timing API exposes the delay from an input event timestamp through handler processing to the next presentation opportunity. INP uses these entries to describe page responsiveness across the page lifecycle. Hydration can hurt INP in two main ways:

1. hydration work occupies the main thread, so the event waits before processing;
2. the handler runs but expensive rendering delays the next paint.

Use `web-vitals/attribution` to split a poor INP into input delay, processing duration, and presentation delay. Correlate its timestamp with hydration marks and long tasks. Do not replace INP with `hydration:end - click:start`: the custom interval can describe app readiness, but it does not implement the standardized INP algorithm.

```js
import { onINP } from "web-vitals/attribution";

onINP(({ value, attribution }) => {
  report({
    metric: "INP",
    value,
    inputDelay: attribution.inputDelay,
    processingDuration: attribution.processingDuration,
    presentationDelay: attribution.presentationDelay,
    duringHydration: overlapsHydration(attribution),
    boundary: allowlistedBoundary(attribution.interactionTarget),
  });
});
```

Pages with no interaction provide no INP sample. Preserve that distinction; zero is not a valid stand-in.

## Diagnose the Delay with Supporting Timelines

Once a route has a large visible-to-ready gap, break it down:

- Resource Timing for the framework chunks and route data;
- Long Tasks or Long Animation Frames during the gap;
- script evaluation and rendering work in a DevTools Performance trace;
- server timing for HTML generation and API calls;
- release, device class, route, and service-worker state;
- early input attempt rate and outcome.

If hydration starts late, prioritize code discovery, bundle loading, scheduling, or third-party work. If hydration starts promptly but takes a long time, reduce client work, split boundaries, defer noncritical components, or avoid hydrating static content. If the framework is ready but INP presentation delay is high, investigate the work triggered by the interaction rather than blaming initial hydration.

## Validate the Instrumentation

Test the metric itself before relying on a dashboard:

1. Add a controlled delay before hydration starts and confirm only boot/visible-to-ready gaps grow.
2. Add synchronous work inside hydration and confirm hydration duration and long-task evidence grow.
3. Click a marked boundary before readiness and verify one privacy-safe attempt is recorded.
4. Test keyboard input, cached and uncached scripts, direct loads, bfcache restores, and hidden tabs.
5. Confirm every hydration start has at most one terminal outcome per boundary.
6. Compare marks in a DevTools trace with RUM event timestamps.

Track sample coverage by browser. Performance APIs and component attribution differ across engines, and a metric based only on supporting browsers must be labeled accordingly.

## Official Documentation

- [User Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing)
- [Performance marks](https://developer.mozilla.org/en-US/docs/Web/API/Performance/mark)
- [Event Timing API specification](https://w3c.github.io/event-timing/)
- [Interaction to Next Paint](https://web.dev/articles/inp)
- [Rendering on the web and hydration trade-offs](https://web.dev/articles/rendering-on-the-web)
- [PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)
- [Largest Contentful Paint API](https://developer.mozilla.org/en-US/docs/Web/API/LargestContentfulPaint)

## Conclusion

Hydration delay is an application lifecycle gap, not a browser-native metric. Mark when hydration starts and when each important boundary becomes usable, anchor visible time to an appropriate paint signal, and observe whether users attempt interaction before readiness. Then use Event Timing, INP attribution, resource timing, and main-thread diagnostics to explain the actual penalty. The result distinguishes fast-looking HTML from a genuinely responsive interface without pretending that one heuristic timestamp is a new Web Vital.
