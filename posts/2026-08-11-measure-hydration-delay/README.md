# Measure Hydration Delay Before a Page Becomes Interactive

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
| Boot delay | Navigation start or relevant HTML paint | Client hydration code starts | Network, server, HTML delivery, and parsing when navigation start is the baseline; then script discovery, download, scheduling, or prior main-thread work |
| Hydration work | Framework hydration starts | Required component boundary commits | Framework reconciliation and component initialization |
| Visible-to-ready gap | Relevant content paint | Its interaction boundary becomes ready | Time the UI looked usable but was not |
| Qualifying interaction latency | Qualifying user input timestamp | Next rendering update after event dispatch | Immediate responsiveness measured by Event Timing/INP; it does not reveal whether the input was handled or when asynchronous work completes |
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

- **LCP entry:** useful when an element in the server-rendered primary boundary becomes an LCP candidate. LCP may produce multiple candidate entries. For a boundary gap, retain a candidate from that boundary no later than readiness; for page-level LCP, use the official `web-vitals` library.
- **Element Timing:** useful for a deliberately annotated hero or primary component in supporting browsers. It is not universally available, so feature-detect it.
- **Paint Timing:** first contentful paint is a broad lower bound, not proof the particular control appeared.
- **A framework render mark:** useful as an application boundary, but it is not itself a browser-observed paint.

Never use `DOMContentLoaded` as "content visible" or `load` as "interactive." Those events reflect document parsing and resource lifecycle, not whether a specific control has painted and gained behavior.

A field collector can retain the latest candidate from the primary boundary and compare it with the readiness mark. This example assumes that the boundary or an ancestor of the LCP element has `data-interaction-boundary="primary"`:

```js
let lastPrimaryLcp;
let lcpObserver;

function retainPrimaryLcp(entries) {
  for (const entry of entries) {
    const boundary = entry.element
      ?.closest?.("[data-interaction-boundary]")
      ?.getAttribute("data-interaction-boundary");

    if (boundary === "primary") {
      lastPrimaryLcp = entry;
    }
  }
}

if (
  "PerformanceObserver" in window &&
  PerformanceObserver.supportedEntryTypes?.includes(
    "largest-contentful-paint",
  )
) {
  lcpObserver = new PerformanceObserver((list) => {
    retainPrimaryLcp(list.getEntries());
  });
  lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
}

function reportPrimaryReady() {
  const readyAt = performance.now();
  retainPrimaryLcp(lcpObserver?.takeRecords() ?? []);
  lcpObserver?.disconnect();

  report({
    metric: "hydration.visible_to_primary_ready",
    value: lastPrimaryLcp
      ? Math.max(0, readyAt - lastPrimaryLcp.startTime)
      : null,
    paint_source: lastPrimaryLcp ? "lcp_candidate" : "unavailable",
  });
}
```

Label this precisely as a boundary-specific gap from an observed LCP candidate, not as final page-level LCP or a new Web Vital. A later, unrelated candidate can become the final page-level LCP without invalidating this boundary's earlier paint. Use the official Web Vitals callback for page-level LCP; component-specific Element Timing or an explicit visual milestone may be a better fit for the boundary gap.

The raw LCP API does not emit a new entry for a back/forward cache restoration. Do not reuse the initial navigation's LCP entry as a restore measurement, and exclude or separately label samples whose relevant interval occurred while the page was hidden.

## Capture Early User Attempts

The strongest evidence of an interactivity gap is a user trying to use the page before the relevant boundary is ready. Install a tiny, first-party capture listener early in the document, before the framework bundle executes. It should observe rather than change behavior.

```html
<script nonce="{{cspNonce}}">
  (() => {
    const inputLimit = 50;
    const trackedBoundaries = new Set([
      "primary",
      "header",
      "checkout-form",
      "recommendations",
    ]);

    window.__earlyInputs = [];
    window.__interactionBoundaryReadyAt = new Map();

    function recordEarlyInput(event) {
      if (!event.isTrusted || window.__earlyInputs.length >= inputLimit) {
        return;
      }

      if (
        event.type === "pointerdown" &&
        (!event.isPrimary || event.button !== 0)
      ) {
        return;
      }

      if (
        event.type === "keydown" &&
        (event.repeat || (event.key !== "Enter" && event.key !== " "))
      ) {
        return;
      }

      const boundary = event.target instanceof Element
        ? event.target
            .closest("[data-interaction-boundary]")
            ?.getAttribute("data-interaction-boundary")
        : null;

      if (!boundary || !trackedBoundaries.has(boundary)) {
        return;
      }

      const readyAt = window.__interactionBoundaryReadyAt.get(boundary);
      if (readyAt === undefined || event.timeStamp < readyAt) {
        window.__earlyInputs.push({
          type: event.type,
          time: event.timeStamp,
          target: boundary,
        });
      }
    }

    document.addEventListener("pointerdown", recordEarlyInput, {
      capture: true,
      passive: true,
    });
    document.addEventListener("keydown", recordEarlyInput, {
      capture: true,
      passive: true,
    });

    window.__markInteractionBoundaryReady = (boundary) => {
      if (
        trackedBoundaries.has(boundary) &&
        !window.__interactionBoundaryReadyAt.has(boundary)
      ) {
        window.__interactionBoundaryReadyAt.set(boundary, performance.now());
      }
    };

    window.__stopEarlyInputCapture = () => {
      document.removeEventListener("pointerdown", recordEarlyInput, true);
      document.removeEventListener("keydown", recordEarlyInput, true);
    };
  })();
</script>
```

