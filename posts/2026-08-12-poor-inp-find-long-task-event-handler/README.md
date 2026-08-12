# INP Is Poor but LCP Is Fine: Finding the Long Task or Event Handler Behind Slow Interactions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: INP, Core Web Vitals, Browser Monitoring, JavaScript Performance, PerformanceObserver

Description: Trace poor INP from field interaction evidence to input delay, handler work, rendering delay, long tasks, and responsible scripts.

---

Largest Contentful Paint and Interaction to Next Paint measure different phases of experience. A page can render its main content quickly and still become unresponsive when a user opens a menu, types in a search box, changes a filter, or clicks checkout. LCP being healthy therefore does not contradict poor INP.

Start with the slow interaction observed in real-user data: route, release, interaction type, target, and lifecycle point. Reproduce that workflow under the same coarse device and browser conditions, then split the latency into input delay, event-handler processing, and presentation delay. Each component points to a different class of fix.

## What INP Actually Measures

INP observes qualifying click/tap and keyboard interactions throughout a page visit and reports a high-latency interaction, normally the longest while ignoring outliers on pages with many interactions. It is not the average handler time, not time to complete a network request, and not a load metric.

An interaction's visible latency has three broad parts:

~~~text
input delay
  + event callback processing
  + presentation delay until the next frame
  = interaction latency
~~~

Input delay means another main-thread task prevented the event from starting. Processing means event listeners and related synchronous work ran too long. Presentation delay includes style, layout, rendering work, and time until the next frame can be presented. The Event Timing API exposes timestamps that let you approximate those components for individual event entries.

Google's current guidance considers 200 milliseconds or less “good” and recommends evaluating the 75th percentile of page visits, segmented across mobile and desktop. Use that threshold for the user-experience metric, but investigate the entire distribution and your product's most important actions.

## Capture Actionable Field Evidence

The standard `web-vitals` build reports INP. The attribution build adds the interaction target, type, load state, and—where available—Long Animation Frame script summaries and style/layout totals.

~~~javascript
import { onINP } from 'web-vitals/attribution';

onINP((metric) => {
  const a = metric.attribution;
  sendPerformanceEvent({
    metric: 'INP',
    value_ms: Math.round(metric.value),
    rating: metric.rating,
    metric_id: metric.id,
    route: routeTemplate(metric.navigationURL ?? location.href),
    release: APP_RELEASE,
    navigation_type: metric.navigationType,
    interaction_type: a.interactionType ?? 'unknown',
    target: a.interactionTarget
      ? safeComponentName(a.interactionTarget)
      : 'unknown',
    load_state: a.loadState,
    input_delay_ms: Math.round(a.inputDelay),
    processing_ms: Math.round(a.processingDuration),
    presentation_delay_ms: Math.round(a.presentationDelay),
  });
});
~~~

Use the type definitions for the pinned `web-vitals` version; attribution fields evolve. `metric.navigationURL` avoids assigning a delayed report to whichever URL happens to be current when the callback runs. In an SPA using traditional page-lifetime INP, retain timestamped route history and correlate it with `a.interactionTime` when available if you need the exact interaction route; `web-vitals` 6 can instead opt in to per-soft-navigation reporting with `{ reportSoftNavs: true }` where the browser supports that feature. `loadState` describes only the document's loading phase, so use `metric.navigationType` and application telemetry for states such as bfcache restore, SPA navigation, or idle. Do not send arbitrary selectors, element text, IDs, or input values. Map known components to bounded names such as `checkout-submit` or `search-filter`, and use `unknown` otherwise.

INP is not reported when the user never interacts. Store missing as missing, not zero. The callback can report updates for the same metric ID, so upsert the full value by ID or send `metric.delta` to an additive analytics system. A bfcache restore creates a new metric object and ID for the restored visit; the official library handles this lifecycle when registered once.

## Inspect Individual Event Timings

For a bounded diagnostic sample, observe slow event entries directly:

~~~javascript
if (PerformanceObserver.supportedEntryTypes.includes('event')) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.interactionId === 0) continue;

      const inputDelay = entry.processingStart - entry.startTime;
      const processing = entry.processingEnd - entry.processingStart;
      const presentation = entry.startTime + entry.duration - entry.processingEnd;

      sendBoundedDiagnostic({
        event_type: entry.name,
        interaction_id: entry.interactionId,
        duration_ms: entry.duration,
        input_delay_ms: Math.max(0, inputDelay),
        processing_ms: Math.max(0, processing),
        presentation_delay_ms: Math.max(0, presentation),
      });
    }
  });

  observer.observe({
    type: 'event',
    buffered: true,
    durationThreshold: 40,
  });
}
~~~

The values above are per-entry diagnostics. Related events such as `pointerdown`, `pointerup`, and `click` can share an `interactionId`. The interaction latency is the maximum of their durations, not their sum. For an interaction-level phase split, account for all event entries presented in the same frame, as the `web-vitals` attribution build does, instead of copying the phases from only the longest entry. The API rounds `duration` to an 8-millisecond granularity, so component arithmetic is approximate. The Event Timing specification clamps `durationThreshold` to a minimum of 16 milliseconds, but a higher diagnostic threshold controls overhead and volume. The 40-millisecond threshold applies to future entries after registration; `buffered: true` can only retrieve earlier entries that met the platform's default 104-millisecond threshold, so install the observer before the diagnostic workflow.

The entry's target may be absent or removed from the DOM by the time it is processed. Instrument stable application action names at the handler boundary when possible. An `interactionId` only groups entries within its `Window`; include a page-visit identifier when sending it to telemetry rather than treating it as globally unique.

## Decide Which Phase Dominates

