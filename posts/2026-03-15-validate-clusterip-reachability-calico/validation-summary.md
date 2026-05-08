# Validation Summary: How to Validate the Resolution of ClusterIP Reachability Issues with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services and ClusterIP networking
- Kubernetes DNS for Services
- Kubernetes EndpointSlices and legacy Endpoints
- kube-proxy
- Calico and Calico Felix
- calicoctl
- iptables
- kubectl

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Virtual IPs and Service Proxies reference: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Helm installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico eBPF dataplane documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico eBPF troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf

## Issues Found
- Several `kubectl run` examples used `-- <command>` without `--command`, which sets container arguments rather than overriding the container command. Added `--command`, `--restart=Never`, and `--attach --rm` to the one-shot diagnostic pods so the examples run the intended command, return output, and clean up correctly.
- The `kubectl run --overrides` examples omitted `apiVersion` from the inline override object. Added `apiVersion: v1` to match kubectl's documented override format.
- The endpoint validation used the legacy `Endpoints` API as the primary check. Kubernetes v1.33 deprecates the Endpoints API in favor of EndpointSlices, so the post now checks EndpointSlices first and keeps Endpoints as an optional legacy compatibility check.
- The Calico pod namespace was presented as always `calico-system`. Calico operator installs use `calico-system`, but other install methods can use `kube-system`; the post now notes that caveat.
- The iptables validation implied that every cluster should have `KUBE-SERVICES` NAT rules. This is only appropriate for kube-proxy iptables mode and does not cover kube-proxy nftables/IPVS mode or Calico eBPF service handling. The post now scopes the command to iptables mode and generalizes the checklist item.
- The infrastructure and persistence sections assumed kube-proxy is always present. Calico eBPF can replace kube-proxy, so the kube-proxy checks are now explicitly scoped to clusters that use kube-proxy.
- The cross-service validation command used `--field-selector spec.type=ClusterIP`, but Kubernetes Services do not support `spec.type` as a field selector. Replaced it with JSON output filtered through `jq`.
- The cross-service sample included headless Services because they are also type `ClusterIP` with `clusterIP: None`. The `jq` filter now excludes headless Services for a ClusterIP reachability check.

## Review Notes
The guide is technically relevant and useful. Some checks still depend on cluster-specific choices such as kube-proxy mode, Calico dataplane mode, install namespace, and whether sampled services expose HTTP endpoints; these are noted where they affect command correctness.
