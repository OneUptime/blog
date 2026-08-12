# Browser Telemetry Disappears Behind Ad Blockers and CSP: How Much Data Are You Missing?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Browser Telemetry, Ad Blockers, Content Security Policy, Real User Monitoring, Observability, Data Quality

Description: Quantify browser-observability coverage with a staged delivery funnel while separating consent, CSP, client blocking, sampling, transport, and backend loss.

---

A browser dashboard can look healthy because the users having trouble are the users whose telemetry never arrives. Content Security Policy (CSP) may block the monitoring script or its collector. An extension or network filter may match the vendor domain, file name, or request path. Consent rules may correctly prevent collection. Sampling, navigation, offline conditions, or the ingestion pipeline may drop the rest.

You cannot calculate the missing population using only the events that survived. Build an independent coverage model from server and edge traffic, CSP reports, staged client counters, ingestion acknowledgements, and controlled browser tests. Even then, report a bounded estimate with known blind spots rather than a fictional exact percentage.

## Define "Missing" Before Counting It

Not every unobserved visit is data loss. Separate these groups:

| Group | Meaning | Operational treatment |
| --- | --- | --- |
| Ineligible by policy | Consent not granted, privacy rule, excluded route, unsupported environment | Expected exclusion; report separately and do not bypass |
| Intentionally sampled out | Eligible but excluded by configured sampling | Expected; weight only if sampling probability is known |
| SDK did not execute | Script blocked, CSP `script-src`, load error, early page exit, integration bug | Coverage failure or dependency failure |
| SDK executed but could not export | CSP `connect-src`, blocker, offline/navigation loss, CORS, payload limit | Transport failure |
| Collector accepted but data vanished later | Queue, processor, storage, schema, or retention failure | Observability-pipeline failure |

Publish both **policy coverage** and **technical delivery coverage**. Combining consented-out visits with broken telemetry invites teams to "fix" a privacy decision, while excluding them silently makes the dashboard population look universal.

## Build a Measurement Funnel

A useful funnel has independently observable stages:

```text
eligible navigation estimate
  -> telemetry bootstrap executed
  -> SDK initialized
  -> event created / sampled in
  -> export queued
  -> collector accepted
  -> pipeline stored and queryable
```

No single identifier needs to follow a person across all stages. Aggregate counts by a short time window, normalized route group, release, broad region, and browser family. Apply privacy thresholds before exposing small cohorts.

### Stage 1: Estimate eligible navigations independently

Count HTML/document requests at an edge or server before the browser SDK is involved, then subtract known policy-ineligible traffic where that can be done lawfully and accurately. This denominator has limitations:

- bfcache restores can create page experiences without a new document request;
- a service worker or cache can serve a document without hitting the origin;
- client-side SPA route changes do not create document requests;
- bots and synthetic agents may inflate server traffic;
- retries and prerendering can differ from visible page views.

Treat it as an estimate. Add separate lifecycle counters for SPA routes and bfcache restores from supporting telemetry, while acknowledging that fully blocked clients remain invisible.

### Stages 2–4: Emit tiny health events

The bootstrap can record that it executed, the SDK can record readiness, and the sampler can record aggregate decisions. Sending every stage through the same exporter shows internal funnel ratios among clients that can reach that exporter, but cannot prove reachability for clients blocked from it.

Where justified, use a small, purpose-named, same-origin health endpoint distinct from the full telemetry pipeline. Its job is to measure delivery health, not to tunnel detailed analytics around a user's blocker. Document it, honor the same consent policy, and keep the payload aggregate and minimal.

### Stages 5–6: Count on the server

`navigator.sendBeacon()` returning `true` only means the browser queued the payload; it is not a delivery receipt. The collector's accepted-request count is the first server-side evidence that the payload reached your infrastructure. Add counters after authentication, validation, enqueue, processing, and storage so a green HTTP endpoint cannot hide downstream loss.

## Calculate Coverage as a Set of Ratios

Suppose a 30-minute window contains:

```text
900,000 estimated eligible document experiences
810,000 bootstrap executions observed
795,000 SDK-ready events observed
780,000 sampled-in events queued for export
750,000 events accepted after collector decoding and deduplication
747,000 events stored
```

Report several ratios:

```text
bootstrap coverage estimate = 810,000 / 900,000 = 90.0%
SDK initialization success = 795,000 / 810,000 = 98.1%
collector acceptance among queued sampled-in events = 750,000 / 780,000 = 96.2%
pipeline persistence = 747,000 / 750,000 = 99.6%
```

Do not conclude that exactly 17% of all users are missing by comparing stored rows with server requests. The denominator and numerator represent different lifecycle events, and missingness is not random. Clearly label the estimate and its cache, bfcache, SPA, bot, consent, and sampling assumptions.

More importantly, plot coverage by cohort. If total acceptance is 95% but a particular browser family is 60%, the overall Core Web Vitals distribution is biased. A simple inverse scale-up cannot recover the performance values of unobserved visits.

## Diagnose CSP Separately

CSP has two common failure points:

- `script-src` can prevent a remote monitoring SDK from loading;
- `connect-src` can prevent Fetch, XHR, WebSocket, EventSource, and Beacon exports to the collector.

Declare required destinations explicitly. For example:

```http
Reporting-Endpoints: csp="https://reports.example.com/csp"
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'nonce-{RANDOM_PER_RESPONSE_NONCE}';
  connect-src 'self' https://rum.example.com;
  report-to csp
```

