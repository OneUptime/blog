# Validation Summary: How to Tune Calico on Kind for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Kind
- FelixConfiguration
- Prometheus metrics
- WireGuard
- kubectl
- calicoctl

## Sources Consulted
- Calico: Configure MTU to maximize network performance - https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico: FelixConfiguration resource reference - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico: Encrypt in-cluster pod traffic - https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico: calicoctl patch reference - https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes: kubectl patch reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The MTU command used `veth_mtu: "1440"` immediately after explaining IPv4 IP-in-IP overhead. Calico documents IPv4 IP-in-IP as a 20-byte overhead, so a 1500-byte underlay should use 1480. Updated the command to use `1480`.
- The MTU command omitted `--type merge`. `kubectl patch` defaults to strategic merge for built-in resources, so the original command was likely to work, but the Calico documentation example uses an explicit merge patch. Added `--type merge` for clarity and consistency with official guidance.
- The metrics Service did not set `clusterIP: None`. Calico's documented Felix metrics Service is headless so Prometheus can discover all Felix endpoints. Added `clusterIP: None`.
- The WireGuard note said WireGuard requires Linux kernel 5.6+. Calico documents that WireGuard is included in Linux 5.6+ and backported to some earlier distribution kernels. Updated the note and added the MTU caveat that IPv4 WireGuard on a 1500-byte network should use 1440.

## Review Notes
Calico can auto-detect MTU when the enabled encapsulation modes are correctly configured, so manually setting `veth_mtu` should be treated as an override. The resource limit patch is syntactically valid but assumes the `calico-node` container is at index 0 in the DaemonSet, which is true for common manifest installs but less robust than patching by container name through an installation-specific configuration mechanism.
