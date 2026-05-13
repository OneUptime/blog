# Validation Summary: Idle Resource Detection with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomizations
- Kubernetes CronJobs, Deployments, Jobs, Namespaces, and ResourceQuotas
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- kube-janitor TTL cleanup annotations
- kubectl and Flux CLI commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://v2-6.docs.fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux events documentation: https://fluxcd.io/flux/monitoring/events/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- kube-janitor documentation: https://codeberg.org/hjacobs/kube-janitor and https://github.com/hjacobs/kube-janitor
- Bitnami kubectl container listing: https://bitnami.com/stack/kubectl/containers

## Issues Found
- Flux pruning was described as removing any resource not present in Git. Updated the wording to clarify that pruning applies to stale resources previously applied by the relevant Flux Kustomization.
- The prerequisites implied metrics-server was required for the Prometheus-based resource usage examples. Clarified that Prometheus is required for these queries and metrics-server is optional for separate `kubectl top` checks.
- The request-rate examples implied `http_requests_total` would be universally available. Clarified that the query depends on applications exposing HTTP request counters with workload labels.
- The Prometheus recording rule for `deployment:idle:indicator` grouped by `pod` while describing deployment-level detection. Changed the aggregation to group by `namespace` and `deployment`.
- The CPU idle query did not aggregate per pod even though the text described idle pods. Updated both the ad hoc query and recording rule to aggregate by `namespace` and `pod`, and renamed the recording rule to `pod:low_cpu:7d`.
- The CronJob example used `python3` inside the `bitnami/kubectl` image without establishing that Python is available. Replaced the Python snippet with `kubectl` JSONPath output.
- The CronJob section claimed to report completed Jobs older than 7 days but only listed all Jobs sorted by creation time. Added shell filtering using Job `status.succeeded` and `status.completionTime`.
- The namespace TTL example used `janitor/ttl` as a label, but kube-janitor documents direct TTL configuration via annotation. Moved `janitor/ttl` to annotations.
- The namespace example used `flux.weave.works/*` annotations for general audit metadata. Replaced them with neutral example-prefixed annotations to avoid implying those are current Flux CD audit annotations.

## Review Notes
- In many clusters, teams may need to adapt the PromQL label names or join request metrics with Kubernetes metadata.
- `kubectl` and `flux` were not installed in the local review environment, so command verification was performed against official documentation rather than local `--help` output.
