# How Do bfcache Restores and Prerendered Pages Distort Browser Performance Metrics?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Browser Monitoring, bfcache, Prerendering, Web Vitals, Page Lifecycle

Description: Keep browser performance data honest by modeling normal loads, history restores, and prerender activations as distinct page-visit lifecycles.

---

A page restored from the back/forward cache can appear instantly without running a new document load. A prerendered page can perform work while hidden before the user activates it. If browser monitoring treats both as ordinary navigations, page views are missed, load timers are reused, and apparent performance can improve or worsen for reasons unrelated to a code change.

Do not “correct” these visits into one generic load. Record the lifecycle that actually happened, give each user-visible visit a distinct ID, and compare like with like. Use `pageshow.persisted` for bfcache restoration and `document.prerendering` plus `PerformanceNavigationTiming.activationStart` for prerender. Keep navigation type, bfcache outcome, and prerender activation as separate fields.

## Three Lifecycles That Look Like One URL

Consider a product page:

1. **Normal navigation:** the browser fetches or loads the document, parses it, runs scripts, and paints it.
2. **bfcache restore:** the user navigates away and then back; the browser resumes a frozen in-memory document. There is no new document initialization.
3. **Prerender activation:** the browser has begun loading and rendering a hidden document based on a speculation rule, then makes its current state visible when the user navigates. If prerendering is incomplete, loading continues after activation.

All three can produce the same route and release. Their costs and user expectations differ. A normal navigation answers “how did a fresh document load?” A bfcache restore answers “how quickly did an existing document resume?” A prerender activation answers “what did the user experience after activation, and what work was spent speculatively beforehand?”

Use a bounded model:

~~~text
visit_kind = normal | loaded_back_forward | bfcache_restore | prerender_activation
navigation_type = navigate | reload | back_forward
document_id = one ID for the Document lifetime
visit_id = new ID for each visible visit, including bfcache restores
release = immutable build ID
~~~

Do not put raw URLs or random IDs into metric labels. Keep identifiers as event correlation fields and aggregate on route templates and bounded lifecycle values.

## Detect bfcache with `pageshow.persisted`

The `pageshow` event can fire after an initial load, while a document is still prerendering, and whenever a document is restored from bfcache. It is not by itself proof that the page is visible. Its `persisted` property is the direct signal for a restore:

~~~javascript
const documentId = crypto.randomUUID();
let visitSequence = 0;

function beginVisibleVisit(kind) {
  visitSequence += 1;
  const visitId = `${documentId}:${visitSequence}`;
  startView({ visitId, kind, route: routeTemplate(location.href) });
}

addEventListener('pageshow', (event) => {
  if (event.persisted) {
    beginVisibleVisit('bfcache_restore');
  }
});

addEventListener('pagehide', (event) => {
  finishCurrentView({ mayEnterBfcache: event.persisted });
});
~~~

Use `pageshow` here only for persisted restores. The activation-gated initialization shown below starts the initial normal/reload, loaded back/forward, or prerender visit exactly once; otherwise a prerender's non-persisted `pageshow` could create a premature view. If your visit definition also excludes ordinary background tabs, gate visit emission on `document.visibilityState` and deduplicate the first `visibilitychange`.

On `pagehide`, `persisted: true` means the browser intends to cache the page, not a guarantee that it remains cached. Use `pageshow.persisted` to count actual hits. The web.dev bfcache guidance makes this distinction explicit.

Do not initialize the monitoring SDK again on every `pageshow`. A restored document retains its JavaScript state and listeners. Reinitialization can duplicate observers, errors, and network instrumentation. Instead, use the SDK's supported “start view” or lifecycle API to begin a new logical visit while keeping the document-level instance alive.

## Count Restores as Visits Without Calling Them Loads

Analytics libraries that run only at startup undercount bfcache page views because startup does not rerun. Emit a new page-view or view event on a persisted `pageshow`, using a new visit ID. Keep it out of the normal-navigation load denominator.

For bfcache effectiveness, distinguish:

- `back_forward`: a history navigation that loaded a document rather than restoring it;
- `bfcache_restore`: a persisted `pageshow`;
- other normal/reload navigations.

`PerformanceNavigationTiming.type` can report `back_forward` for history traversal, but it does not alone prove a bfcache hit. Google's bfcache guidance combines navigation type for loaded history navigations with `pageshow.persisted` for restored ones.

A useful pair of ratios is:

~~~text
history_visit_count = loaded_back_forward + bfcache_restore
bfcache_hit_ratio = bfcache_restore / history_visit_count
~~~

Apply a clear eligibility and browser-support definition before using this as a target. Some restore outcomes are outside application control, and browser implementations differ.

## Reset Visit-Scoped Performance State on Restore

The initial document's Navigation Timing entry remains about the document navigation; it does not become a fresh network load when the document is restored. Reusing `responseStart`, `domComplete`, or initial LCP as the restore's load time produces nonsense.

For a restore, measure restore-specific signals from the `pageshow` callback:

~~~javascript
addEventListener('pageshow', (event) => {
  if (!event.persisted) return;

  const restoreObservedAt = performance.now();
  queueMicrotask(() => {
    reportRestore({
      kind: 'bfcache_restore',
      handler_to_microtask_ms: performance.now() - restoreObservedAt,
    });
  });
});
~~~

That microtask delta is only an instrumentation health measurement, not a standardized “bfcache LCP.” Prefer the official `web-vitals` library for Core Web Vitals. Its documentation states that metrics are reported again after bfcache restore and that a new metric object gets a new ID because restores are separate page visits. Do not call `onLCP`, `onINP`, or `onCLS` again yourself on every restore; the library warns against repeated registration.

