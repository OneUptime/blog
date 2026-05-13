# Validation Summary: How to Configure Sidecar Acceleration in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- eBPF SOCKMAP
- Istio
- Envoy sidecars
- FelixConfiguration
- calicoctl

## Sources Consulted
- Calico documentation: Accelerate Istio network performance, https://docs.tigera.io/calico/latest/networking/configuring/sidecar-acceleration
- Calico documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Enforce Calico network policy for Istio service mesh, https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Calico Felix configuration reference, https://docs.tigera.io/calico/latest/reference/felix/configuration

## Issues Found
- The post described sidecar acceleration as applying to generic service mesh sidecars, including Linkerd2-proxy. Calico's current documentation describes this feature for Istio Envoy sidecars, so the wording was narrowed to Istio Envoy.
- The post said the Calico eBPF dataplane was the prerequisite and used `bpfEnabled: true` as the configuration command. Calico documents sidecar acceleration as a separate Felix setting, `sidecarAccelerationEnabled: true`, with application layer policy and kernel requirements, so the prerequisite list and command were corrected.
- The post omitted Calico's production caveat. Official documentation states the feature is experimental and should not be used in production clusters, so the introduction and conclusion now reflect that limitation.
- The verification command checked only for a generic sidecar string after enabling the wrong setting. It now checks for `sidecarAccelerationEnabled`.

## Review Notes
The post remains a very minimal guide. A future improvement would be to link to the Calico application layer policy setup steps, because sidecar acceleration assumes that Istio integration is already configured.
