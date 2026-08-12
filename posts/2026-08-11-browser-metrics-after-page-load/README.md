# Browser Metrics After Page Load: LCP, INP, CLS, and Long Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Browser Monitoring, Web Vitals, INP, CLS, Long Tasks, Performance API, Real User Monitoring

Description: Build browser monitoring around the whole page lifecycle by separating load milestones, interaction latency, visual instability, main-thread work, and business-action timings.

---

The `load` event is not the end of a web application's performance story. It is only a lifecycle milestone for the initial document and its dependent resources. Users may spend minutes in the same document opening menus, filtering tables, navigating an SPA, loading third-party widgets, and submitting forms. Monitoring only page-load duration misses most of that experience.

A useful browser dashboard separates five questions:

1. How quickly did the main content initially appear?
2. How responsive were real user interactions over the page's lifetime?
3. Did visible content move unexpectedly at any time?
4. What main-thread work could explain blocked interaction or rendering?
5. How long did product-specific actions take from intent to visible completion?

LCP, INP, CLS, Long Tasks, and custom action timings answer those questions at different layers. They should be correlated, not merged into one generic "page speed" number.

## Metric Roles at a Glance

| Signal | What it answers | Scope | Main limitation |
| --- | --- | --- | --- |
| Largest Contentful Paint (LCP) | When did the largest qualifying initial viewport content render? | Initial navigation by default; supported soft navigations when enabled | Not a general metric for every later application update |
| Interaction to Next Paint (INP) | How slow was the page's interaction responsiveness? | Page lifetime, based on observed interactions | Requires real interactions; final value is known when the lifecycle ends |
| Cumulative Layout Shift (CLS) | How much unexpected visual instability occurred? | Page lifetime, using session windows | Needs attribution to identify the moving elements and cause |
| Long Task | When was the main thread occupied for at least 50 ms? | Whenever the observer is active | A diagnostic primitive, not proof a user interaction was delayed |
| Custom action | How long did a named product journey take? | Boundaries you define | Easy to define inconsistently or stop before visible completion |

The current Core Web Vitals are LCP, INP, and CLS. Their recommended "good" thresholds are LCP at or below 2.5 seconds, INP at or below 200 milliseconds, and CLS at or below 0.1, evaluated at the 75th percentile of page loads separately for mobile and desktop. Those thresholds do not turn Long Tasks or business timings into lesser data. Core Web Vitals are a common user-experience baseline; custom telemetry explains your application.

## LCP Is a Load Metric, Even If It Finalizes Later

LCP reports the render time of the largest qualifying image, text block, or video content visible in the viewport. The candidate may change as larger content renders. The browser stops considering new LCP candidates around the first user interaction, and field libraries also handle lifecycle events such as the page becoming hidden.

This has two operational consequences:

- Do not treat an early observer callback as the final LCP value. Use the official `web-vitals` library or correctly retain the last relevant entry.
- Do not reset ordinary LCP after `window.load` and call later widget paints "LCP." The standardized metric is tied to navigation measurement.

For an SPA route transition, measure an application route-render action today and use the incubating Soft Navigations API only where supported. As of August 2026, Chrome is rolling the Soft Navigations API out from Chrome 151, while older Chrome versions and other browsers may not provide it. Feature-detect it and keep your portable custom route metric.

LCP attribution is often more useful than LCP alone. Capture a privacy-safe description of the LCP element and break the time into time to first byte (TTFB), resource load delay, resource load duration, and element render delay. If the LCP value is slow because JavaScript holds the main thread after the image is available, optimizing the CDN will not fix the dominant component.

## INP Covers What Happens After Load

INP is the Core Web Vital most directly aimed at long-lived pages. It observes click, tap, and keyboard interactions and considers the latency from input through event processing until the browser can present the next frame. In simplified terms, that duration contains:

- **input delay:** time waiting before event handlers start;
- **processing duration:** time spent running the handlers;
- **presentation delay:** time after handlers finish until the next frame is rendered.

The Event Timing API exposes `PerformanceEventTiming` entries that underpin INP. The browser groups related events into interactions using `interactionId`. The `web-vitals` library implements the metric's selection and lifecycle details, including the rule that INP is not always the single absolute maximum on high-interaction pages.

```js
import { onINP } from "web-vitals/attribution";

onINP(({ value, rating, attribution, id }) => {
  sendRum({
    metric: "INP",
    value,
    rating,
    id,
    eventType: attribution.interactionType,
    inputDelay: attribution.inputDelay,
    processingDuration: attribution.processingDuration,
    presentationDelay: attribution.presentationDelay,
    // Normalize or allowlist target data before export.
    target: sanitizeTarget(attribution.interactionTarget),
  });
});
```

Avoid attaching raw DOM text, selectors containing user data, or the complete URL. Also record pages with no qualifying interaction separately; they do not provide an INP sample and should not be silently represented as zero.

## CLS Can Get Worse Long After Initial Render

CLS measures unexpected movement of visible content. Images without dimensions can shift the initial page, but late application behavior is just as important: a banner inserted above content, a validation message, an expanding ad, a web font swap, or a lazy widget can move what the user is reading.

