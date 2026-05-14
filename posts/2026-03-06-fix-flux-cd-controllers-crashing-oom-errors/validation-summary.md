# Validation Summary: How to Fix Flux CD Controllers Crashing with OOM Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Helm Controller
- Source Controller
- Prometheus Operator
- kube-state-metrics

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux vertical scaling guide: https://fluxcd.io/flux/installation/configuration/vertical-scaling/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Operator rule documentation: https://prometheus-operator.dev/kube-prometheus/kube/developing-prometheus-rules-and-grafana-dashboards/

## Issues Found
- The source-controller concurrency example set `--concurrent=2` while describing it as a reduction from the default. Flux documents the source-controller default as `2`, so the example now uses `--concurrent=1`.
- The source-controller patch described `--storage-adv-addr` as limiting artifact storage size. Flux documents this flag as the advertised storage address, not a storage-size control. Removed the incorrect comment.
- The GitRepository ignore example said ignored paths reduce clone size. Flux documents `.spec.ignore` as excluding files from the archived artifact, so the comment now says artifact size.
- The sparse checkout example used `.spec.include` without the required `repository` field and described it as sparse checkout. Flux documents sparse checkout as `.spec.sparseCheckout`, so the example now uses `sparseCheckout`.
- The full-clone explanation over-specified tag behavior. Updated it to the documented claim that branch references perform shallow clones and that other reference configurations may require more Git history.

## Review Notes
The memory sizing table is operational guidance rather than an official Flux sizing matrix; actual limits should be tuned with workload metrics. The PrometheusRule example assumes Prometheus Operator, kube-state-metrics, and container/cAdvisor metrics are installed and scraped.