Flush the previous visit when the page becomes hidden or on the appropriate library callback, then associate the new metric ID with the restore visit. INP may be absent when the user does not interact; absence is not zero.

## Detect Prerender Before Sending Telemetry

In Chromium's Speculation Rules prerendering, a hidden document can execute JavaScript before activation. `document.prerendering` is `true` during that period, and the `prerenderingchange` event fires when the document activates. After activation, a nonzero `PerformanceNavigationTiming.activationStart` indicates it was prerendered.

~~~javascript
const nav = performance.getEntriesByType('navigation')[0];

function activateVisibleMonitoring() {
  const kind = nav?.activationStart > 0
    ? 'prerender_activation'
    : nav?.type === 'back_forward'
      ? 'loaded_back_forward'
      : 'normal';

  beginVisibleVisit(kind);
}

if (document.prerendering) {
  document.addEventListener('prerenderingchange', activateVisibleMonitoring, {
    once: true,
  });
} else {
  activateVisibleMonitoring();
}
~~~

Delay user-presence analytics, session starts, replay uploads, ads, and irreversible actions until activation unless the specific API is designed for prerender. Chrome's official guidance recommends `document.prerendering` for this purpose. A prerender may never activate; counting it as a page view invents a visit.

Monitoring can still initialize enough state to catch supported performance entries, but it must not transmit a customer-visible visit prematurely. Follow the chosen SDK's documented prerender integration; a hand-built delay can miss early data or create duplicate sessions.

## Interpret `activationStart` Correctly

`activationStart` is a high-resolution timestamp relative to the navigation time origin, representing the time from prerender start until activation. It is not “load duration,” and `PerformanceNavigationTiming.type` does not currently identify modern prerender with a `prerender` value in Chrome. Chrome explicitly advises using `document.prerendering` and nonzero `activationStart` instead.

Raw prerender timings can include work before activation. For any custom timestamp, decide whether the question is:

- **speculation cost:** elapsed work since prerender began;
- **activation experience:** elapsed time since the user activated the page;
- **document work:** lifecycle timing for the whole document.

For a custom performance timestamp from the same document time origin and after activation:

~~~javascript
function sinceActivation(entryStartTime, navEntry) {
  if (!navEntry || navEntry.activationStart <= 0) return entryStartTime;
  return Math.max(0, entryStartTime - navEntry.activationStart);
}
~~~

Do not blindly subtract `activationStart` from standardized Web Vitals. Use a maintained implementation such as `web-vitals`, whose logic accounts for supported lifecycle behavior, and retain raw entries for debugging only within a bounded sample.

## Keep Lifecycle Cohorts Separate in Dashboards

Build dashboards with explicit panels:

| Cohort | Primary questions |
| --- | --- |
| normal/reload | network, server, resource, and render performance |
| loaded back/forward | why was history navigation not restored? |
| bfcache restore | hit ratio, restore experience, stale-state errors |
| prerender activation | activation rate, activation-relative experience, wasted prerenders |

An overall p75 can still be useful for user experience if each visit is represented correctly, but release diagnosis must inspect the mix. A rise in bfcache restores can improve the blended distribution without changing application code. A new prerender rollout can shift work before activation while increasing total bytes and server requests. Alert on cohort metrics and lifecycle mix together.

Also separate browser family and major version because support and eligibility change. Do not fingerprint users with unnecessary high-entropy fields; coarse supported categories are enough for operational comparison.

## Validate with Repeatable Navigation Tests

For bfcache:

1. Load page A, navigate to page B, then go back.
2. Confirm exactly one initial view and one restore view.
3. Confirm `pageshow.persisted` is true for the hit.
4. Confirm the SDK was not initialized twice.
5. Interact after restore and verify metrics attach to the new visit ID.
6. Test stale authentication and data refresh behavior.

For prerender:

1. Use Chrome DevTools' documented speculation-rule debugging workflow.
2. Confirm `document.prerendering` before activation.
3. Confirm no page view, replay upload, or irreversible side effect is sent then.
4. Activate and confirm one visit with nonzero `activationStart`.
5. Let another prerender be discarded and confirm it never becomes a visit.

Include these cases in SDK upgrades because lifecycle handling belongs to monitoring correctness, not only application navigation.

## Official Documentation

- [web.dev back/forward cache guide](https://web.dev/articles/bfcache)
- [MDN `pageshow` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event)
- [MDN `PageTransitionEvent.persisted`](https://developer.mozilla.org/en-US/docs/Web/API/PageTransitionEvent/persisted)
- [Chrome prerendering guidance](https://developer.chrome.com/docs/web-platform/prerender-pages)
- [MDN `Document.prerendering`](https://developer.mozilla.org/en-US/docs/Web/API/Document/prerendering)
- [W3C Navigation Timing Level 2](https://www.w3.org/TR/navigation-timing-2/)
- [Google `web-vitals` lifecycle behavior](https://github.com/GoogleChrome/web-vitals)

## Conclusion

bfcache and prerendering do not corrupt browser metrics; an incomplete visit model does. Count a persisted `pageshow` as a new visible visit without pretending it was a network load, and delay prerender page views until activation. Use new visit IDs, lifecycle labels, supported Web Vitals handling, and separate dashboards for normal loads, history restores, and prerender activations. When lifecycle mix is visible, performance improvements remain distinguishable from browser navigation optimizations.
