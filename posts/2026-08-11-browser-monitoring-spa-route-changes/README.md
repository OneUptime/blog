# Why Does Browser Monitoring Miss SPA Route Changes? Instrumenting Virtual Navigations and Route Timings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Browser Monitoring, Single Page Applications, Soft Navigations, Performance API, OpenTelemetry, Real User Monitoring

Description: Capture SPA route transitions with portable router timings today while progressively adopting Chrome's Soft Navigations performance entries.

---

Browser monitoring often records the first page of a single-page application perfectly and then appears blind while the user visits five more screens. The reason is architectural: an SPA route transition usually changes history and replaces content inside the existing `Document`. It does not create a new top-level navigation, so the browser does not emit another ordinary `PerformanceNavigationTiming` entry or repeat the initial document lifecycle.

The URL changed, but the page did not navigate in the traditional web-platform sense.

Fixing this requires two layers:

1. Instrument route intent, completion, outcome, and context in the application or router for broad browser coverage.
2. Progressively consume Chrome's Soft Navigations API where it is available, without assuming every browser, RUM SDK, or public field dataset supports it yet.

## What a Route Change Does—and Does Not—Emit

A hard navigation creates a new document and naturally supplies Navigation Timing, paint timing, resource timing, and page lifecycle boundaries. A typical SPA transition instead does something like:

```js
history.pushState({}, "", "/orders/42");
root.replaceChildren(renderOrder(order));
```

`pushState()` itself does not fire `popstate`, and it does not create a new document navigation entry. Back and forward traversal can fire `popstate`, but observing only that event misses programmatic pushes and replaces. Monkey-patching `history.pushState()` detects URL mutations, but a URL mutation alone does not tell you when the user initiated the transition, whether data loading succeeded, or when meaningful content became visible.

This is why SDK auto-instrumentation commonly fails in one of four ways:

- it only instruments document loads;
- it initializes after the first route transition or after a framework captured references;
- it observes URL changes but not route completion;
- it double-counts a router hook, history mutation, and `popstate` as separate routes.

Treat the framework router as the portable source of application intent. It knows which transition was started and when its loaders and render lifecycle complete.

## Define a Route Timing Contract

Before writing code, define what the metric means. "Route duration" is otherwise ambiguous.

| Boundary | Recommended definition |
| --- | --- |
| Start | Captured in-page input timestamp for a user-initiated route when available; immediately before programmatic navigation, or the earliest router/navigation callback otherwise |
| URL committed | History/current entry reflects the destination |
| Data ready | Required loaders have succeeded or a terminal error state is known |
| Render committed | Framework has committed the destination view |
| Visually ready | Browser has had an opportunity to render the meaningful destination state |
| End outcome | `success`, `error`, `cancelled`, or `superseded` |

Do not end the metric merely when `fetch()` resolves. Parsing, state updates, component rendering, style, layout, and painting can still follow. Also do not wait for every background request; define the minimal content that makes the route usable.

For a route with streaming or progressive content, record milestones such as `shell`, `primary_content`, and `complete` rather than forcing one boundary to represent all three.

## Instrument the Router Once

The exact hook names differ by framework, but the lifecycle should look like this:

```js
const transitions = new Map();

export function routeStarted({ id, from, to, trigger, eventTimestamp }) {
  const startTime = eventTimestamp ?? performance.now();
  const fromTemplate = routeTemplate(from);
  const toTemplate = routeTemplate(to);

  performance.mark(`route:${id}:start`, {
    startTime,
    detail: { from: fromTemplate, to: toTemplate, trigger },
  });

  transitions.set(id, {
    id,
    from: fromTemplate,
    to: toTemplate,
    trigger,
    startTime,
    release: APP_RELEASE,
  });
}

export async function routeCommitted({ id }) {
  const transition = transitions.get(id);
  if (!transition) return;

  // Framework commit hooks should call this after destination DOM is committed.
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );

  // A failure or newer transition may have invalidated this completion.
  if (transitions.get(id) !== transition) return;

  performance.mark(`route:${id}:ready`);
  const measure = performance.measure(
    "spa.route",
    `route:${id}:start`,
    `route:${id}:ready`,
  );

  sendRum({
    name: measure.name,
    duration: measure.duration,
    outcome: "success",
    ...transition,
  });
  cleanup(id);
}

export function routeFailed({ id, outcome, error }) {
  const transition = transitions.get(id);
  if (!transition) return;
  sendRum({
    name: "spa.route",
    duration: performance.now() - transition.startTime,
    outcome, // error, cancelled, or superseded
    error_type: safeErrorType(error),
    ...transition,
  });
  cleanup(id);
}
```

`cleanup(id)` should delete the transition and clear its per-transition marks. If the application does not need completed `spa.route` measures in the Performance Timeline, clear those after export too so a long-lived session does not accumulate them.

Two animation frames are a pragmatic render opportunity, not proof that the monitor observed pixels on the physical display. If the framework provides a post-commit callback or a stable "primary content ready" signal, use it. Document the boundary so teams compare the same metric.

Every transition needs an ID. If route B supersedes route A, finish A as `superseded`; do not let A's eventual request completion end B's metric. If redirects occur, either keep them as one logical route with redirect attributes or finish each transition consistently.

## Preserve User Intent Timing

Starting when a router callback finally runs omits any input delay before it. When an eligible same-origin link click triggers client routing, retain the event's high-resolution timestamp and cancel the browser's default navigation:

```js
link.addEventListener("click", (event) => {
  if (!shouldHandleAsSpaNavigation(event, link)) return;
  event.preventDefault();

  navigateTo(link.href, {
    trigger: "link",
    eventTimestamp: event.timeStamp,
  });
});
```

`shouldHandleAsSpaNavigation()` should reject modified or non-primary clicks, downloads, cross-origin URLs, and links targeting another browsing context.

The Event Timing API underpins INP, the Core Web Vital for interaction-to-next-paint responsiveness. A route duration can extend beyond the interaction's next paint and represent application readiness. Correlate the two rather than renaming route duration as INP.

The newer Navigation API centralizes many same-document navigation events and is useful for SPA routing, but it is newly available and older browsers remain in production. Feature detection and framework hooks are still necessary for broad RUM coverage.

## Normalize Routes Before Export

Never use raw destination URLs as metric names. `/users/849102/orders/771?email=...` creates unbounded cardinality and may leak personal data. Match the destination against your routing table and emit templates:

```text
/users/:userId/orders/:orderId
/catalog/:category
/search
```

Keep query values out by default. If a query parameter defines a small, reviewed product mode, map it to an allowlisted attribute. Record the route template, release, navigation trigger, outcome, and coarse device context. Put unique transition IDs in trace/event records, not metric labels.

## Add Spans Without Treating Every URL as a Span Name

A route transition can be a useful browser span. When its context is active, or explicitly passed, while loaders and client requests start, it connects an interaction, client requests, and server traces. Give it a stable name such as `spa.route /orders/:orderId`, then attach low-cardinality attributes and events.

```js
const span = tracer.startSpan(`spa.route ${toTemplate}`, {
  attributes: {
    "com.example.spa.route.from": fromTemplate,
    "com.example.spa.route.to": toTemplate,
    "com.example.spa.route.trigger": trigger,
  },
  startTime: startTimestamp,
});

const routeContext = trace.setSpan(context.active(), span);

// Re-enter this context whenever route work that should be a child starts.
context.with(routeContext, () => startRouteWork());

span.addEvent("data.ready");
span.addEvent("render.committed");
span.setAttribute("com.example.spa.route.outcome", "success");
span.end(endTimestamp);
```