Replace the example boundary names with a fixed application allowlist. When a boundary becomes ready, call `__markInteractionBoundaryReady()` from the same lifecycle callback. An input can wait behind a long hydration task and dispatch after the readiness callback, so classify it with `event.timeStamp`, not the time the capture listener runs. After queued early inputs have been correlated, call `__stopEarlyInputCapture()` and clear the buffer.

Report:

- attempts before readiness;
- time from the earliest attempt to readiness;
- whether the expected action ultimately ran;
- the Event Timing/INP attribution for slow qualifying interactions.

Do not serialize DOM text, input values, arbitrary selectors, or coordinates. Do not call `preventDefault()` merely to improve measurement; changing the interaction changes the experience being measured. If your framework deliberately queues and replays early events, instrument the queue and replay outcome directly.

An early `pointerdown` does not prove an activation attempt or that a subsequent click was lost; it can begin a scroll or be canceled. Treat it as evidence of a possible attempt and correlate it with a subsequent `click`, cancellation or scroll outcome, and framework handling. Keyboard users also matter, so adapt the relevant `keydown` keys to each widget's semantics while keeping the same privacy controls.

## Use Event Timing and INP for Immediate Interaction Latency

The Event Timing API exposes the delay from a qualifying input event timestamp through event dispatch to the next rendering update. INP uses these entries to describe page responsiveness across the page lifecycle. Hydration can hurt INP in three main ways:

1. hydration work occupies the main thread, so the event waits before processing;
2. framework event handling or hydration-on-interaction work increases processing duration;
3. the handler runs but expensive rendering delays the next paint.

Event Timing and INP can time an early qualifying interaction even when no listener handles it, but they do not reveal whether the application handled the intent or when eventual asynchronous work completed. Keep those as separate application metrics using the attempt and outcome correlation described above.

Use `web-vitals/attribution` to split a poor INP into input delay, processing duration, and presentation delay. Correlate its timestamp with hydration marks and long tasks. Do not replace INP with `hydration:end - click:start`: the custom interval can describe app readiness, but it does not implement the standardized INP algorithm.

```js
import { onINP } from "web-vitals/attribution";

const inpBoundaries = new Set([
  "primary",
  "header",
  "checkout-form",
  "recommendations",
]);

function inpBoundary(node) {
  const boundary = node instanceof Element
    ? node
        .closest("[data-interaction-boundary]")
        ?.getAttribute("data-interaction-boundary")
    : null;

  return boundary && inpBoundaries.has(boundary) ? boundary : "other";
}

onINP(
  ({ value, delta, id, navigationType, attribution }) => {
    const reportedBoundary = attribution.interactionTarget;

    report({
      metric: "INP",
      id,
      delta,
      value,
      navigationType,
      inputDelay: attribution.inputDelay,
      processingDuration: attribution.processingDuration,
      presentationDelay: attribution.presentationDelay,
      duringHydration: overlapsHydration(attribution),
      boundary:
        reportedBoundary && inpBoundaries.has(reportedBoundary)
          ? reportedBoundary
          : "other",
    });
  },
  { generateTarget: inpBoundary },
);
```

The `generateTarget` option maps an available target node to an allowlisted name. Recheck `interactionTarget` before reporting it because `web-vitals` can fall back to the browser's `targetSelector` when the node is unavailable. `overlapsHydration` is an application helper and must handle missing attribution timestamps. The callback can run more than once for one metric instance and creates a new `id` after a back/forward cache restore. Upsert the absolute `value` by `id`, or sum `delta` values for that `id`, instead of treating every callback as an independent page sample.

Pages with no qualifying interaction provide no INP sample. Preserve that distinction; zero is not a valid stand-in.

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

1. Add a controlled asynchronous delay before hydration starts and confirm the boot/visible-to-ready gaps grow while hydration-work duration does not.
2. Add more than 50 ms of synchronous work in one hydration task and confirm hydration duration and long-task evidence grow.
3. Click a marked boundary before readiness and verify one privacy-safe attempt is recorded.
4. Test keyboard input, cached and uncached scripts, direct loads, bfcache restores, and hidden tabs. Verify that initial-load LCP data is not reused for a restored visit and that hidden intervals are excluded or labeled.
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

Hydration delay is an application lifecycle gap, not a browser-native metric. Mark when hydration starts and when each important boundary becomes usable, anchor visible time to an appropriate paint signal, and observe whether users attempt interaction before readiness. Then use Event Timing, INP attribution, resource timing, and main-thread diagnostics to explain immediate responsiveness costs, and use application outcome metrics for lost or asynchronous actions. The result distinguishes fast-looking HTML from a genuinely responsive interface without pretending that one heuristic timestamp is a new Web Vital.
