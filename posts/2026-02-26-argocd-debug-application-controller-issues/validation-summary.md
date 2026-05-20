# Validation Summary: How to Debug ArgoCD Application Controller Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Argo CD application controller
- Kubernetes
- kubectl
- Prometheus metrics
- jq
- Bash

## Sources Consulted
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD high availability and application-controller sharding docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD argocd-cm configuration example: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/argocd-cm-yaml/
- Argo CD argocd-cmd-params-cm configuration example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD resource exclusion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD terminate operation command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_terminate-op/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post used `deployment/argocd-application-controller` in several commands. Official Argo CD manifests normally run the application controller as a StatefulSet, so I changed patch, rollout, scaling, and exec examples to use the StatefulSet or controller pod, and changed log examples to use the controller label selector.
- The reconciliation default was described as 180 seconds. Current Argo CD documentation describes the default as 120 seconds plus up to 60 seconds of jitter, so I updated the default and included `timeout.reconciliation.jitter` where relevant.
- The HA troubleshooting section described application-controller leader election and a Lease named `argocd-application-controller`. Argo CD application-controller HA uses sharding across controller replicas, so I replaced the Lease commands with shard and replica-count checks.
- The metrics port-forward examples targeted the controller Deployment. The official metrics endpoint is exposed through `argocd-metrics:8082`, so I updated the examples to port-forward `svc/argocd-metrics`.
- The CPU reduction example excluded Kubernetes Events, but modern Argo CD already excludes `events.k8s.io/*` by default. I changed the example to show excluding a noisy custom resource instead.

## Review Notes
- The commands assume the standard `argocd` namespace and default controller name. Helm installations or renamed components may require adjusted resource names or labels.
- The resource limits and processor counts are operational examples, not universal sizing guidance. Production values should be validated with real metrics and workload size.
