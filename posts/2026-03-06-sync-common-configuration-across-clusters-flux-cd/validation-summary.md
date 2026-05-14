# Validation Summary: How to Sync Common Configuration Across Clusters with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Kustomization
- Flux HelmRelease
- Flux HelmRepository
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Admission
- Kubernetes RBAC
- Kubernetes Namespace and LimitRange resources
- Prometheus Operator PrometheusRule
- kube-prometheus-stack

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The default deny NetworkPolicy comment said it applied to every namespace, but the manifest is scoped to the `apps` namespace. Updated the comment to say it applies to the `apps` namespace.
- The HelmRelease referenced a `prometheus-community` HelmRepository but did not define that source. Added a Flux `HelmRepository` resource pointing to `https://prometheus-community.github.io/helm-charts` so the HelmRelease source reference is complete.
- The CrashLoopBackOff alert used `rate(kube_pod_container_status_restarts_total[15m]) > 0`, which detects recent container restarts rather than the current CrashLoopBackOff waiting reason. Updated it to use `kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} == 1`.
- The developer RBAC example said developers cannot access secrets directly, but then granted `get` and `list` on `secrets`. Removed the secrets rule so the example matches the stated access model.

## Review Notes
- The Flux `Kustomization` `dependsOn`, `postBuild.substitute`, `postBuild.substituteFrom`, and `force` fields are current and valid for the Flux `kustomize.toolkit.fluxcd.io/v1` API.
- The Flux `HelmRelease` `install.createNamespace`, `install.crds`, and `upgrade.crds` fields are valid, and `CreateReplace` is an accepted CRD policy.
- Kubernetes Pod Security Admission namespace labels, NetworkPolicy selectors, RBAC resources, and LimitRange structure are valid.
- YAML syntax for all 11 YAML snippets in the post was checked successfully with PyYAML.
