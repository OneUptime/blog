# How to Validate Alert Correlation Rules Against Historical Incidents Before Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation Rules, Alert Rules, Incident Correlation, Prometheus, Alerting

Description: Replay versioned alert transitions against curated historical incidents, measure false merges and splits, and shadow new correlation rules before they affect paging.

---

A correlation rule can reduce notifications in a demo while merging two real outages or hiding the alert that responders needed. Validate it as a classification and state-machine change, not just as valid YAML. Historical replay should reproduce source timestamps, late delivery, state transitions, catalog topology, and the exact rule version.

Test ordinary Prometheus alert expressions separately from cross-source incident correlation. `promtool` can unit-test rule evaluations; it does not prove that a custom incident clustering engine joins and closes alerts correctly.

## Preserve a Replayable Event Log

For every raw alert transition, retain:

~~~text
source and tenant/account
source alert ID/fingerprint
complete labels and annotations
firing/resolved or source-native state
condition start and transition timestamps
ingestion/notification timestamps
generator URL or rule version
original payload reference
~~~

Also snapshot the service catalog, dependency graph, normalization map, maintenance windows, and deployed versions that existed during the incident. Replaying today's topology against last year's alerts leaks future knowledge into the result.

Redact secrets and personal data deterministically. If redaction replaces every service with the same token, correlation behavior changes. Preserve equality, inequality, cardinality, and tenant boundaries while anonymizing values.

## Build a Gold Incident Set

Select more than memorable major outages. Include:

- one dependency causing many downstream symptoms;
- two unrelated failures in one service at the same time;
- the same alert names in two environments or clusters;
- flapping and out-of-order firing/resolved transitions;
- a slow asynchronous cascade;
- deployment and maintenance noise;
- missing or malformed labels;
- monitoring-system failure;
- no-incident periods with high alert volume;
- an important alert that must never be inhibited.

Have incident responders label which source alerts belonged to each incident, which were actionable symptoms, and which were unrelated. Record uncertainty and disagreements. Ground truth is not magically perfect because it came from a postmortem; use adjudication and allow “ambiguous” cases that do not count as confident training wins.

Reserve incidents by time or service as a holdout set. Tuning and evaluating on the same examples overfits the exact outages already known.

## Define the Rule Contract

Version everything needed to produce a decision:

~~~yaml
rule_version: corr-v17
required_equal: [tenant, environment]
entity_match: same_service_or_declared_dependency
onset_window: 120s
idle_timeout: 10m
max_episode_duration: 4h
missing_key_policy: do_not_merge
inhibition_policy: suggest_only
catalog_snapshot: catalog-2026-08-31
~~~

This is an illustrative correlation schema, not an Alertmanager format. Document timestamp selection, tie-breaking, late-event handling, graph direction, missing values, reopening behavior, and hard boundaries. A rule is not reproducible if it depends on “current incident state” without recording how that state evolved.

## Unit-Test Source Alert Rules

Prometheus provides `promtool test rules` for recording and alerting rules. A minimal fixture can assert when an alert fires and which labels and annotations it produces:

~~~yaml
rule_files:
  - checkout.rules.yml
evaluation_interval: 1m
tests:
  - interval: 1m
    input_series:
      - series: 'checkout_errors_total{service="checkout",environment="production"}'
        values: '0 0 10 20 30 40 50'
    alert_rule_test:
      - eval_time: 6m
        alertname: CheckoutErrors
        exp_alerts:
          - exp_labels:
              service: checkout
              environment: production
              severity: page
~~~

Run `promtool check rules` for syntax and `promtool test rules` for behavior using the Prometheus version deployed in production. Include resets, missing series, staleness, zero denominators, `for` duration, and label aggregation. A source rule that drops the cluster label cannot be repaired reliably by the correlation layer.

## Replay with an Event-Time Simulator

Feed raw transitions in source-time order, then repeat with their original ingestion order. Advance a deterministic virtual clock; do not use wall time. Simulate:

- delayed and duplicated webhooks;
- out-of-order resolve events;
- notification grouping waits;
- catalog changes;
- correlation service restart and state recovery;
- clock skew and missing timestamps;
- an event arriving after an incident closes.

Capture every merge, split, inhibition suggestion, incident open/update/close, and notification. Each decision should cite matched keys, topology edge, time delta, rule version, and confidence. Preserve rejected-candidate reasons as well.

## Score Accuracy and Operational Cost

Measure at least:

~~~text
false merge rate       distinct gold incidents joined
false split rate       one gold incident divided
precision              correct joins / proposed joins
recall                  recovered gold joins / expected joins
notification reduction notifications avoided / baseline notifications
detection delay         proposed first page - baseline first actionable page
hidden-important rate   protected alerts not delivered as required
operator correction     manual split/merge/unsuppress decisions
~~~

Weight safety failures by severity. One missed page is not offset by a thousand correctly deduplicated warnings. Report results by service, source, incident type, and label completeness; aggregate accuracy can hide a poor region or newer monitoring integration.

## Shadow Before Suppressing Anything

Run the candidate rule alongside production. It should create proposed incidents and notifications without changing routing, silences, or source alert state. Let responders view the grouping explanation and mark join, split, wrong root candidate, or missing alert.

Compare shadow output with the actual incident timeline for several on-call cycles. Establish promotion gates such as zero hidden protected alerts, false-merge rate below an agreed threshold, bounded added detection delay, and adequate coverage of holdout cases. Roll out by team or service with a rapid disable switch.

After promotion, retain source events and continue sampling decisions for review. Alerts and system topology change, so validation is continuous rather than a one-time certificate.

## Conclusion

Production-safe correlation requires a replayable event history, curated incident truth, deterministic state-machine tests, and separate validation of source alert rules. Score false merges, false splits, detection delay, and hidden important alerts—not notification reduction alone. Shadow every policy with explainable decisions, holdout incidents, and a fast rollback before it can alter paging.

## Official References

- [Prometheus Unit Testing for Rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)
- [Prometheus Recording and Alerting Rule Configuration](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Alertmanager Alerts API](https://prometheus.io/docs/alerting/latest/alerts_api/)
- [Alertmanager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Grafana Alert State History](https://grafana.com/docs/grafana/latest/alerting/monitor-status/view-alert-state-history/)
