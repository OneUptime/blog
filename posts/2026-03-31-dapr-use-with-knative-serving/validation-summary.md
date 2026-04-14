# Validation Summary: How to Use Dapr with Knative Serving

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Knative Serving (scale-to-zero serverless on Kubernetes)
- Knative Eventing (ApiServerSource)
- Kourier (Knative networking layer)
- Prometheus (observability / metrics scraping)
- Kubernetes

## Sources Consulted
- Knative Serving autoscaling scale bounds documentation: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- Knative Serving autoscaling targets documentation: https://knative.dev/docs/serving/autoscaling/autoscaling-targets/
- Knative Eventing ApiServerSource documentation: https://knative.dev/docs/eventing/sources/apiserversource/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Prometheus relabel_config documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config

## Issues Found

### 1. Incorrect Knative autoscaling annotation keys (lines 56-57)
- **What was wrong:** The annotations used camelCase format (`autoscaling.knative.dev/minScale` and `autoscaling.knative.dev/maxScale`), which is a legacy format.
- **What was changed:** Updated to the current standard hyphenated format: `autoscaling.knative.dev/min-scale` and `autoscaling.knative.dev/max-scale`.
- **Why:** The official Knative documentation uses the hyphenated form as the standard. The camelCase form is legacy and may not be supported in future versions.

### 2. Misleading ApiServerSource name (line 83)
- **What was wrong:** The ApiServerSource resource was named `kafka-trigger`, which implies it is related to Kafka. However, ApiServerSource watches Kubernetes API server events and has nothing to do with Kafka.
- **What was changed:** Renamed from `kafka-trigger` to `k8s-event-source` to accurately reflect its purpose.
- **Why:** The misleading name could confuse readers into thinking this is a Kafka integration, when it is actually watching Kubernetes API events.

### 3. Prometheus relabel_configs missing regex filter (lines 126-133)
- **What was wrong:** Both `keep` actions in the Prometheus relabel_configs did not specify a `regex` field. The default regex in Prometheus is `(.*)`, which matches empty strings. This means ALL pods would be kept (including those without the specified label/annotation), defeating the purpose of the filter.
- **What was changed:** Added `regex: .+` to both `keep` actions to ensure only pods with a non-empty value for the specified label/annotation are kept.
- **Why:** Without the explicit regex, the scrape config would scrape all pods instead of only Knative and Dapr pods, leading to unnecessary metric collection and potential confusion.

## Review Notes
- The ApiServerSource example watches `v1/Event` resources, which is technically valid but unusual. A more typical example might watch `Pod` or `Deployment` resources. However, watching Events is a valid use case and the YAML is structurally correct.
- The claim that Knative provides "Automatic HTTPS via cert-manager" is slightly simplified — cert-manager must be installed and configured separately alongside the `net-certmanager` controller. This is not wrong but could benefit from a note in a future revision.
- The Dapr sidecar annotations, traffic splitting YAML, and Knative Service structure are all correct and follow current best practices.
- The Knative Serving and Kourier installation URLs for v1.16.0 follow the correct release URL patterns.
