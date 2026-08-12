# How to Detect a Frontend Regression Without Confusing It with Bot Traffic, Extensions, or a Changing User Mix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Browser Monitoring, Frontend Performance, Regression Detection, Real User Monitoring, Core Web Vitals

Description: Detect release regressions with stable cohorts, verified traffic classes, mix-aware comparisons, and guarded statistical evidence.

---

A frontend p75 can worsen while every route becomes faster, simply because traffic shifted toward slower mobile devices. Error volume can spike because a crawler began rendering pages or an extension update threw on every site. Conversely, a real checkout regression can disappear inside a surge of fast landing-page traffic.

Detect regressions at the release and cohort level before interpreting the blended aggregate. Classify traffic with evidence, compare simultaneous control and treatment when possible, examine stable route/browser/device strata, and report population-mix changes alongside performance changes. Keep unclassifiable traffic visible rather than deleting it until the dashboard looks clean.

## Define the Observation Unit

Decide what one row represents before building alerts. For Core Web Vitals, a metric instance within a page visit is a useful unit. Use the metric library's metric ID to deduplicate or update reports for that metric instance, and keep a separate visit ID to join different metrics. A bfcache restore creates new metric instances and is a separate visit; INP is absent when the user never interacts. For errors, the unit may be an eligible page visit with at least one first-party error, not the raw exception count.

Store bounded dimensions:

~~~text
release = immutable frontend build
route = router template
visit_kind = navigate | reload | back_forward | bfcache_restore | prerender_activation | restore | soft_navigation | unknown
form_factor = phone | tablet | desktop | unknown
browser_family = bounded family
browser_major = bounded integer or unknown
traffic_class = human_candidate | verified_bot | synthetic | suspected_automation | unknown
sampling_rule = versioned bounded identifier
~~~

Keep random visit and trace IDs as non-indexed correlation fields rather than metric labels. Never group by raw URL, user ID, full user-agent string, DOM selector, or extension ID.

Use the official `web-vitals` implementation where its support fits so lifecycle details and metric definitions are consistent. If you opt into its soft-navigation reporting, keep those observations separate because support and semantics differ from full-page navigation. Tag the release before monitoring starts; a value inferred later from “current deployment” can assign an old open tab to the wrong code.

## Prefer a Simultaneous Release Comparison

The strongest operational design is a stable canary:

- randomly assign eligible experiment units to control and candidate at the edge or release router;
- keep assignment sticky for the intended experiment lifetime;
- serve complete, internally consistent asset sets;
- run both during the same clock period;
- use identical telemetry schema, sampling, privacy, and intake;
- exclude staff and synthetic traffic using explicit authenticated markers, not guesswork.

This helps balance campaigns, weather, browser releases, time of day, and regional traffic changes better than “24 hours before versus 24 hours after.” Compare candidate and control within each important stratum, then expand traffic only after primary and guardrail metrics pass.

If simultaneous releases are impossible, use a release-centered time series with several stable baselines: same hour/day pattern, previous release, and a synthetic control flow. A time-correlated jump beginning at deployment is evidence, but planned marketing and browser updates remain competing explanations.

## Classify Bots at a Trusted Boundary

Browser JavaScript cannot reliably decide whether its environment is human. User-agent strings are easy to spoof, automation can run a full browser, and privacy changes reduce exposed detail. Treat client classification as a hint.

For known synthetic monitors, add an authenticated marker at the edge and propagate only a bounded `traffic_class=synthetic` field to RUM. Rotate the credential, prevent customers from setting it, and keep synthetic results in their own dashboard.

For recognized crawlers, verify server-side. Google's current documentation warns that the Googlebot user-agent is often spoofed and recommends its documented reverse-then-forward DNS verification procedure or matching the source IP against published Googlebot IP ranges. Apply equivalent official verification for each crawler you intentionally classify. Do not perform DNS verification from browser code.

Use classes rather than a single `is_bot` flag:

| Class | Evidence | Use |
| --- | --- | --- |
| `synthetic` | authenticated monitor identity | separate release guardrail |
| `verified_bot` | provider-documented server verification | exclude from human UX, retain crawler health |
| `suspected_automation` | behavioral/server heuristics | show separately; do not silently drop |
| `human_candidate` | eligible traffic without automation evidence | primary RUM population |
| `unknown` | missing or conflicting data | monitor explicitly |

Do not block or discard unverified traffic merely to clean metrics. First compare its share, route mix, interaction rate, and browser distribution. An increase in “no interaction” visits affects INP availability but is not itself a performance improvement.

## Treat Extensions as Noise with Evidence, Not Detection

Chrome documents that extension content scripts normally run in isolated worlds but can share the DOM, and extensions can also execute in the page's main world. There is no complete, privacy-safe way for a site to enumerate installed extensions or prove that none influenced performance.

For errors, extension-scheme stack frames such as `chrome-extension://` or `moz-extension://` provide strong event-level evidence. Classify events with only extension frames separately. Keep mixed stacks that include owned application frames, because your code may still be involved.

For performance, an extension can consume main-thread time without leaving an attributable frame in exported RUM. Reduce its influence through:

- large enough field samples and robust percentiles;
- simultaneous release cohorts exposed to the same extension population;
- segmentation by browser family and coarse environment, not extension fingerprint;
- clean-profile synthetic tests for causal reproduction;
- trimmed diagnostic views used only in addition to, never instead of, the standard metric.

