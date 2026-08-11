# Why Is Lighthouse Fast While Real Users Are Slow? Segment RUM by Device, Network, Region, and Cache State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Lighthouse, Real User Monitoring, Core Web Vitals, Browser Monitoring, Performance Analysis, RUM

Description: Diagnose fast Lighthouse runs and slow production users by aligning test conditions and segmenting RUM without over-trusting unreliable browser hints.

---

A fast Lighthouse result and slow real-user monitoring (RUM) are not contradictory. Lighthouse measures one page load in a configured lab environment. RUM measures a distribution of visits across the devices, networks, regions, cache states, page variants, and behaviors that production actually receives. The two results should only converge when those conditions converge—and they rarely do by accident.

The right response is not to average more Lighthouse runs until the field problem disappears. Preserve the field distribution, segment it along plausible causes, and then configure a lab run that represents the affected segment closely enough to reproduce and diagnose it.

## Start by Making the Comparison Valid

Before looking for a code bug, confirm that both tools measured the same thing.

| Dimension | Questions to align |
| --- | --- |
| Page scope | Is RUM grouped by a normalized route, an exact URL, or the whole origin? |
| Time | Does the RUM window include a release or incident that the lab build does not? |
| Metric | Are both values LCP or CLS? Lighthouse cannot measure real-user INP and reports lab proxies such as TBT. |
| Statistic | Are you comparing one run, a median of runs, a p75, or a good/poor fraction? |
| Device | Is Lighthouse's emulated mobile profile comparable to the affected real hardware? |
| Network | Is throttling simulated or applied at the network layer, and how does it compare with production? |
| State | Are authentication, consent, experiments, personalization, service workers, and caches equivalent? |
| Lifecycle | Is RUM including restored pages, hidden loads, or SPA activity that the lab navigation does not? |

Run Lighthouse several times against the same release and keep the individual results. Lab runs vary because of the host machine, page nondeterminism, shared infrastructure, and network behavior. Repetition estimates lab variance; it does not transform lab data into field data.

## Why a Lab Profile Can Be Optimistic

The label "mobile" does not mean a Lighthouse run has become a physical sample of your mobile users. Lighthouse applies a device and throttling profile so audits are repeatable, but real hardware has different CPU architecture, memory pressure, thermal throttling, radio quality, background processes, and browser state. Field performance also depends on what people do: INP only exists when someone interacts, and the page's worst interaction can occur minutes after load.

Common optimism sources include:

- the lab host is stronger than low-end production phones even after CPU slowdown;
- the test location is close to the CDN while users are far from an edge or origin;
- a test account has little data while established accounts render large lists;
- banners, personalization, A/B tests, and third-party tags differ;
- the lab stops after load while users open menus, filters, and editors later;
- a monitor always has a clean profile while users carry old service workers or large storage;
- the tested route is fast but a whole-origin field number includes slower routes.

The reverse is also possible. A cold synthetic run may be slower than users with warm HTTP caches, an installed service worker, or a prerendered page. Neither direction is inherently suspicious.

## Segment by Device Without Creating Fingerprints

Start with coarse dimensions that materially change browser work:

- mobile versus desktop form factor;
- viewport-width bucket;
- operating-system family;
- browser engine and major version;
- coarse logical-processor and device-memory buckets where supported;
- reduced-motion or data-saving modes when relevant to what the app serves.

`navigator.hardwareConcurrency` and `navigator.deviceMemory` are hints, not specifications of CPU speed or available RAM. Values may be reduced for privacy, and `deviceMemory` is not supported everywhere. Never combine many hardware hints into a fingerprint or put raw user-agent strings into metric labels. Bucket at collection time and enforce an allowlist.

```js
function deviceClass() {
  const width = window.innerWidth;
  const viewport = width < 600 ? "small" : width < 1024 ? "medium" : "large";

  const cores = navigator.hardwareConcurrency;
  const cpu = !cores ? "unknown" : cores <= 4 ? "low" : cores <= 8 ? "mid" : "high";

  const memory = navigator.deviceMemory;
  const ram = !memory ? "unknown" : memory <= 4 ? "low" : "high";

  return { viewport, cpu, ram };
}
```

Use these fields for analysis, not for changing product access or making consequential decisions. The segment with the slowest p75 is a reproduction lead, not proof that hardware alone caused the slowdown.

## Segment Network Data Carefully

Network conditions affect TTFB, resource load delay, and download duration, which can dominate LCP. The Network Information API can expose values such as `effectiveType`, `rtt`, and `downlink`, but it has limited browser availability and values are estimates. Treat `unknown` as a first-class bucket rather than dropping unsupported browsers.

```js
function networkClass() {
  const connection = navigator.connection;
  if (!connection) return { effectiveType: "unknown", saveData: "unknown" };

  return {
    effectiveType: connection.effectiveType ?? "unknown",
    saveData: connection.saveData ? "on" : "off",
  };
}
```

