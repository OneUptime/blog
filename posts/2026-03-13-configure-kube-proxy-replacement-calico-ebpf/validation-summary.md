# Validation Summary: How to Configure Kube-Proxy Replacement with Calico eBPF

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes kube-proxy
- Kubernetes Services
- Direct Server Return (DSR)
- iptables
- calicoctl

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Install in eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: About Calico eBPF - https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico Felix configuration reference - https://docs.tigera.io/calico-cloud/reference/resources/felixconfig

## Issues Found
- The prerequisites used outdated kernel guidance (`5.3+`, `5.8+ for full features`). Current Calico documentation lists Ubuntu 22.04, Red Hat 8.4 with kernel 4.18.0-305 or later, or another supported distribution with Linux kernel 5.10 or later, so the prerequisite was updated.
- The prerequisites did not mention the Kubernetes datastore driver requirement, direct API server access requirement, or IPVS-mode kube-proxy migration requirement. These were added because Calico eBPF service handling depends on Kubernetes service watches and Calico must reach the API server without relying on kube-proxy.
- The configuration flow disabled kube-proxy before showing the required direct API server endpoint configuration for manual migrations. A `kubernetes-services-endpoint` ConfigMap step was added before disabling kube-proxy.
- The eBPF enablement command only covered manifest-based installs. The operator-based `Installation` patch was added as the appropriate alternative for operator installs.
- The verification command `calico-node -bpf-nat-dump` is not the current documented syntax. It was changed to `calico-node -bpf nat dump`, with a preceding command to identify a `calico-node` pod.
- The iptables verification expected all `KUBE` matches to be zero, which is too broad. It was narrowed to kube-proxy service chains (`KUBE-SERVICES`, `KUBE-SVC`, and `KUBE-SEP`).
- The DSR explanation incorrectly said DSR eliminates asymmetric routing. It was corrected to say DSR sends return traffic directly from the backend pod's node and requires the underlying network to allow nodes to send traffic with each other's IPs.
- The Mermaid diagram labeled the lookup as `O1`; it was corrected to `O(1)`.
- The conclusion said the migration can be done without rebooting nodes. It was qualified because Calico documentation requires node restarts when switching kube-proxy from IPVS mode before enabling eBPF.

## Review Notes
The post is now technically valid for current Calico eBPF guidance. The command examples still assume a typical `calico-system` namespace for Calico node pods; manifest-based installations may use `kube-system` instead.
