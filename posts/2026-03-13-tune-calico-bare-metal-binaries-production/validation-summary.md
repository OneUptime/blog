# Validation Summary: How to Tune Calico on Bare Metal with Binaries for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico IPPool, FelixConfiguration, and BGPConfiguration resources
- Calico eBPF dataplane
- systemd environment variables
- Linux sysctl networking settings
- Prometheus metrics

## Sources Consulted
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source eBPF enablement guide: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Open Source eBPF install guide: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Open Source eBPF troubleshooting guide: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico Open Source BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico Open Source component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics

## Issues Found
- The IPPool patch used `spec.encapsulation`, which is an operator Installation API field, not an IPPool CRD field. Changed it to set `ipipMode` and `vxlanMode` to `Never`, which are the IPPool fields used to disable IP-in-IP and VXLAN encapsulation.
- The eBPF prerequisite said Linux kernel 5.3+. Current Calico Open Source documentation requires Linux kernel 5.10+ for supported distributions, with RHEL 8.4+ backports as a supported exception. Updated the prerequisite.
- The eBPF enablement step omitted the need to account for direct Kubernetes API server access and kube-proxy migration. Added a short prerequisite note before enabling `bpfEnabled`.
- The systemd tuning section described Felix refresh and metrics settings as startup performance tuning. Updated the wording to reflect what the environment variables configure.
- The BGP section claimed to tune keepalive timers but patched `keepOriginalNextHop`, which is not a valid current `BGPConfiguration` field. Changed the section to tune `nodeMeshMaxRestartTime`, a documented BGP graceful restart setting.
- The conclusion referred only to BGP behavior generically. Updated it to match the corrected graceful restart tuning.

## Review Notes
The sysctl values are syntactically valid Linux networking settings, but the exact values should still be benchmarked per hardware profile and workload. Enabling eBPF can be disruptive if kube-proxy migration and API server reachability are not handled before rollout.
