# Browser Monitoring, Synthetic Tests, or CrUX: Which View of User Experience Should You Trust?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Browser Monitoring, Real User Monitoring, Synthetic Monitoring, Chrome UX Report, Core Web Vitals, Web Performance

Description: Learn what RUM, synthetic tests, and CrUX actually measure and how to combine them without treating unlike datasets as interchangeable.

---

Browser monitoring, synthetic tests, and the Chrome User Experience Report (CrUX) can produce three different answers for the same URL without any of them being wrong. They observe different populations, under different conditions, for different purposes. The useful question is therefore not which single number is "truth," but which dataset can answer the decision in front of you.

The short version is:

- Use **real user monitoring (RUM)** to understand your users, segment problems, and connect performance to releases and business journeys.
- Use **synthetic monitoring and lab tests** to reproduce behavior, continuously exercise critical paths, and catch regressions before users do.
- Use **CrUX** to see Google's aggregated view of eligible Chrome experiences and to understand the public field dataset used by tools such as PageSpeed Insights.

None is a substitute for the other two.

## Three Different Measurement Contracts

The datasets differ before a single metric is calculated.

| View | Population | Conditions | Detail available | Best question |
| --- | --- | --- | --- | --- |
| First-party RUM | Visits where your telemetry runs and is sampled | Real devices, networks, regions, accounts, and interactions | Potentially URL template, release, device, journey, errors, and trace correlation | "Which of our users became slower after this release?" |
| Synthetic test | A configured browser or agent | Controlled location, viewport, network/CPU settings, cache state, script, and schedule | Test steps, screenshots, traces, waterfall, assertions | "Can a user complete checkout from this location right now?" |
| Lighthouse | One lab execution, with simulated throttling by default or configured throttling | A configured lab environment, usually a cold navigation | Audit diagnostics and lab metrics | "What work on this page is likely blocking load?" |
| CrUX | Eligible, opted-in Chrome users on qualifying public pages or origins | Real-world Chrome conditions, aggregated over time | Public dimensions and metric distributions; no private app context | "What does the public Chrome field dataset report for this URL or origin?" |

"Field data" includes both your RUM and CrUX, but they are not the same sample. CrUX has eligibility and privacy rules, includes Chrome experiences rather than every browser, and exposes aggregates rather than your raw events. Your RUM depends on when the SDK loads, consent, sampling, CSP, blockers, and the browsers you support. Those different inclusion rules alone can move a percentile.

## What RUM Can Tell You That CrUX Cannot

First-party RUM is the most actionable production view when it is instrumented carefully. In addition to LCP, INP, and CLS, it can attach low-cardinality operational context such as:

- normalized route, not a URL containing IDs or query values;
- application release or build identifier;
- device class and coarse network information;
- geographic region at an appropriate privacy level;
- authenticated versus anonymous journey, without emitting identity;
- cold versus warm navigation, where you can infer it safely;
- errors, failed requests, long tasks, and trace correlation.

The official `web-vitals` library handles the tricky lifecycle rules for the Core Web Vitals better than hand-rolled observers. The application-specific route lookup below safely falls back to `"unknown"`; replace it with your router's route-pattern matcher. A minimal collector looks like this:

```js
import { onCLS, onINP, onLCP } from "web-vitals";

function routeTemplate(url) {
  const pathname = new URL(url, location.href).pathname;
  return window.APP_ROUTE_TEMPLATE_FOR_PATH?.(pathname) ?? "unknown";
}

function report(metric) {
  const event = {
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    id: metric.id,
    route: routeTemplate(metric.navigationURL ?? location.href),
    release: window.APP_RELEASE ?? "unknown",
    visibility: document.visibilityState,
  };

  const body = JSON.stringify(event);
  if (!navigator.sendBeacon("/rum", body)) {
    fetch("/rum", {
      method: "POST",
      body,
      keepalive: true,
      headers: { "content-type": "application/json" },
    }).catch(() => {});
  }
}

onCLS(report);
onINP(report);
onLCP(report);
```

Because a metric callback can run more than once during a page's lifetime, the receiver should replace the previous `value` for the same `name` and `id`, or collect and sum `metric.delta`, rather than count every callback as a separate visit.

This is still not an unbiased census. Record telemetry health alongside product metrics: SDK initialization rate, event acceptance rate, sampled page views, browser mix, and beacon failures observed at the server. Never interpret a sudden improvement without checking whether a slow segment stopped reporting.

## What Synthetic Tests Are Uniquely Good At

A synthetic browser is deliberately artificial. That is its strength. It lets you hold variables constant and compare builds. It can run before deployment, on every pull request, or every five minutes from a fixed region. A scripted monitor can sign in, search, add an item, pay with a test method, and assert both UI state and API responses.

Synthetic results are especially useful for:

1. **Availability:** does the page load and does the journey finish?
2. **Regression detection:** did the same test get slower after a code change?
3. **Diagnosis:** which request, long task, or layout shift caused the change?
4. **Coverage without traffic:** do low-traffic but critical paths still work?
5. **Pre-production gates:** does a candidate build meet a repeatable budget?

