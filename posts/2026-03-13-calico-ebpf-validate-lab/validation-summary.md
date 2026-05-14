# Validation Summary: How to Validate eBPF in Calico in a Lab Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Tigera Operator
- eBPF dataplane
- kube-proxy
- Kubernetes NetworkPolicy
- bpftool / Calico BPF troubleshooting tools

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Felix configuration reference, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes documentation: kubectl run reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Echo Server documentation, https://ealenn.github.io/Echo-Server/pages/quick-start/docker.html

## Issues Found
- The prerequisites used outdated and overly broad Calico/kernel requirements. Updated the post to state that the operator-based commands require a Tigera Operator installation, and changed the generic kernel guidance to Calico's current 5.10+ baseline with the documented RHEL 8.4 backport exception.
- Step 2 claimed to configure Calico's BPF filesystem path, but the command actually patched unrelated Felix settings and did not set a mount path. Replaced it with the official `kubernetes-services-endpoint` ConfigMap flow so Calico can reach the API server directly before kube-proxy is disabled.
- The eBPF enablement command omitted `hostPorts:null`, which current Calico install guidance includes when switching an existing operator-managed cluster to BPF mode. Added it to the `Installation` patch.
- The verification step used a generic host `bpftool` listing. Replaced it with Calico's documented `calico-node -bpf nat dump` inspection method from a calico-node pod.
- The functional test could run before the client, server, or echo pods were ready. Added `kubectl wait` commands before executing connectivity checks.
- The source IP validation used a direct pod request while describing source IP preservation. Renamed the section to pod source IP visibility and adjusted the grep to match the echo server's IP-related response fields.
- The introduction promised basic performance benchmarking, but the post only provides performance checks and a load-test recommendation. Changed the wording to "basic performance checks."

## Review Notes
The guide now follows a coherent manual kube-proxy disablement path for an operator-managed Calico installation. Future improvements could add a separate external NodePort or LoadBalancer test for Calico eBPF's external client source IP preservation behavior, since the current echo-server check only validates pod-to-pod source IP visibility.
