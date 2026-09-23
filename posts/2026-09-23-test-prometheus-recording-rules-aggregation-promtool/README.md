# How to Test Prometheus Recording Rules and Aggregation Logic with `promtool`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Recording Rules, Monitoring

Description: Build executable Prometheus rule fixtures that verify output labels, counter resets, and missing samples before deploying aggregation changes.

A recording rule can parse correctly and still calculate the wrong service total. Summing counters before taking their rate, retaining an unintended label, or replacing missing data with zero can all survive a syntax check.

Use `promtool` for two complementary checks: validate the rule file's structure, then evaluate the rule against small synthetic inputs with explicit expected outputs. The examples below were exercised with Prometheus **3.14.0**; use the `promtool` version that matches your deployment when reproducing them.

## Define a small rule with a clear contract

Save this as `requests.rules.yml`:

```yaml
groups:
  - name: request_rates
    interval: 1m
    rules:
      - record: cluster_service:http_requests:rate5m
        expr: |
          sum by (cluster, service) (
            rate(http_requests_total[5m])
          )
```

The result should contain one requests-per-second value per cluster and service. `instance` should disappear, and each source counter should have its resets handled before aggregation. A descriptive recording name helps reviewers see that contract. [Recording-rule practices](https://prometheus.io/docs/practices/rules/)

Check the file before writing fixtures:

```bash
promtool check rules requests.rules.yml
```

This catches invalid rule syntax and expressions. It cannot prove that the chosen grouping matches the application's ownership model. [Recording-rule validation](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/#syntax-checking-rules)

## Test normal independent traffic

Create `requests.test.yml` beside the rule file:

```yaml
rule_files:
  - requests.rules.yml
evaluation_interval: 1m
tests:
  - name: independent_instances
    interval: 1m
    input_series:
      - series: 'http_requests_total{cluster="prod",service="checkout",instance="a"}'
        values: '0+60x5'
      - series: 'http_requests_total{cluster="prod",service="checkout",instance="b"}'
        values: '0+120x5'
    promql_expr_test:
      - expr: cluster_service:http_requests:rate5m
        eval_time: 5m
        exp_samples:
          - labels: 'cluster_service:http_requests:rate5m{cluster="prod",service="checkout"}'
            value: 3
```

The first series increases by 60 every minute; the second increases by 120. Their rates are one and two requests per second. The expected result checks the number and complete labels together, so accidentally retaining `instance` fails the test.

The expanding notation includes the initial sample: `0+60x5` means `0 60 120 180 240 300`. The official [unit-testing format](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/) specifies input intervals, evaluation times, expected samples, and special missing/stale values.

Run the test:

```bash
promtool test rules requests.test.yml
```

## Add a reset that an aggregate could hide

Append this second entry beneath `tests`, at the same indentation as the first entry:

```yaml
  - name: one_instance_resets
    interval: 1m
    input_series:
      - series: 'http_requests_total{cluster="prod",service="checkout",instance="a"}'
        values: '0 60 120 0 60 120'
      - series: 'http_requests_total{cluster="prod",service="checkout",instance="b"}'
        values: '0+120x5'
    promql_expr_test:
      - expr: cluster_service:http_requests:rate5m
        eval_time: 5m
        exp_samples:
          - labels: 'cluster_service:http_requests:rate5m{cluster="prod",service="checkout"}'
            value: 2.75
```

At five minutes, the range contains samples after its left boundary. For instance A, the observed reset-adjusted increase across those samples is 180 over 240 seconds, giving `0.75` per second. Instance B contributes `2`. This fixture intentionally includes an interval where A resets to zero; it does not claim unseen requests during that interval can be recovered.

If someone rewrites the rule to calculate a rate from an already summed counter, the continuing growth of B can conceal A's reset. The fixture protects the order of operations through a concrete behavioral expectation. [Counter-rate semantics](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)

## Assert absence when the evidence is insufficient

Append a third case:

```yaml
  - name: one_sample_is_insufficient
    interval: 1m
    input_series:
      - series: 'http_requests_total{cluster="prod",service="checkout",instance="a"}'
        values: '10'
    promql_expr_test:
      - expr: cluster_service:http_requests:rate5m
        eval_time: 0m
        exp_samples: []
```

A single counter sample cannot establish this rate. Expecting an empty result protects against introducing a convenient zero that hides startup or collection gaps.

Extend the suite with another service and another cluster to test isolation. Use `_` for a missing sample and `stale` for staleness when those conditions matter to the production query. Test actual emitted labels rather than only an aggregate scalar, particularly for rules used in alert routing.

## Keep the fixture tied to the operational question

Avoid copying the production expression into a second expression and treating their equality as the only assertion. Both can share the same mistake. Use small values whose expected meaning can be explained independently, including unequal traffic and different reset times.

Run both commands in CI when the rule changes. If a rule depends on other rule groups, include those files and specify evaluation order where required. Passing these fixtures establishes the modeled aggregation behavior; still inspect deployed evaluation failures and source coverage, which an offline test cannot observe.