Do not label a single Lighthouse score "user performance." A standard Lighthouse navigation performs no user input and therefore cannot measure INP; it reports Total Blocking Time as a lab proxy that can flag potential responsiveness problems, but TBT is not a substitute for field INP. A green synthetic test also says nothing about an underpowered phone on a congested network unless you configured a test that approximates that condition.

Make synthetic monitors more informative by maintaining at least two profiles: an unthrottled or lightly throttled availability profile and a constrained performance profile. Run several iterations when comparing releases because browser startup, shared infrastructure, and network variance can affect any single run.

## What CrUX Represents

CrUX is aggregated real-user Chrome data. It reports distributions for qualifying public origins and, when enough data is available, individual URLs. Its public interfaces include the CrUX API, History API, and BigQuery dataset. It is excellent for an external, stable field benchmark because you do not need to deploy an SDK.

CrUX has important boundaries:

- it is Chrome-derived, not an all-browser census;
- pages and origins must meet discoverability, popularity, and eligibility requirements;
- URL-level data may be unavailable while origin-level data exists;
- it cannot expose your release, account tier, experiment, or private route;
- aggregate data cannot show the exact trace or JavaScript task behind one poor visit;
- its time window reacts more slowly than a minute-by-minute first-party stream.

Core Web Vitals compliance is assessed at the 75th percentile, separately for LCP, INP, and CLS, with mobile and desktop segmentation called out in the Web Vitals guidance. That assessment convention is not a command to discard the rest of the distribution. A p75 can remain flat while the worst 5% deteriorates sharply.

## Why the Numbers Commonly Disagree

When Lighthouse is fast but RUM is slow, start with population and test conditions rather than assuming instrumentation is broken.

| Difference | Likely effect |
| --- | --- |
| A default Lighthouse navigation clears cache and site storage, while real visits include varied cache and local state | Either dataset may be slower, depending on cache and client work |
| Real users have weaker CPUs or worse networks | Field LCP and INP become slower |
| Consent delays the RUM SDK | Early lifecycle entries may be missed unless buffered APIs or `web-vitals` are used correctly |
| First-party RUM may include Safari and Firefox, subject to each metric API's browser support; CrUX is Chrome data | Browser mix changes the distribution |
| CrUX falls back from URL to origin in a reporting tool | Unrelated routes influence the result |
| A release changed yesterday | RUM shows it quickly; a rolling aggregate changes gradually |
| Bot or monitor traffic enters first-party analytics | RUM population no longer represents customers |
| A blocker prevents one vendor's SDK or endpoint | Reported traffic mix shifts, often invisibly |

Before comparing values, align the metric definition, URL scope, form factor, time range, geography, navigation type, visibility rules, and percentile. Comparing CrUX origin p75 for the last rolling period with today's desktop-only RUM median is not a validation exercise.

## A Practical Triangulation Workflow

Use all three views as a feedback loop.

1. **Detect in RUM or CrUX.** Confirm that a user-facing percentile or good/needs-improvement/poor distribution changed.
2. **Segment in RUM.** Split by route template, device class, browser, region, release, and coarse network class. Keep a global panel beside every segmented panel so traffic mix remains visible.
3. **Reproduce synthetically.** Configure the closest device and network profile, then capture a trace and waterfall. A failure to reproduce does not invalidate the field signal.
4. **Fix and test in the lab.** Use repeatable runs to confirm the suspected bottleneck moved in the right direction.
5. **Canary in production.** Compare the new release with a concurrent control where possible.
6. **Confirm in RUM, then CrUX.** RUM provides the early confirmation; CrUX later shows whether the improvement is visible in the public Chrome dataset.

For an incident, a synthetic availability check provides a direct operational answer even when no real-user traffic is present. For a release regression affecting one device class, RUM wins. For Google's public Core Web Vitals assessment or competitor-level public benchmarking, CrUX is the relevant source. For fixing the code, a lab trace is usually where the investigation becomes concrete.

## Trust the Scope, Not a Single Score

A trustworthy dashboard labels provenance directly: `RUM p75`, `CrUX URL p75`, `CrUX origin p75`, or `Lighthouse run`, including window and device scope. It never silently substitutes origin data for missing URL data, combines lab and field values, or presents one synthetic execution as a percentile.

The best operating model is deliberately redundant. Synthetic tests tell you whether a known journey works under controlled conditions. RUM tells you who is affected and provides deploy-level context. CrUX provides a privacy-preserving, public Chrome field benchmark. Agreement increases confidence; disagreement tells you which assumption to investigate.

## Official Documentation

- [Web Vitals: field and lab measurement](https://web.dev/articles/vitals)
- [Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences)
- [Why CrUX data can differ from first-party RUM](https://web.dev/articles/crux-and-rum-differences)
- [Chrome UX Report methodology](https://developer.chrome.com/docs/crux/methodology)
- [CrUX API guide](https://developer.chrome.com/docs/crux/guides/crux-api)
- [Lighthouse documentation](https://developer.chrome.com/docs/lighthouse/overview)

## Conclusion

There is no universally most trustworthy browser-performance source because each source has a different measurement contract. Trust RUM for your instrumented users and operational dimensions, synthetics for controlled journeys and diagnosis, and CrUX for its public eligible-Chrome population. Label those scopes, compare like with like, and use disagreement as evidence—not as a reason to pick the prettiest number.
