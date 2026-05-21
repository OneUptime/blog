# Validation Summary: How to Uninstall Istio Completely from Your Kubernetes Cluster

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Istio
- Kubernetes
- kubectl
- istioctl
- Helm
- Kubernetes CRDs, admission webhooks, namespaces, RBAC, and CNI plugins

## Sources Consulted
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio install with Helm documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio ambient install with Helm documentation: https://istio.io/latest/docs/ambient/install/helm/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Kubernetes kubectl debug node documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The post said `istioctl uninstall --purge` removes `istio-system` namespace resources. Istio's current documentation says `--purge` removes Istio resources, including shared cluster-scoped resources, but the control plane namespace is not removed by default. Updated the explanation accordingly.
- The Helm uninstall sequence did not mention `ztunnel`, which is installed as a separate chart for ambient mode. Added an optional ztunnel uninstall command before removing the base chart.
- The selector cleanup examples for ClusterRoles and ClusterRoleBindings used two `-l app=...` flags, which creates an impossible AND selector for two different values of the same label. Replaced them with set-based selectors using `app in (istio-reader,istiod)`.
- The reinstall section used `istioctl verify-install`, which is not listed in the current official `istioctl` command reference. Replaced it with the documented `istioctl x precheck` command for checking installation readiness.

## Review Notes
The explicit webhook and CRD names can vary by Istio version, revision, and install method, so the surrounding discovery commands remain important before deletion. The guide is otherwise consistent with current Istio and Kubernetes documentation.
