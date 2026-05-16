# Validation Summary: How to Set Up Node-Local DNS Cache on Talos Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- Kubernetes
- NodeLocal DNSCache
- CoreDNS
- kube-proxy
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Kubernetes documentation: Using NodeLocal DNSCache in Kubernetes Clusters: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes upstream NodeLocal DNSCache manifest: https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml
- Talos Linux MachineConfig reference for `machine.kubelet.clusterDNS`: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos Linux CLI reference for `talosctl patch machineconfig`: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Prometheus Operator API documentation for ServiceMonitor discovery semantics: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The NodeLocal DNSCache Corefile did not enable the CoreDNS `health` plugin, but the DaemonSet liveness probe queried `169.254.20.10:8080/health`. Added `health 169.254.20.10:8080` to make the probe endpoint real.
- The node-cache image tag was outdated compared with the current upstream Kubernetes sample manifest. Updated `registry.k8s.io/dns/k8s-dns-node-cache:1.23.0` to `1.26.8`.
- The post said the `kube-dns-upstream` Service bypasses iptables. The upstream manifest creates this Service for NodeLocal DNSCache upstream discovery/access, but it is still a Kubernetes Service. Removed the inaccurate "bypasses iptables" wording.
- The Talos kubelet DNS patch was shown as a strategic merge patch. Talos strategic merge patches append most lists, which could leave the old cluster DNS IP first. Replaced it with an RFC6902-style patch that sets `/machine/kubelet/clusterDNS` to `169.254.20.10`.
- The Talos command used a non-existent `--patch-file` flag. Updated the examples to use `--patch @talos-kubelet-dns-patch.yaml`, matching Talos documentation.
- The ServiceMonitor example selected a Service labeled `k8s-app: node-local-dns`, but the post did not define that Service. Added the headless metrics Service used by the upstream manifest pattern.

## Review Notes
- The Kubernetes documentation notes that kubelet `clusterDNS` only needs to be changed for IPVS mode when using the upstream manifest that listens on both the kube-dns service IP and the local IP in iptables mode. This post intentionally configures pods to use the local IP directly, which is valid, but readers should keep the kube-proxy-mode distinction in mind when adapting upstream manifests.
