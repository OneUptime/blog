# How to Fix Datadog OpenMetrics ignore_tags Rules That Leave Dynamic Kubernetes Tags Behind

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Datadog, Prometheus, Kubernetes

Description: Diagnose persistent Kubernetes tags by separating scrape labels from Agent tags and checking dynamic ignore_tags filtering in the installed Datadog check.

---

An `ignore_tags` rule can look correct while unwanted Kubernetes tags remain on an OpenMetrics metric. Start by identifying where the tag enters the pipeline. Tags supplied by Autodiscovery, labels read from the metrics body, and tags added elsewhere in the Agent do not all pass through the same filter.

Current Datadog OpenMetrics V2 source applies `ignore_tags` when setting dynamic tags. An older installation may behave differently, so this is both a configuration investigation and a version check.

## Confirm the metric and its collection path

Choose one metric, one target, and a short time range. Record the exact unwanted tag, including its value. Then inspect the resolved instance:

```bash
sudo datadog-agent configcheck
sudo datadog-agent status
```

In Kubernetes, run these in the Agent container responsible for the workload. A Cluster Check may execute on a runner rather than on the node Agent you happen to inspect.

Check whether another OpenMetrics instance or an official integration submits the same metric. Fixing one check cannot remove tags from a second producer. Use a temporary diagnostic namespace for a canary if overlapping configurations make attribution unclear.

## Match complete tags with regular expressions

For Agent-supplied tags such as `pod_name:checkout-7f4c9`, use patterns over the whole tag string:

```yaml
init_config: {}
instances:
  - openmetrics_endpoint: http://checkout-exporter:9108/metrics
    namespace: shop
    metrics:
      - checkout_queue_depth: queue.depth
    ignore_tags:
      - '^pod_name:.*$'
      - '^kube_replica_set:.*$'
    tags:
      - service:checkout
      - env:production
```

The [OpenMetrics configuration example](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example) defines these entries as regular expressions. Use the observed tag keys; do not assume every cluster supplies the same ones. Anchors make the intended match clear and avoid deleting an unrelated tag that merely contains a similar substring.

A standalone regex test can catch spelling and pattern errors:

```python
import re
patterns = [r"^pod_name:.*$", r"^kube_replica_set:.*$"]
tags = ["pod_name:checkout-abc", "service:checkout", "env:production"]
kept = [t for t in tags if not any(re.search(p, t) for p in patterns)]
assert kept == ["service:checkout", "env:production"]
```

That test verifies the expressions only. It does not establish where the Agent obtains or filters the live tags.

## Use label filters for labels in the payload

Fetch the endpoint and inspect the affected sample. If it contains `pod_name="checkout-abc"`, that is a metric label converted to a tag, not necessarily a dynamic Autodiscovery tag.

For an intentionally removable source label, use:

```yaml
exclude_labels:
  - pod_name
```

The source label filter is evaluated before `rename_labels`. Specify the original exported label name. If the tag comes from `share_labels`, review the copied label set and remove the unnecessary field at that join.

Before dropping any identity label, confirm that it will not collapse independent measurements into identical destination contexts. Removing a tag does not aggregate separate gauges correctly or deduplicate multiple scrapers. Preserve whatever dimensions distinguish measurements that must remain independent.

## Inspect dynamic filtering in the installed version

The [current V2 scraper implementation](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/scraper/base_scraper.py) filters both configured tags and tags passed to `set_dynamic_tags`. The [base check](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/base.py) forwards dynamic tag updates to its scrapers.

Compare these paths with the integration version installed in your Agent image. Do not conclude that current source guarantees behavior in every older Agent. If the deployed implementation filters initial tags but not later dynamic updates, upgrade to a tested version containing both paths. Record the image and integration versions used in the verification rather than guessing a minimum supported release.

## Verify a real lifecycle change

After applying the configuration, observe fresh points, then replace a canary pod so its dynamic tags change. Confirm that ignored keys remain absent and intended service/environment tags remain present.

If the tag still appears, compare debug submission output with the stored metric. A tag absent at check submission but present downstream points to another enrichment or collection path. Historical tags can also remain visible in discovery menus after new samples stop using them.

A durable fix survives pod replacement, uses the filter appropriate to the tag's source, and retains the identity needed for correct metric aggregation.
