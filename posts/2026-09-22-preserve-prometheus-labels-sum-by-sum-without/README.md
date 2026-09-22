# How to Preserve the Labels You Need with `sum by()` and `sum without()`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Labels, Monitoring

Description: Choose explicit output labels or explicit removed labels for PromQL sums, and test how new dimensions, missing labels, and binary operations affect the result.

---

`sum by` and `sum without` can produce identical values today and different results after an exporter adds a label. The choice determines how your query behaves when the input schema changes.

Use `by` when the result must have a specified set of dimensions. Use `without` when the result should retain every dimension except a known set being aggregated away. Neither choice supplies missing labels or decides whether summing a metric is meaningful.

## Work through a small label set

Assume these three gauge samples represent independent connection pools:

```text
pool_connections{service="checkout",region="west",instance="a"} 3
pool_connections{service="checkout",region="west",instance="b"} 7
pool_connections{service="checkout",region="east",instance="c"} 5
```

To retain only the service:

```promql
sum by (service) (pool_connections)
```

The result is `{service="checkout"} 15`. Even though all three samples agree on the service, `region` and `instance` are discarded because they were not listed.

To remove only the instance dimension:

```promql
sum without (instance) (pool_connections)
```

The result has two samples: west with 10 and east with 5. The [operator reference](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators) defines this label behavior. For this input, `sum by (service, region)` produces the same output.

## Decide how a future label should behave

Now the exporter adds `pool="primary"` and `pool="reporting"`.

`sum by (service, region)` still combines pools into the same regional total. `sum without (instance)` preserves `pool` and creates a result for each pool. Both calculations can be useful, but they answer different questions.

| Requirement | Useful starting expression |
| --- | --- |
| One stable output per service and region | `sum by (service, region) (...)` |
| Preserve new instrumentation dimensions automatically | `sum without (instance, pod) (...)` |
| One total across everything selected | `sum(...)` |

The final option also removes environment, tenant, and cluster dimensions. Narrow the selector if those must not be combined. For counters, put `rate(metric[5m])` inside the sum so resets are handled on the original series.

## Find missing grouping labels

A `by` clause does not create a label that the input lacks. If all relevant samples omit `service`, asking for `sum by (service)` gives a result without a service label rather than inventing the expected application name.

This diagnostic selects samples where the label is absent or empty:

```promql
pool_connections{service=""}
```

Prometheus explains this matching behavior in its [selector documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/#instant-vector-selectors). An apparently valid service-level total may contain an unlabeled group, so inspect results in table form before putting them behind dashboard legends.

Also verify label availability at the query layer. A label added during remote write or by a remote query system might not exist on series queried locally in the source Prometheus server.

## Align the two sides of arithmetic

To compute pool utilization, aggregate both used connections and capacity with the same grouping:

```promql
sum by (service, region) (pool_connections)
/
sum by (service, region) (pool_capacity)
```

This assumes both metrics cover the same pools and capacity is positive. If one side uses `without(instance)` and unexpectedly retains `pool` while the other uses `by(service, region)`, the label sets differ and default vector matching may return no result. Diagnose the two sides separately before adding a matching modifier.

Adding `group_left` is appropriate only after establishing a deliberate many-to-one relationship. It is not a repair for having accidentally aggregated the two metrics to different meanings.

## Make the output shape testable

Save this as `labels.test.yml` and run `promtool test rules labels.test.yml`:

```yaml
tests:
  - interval: 1m
    input_series:
      - series: 'pool_connections{service="checkout",region="west",instance="a"}'
        values: '3'
      - series: 'pool_connections{service="checkout",region="west",instance="b"}'
        values: '7'
      - series: 'pool_connections{service="checkout",region="east",instance="c"}'
        values: '5'
    promql_expr_test:
      - expr: sum by (service) (pool_connections)
        eval_time: 0m
        exp_samples:
          - labels: '{service="checkout"}'
            value: 15
      - expr: sum without (instance) (pool_connections)
        eval_time: 0m
        exp_samples:
          - labels: '{service="checkout",region="west"}'
            value: 10
          - labels: '{service="checkout",region="east"}'
            value: 5
```

The [Prometheus unit-testing format](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/) compares the expected labels as well as values. Extend this fixture with the proposed `pool` label and a sample missing `service` before changing a shared recording rule. That captures the compatibility decision directly and prevents a label change from silently altering every dependent dashboard.