CLS is calculated with layout-shift session windows rather than by adding every shift across an indefinitely open tab into an unbounded number. Shifts following recent user input are excluded from the unexpected-shift calculation, subject to the metric's rules. This is why manually summing every `LayoutShift.value` is not an equivalent implementation.

Use `onCLS` from `web-vitals` for the standardized value and attribution tooling to identify the affected nodes. Record a stable component name or allowlisted selector rather than serialized DOM.

```js
import { onCLS } from "web-vitals/attribution";

onCLS(({ value, rating, attribution, id }) => {
  sendRum({
    metric: "CLS",
    value,
    rating,
    id,
    largestShift: attribution.largestShiftValue,
    source: sanitizeTarget(attribution.largestShiftTarget),
    time: attribution.largestShiftTime,
  });
});
```

A low initial-load CLS audit does not prove the page stays stable. Synthetic journeys should exercise late UI states, and RUM must remain active for the document lifecycle.

## Long Tasks Are Clues, Not User Outcomes

The Long Tasks API reports main-thread tasks whose duration is 50 milliseconds or longer. Long tasks can delay input processing and rendering, so their count, total blocking portion, and proximity to a slow interaction are valuable diagnostic signals.

They are not interchangeable with INP:

- a long task can occur while nobody is interacting;
- an interaction can have presentation delay involving rendering work that a simple task count does not explain;
- attribution is intentionally limited, especially across origins;
- browser support is not uniform.

Feature-detect observer entry types and cap what you retain. The long-task entry buffer is finite, and an observer callback can report dropped entries.

```js
if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
  const observer = new PerformanceObserver((list, _observer, options) => {
    for (const entry of list.getEntries()) {
      aggregateLongTask({
        start: entry.startTime,
        duration: entry.duration,
        blockingTime: Math.max(0, entry.duration - 50),
        attribution: entry.name,
      });
    }

    if (options?.droppedEntriesCount) {
      increment("performance_entries_dropped", options.droppedEntriesCount);
    }
  });

  observer.observe({ type: "longtask", buffered: true });
}
```

Long Animation Frames (LoAF) can offer richer rendering and script attribution in supporting browsers. Treat it as progressively enhanced diagnostic data, not a required cross-browser input to your primary service-level objective.

## Custom Actions Connect Performance to the Product

Core Web Vitals cannot know when a search result is useful, a cart has updated, or a report has rendered. Define custom timings for the journeys users care about.

A strong custom action has:

- a clear start based on user intent or a programmatic trigger;
- a success end at visible, usable completion-not merely when a fetch promise resolves;
- separate failure, cancellation, and timeout outcomes;
- a stable low-cardinality action name;
- route, release, and coarse environment context;
- optional trace correlation without exposing identity.

The User Timing API adds marks and measures to the same performance timeline:

```js
async function updateSearchResults(query) {
  const actionId = crypto.randomUUID();
  const start = `search:start:${actionId}`;
  const end = `search:rendered:${actionId}`;

  performance.mark(start);
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    renderResults(await response.json());

    // Wait until the browser has had an opportunity to render the update.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    performance.mark(end);
    const measure = performance.measure("action.search", start, end);
    sendRum({ metric: measure.name, value: measure.duration, outcome: "success" });
  } catch (error) {
    sendRum({ metric: "action.search", outcome: classify(error) });
    throw error;
  } finally {
    performance.clearMeasures("action.search");
    performance.clearMarks(start);
    performance.clearMarks(end);
  }
}
```

The double animation-frame boundary is a practical approximation for "render opportunity," not a standardized proof that pixels reached the display. For interaction responsiveness, keep Event Timing/INP as the authoritative platform signal. For framework-specific completion, place the end mark in the framework's committed-render lifecycle and document that definition.

## Build a Lifecycle Dashboard

Do not put all five signals on a single axis. A useful route dashboard includes:

1. LCP, INP, and CLS p50/p75/p95 plus good/needs-improvement/poor fractions.
2. Eligible sample count and no-interaction page-view count.
3. Long-task or LoAF rate and blocking time per active minute.
4. Top custom actions by volume, p75, failure rate, and timeout rate.
5. Release markers and segment share for device, browser, and route.
6. Exemplars or privacy-safe correlations from slow actions to errors, requests, and traces.

Keep navigation metrics and action metrics separate. A fast LCP with slow search is a clear diagnosis, while one combined "frontend duration" would obscure it.

## Official Documentation

- [Web Vitals](https://web.dev/articles/vitals)
- [Interaction to Next Paint](https://web.dev/articles/inp)
- [Optimize Cumulative Layout Shift](https://web.dev/articles/optimize-cls)
- [Performance data entry types and buffers](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Performance_data)
- [Event Timing API specification](https://w3c.github.io/event-timing/)
- [Long Tasks API specification](https://w3c.github.io/longtasks/)
- [User Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing)

## Conclusion

After page load, monitor user outcomes and their causes at different layers. LCP describes initial content, INP describes real interaction responsiveness, CLS continues to catch instability, Long Tasks expose main-thread pressure, and custom actions measure the work unique to your product. Keep their definitions and lifecycles explicit, feature-detect emerging diagnostics, and correlate them around the route, release, and user action instead of compressing them into one misleading speed score.