`startSpan()` does not make the new span active. Store `routeContext` with the transition and re-enter it for later loader or request-start callbacks, or structure the lifecycle with `startActiveSpan()` and a suitable browser async context manager. Configure the release once as the stable `service.version` resource attribute.

The browser OpenTelemetry semantic conventions are still marked Development in the official specification. Avoid claiming custom route attributes are stable OpenTelemetry conventions. Replace the placeholder `com.example` prefix with a unique company or application namespace, version your own schema, and review the conventions before migrating attribute names.

Browser trace propagation also needs deliberate CORS and security configuration. For cross-origin fetch or XHR propagation, allowlist only trusted destinations—for example, with `propagateTraceHeaderCorsUrls`—and configure each destination's CORS response to allow the caller origin and every injected request header: at least `traceparent`, plus `tracestate` and `baggage` if enabled. Remember that spans may be sampled out and telemetry export may be blocked by CSP, CORS, extensions, or network policy.

## Use the Soft Navigations API Progressively

Chrome's Soft Navigations API defines browser-detected same-document navigations around three conditions: a user interaction, a visible URL change, and a visible content paint. It provides `soft-navigation` entries and interaction contentful paint data, plus navigation identifiers that attribute performance entries to a navigation.

As of August 2026, Chrome 151 ships the feature unflagged. Older Chrome versions and other browsers may not report it. Feature-detect support:

```js
if (PerformanceObserver.supportedEntryTypes.includes("soft-navigation")) {
  const softNavObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      sendRum({
        name: "browser.soft_navigation",
        navigationId: entry.navigationId,
        interactionId: entry.interactionId,
        route: routeTemplate(new URL(entry.name).pathname),
        startTime: entry.startTime,
      });
    }
  });

  softNavObserver.observe({ type: "soft-navigation", buffered: true });
}
```

Use the final API documentation for the exact fields available in your target Chrome version; the shape changed during origin trials. Do not deploy code copied from an older experimental article without feature tests.

Browser-detected soft navigations and application transitions serve different purposes. The browser API provides common boundaries for comparable Core Web Vitals slicing, while application hooks capture programmatic transitions, errors, readiness semantics, and unsupported browsers. During rollout, correlate both by time and route, detect duplicates, and do not add both samples to the same denominator.

Also verify whether your RUM provider and the reporting surface you use have adopted the new entries. Browser support does not automatically mean an SDK, backend aggregation, or CrUX view applies the same soft-navigation policy on the same day.

## Diagnose Missing and Duplicate Routes

Add an instrumentation health dashboard:

- hard navigations versus route starts per session;
- route starts with no terminal outcome after a timeout;
- multiple terminal outcomes for one transition ID;
- raw URL changes with no matched route template;
- browser soft-navigation entries unmatched to application transitions;
- route timing samples by browser/version and SDK version;
- accepted telemetry divided by attempted telemetry where measurable.

Test direct loads, links, buttons, `pushState`, `replaceState`, redirects, browser back/forward, hash changes, aborted loaders, error boundaries, cached data, and two rapid consecutive navigations. A single happy-path click test will not expose lifecycle races.

## Official Documentation

- [Measuring soft navigations in Chrome](https://developer.chrome.com/docs/web-platform/soft-navigations)
- [Soft Navigations and Interaction Contentful Paint specification](https://wicg.github.io/soft-navigations/)
- [How SPA architectures affect Core Web Vitals](https://web.dev/articles/vitals-spa-faq)
- [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
- [History: pushState](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)
- [User Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing)
- [OpenTelemetry browser semantic conventions](https://opentelemetry.io/docs/specs/semconv/browser/)

## Conclusion

SPA routes are missed because a new URL does not necessarily mean a new document. Instrument the router's intent, data, commit, visible-readiness, and outcome boundaries with a unique transition ID and normalized route. Then feature-detect Chrome's soft-navigation entries and use them as progressive enhancement while coverage matures. This produces portable operational timings now and a clean path toward comparable per-navigation Web Vitals without double-counting either view.
