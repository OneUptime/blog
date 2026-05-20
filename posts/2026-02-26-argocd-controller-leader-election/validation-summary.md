# Validation Summary: How to Handle ArgoCD Controller Leader Election

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD application controller
- Argo CD controller sharding
- Kubernetes StatefulSets
- Kubernetes Lease API
- Prometheus alerting
- kube-state-metrics

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD dynamic cluster distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD `argocd-application-controller` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD `argocd-cmd-params-cm` reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD v3.4.2 source and manifests: https://github.com/argoproj/argo-cd/tree/v3.4.2
- Argo Helm chart values and templates: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Kubernetes Lease documentation: https://kubernetes.io/docs/concepts/architecture/leases/
- kube-state-metrics project documentation: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The original post incorrectly described multiple Argo CD application controller replicas as an active-passive leader election group using Kubernetes Lease objects. Argo CD documentation and source show that application-controller horizontal scaling is cluster sharding based on StatefulSet pod ordinals and `ARGOCD_CONTROLLER_REPLICAS`. Rewrote the explanation and examples to cover controller sharding instead.
- The ConfigMap keys `controller.leader.election.lease.duration`, `controller.leader.election.renew.deadline`, and `controller.leader.election.retry.period` are not Argo CD application-controller parameters. Replaced them with the supported `controller.sharding.algorithm` parameter and the documented `ARGOCD_CONTROLLER_REPLICAS` configuration.
- The Lease inspection and deletion commands targeted a non-existent standard application-controller leader Lease. Replaced them with commands that inspect controller pods, StatefulSet replicas, `ARGOCD_CONTROLLER_REPLICAS`, and the sharding algorithm.
- The troubleshooting section recommended RBAC for Lease creation and deleting the Lease to force failover. Removed those recommendations and replaced them with shard-count, pod-health, restart, and rollout checks that match the application controller architecture.
- The Helm example manually set `ARGOCD_CONTROLLER_REPLICAS` through `controller.env`. The official Argo Helm chart sets that value from `controller.replicas`; updated the example to use `controller.replicas` and `configs.params.controller.sharding.algorithm`.
- The monitoring examples alerted on Lease-owner and Lease-renewal metrics for the application controller. Replaced them with StatefulSet readiness and controller restart alerts.

## Review Notes
The post now corrects the application-controller behavior but still lives under the original leader-election slug. Argo CD does support leader election for some components, such as the ApplicationSet controller when enabled, but that is separate from application-controller cluster sharding.