Header syntax must be sent on one valid HTTP header line even if it is formatted across lines in documentation. Test in report-only mode, review noise, then enforce. A nonce must be unpredictable and generated per response; the placeholder above is not a literal value.

When JavaScript is running, observe violations locally:

```js
document.addEventListener("securitypolicyviolation", (event) => {
  recordCspHealth({
    directive: event.effectiveDirective,
    disposition: event.disposition,
    blockedOrigin: redactToOrigin(event.blockedURI),
    sourceClass: classifySource(event.sourceFile),
  });
});
```

Sanitize CSP data. Reports can contain document URLs, blocked URLs, source locations, and samples; those may expose paths or query data. Enforce retention and access controls at the reporting endpoint.

The DOM event cannot report that the script containing the listener was itself blocked. Server-received CSP reports help cover that case, but the Reporting API explicitly does not guarantee delivery. Network conditions, browser support, privacy behavior, and blockers can suppress reports too. CSP counts are therefore corroborating evidence, not a complete denominator.

## Diagnose Ad Blockers Without Pretending to Detect Them

There is no standardized, reliable page API that identifies an ad blocker or names the rule that blocked a request. Extensions deliberately operate outside the page's trust boundary. Script probes and bait resources are brittle, create an arms race, and can disrespect an explicit user choice.

Use three safer forms of evidence:

1. **Controlled reproduction:** run the site with representative, versioned filter lists and observe which script URLs and endpoints fail. This identifies failure modes, not field prevalence.
2. **Server absence:** compare independent eligible-traffic estimates with bootstrap/collector counts, after accounting for consent, sampling, caches, bots, and early exits.
3. **Naming/domain experiments:** if operationally and ethically appropriate, compare a transparent first-party integration with a third-party vendor endpoint under the same consent. Treat the result as endpoint reliability, not proof about individual extensions.

Self-hosting a small SDK and using a same-origin `/observability` endpoint can simplify CSP, reduce third-party availability dependencies, and avoid accidental matching on a vendor hostname. It does not make telemetry entitled to delivery. Blockers can filter first-party paths, users can deny consent, and enterprise networks can still restrict traffic. Do not obfuscate URLs or disguise telemetry as essential application data.

## Distinguish Script Blocking from Export Blocking

These two failures bias data differently:

| Symptom | Likely stage | Evidence |
| --- | --- | --- |
| Server page view, no bootstrap, CSP `script-src` report | Script load blocked by policy | CSP report plus dependency request logs |
| SDK-ready health event arrives, full payload does not | Export path or payload issue | Health/full collector divergence |
| `securitypolicyviolation` names `connect-src` | Collector not allowed by CSP | DOM/server CSP report |
| Beacon accepted at collector but absent from storage | Backend pipeline loss | Collector and storage counters |
| Neither telemetry nor CSP report arrives for one cohort | Consent, blocker, early exit, unsupported client, or denominator error | Remains a bounded unknown |

Avoid putting both health and detailed telemetry on exactly the same host/path if you need to distinguish their transport reliability. Conversely, too many endpoints add CSP surface and complexity. Use the smallest architecture that answers a real quality question.

## Make Missingness Visible on Every RUM Dashboard

Place these panels beside Web Vitals and JavaScript error rates:

- estimated eligible experiences;
- bootstrap and SDK initialization coverage;
- sampling probability and sampled-in counts;
- collector acceptance and backend persistence;
- coverage by browser, route, release, device class, and broad region;
- CSP violations for `script-src` and `connect-src`;
- beacon payload size and rejection/queue-failure counters;
- SDK and exporter error rates.

Alert on sudden coverage changes before interpreting a performance improvement. If low-end devices disappear from telemetry after a bundle increase, aggregate LCP may improve while actual user experience becomes worse.

Use a concurrent stable release or minimal health collector as a control when changing the SDK, CSP, endpoint, or sampling. Roll out gradually and compare acceptance at each stage.

## Validate with a Browser Matrix

Test at least:

- enforced and report-only CSP;
- remote and self-hosted scripts;
- same-origin and cross-origin collectors;
- consent granted, denied, and changed mid-session;
- common browsers and mobile lifecycle transitions;
- representative content blockers and enterprise filtering;
- offline, slow network, navigation, and payload-limit cases;
- bfcache restore and SPA route transitions.

Verify server counters as well as the browser console. A test that merely shows `sendBeacon()` returned `true` has not validated end-to-end storage.

## Official Documentation

- [CSP `connect-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)
- [Content Security Policy Level 3](https://www.w3.org/TR/CSP/)
- [SecurityPolicyViolationEvent](https://developer.mozilla.org/en-US/docs/Web/API/SecurityPolicyViolationEvent)
- [Reporting API specification and delivery limitations](https://www.w3.org/TR/reporting-1/)
- [CSP report-only header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only)
- [Navigator.sendBeacon](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
- [Page lifecycle guidance](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)

## Conclusion

You cannot measure telemetry loss solely from telemetry that arrived, and you cannot reliably label an individual gap as an ad blocker. Build a staged coverage funnel with independent server estimates, CSP evidence, client health stages, collector acceptance, and storage counters. Report policy exclusions, sampling, script execution, transport, and backend loss separately; preserve known denominator limitations; and watch cohort coverage beside every performance chart. That turns a hidden selection bias into an observable reliability problem without bypassing privacy or user choice.
