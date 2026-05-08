# Validation Summary: Monitoring Calico Alternate Registry Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- Container registries
- crane CLI
- Prometheus
- Prometheus Pushgateway
- kube-state-metrics
- Prometheus Operator PrometheusRule resources
- Bash
- Python JSON parsing
- Mermaid

## Sources Consulted
- Calico documentation: Configure use of your image registry - https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Kubernetes documentation: Field selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: kubectl events - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- kube-state-metrics pod metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Pushgateway documentation - https://github.com/prometheus/pushgateway
- go-containerregistry crane ls documentation - https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_ls.md
- go-containerregistry crane manifest documentation - https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_manifest.md

## Issues Found
- The registry synchronization example compared against `docker.io/calico`, but current Calico documentation uses `quay.io/calico` as the upstream source for Calico images. Changed `PUBLIC_REGISTRY` to `quay.io/calico`.
- The health check example defaulted to Calico `v3.27.0`, which is older than the current documented Calico version. Updated the example default to `v3.32.0` while keeping the environment variable override.
- The `CalicoImagePullFailures` PromQL expression used `increase()` on `kube_pod_container_status_waiting_reason`, which kube-state-metrics documents as a gauge. Replaced it with `max_over_time(...) == 1` and included both `ImagePullBackOff` and `ErrImagePull` waiting reasons.
- The Mermaid diagram showed Kubernetes events flowing through kube-state-metrics. kube-state-metrics exposes pod state metrics used by the alert, not Kubernetes event streams. Updated the diagram label to `Kubernetes Pod Status`.

## Review Notes
- The scripts assume Calico is running in the `calico-system` namespace, which is correct for operator-managed Calico installs but may need adjustment for manifest-based installs that run components in `kube-system`.
- Pushgateway is appropriate for the shell-based health check if it runs as a short-lived job, but long-running checks are usually better exposed via a scrape endpoint.