Client hints are not the only evidence. At your controlled edge or ingestion service, record coarse server-observed timing and region. Break LCP into time to first byte, resource load delay, resource load duration, and element render delay using supported attribution tooling. If only TTFB and download grow in one region, investigate routing, cache hit rate, and origin latency. If render delay grows while network components do not, investigate main-thread and rendering work instead.

Do not label `effectiveType: "4g"` as literal 4G radio access. It is an effective connection category derived by the browser and can describe Wi-Fi or another transport.

## Region Should Explain Infrastructure, Not Identify People

The browser does not need precise geolocation for performance analysis. Map the request at your server or CDN to a broad operational region, such as `eu-west`, `ap-south`, or `north-america`, then discard the address according to your privacy policy. Do not prompt for the Geolocation API to debug page speed.

Compare each region's:

- request count and device/network composition;
- Core Web Vitals p50, p75, and p95;
- server and edge timing;
- CDN hit rate and response size;
- release and feature-flag distribution;
- telemetry delivery rate.

A "slow region" may simply have more low-end mobile traffic. Cross-tabulate region with device and network rather than viewing each dimension in isolation.

## Cache State Is More Than Warm Versus Cold

Cache behavior spans the browser HTTP cache, memory cache, service worker, CDN, prefetching, and application data caches. There is no universal, cross-browser `isColdLoad` flag. Instrument observable evidence and keep an `unknown` category.

Navigation and Resource Timing entries expose transfer sizes and detailed phases, subject to cross-origin timing restrictions. Newer implementations also expose delivery information on resource timing entries. A zero `transferSize` can be consistent with cache delivery, but restricted cross-origin timing and other cases can also yield zero values. Do not turn one field into an absolute cache verdict.

Useful comparisons include:

- first page view in a session versus later page views;
- navigation type (`navigate`, `reload`, or back/forward) from `PerformanceNavigationTiming`;
- service-worker controller present versus absent;
- resource `deliveryType` where supported;
- same-origin resource transfer size and server-side CDN cache status;
- a deliberately clean synthetic profile versus a persisted profile.

```js
function navigationContext() {
  const nav = performance.getEntriesByType("navigation")[0];
  return {
    navigationType: nav?.type ?? "unknown",
    controlledByServiceWorker: Boolean(navigator.serviceWorker?.controller),
    transferred: nav?.transferSize ?? null,
  };
}
```

The goal is a defensible cohort, such as "first session page view, no controlling service worker," not a promise that every byte came from a cold network.

## Avoid Traffic-Mix Illusions

An overall percentile can get worse while every stable segment stays constant if traffic shifts toward a slower segment. It can also improve because slow users stopped reporting. Always plot segment share alongside segment performance.

For a release comparison, build a table like this:

| Segment | Before share | After share | Before LCP p75 | After LCP p75 |
| --- | ---: | ---: | ---: | ---: |
| Small viewport / low CPU | 20% | 35% | 3.4 s | 3.3 s |
| Small viewport / mid CPU | 30% | 28% | 2.5 s | 2.5 s |
| Large viewport | 50% | 37% | 1.6 s | 1.6 s |

The aggregate can degrade even though no row regressed. For paging and deployment decisions, compare stable cohorts or reweight to a fixed reference mix, while keeping the raw user distribution visible as the product outcome.

Do not slice until every bucket contains a handful of samples. Establish minimum counts, suppress high-cardinality dimensions, and widen the time window for low-traffic routes. Percentiles from tiny buckets jump between observations and invite false conclusions.

## Turn the Slow Cohort into a Reproducible Test

Once RUM identifies a cohort, create a matching synthetic profile:

1. Use the same normalized route and production release.
2. Match viewport and a realistic CPU slowdown.
3. Approximate the cohort's latency and bandwidth; document the choice.
4. Run from the relevant region or a nearby agent.
5. Exercise cold and persisted browser profiles separately.
6. Reproduce consent, authentication, feature flags, and representative account data.
7. Capture a performance trace, network waterfall, and screenshots.
8. Repeat enough times to distinguish a change from run variance.

If the problem does not reproduce, the RUM signal still stands. Add field attribution: LCP element and subparts, long animation frames or long tasks around slow interactions, resource timing for same-origin assets, error state, and release. Field debugging evidence often reveals the variable the lab profile omitted.

## Official Documentation

- [Why lab and field data can be different](https://web.dev/articles/lab-and-field-data-differences)
- [Web Vitals field and lab guidance](https://web.dev/articles/vitals)
- [Lighthouse performance scoring and variability](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)
- [Chrome DevTools throttling](https://developer.chrome.com/docs/devtools/settings/throttling)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
- [PerformanceResourceTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming)
- [Debug performance in the field](https://web.dev/articles/debug-performance-in-the-field)

## Conclusion

Lighthouse is a controlled experiment; RUM is a changing production population. Align scope first, then segment RUM by coarse device, network, region, and cache evidence while watching the size and telemetry health of each cohort. Use the slow cohort to configure a reproducible lab test, diagnose it with a trace, and confirm the fix back in the field. A lab score is most valuable as a debugging instrument, not as permission to ignore real users.
