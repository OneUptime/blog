# How Should You Sample Browser Sessions Without Losing Rare Errors and Slow Outliers?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Browser Monitoring, Real User Monitoring, Sampling, Session Replay, Observability

Description: Design browser telemetry sampling that controls cost while preserving rare errors, slow outliers, and representative user-experience trends.

---

A flat 1% browser-session sample is inexpensive and easy to explain. It is also very good at deleting the incidents you most need to investigate. An error affecting 1 in 10,000 sessions has only about a 9.5% chance of appearing in a random 1,000-session sample. A severe interaction that occurs only on one browser, route, or release can disappear for days even while aggregate dashboards look healthy.

The answer is not to record every detail from every visitor. Separate the signals by cost and purpose, make representative sampling deterministic, and reserve a second path for diagnostically valuable sessions. Keep low-cost counts and distributions broadly; sample expensive traces and replays selectively; and protect explicit error and latency budgets from being consumed by ordinary traffic.

## Start with Three Different Questions

“What is our sample rate?” is underspecified. A browser monitor normally makes at least three decisions:

1. **Was the session admitted to basic RUM?** This controls page views, actions, resources, errors, and performance events according to the SDK.
2. **Which operations were traced in detail?** A transaction or span sampler may discard child spans while retaining a summary transaction.
3. **Was a replay recorded or uploaded?** DOM snapshots and mutations are substantially more expensive than small metric events.

These rates may be nested rather than additive. Datadog, for example, documents `sessionReplaySampleRate` as a percentage of sessions already selected by `sessionSampleRate`. A configuration of 20 and 10 therefore produces replay for 2% of all sessions, not 10%. Elastic's browser agent applies `transactionSampleRate` to transactions and may retain less detailed information for unsampled transactions. Read the exact semantics for the SDK version you deploy.

Maintain a sampling contract in your telemetry schema:

| Field | Meaning |
| --- | --- |
| `rum_admitted` | basic session telemetry was selected |
| `detail_sample_rate` | probability used for detailed events |
| `replay_mode` | `none`, `baseline`, or `triggered` |
| `sampling_rule` | stable rule identifier, not free-form text |
| `release` | immutable deployed build identifier |

Without the applied rate, sampled counts cannot be weighted back to estimates. Never weight deliberately triggered error replays as if they were a random population sample.

## Keep a Representative Baseline

Use a stable, deterministic decision for the baseline rather than calling `Math.random()` on every page. Hash a random session identifier once, compare it with a threshold, and persist the decision only for the intended session lifetime. This prevents a multi-page visit from flickering in and out of the sample.

