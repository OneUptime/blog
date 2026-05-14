# Validation Summary: How to Deploy CoreDNS Configuration with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- CoreDNS
- Kubernetes
- GitOps
- Kubernetes ConfigMaps
- Cluster Proportional Autoscaler
- NodeLocal DNSCache
- kubectl

## Sources Consulted
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS import plugin documentation: https://coredns.io/plugins/import/
- CoreDNS log plugin documentation: https://coredns.io/plugins/log/
- CoreDNS hosts plugin documentation: https://coredns.io/plugins/hosts/
- CoreDNS loadbalance plugin documentation: https://coredns.io/plugins/loadbalance/
- CoreDNS Kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- Kubernetes DNS horizontal autoscaling documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-horizontal-autoscaling/
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The custom DNS entries example used a separate `coredns-custom` ConfigMap, then imported `/etc/coredns/custom/*.server`. The default CoreDNS Deployment mounts the `coredns` ConfigMap under `/etc/coredns`, so the separate ConfigMap would not be visible without an additional Deployment volume mount. Updated the example to put `custom.server` in the same `coredns` ConfigMap and import `/etc/coredns/custom.server`.
- The DNS autoscaler manifest referenced `serviceAccountName: dns-autoscaler` but did not create the ServiceAccount, ClusterRole, or ClusterRoleBinding required for the cluster-proportional-autoscaler to list nodes and update scale subresources. Added the required RBAC resources and aligned the autoscaler arguments with the Kubernetes DNS autoscaling guidance.
- The NodeLocal DNSCache DaemonSet referenced a `node-local-dns` ConfigMap but did not define it, and omitted companion settings used by the upstream Kubernetes manifest. Added the ServiceAccount, ConfigMap Corefile, required mounts, `NET_ADMIN` capability, and updated the image to the current Kubernetes sample image.

## Review Notes
The CoreDNS plugin syntax, Flux Kustomization fields, and kubectl verification commands are technically valid. NodeLocal DNSCache still requires cluster-specific values such as the local DNS IP, cluster domain, and kubelet `--cluster-dns` behavior to be reviewed before production rollout.
