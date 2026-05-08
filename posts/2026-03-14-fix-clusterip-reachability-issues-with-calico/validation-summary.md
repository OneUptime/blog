# Validation Summary: Fixing ClusterIP Reachability Errors in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Services and ClusterIP networking
- Kubernetes kube-proxy
- Kubernetes Endpoints and EndpointSlices
- Calico Open Source
- Calico Felix configuration and eBPF dataplane
- calicoctl
- kubectl

## Sources Consulted
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation update: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Calico eBPF dataplane enablement documentation: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico eBPF troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico resource definitions reference: https://docs.tigera.io/calico/latest/reference/resources/overview

## Issues Found
- The eBPF/kube-proxy guidance said kube-proxy and Calico eBPF simply conflict. Updated it to match Calico documentation: Calico can replace kube-proxy in eBPF mode, kube-proxy should normally be disabled, and if kube-proxy must keep running then `bpfKubeProxyIptablesCleanupEnabled` should be disabled to prevent iptables rule flapping.
- The endpoint guidance said empty endpoints always mean a pod selector issue. Updated it to include pod readiness and manually managed service backends, because Kubernetes Services can use EndpointSlices and can also exist without selectors.
- The Calico pod checks assumed the `calico-system` namespace. Updated those commands to query `calico-node` pods across all namespaces so they also work for manifest-based installs that commonly use `kube-system`.
- The recovery checklist used `calicoctl ipam check`, which is documented for Calico Enterprise but not in the current Calico Open Source IPAM command reference. Replaced it with the documented Open Source command `calicoctl ipam show --show-blocks`.
- The recovery checklist labeled `calicoctl node status` as generic node-to-node connectivity. Updated the label to node-to-node BGP status, matching the command's documented output.
- The recovery checklist used HTTP against `kubernetes.default.svc/healthz`, but the default Kubernetes API Service is exposed on HTTPS port 443. Updated the probe to use `https://kubernetes.default.svc/healthz` with `--no-check-certificate`.

## Review Notes
The post is technically relevant and contains runnable troubleshooting commands. The `kubectl get endpoints` examples are still valid, but Kubernetes documentation now recommends EndpointSlices as the scalable API for endpoint tracking, so a future revision could add EndpointSlice-specific checks.
