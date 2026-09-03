# Fix Time-Window Alert Correlation Keys and Boundaries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation Rules, Incident Correlation, Alert Deduplication, Alerting

Description: Prevent false incident merges by combining time proximity with stable entity keys, topology, state-aware episodes, and hard correlation boundaries.

---

Time-window correlation merges unrelated incidents because proximity is evidence of coincidence, not identity. A five-minute window will happily join a database latency alert in production with a separate deployment failure in staging unless the rule also requires compatible scope and relationship.

Use time as one feature after tenant, environment, entity, and symptom normalization. Add state-aware episode boundaries and a hard maximum duration so a constantly noisy system cannot absorb every later alert.

## Replace One Global Window with a Composite Rule

A defensible candidate test looks like:

~~~text
same tenant/account
AND same environment
AND compatible region/cluster scope
AND (same service OR known dependency relationship)
AND compatible symptom or causal direction
AND temporal distance within the rule-specific allowance
AND neither event crosses a hard episode boundary
~~~

Every predicate must have an explicit behavior for missing values. “Missing equals missing” is dangerous: two unclassified alerts should not merge just because both lack `cluster`. Quarantine incomplete alerts, route them broadly, or lower correlation confidence rather than treating absence as agreement.

Start with exact stable keys:

- tenant or cloud account;
- `deployment.environment.name` or normalized environment;
- canonical service/resource ID;
- region and cluster when failures are isolated by them;
- alert/symptom family;
- deployment or workflow ID for genuinely change-scoped alerts.

Do not key on display text, dynamic pod names, trace IDs, raw URLs, or exception messages. Those values either drift or split one incident into excessive fragments.

## Use Several Kinds of Time

Alert pipelines expose different timestamps:

~~~text
condition_start   when the source says the condition began
transition_time   when the source changed alert state
observed_time     when a collector or gateway saw it
ingested_time     when the correlation system stored it
notified_time     when a message reached responders
~~~

Use source condition/transition time for incident chronology when trustworthy. Use ingestion time to detect delay and choose how long to accept late events. Never order root-cause candidates solely by notification time.

Clock skew, rule evaluation intervals, `for` durations, group waits, retries, and batch delivery all shift timestamps. Estimate the distribution per source. A Prometheus alert evaluated each minute and held `for: 5m` naturally appears later than a direct application error, even if it describes the same failure.

Define asymmetric allowances where causality has direction. A dependency failure may precede caller symptoms by two minutes; a caller symptom arriving ten minutes before the dependency failure is weaker evidence.

## Model Episodes with Two Clocks

Use both an idle gap and a hard cap:

~~~text
incident.opened_at
incident.last_related_activity
idle_timeout = rule-specific quiet period
max_episode_duration = absolute limit
~~~

Related alerts can extend `last_related_activity`, but never move `opened_at`. Close a candidate after the quiet period and required recovery conditions. Force a new episode at the maximum duration even if one low-value alert keeps flapping; link it to the prior episode for continuity.

Apply a recovery boundary. If user-impact indicators were healthy for a meaningful stabilization interval, a later firing event should usually open a new incident. A notification repeat is not a new episode, and an out-of-order late event should attach historically without reopening a newer closed state.

## Tune Windows by Relationship

One window cannot serve every signal pair:

| Relationship | Typical evidence for allowance |
| --- | --- |
| same alert resend | source ID/state transition, not time alone |
| replicas of one service | evaluation and scrape skew |
| dependency to caller symptom | measured propagation delay |
| deployment to regression | rollout/exposure timeline |
| async workflow stages | workflow ID plus expected stage latency |
| unrelated alerts in same service | do not merge on time alone |

Compute allowances from historical percentiles, then cap them using operational meaning. If 99% of confirmed dependency symptoms arrive within 90 seconds, a two-minute allowance is explainable. A 30-minute window chosen only to increase notification reduction is not.

For long-running workflows, require the stable workflow ID and causal stage metadata. Extending a generic service window to several hours will merge separate customer operations and routine background failures.

## Add Topology Without Treating It as Truth

A service dependency graph can permit adjacent entities to correlate, but require direction consistent with symptoms. If database B is downstream of API A, a B availability failure followed by A error rate is plausible. A CPU alert on an unrelated upstream service is not automatically part of the incident.

Graphs derived from traces can miss edges because of sampling, broken propagation, or asynchronous boundaries. Catalog graphs can be stale. Record graph source, version, edge direction, and confidence. Never allow a low-confidence inferred edge to silence a high-severity alert.

## Explain Every Merge

Store a decision record:

~~~json
{
  "incident": "INC-2041",
  "alert": "alert-8f2",
  "rule_version": "corr-17",
  "matched": {
    "environment": "production",
    "cluster": "eu-west-primary",
    "dependency_edge": "checkout->orders-db",
    "onset_delta_seconds": 42
  },
  "confidence": 0.91
}
~~~

Also store rejected candidate reasons. Operators need to split a false merge and feed that correction back into testing. Correlation should never mutate or delete the original alert timeline.

## Replay Historical Incidents

Create labeled test cases including two simultaneous incidents in one service, the same failure in different clusters, cross-environment name collisions, a slow dependency cascade, a noisy week-long alert, missing labels, clock skew, delayed events, and recovery followed by recurrence.

Measure false merges, false splits, time to first incident, pages reduced, high-severity alerts hidden, and correction rate. Optimize false merges separately from notification count; a rule that creates one quiet but incoherent incident is worse than several accurate notifications.

Deploy in shadow mode and compare proposed clusters with actual responder decisions. Version rules and catalog snapshots so replays remain deterministic.

## Conclusion

Time windows work only inside strong semantic boundaries. Require tenant, environment, normalized entity, plausible topology, and compatible symptoms; use source time with known skew; and bound episodes with both quiet-period and maximum-duration rules. Relationship-specific windows plus explainable replay testing reduce noise without turning every nearby alert into the same incident.

## Official References

- [Prometheus Alertmanager: Grouping and Inhibition](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Alertmanager Configuration: Timing and Inhibition](https://prometheus.io/docs/alerting/latest/configuration/)
- [Alertmanager Alerts API: Alert Identity and Timestamps](https://prometheus.io/docs/alerting/latest/alerts_api/)
- [OpenTelemetry Service Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [Grafana Tempo Service Graphs](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/)
