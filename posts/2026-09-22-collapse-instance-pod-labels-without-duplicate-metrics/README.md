# How to Safely Aggregate Prometheus `instance` and `pod` Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, PromQL, Labels, Kubernetes, Data Quality

Description: Aggregate instance and Pod dimensions at query time while preserving source identities, detecting duplicate collection, and avoiding relabeling collisions.

---

A service dashboard rarely needs one line per Pod, but the monitoring database still needs to distinguish those Pods. Removing identity labels during ingestion can merge independent measurements into the same series. Query aggregation lets you choose which values belong together while retaining their original histories.

Start by separating two cases: different Pods doing different work, and different scrapers observing the same work. The first can often be summed. The second requires fixing collection or using a backend's replica deduplication.

## Define the intended output

Suppose an application exports request counters with these ingested labels:

```text
checkout_requests_total{cluster="west",namespace="shop",service="checkout",pod="a",instance="10.0.0.1:9000",status="200"}
checkout_requests_total{cluster="west",namespace="shop",service="checkout",pod="b",instance="10.0.0.2:9000",status="200"}
```

The lines illustrate identities, not complete exposition samples. Decide whether the output should retain `status`. Also retain the environment or tenant boundary wherever combining it would make the result misleading.

For one rate per service and status:

```promql
sum by (cluster, namespace, service, status) (
  rate(checkout_requests_total{job="checkout-pods"}[5m])
)
```

This removes `instance`, `pod`, and any other unlisted labels from the result. `rate` runs first because each Pod counter has its own reset history. The [Prometheus function reference](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate) explains that order.

If the exporter introduces a `route` label next month, this query still combines routes. That may be the desired contract. If routes must remain separate, include them explicitly or use an appropriate `without` expression after reviewing the entire label set.

## Do not use label removal as addition

A relabeling rule that drops `instance` and `pod` does not add sample values. If those labels distinguish two otherwise identical series, their removal destroys that distinction. Depending on timestamps and collection paths, this can surface as conflicting samples or as one misleading time series assembled from multiple processes.

Prometheus's [relabeling documentation](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config) explicitly requires preserving uniqueness when using `labeldrop` or `labelkeep`. Use those actions for redundant labels whose removal does not merge distinct identities. For an aggregate, use a query or recording rule.

The same issue applies to `label_replace`: changing a Pod name into a deployment name is a label transformation, not an aggregation. Preserve the source identity and aggregate with the intended operation afterward.

## Find duplicate collection before summing

Inspect the raw series and the target list. A duplicate ServiceMonitor, overlapping scrape jobs, or two collection paths into a remote backend can inflate a correct-looking sum.

For a counter whose instrumentation dimensions are exactly `status`, use this diagnostic:

```promql
count by (cluster, namespace, pod, status) (
  checkout_requests_total{service="checkout"}
) > 1
```

More than one series per grouping is a prompt to investigate, not proof of duplication. A Pod may legitimately expose multiple containers, endpoints, or routes. Add all intended instrumentation dimensions and inspect the labels omitted by the grouping. A count over several jobs can reveal that the same endpoint is being scraped twice.

For an HA backend, distinguish a scraper replica from an application replica. [Thanos Query documents deduplication](https://thanos.io/tip/components/query.md/) using configured replica labels. Application Pods serving independent requests must remain separate inputs; configuring their identity as a deduplication label would discard real traffic.

## Record the aggregate when it is reused

Save a recording rule after checking the live expression:

```yaml
groups:
  - name: checkout-rollups
    rules:
      - record: service_status:checkout_requests:rate5m
        expr: |
          sum by (cluster, namespace, service, status) (
            rate(checkout_requests_total{job="checkout-pods"}[5m])
          )
```

Load it through the `rule_files` setting and check it with `promtool check rules` as described in the [recording-rule documentation](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/). Consumers then query the recorded series directly. It is already a rate; applying `rate` again gives the wrong meaning.

Recording the result reduces repeated query work but does not remove the raw input series from storage. Retaining those inputs makes it possible to inspect restarts, missing Pods, and changed label sets later.

## Test values and labels together

Use two independent Pods contributing 3 and 7 requests per second. The service total should be 10. Add a second scraper copy of both and verify that the collection or backend policy prevents the apparent total of 20. Then restart one Pod and check that per-series rate handling still applies.

Finally add a new label such as `route`. Inspect both the numeric value and every output label. A dashboard that still shows the same total may nevertheless have lost a dimension required by an alert or created unexpected extra lines. Treat that output shape as part of the aggregation's behavior.
