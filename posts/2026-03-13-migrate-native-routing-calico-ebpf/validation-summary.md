# Validation Summary: How to Migrate to Native Routing with Calico eBPF Safely

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- eBPF dataplane
- kube-proxy replacement
- kubectl
- calicoctl
- iperf3

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Felix configuration, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: System requirements for Kubernetes, https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: calicoctl patch, https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The introduction overstated that Calico eBPF intercepts packets at the earliest possible point and bypasses broad kernel layers. Updated it to describe Calico eBPF as using TC/TCX and, for some paths, XDP hooks, with service handling and policy enforcement avoiding large iptables rule sets.
- The native routing explanation implied eBPF itself eliminates VXLAN or IP-in-IP encapsulation. Updated it to clarify that overlays are avoided when the underlying network can route pod traffic directly, and that VXLAN is preferred over IP-in-IP when an overlay is required.
- The prerequisites listed Linux kernel 5.3+ and Calico v3.13+. Updated this to current Calico eBPF requirements: supported distributions with kernel 5.10+, or Red Hat v8.4 kernel 4.18.0-305 or above, and Kubernetes datastore driver support.
- The enablement commands disabled kube-proxy before configuring Calico to reach the API server directly. Added the documented Tigera Operator automatic enablement command and the required manifest-install ConfigMap step before disabling kube-proxy.
- The calicoctl patch command used `--type merge`, but Calico's calicoctl documentation notes JSON merge patch is not implemented for that option. Removed the `--type merge` flag and used the documented `--patch` form.
- The verification command `calico-node -bpf-log-level Debug` was not a valid kube-proxy replacement verification command. Replaced it with Calico log verification for `BPF enabled` and `calico-node -bpf nat dump` to inspect the BPF NAT table.

## Review Notes
- The benchmark commands are syntactically valid as a simple smoke benchmark, but a production-grade benchmark should wait for pods to become Ready, pin client/server placement, and include latency and CPU metrics as well as throughput.
- The post assumes the Calico node pods are in `calico-system`, which is correct for operator installs. Manifest installs may use `kube-system`, so readers should adjust the namespace if their installation differs.
