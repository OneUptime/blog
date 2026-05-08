# Validation Summary: VPA Recommendation Only Mode with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Vertical Pod Autoscaler
- Flux CD HelmRelease and Kustomization resources
- Fairwinds VPA Helm chart
- kubectl JSONPath
- Prometheus Operator PrometheusRule
- kube-state-metrics

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA quickstart and API documentation: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler/docs
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Fairwinds VPA Helm chart values: https://github.com/FairwindsOps/charts/blob/master/stable/vpa/values.yaml
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The HelmRelease was placed in `kube-system` while referencing a likely `flux-system` HelmRepository without an explicit namespace. I changed the HelmRelease namespace to `flux-system`, set `targetNamespace: kube-system`, and made the chart source namespace explicit.
- The script labeled VPA `.status.recommendation.containerRecommendations[*].target` output as "Current requests", but that field contains VPA target recommendations, not the workload's existing requests. I changed the label to "Target recommendations".
- The Flux Kustomization `dependsOn` example used `name: vpa`, which would only work if there is a Flux Kustomization named `vpa`; Flux Kustomization dependencies reference other Flux Kustomization resources, not HelmRelease objects. I changed the example to depend on an `infrastructure` Kustomization that applies the VPA HelmRelease and CRDs.
- The PromQL example joined VPA recommendation metrics on a `pod` label, but kube-state-metrics VPA recommendation metrics are labeled by fields such as namespace, container, resource, target, and VPA name, not pod. I changed the query to join on `namespace`, `container`, and `resource`, and updated the annotation to reference the VPA name.
- The best-practices section stated that the VPA target is based on P90 usage. The official API documentation describes `target` as the recommended resources after applying container resource policy, without guaranteeing that simplified percentile. I replaced the statement with the API-backed description.

## Review Notes
The Prometheus rule is now syntactically aligned with kube-state-metrics labels, but it remains a dashboard starting point. For production-grade alerting, consider joining through workload ownership labels or using recording rules so comparisons are scoped to the exact VPA target instead of namespace/container averages.