If the canary worsens relative to its simultaneous control and clean-profile lab traces reproduce the same task, extensions are an unlikely explanation. If both cohorts change at the same moment with no release difference, investigate environment or traffic shifts first.

## Detect Population-Mix Changes

Always publish the cohort distribution beside the metric:

~~~text
route share
form-factor share
browser-family/major share
region share
visit-kind share
traffic-class share
metric-availability rate
sampling-rule share
~~~

Suppose the desktop checkout INP distribution and mobile checkout INP distribution stay fixed, with respective p75 values of 150 ms and 280 ms, but mobile grows from 30% to 70%. Depending on the shapes of those distributions, the blended p75 can worsen with no within-device regression. That is still a real change in users' aggregate experience, but the remedy is not necessarily a rollback.

Compare in two views:

1. **Observed mix:** what current visitors actually experienced.
2. **Standardized mix:** each release reweighted to a fixed reference population.

For means or threshold rates, direct standardization is straightforward:

~~~text
standardized_value(release) = sum(reference_weight[stratum] * value[release, stratum])
~~~

Percentiles do not combine by averaging stratum percentiles. Reweight the underlying visit observations, then calculate the percentile from the combined weighted distribution. If only aligned histogram buckets are available, combine their weights and approximate or bound the percentile at the histogram's resolution. Keep the reference population versioned and publish excluded sparse strata.

If observed worsens but standardized remains stable, mix explains much of the shift. If both worsen and several high-volume strata regress, the candidate likely changed performance. If only one stratum regresses, target the responsible browser, route, or device without hiding it in a global average.

## Build a Release Comparison Table

For each route and important coarse stratum, calculate:

- eligible visits and metric-present visits;
- p50, p75, p95 or histogram;
- poor-threshold fraction;
- candidate minus control absolute and relative change;
- first-party error-visit rate;
- action completion or abandonment guardrails;
- application and telemetry bytes per visit;
- missing-field and rejected-event rates.

Require minimum sample sizes and duration before paging. A p75 based on 12 canary visits is not a stable release verdict. Use confidence intervals or resampling appropriate to the metric distribution, and predefine the practical regression threshold. “Statistically detectable” at enormous volume can be operationally irrelevant; a large customer-impacting change may demand action before a formal interval narrows.

NIST's process-control guidance describes control charts as a statistic over sample or time with a center line and control limits, plus rules for nonrandom sequences. A release monitor can use that discipline, but recalculate baselines only from known-stable periods. Automatically teaching a control chart that a bad release is normal destroys the detector.

## Separate Error and Performance Denominators

Raw event counts combine traffic growth, sampling, retry behavior, and repeated throws. Prefer:

~~~text
first_party_error_visit_rate = visits_with_first_party_error / eligible_observed_visits
slow_visit_rate = visits_over_threshold / visits_with_metric
~~~

Report metric availability separately. INP exists only for visits with a qualifying interaction; a UI bug that prevents interaction could perversely lower the number of poor INP observations. Pair it with action-start/action-completion rates and JavaScript error visits.

Deduplicate repeated errors within a visit for rate calculations, but keep a bounded occurrence count for severity. Symbolicate before first-party classification and track extension-only, third-party-only, mixed, and opaque errors separately.

## Example Decision Workflow

When an alert fires:

1. Confirm ingestion, sampling-rule, SDK, and schema changes did not coincide.
2. Confirm the candidate's release tag and asset manifest are correct.
3. Compare candidate versus simultaneous control for the same time window.
4. Inspect traffic-class and metric-availability shifts.
5. Compare route, device, browser, lifecycle, and region distributions.
6. Check within-stratum deltas and a fixed-mix standardized distribution.
7. Inspect first-party errors and action completion.
8. Reproduce the largest affected stratum in a clean browser profile.
9. Pause or roll back based on predefined customer-impact guardrails.

Do not spend an hour proving the cause while a large canary is harming customers. Statistical investigation informs the decision policy; it does not replace a safe rollout and rapid rollback path.

## Guard Against Telemetry Regressions

A new SDK can change what is observed without changing the application. Run schema and capture checks during release:

- SDK initialization success by browser;
- selected, attempted, accepted, and stored event counts;
- sample-rate and rule version;
- Web Vitals metric availability;
- source-map coverage and first-party classification rate;
- payload bytes and rejected events;
- bfcache and prerender handling.

Keep a small synthetic canary that generates a known navigation, interaction, and test error. It validates the measurement path but must remain a separate traffic class.

## Official Documentation

- [Google `web-vitals` measurement library](https://github.com/GoogleChrome/web-vitals)
- [Chrome UX Report API and percentile data](https://developer.chrome.com/docs/crux/api)
- [MDN User-Agent Client Hints API](https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API)
- [Google's official Googlebot verification guidance](https://developers.google.com/search/docs/crawling-indexing/googlebot#verifying-googlebot)
- [Chrome extension content scripts and isolated worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [NIST Engineering Statistics Handbook: control charts](https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc31.htm)
- [W3C Navigation Timing Level 2](https://www.w3.org/TR/navigation-timing-2/)

## Conclusion

A blended frontend metric cannot identify a release regression by itself. Bind every observation to an immutable release, compare simultaneous cohorts, classify bots at a trusted boundary, and treat extension influence as bounded noise rather than something a page can enumerate away. Publish traffic mix and metric availability, compare within stable strata, and recompute standardized distributions against a fixed reference population. With those controls, a rollout decision rests on changed code and user impact—not on whichever visitors happened to arrive that hour.
