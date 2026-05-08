# Validation Summary: How to Monitor Calico Alternate Registry Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source / Tigera Operator
- Kubernetes
- kubectl
- Kubernetes CronJob
- Kubernetes Secrets and image pull secrets
- kube-state-metrics
- Prometheus and Prometheus Operator PrometheusRule
- Bash

## Sources Consulted
- Calico documentation: Configure use of your image registry, https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Calico documentation: Installation resource reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes documentation: Images and ImagePullBackOff behavior, https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes documentation: kubectl get reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: JSONPath support, https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes documentation: CronJob, https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes documentation: kube-apiserver --event-ttl option, https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- kube-state-metrics pod metrics documentation, https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- PrometheusRule API reference, https://docs.okd.io/4.12/rest_api/monitoring_apis/prometheusrule-monitoring-coreos-com-v1.html

## Issues Found
- The Calico Installation API reference states that `spec.registry` must end with a slash. Updated the drift-detection expected value from `registry.internal.example.com` to `registry.internal.example.com/`.
- The credential monitoring section described Secret age as credential expiry detection. Kubernetes Secret creation time does not prove registry credential expiry, so the section now describes credential rotation monitoring instead.
- Calico's alternate registry documentation says private registry pull secrets should be configured in the `tigera-operator` namespace. Updated the Secret age script namespace from `calico-system` to `tigera-operator`.
- Fixed a minor alert annotation grammar issue from "has been not ready" to "has not been ready."

## Review Notes
The Prometheus metrics used in the alert examples are valid kube-state-metrics pod metrics. The CronJob manifest uses the stable `batch/v1` API and a valid Job pod `restartPolicy`. The `bitnami/kubectl:latest` image is functional for examples, but pinning a digest or version would be preferable in production.
