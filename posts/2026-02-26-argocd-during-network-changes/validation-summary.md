# Validation Summary: How to Handle ArgoCD During Network Changes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes NetworkPolicy
- CoreDNS
- Istio
- Linkerd
- Prometheus and Prometheus Operator
- Kubernetes Ingress

## Sources Consulted
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes API server ports documentation: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Kubernetes HostAliases documentation: https://kubernetes.io/docs/tasks/network/customize-hosts-file-for-pods/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio annotation reference: https://istio.io/latest/docs/reference/config/annotations/
- Linkerd automatic proxy injection documentation: https://linkerd.io/2.19/features/proxy-injection/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- Linkerd namespace opt-out was placed under `metadata.labels`, but Linkerd injection is controlled with the `linkerd.io/inject` annotation. Moved the Linkerd key to `metadata.annotations`.
- The pod-level Istio opt-out used the deprecated `sidecar.istio.io/inject` annotation. Changed it to the current `sidecar.istio.io/inject` label and kept Linkerd as an annotation.
- The post implied Istio automatic injection always mutates Argo CD-managed workload specs and causes drift. Clarified that Istio automatic injection usually happens at pod creation time and the ignore-differences configuration is only needed when managed resources are actually mutated.
- The Kubernetes API server traffic examples only allowed port `6443`, while the post later tests `kubernetes.default.svc:443` and Kubernetes commonly exposes the in-cluster API service on port `443`. Updated the diagram and NetworkPolicy to include both `443` and `6443`.
- The post re-enabled auto-sync unconditionally after migration, which can fail to restore the previous policy details such as prune or self-heal. Updated the comment to instruct restoring the previously recorded sync policy and left the automated command as the example for applications that were automated before.
- The Git connectivity alert used `argocd_git_request_total{grpc_code!="OK"}`, but `grpc_code` is not a documented label for that Argo CD repo-server metric. Replaced it with the documented `argocd_git_fetch_fail_total` metric.
- The cluster connectivity alert used `argocd_cluster_info{connection_state!="Successful"}`, but the documented connectivity metric is `argocd_cluster_connection_status`. Replaced the expression with `argocd_cluster_connection_status == 0`.

## Review Notes
The NetworkPolicy examples are valid but intentionally broad in places, such as allowing API server egress with `0.0.0.0/0` on API ports and allowing Git egress to any destination on ports `443` and `22`. In production, readers should narrow those destinations to their actual API server, DNS, Git, Helm, Redis, and ingress paths where their CNI supports the needed selectors or CIDRs.