~~~javascript
async function chooseBaseline(sessionId, rate) {
  if (rate < 0 || rate > 1) throw new RangeError('rate must be 0..1');

  const bytes = new TextEncoder().encode(`browser-rum-v3:${sessionId}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const bucket = new DataView(digest.buffer).getUint32(0) / 2 ** 32;
  return bucket < rate;
}
~~~

Generate `sessionId` randomly; do not derive it from an email address, account ID, or other personal identifier. Version the hash namespace when changing sampling policy. The example makes a stable local decision, but use an SDK's supported sampler when one exists so its internal session, trace, and billing semantics remain correct.

A representative sample must cover the population you intend to describe. Check selection rates by low-cardinality strata such as route template, device class, browser family, geography region, authentication state, and release. If mobile Safari accounts for 12% of eligible sessions but 2% of the baseline, investigate SDK initialization and browser compatibility before trusting the aggregate.

## Add a Protected Rare-Signal Path

Baseline sampling estimates normal experience. A separate triggered path preserves evidence. Useful triggers include:

- a newly observed uncaught exception fingerprint;
- an error on a high-value workflow such as checkout or sign-in;
- a locally measured INP, LCP, or route duration above a defined threshold;
- repeated failed resource or API requests;
- a release canary cohort selected before page execution.

The critical design is **buffer, then decide**. Sentry's documented error-replay mode buffers recent replay events for a session that was not selected for full-session replay and uploads them only if an error occurs. A home-grown recorder needs the same bounded circular-buffer idea; starting observation after the exception cannot reconstruct the preceding interaction.

Do not promise “100% of errors” unless the implementation can support that claim. A browser can close, lose connectivity, hit an SDK rate limit, block the endpoint, or crash before upload. Say “eligible error sessions are selected at 100% before quota and delivery loss,” then monitor accepted and dropped counts at every stage.

## Preserve Slow Outliers Without Retaining Every Trace

Head sampling occurs before the system knows the final duration. It cannot preferentially retain slow work discovered later. W3C Trace Context explicitly recognizes probability, delayed-decision, and deferred-sampling approaches; its sampled flag is a propagation hint, not a guarantee that every receiver must retain data.

Use two layers for performance:

- Record a compact duration and dimensions for a broad population, preferably as an aggregatable event or distribution.
- Buffer detailed spans locally or make a tail decision downstream, retaining traces above a latency threshold and a random control group below it.

Browser memory is limited, so keep buffers bounded by bytes, event count, and age. Server-side tail sampling also needs all spans for a trace routed to a compatible decision point and held until the decision; it is not a free switch. If full tail sampling is unavailable, oversample known-risk routes and canary releases, then retain slow browser transactions through an SDK-supported callback if available.

Never calculate a p75 from only “slow” retained traces. That dataset is intentionally biased. Compute percentiles from the representative stream; use the triggered stream for diagnosis.

## Use Separate Quotas, Not One Shared Bucket

One global event cap lets a traffic spike evict the rare events it was meant to protect. Define independent budgets:

| Lane | Purpose | Example policy |
| --- | --- | --- |
| baseline | unbiased trends | deterministic 2% of eligible sessions |
| errors | debugging failures | first N per fingerprint, release, and hour |
| slow | latency diagnosis | threshold plus reservoir within each route |
| canary | release safety | fixed cohort at a higher detail rate |
| replay | visual context | baseline plus bounded triggered buffer |

Cap each lane per tenant and globally. Within the error lane, reserve capacity for new fingerprints so a noisy known error cannot consume everything. Within the slow lane, stratify by route template; otherwise the busiest endpoint dominates. When a quota is exhausted, emit a low-cost counter describing the drop reason rather than failing silently.

## Calculate Whether the Sample Can See the Event

For an event with per-session probability `p` and `n` independent sampled sessions, the probability of seeing it at least once is:

~~~text
P(observe at least one) = 1 - (1 - p)^n
~~~

If an error rate is 0.01% (`p = 0.0001`), approximately 29,956 sampled sessions are needed for a 95% chance of seeing at least one occurrence. This is why simply increasing a tiny random rate often remains inadequate. Triggering on the error changes the collection problem, while baseline sampling remains necessary to estimate how common the error is.

Use weighted denominators carefully. If 2% of ordinary sessions are sampled, one admitted baseline session represents roughly 50 eligible sessions under ideal independent sampling. A deliberately retained error session has no such weight. Store the lane and inclusion probability with every event so queries cannot accidentally mix the two.

## Roll Out Sampling Changes as Production Changes

Treat sampling rules like application code:

1. Define eligible traffic and exclusions explicitly.
2. Ship a rule version and immutable release identifier.
3. Compare client-selected, attempted, accepted, rate-limited, and stored counts.
4. Validate representation across a small set of bounded strata.
5. Inject a synthetic test error and slow interaction in a non-customer test route.
6. Confirm the error has preceding buffered context and the slow sample has usable spans.
7. Increase rates gradually and alert on bytes per session and SDK overhead.

Consent and privacy gates run before observability value. A rare error does not authorize recording a user who opted out, and triggered replay must use the same or stricter masking as baseline replay. Sampling reduces volume; it does not make captured data anonymous.

## Official Documentation

- [Sentry JavaScript Session Replay sampling](https://docs.sentry.io/platforms/javascript/session-replay/)
- [Datadog Browser RUM and Session Replay sampling](https://docs.datadoghq.com/real_user_monitoring/guide/sampling-browser-plans/)
- [Elastic RUM JavaScript agent configuration](https://www.elastic.co/docs/reference/apm/agents/rum-js/configuration)
- [Elastic RUM JavaScript performance tuning](https://www.elastic.co/docs/reference/apm/agents/rum-js/performance-tuning/)
- [OpenTelemetry sampling concepts](https://opentelemetry.io/docs/concepts/sampling/)
- [W3C Trace Context sampled flag](https://www.w3.org/TR/trace-context/#sampled-flag)
- [Google `web-vitals` measurement library](https://github.com/GoogleChrome/web-vitals)

## Conclusion

Use random session sampling to measure the population, not as the only route to diagnostic evidence. Keep compact performance distributions broadly, make baseline selection stable and measurable, and add protected error, slow, and canary lanes with their own quotas. Buffer expensive context before a possible trigger, label every event with its inclusion probability and rule, and never mix triggered samples into population percentiles. That design controls cost without making the rarest production failures invisible.
