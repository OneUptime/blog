# Validation Summary: How to Fix ArgoCD Controller OOMKilled Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD application controller
- Kubernetes workloads, resources, events, and OOMKilled behavior
- Prometheus metrics and alerting
- Go runtime `GOMEMLIMIT`
- Cilium custom resources

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD declarative setup and resource inclusion/exclusion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd-cm.yaml` reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD dynamic cluster distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD orphaned resources documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/orphaned-resources/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes memory resource documentation: https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Go runtime documentation for `GOMEMLIMIT`: https://go.dev/src/runtime/extern.go

## Issues Found
- The post used `deployment/argocd-application-controller` as the default controller workload. Argo CD's documented HA sharding path uses the `argocd-application-controller` StatefulSet, so the memory inspection and patch examples now default to StatefulSet and mention Deployment as an installation-specific alternative.
- The memory-limit YAML was presented as a full `apps/v1` Deployment, but it omitted required Deployment fields such as `spec.selector`. It is now described as a patch fragment for the existing workload, with direct `kubectl patch` commands.
- The sharding section described `ARGOCD_CONTROLLER_REPLICAS` as the Deployment-based approach. Official Argo CD docs describe it for StatefulSet-based sharding, while dynamic cluster distribution for Deployment-based controllers uses `ARGOCD_ENABLE_DYNAMIC_CLUSTER_DISTRIBUTION` and reads the Deployment replica count. The section was corrected.
- The sharding section recommended `round-robin` without noting its feature maturity. Official Argo CD docs mark `round-robin` sharding as alpha, so a production-readiness caveat was added.
- The reconciliation settings were shown under `argocd-cmd-params-cm`. Official docs place `timeout.reconciliation` and `timeout.reconciliation.jitter` in `argocd-cm`; the ConfigMap name and default interval note were corrected.
- The orphaned resource monitoring example used `orphanedResources: null`. Official docs show enabling it by setting `spec.orphanedResources`; disabling it is best represented by removing that field. The snippet was changed accordingly.
- The metrics port-forward command targeted a Deployment. Official Argo CD metrics docs expose controller metrics via `argocd-metrics:8082/metrics`, so the command now port-forwards `service/argocd-metrics`.

## Review Notes
The memory sizing table remains an operational guideline rather than an official formula. Actual memory requirements depend heavily on cluster count, resource cardinality, manifest size, enabled features, and Argo CD version.
