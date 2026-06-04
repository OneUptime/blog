# Validation Summary: How to Use Goldilocks VPA Recommendations to Right-Size Kubernetes Pod Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler
- Fairwinds Goldilocks
- Helm
- kubectl
- Prometheus / PromQL
- Prometheus Operator PrometheusRule
- Python

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA installation documentation: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md
- Kubernetes autoscaler VPA quickstart documentation: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- VPA API reference generated from kubernetes/autoscaler: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md
- Goldilocks documentation: https://goldilocks.docs.fairwinds.com/
- Goldilocks installation documentation: https://goldilocks.docs.fairwinds.com/installation/
- Goldilocks advanced usage documentation: https://goldilocks.docs.fairwinds.com/advanced/
- Fairwinds Goldilocks Helm chart values: https://raw.githubusercontent.com/FairwindsOps/charts/master/stable/goldilocks/values.yaml
- kubectl set resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction implied underprovisioned pods are directly throttled by low requests. Updated it to distinguish CPU throttling from CPU limits and memory eviction/OOM behavior.
- The VPA installation section omitted the metrics-server prerequisite. Added a note before the VPA install commands because VPA requires a metrics source.
- The descriptions of VPA lower and upper bounds were too absolute. Updated them to match the VPA API semantics: lower bound is a minimum recommendation below which performance or availability is likely affected, and upper bound is a maximum recommendation above which resources are likely wasted.
- The manual recommendation command piped a JSONPath map rendering into `jq`, which would not reliably produce valid JSON. Replaced it with `kubectl get vpa -o json | jq ...`.
- The Deployment YAML snippets omitted the required selector and matching pod template labels. Added them so the examples are valid `apps/v1` Deployment manifests.
- The batch update script applied the first container recommendation to all containers in a deployment. Updated it to read the recommended container name and pass `--containers` to `kubectl set resources`.
- The Python savings script assumed every Deployment explicitly sets `spec.replicas` and `resources.requests`. Updated it to use Kubernetes' default replica count of 1 and to handle missing requests.
- The Python savings script excluded deployments without recommendations from the recommended total, inflating savings. Updated it to carry current cost forward when no recommendation exists.
- The Python savings script described monthly costs but multiplied savings by 30 and 365. Updated the output to report monthly savings directly and annual savings as monthly savings multiplied by 12.
- The gradual rollout snippet claimed it updated 10% of pods, but `maxUnavailable: 0` and `maxSurge: 1` rolls pods one at a time rather than enforcing a 10% canary. Updated the comments to match the strategy.
- The conclusion claimed organizations typically achieve 30-50% cost reduction without a source in the post. Reworded it to the supportable claim that Goldilocks recommendations can reduce overprovisioned waste.

## Review Notes
The Helm chart's current default has `dashboard.enabled: true`, so the explicit `--set dashboard.enabled=true` remains valid but is redundant. Goldilocks' current chart has `vpa.enabled: false` by default, which is consistent with installing VPA separately before installing Goldilocks.