### Large input delay

The interaction waited for earlier main-thread work. Look immediately before the event in a Performance panel trace for:

- large script evaluation during page startup;
- hydration or framework rendering;
- JSON parsing and client-side data transforms;
- third-party tags, ads, or monitoring callbacks;
- timers and background refresh work;
- another interaction's long handler.

Fix the blocking task, not the small handler that happened to wait behind it. Split long startup work, reduce initial JavaScript, defer nonessential tasks, move suitable computation to a worker, and avoid starting background work just as controls become usable.

### Large processing duration

The interaction's callbacks are expensive. Record a trace and inspect Event Log, Bottom-Up, and Call Tree views. Look for repeated state updates, synchronous validation, large array filtering, serialization, framework rerenders, and nested third-party callbacks.

Make the immediate visual state change first, do only essential synchronous work, and schedule the remainder in later tasks. Do not simply wrap all work in a promise: promise callbacks are microtasks and a long microtask chain can still delay rendering. Yield using an appropriate supported scheduling primitive or task boundary, then verify the resulting frame in the profiler.

### Large presentation delay

The handler ended, but the next frame was expensive or delayed. Look for:

- style recalculation over a large DOM;
- layout triggered by reading geometry after writes;
- heavy paint, filters, or large shadows;
- synchronous framework commit work;
- many DOM nodes inserted at once;
- other queued tasks or microtasks before rendering.

Batch DOM reads before writes, reduce affected DOM size, virtualize large lists, avoid layout thrashing, and render a lightweight acknowledgement before expensive content.

## Correlate Long Tasks and Long Animation Frames

A task longer than 50 milliseconds is a strong candidate for input delay or processing blockage. Observe long tasks to find time windows:

~~~javascript
const longTaskWindows = [];

if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      longTaskWindows.push({
        start: entry.startTime,
        end: entry.startTime + entry.duration,
      });
    }
  }).observe({ type: 'longtask', buffered: true });
}
~~~

An overlap is correlation, not ownership. The Long Tasks API has coarse attribution. Chrome's Long Animation Frames API can expose `scripts`, invoker information, and forced style/layout duration for long frames in supporting browsers. MDN marks this functionality as limited or experimental in some environments, so guard it with `PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')` and use the field primarily for diagnosis.

The current `web-vitals` attribution build can summarize the longest script and style/layout time intersecting the INP interval when Long Animation Frame data is available. That is often a faster path from a field outlier to a script URL or entry-point function, but a DevTools trace remains the proof.

## Reproduce the Field Interaction

Use field evidence to build a narrow lab script:

1. Check the exact release and route template.
2. Match mobile/desktop, browser family, viewport, and a realistic CPU/network profile.
3. Start from the same load state: during load, after idle, after SPA navigation, or after bfcache restore.
4. Populate enough synthetic list or document data to reproduce DOM size.
5. Record a Performance trace while executing the named interaction.
6. Inspect the event's preceding task, handler stack, style/layout, paint, and next frame.
7. Apply one change and repeat the identical scenario.

Do not begin by clicking randomly in Lighthouse. INP needs real interaction, and the worst field action may happen minutes after load. Chrome DevTools' Performance panel and user-flow tooling help in the lab, while RUM identifies which flow deserves attention.

## Fix Patterns Without Breaking Behavior

For a slow filter interaction, first acknowledge input, then chunk or offload the expensive search:

~~~javascript
function yieldToNextTask() {
  if ('scheduler' in window && typeof window.scheduler.yield === 'function') {
    return window.scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function onFilterChanged(value) {
  setPendingIndicator(true); // Small synchronous visual update.
  await yieldToNextTask();

  const result = await searchWorker(value);
  renderWindowedResults(result);
  setPendingIndicator(false);
}
~~~

The helper uses `scheduler.yield()` where available and falls back to a timer task; test both branches in supported browsers. It is intentionally not `await Promise.resolve()`, which only queues a microtask and may not let the browser render. A worker helps CPU-heavy pure computation but still requires careful message serialization and efficient DOM rendering on return.

Set guardrails around fixes: click correctness, focus and accessibility behavior, error rate, memory, and total completion time. Improving first feedback while making the operation never finish is not success.

## Verify in the Field

Ship to a canary and compare the same route, action, release cohort, and device class. Check:

- p75 INP and the slow-tail fraction;
- input, processing, and presentation components;
- the targeted interaction's frequency and latency;
- long-task time near the interaction;
- LCP, CLS, errors, and action completion guardrails;
- traffic and browser mix.

A healthy aggregate can hide a still-broken checkout action, so keep action-level diagnostics bounded and stable. Remove temporary high-volume instrumentation after the cause is confirmed.

## Official Documentation

- [web.dev Interaction to Next Paint](https://web.dev/articles/inp)
- [web.dev optimizing INP](https://web.dev/articles/optimize-inp)
- [W3C Event Timing API](https://www.w3.org/TR/event-timing/)
- [MDN `PerformanceEventTiming.interactionId`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming/interactionId)
- [MDN Long Animation Frames API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing)
- [Chrome DevTools Performance panel](https://developer.chrome.com/docs/devtools/performance)
- [Google `web-vitals` attribution documentation](https://github.com/GoogleChrome/web-vitals#send-attribution-data)

## Conclusion

Good LCP only says the main content appeared quickly; it says nothing about later responsiveness. Find the field interaction responsible for INP, split its latency into input delay, processing, and presentation, and correlate that window with long tasks, Long Animation Frames, and a profiler trace. Fix the dominant phase, preserve immediate visual feedback, and verify the exact action in a canary cohort. That workflow turns a red INP score into an attributable task, handler, or render cost.
