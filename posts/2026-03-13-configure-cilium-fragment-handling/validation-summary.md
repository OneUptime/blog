# Validation Summary: Configure Cilium Fragment Handling

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF datapath maps
- IP fragmentation
- Path MTU Discovery
- Hubble

## Sources Consulted
- Cilium Fragment Handling documentation: https://docs.cilium.io/en/latest/network/concepts/fragmentation/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Helm chart values source for v1.19.4: https://github.com/cilium/cilium/blob/v1.19.4/install/kubernetes/cilium/values.yaml
- Cilium Helm ConfigMap template source for v1.19.4: https://github.com/cilium/cilium/blob/v1.19.4/install/kubernetes/cilium/templates/cilium-configmap.yaml
- Cilium option definitions source for v1.19.4: https://github.com/cilium/cilium/blob/v1.19.4/pkg/option/config.go
- Cilium troubleshooting documentation for `cilium-dbg monitor --type drop`: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium monitoring metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium performance tuning documentation for Packetization Layer PMTUD: https://docs.cilium.io/en/stable/operations/performance/tuning/

## Issues Found
- The Helm command used `enableIPv4FragmentsTracking=true`, which is not the Cilium chart value for enabling IPv4 fragment tracking. I changed it to `fragmentTracking=true`, matching the chart's `fragmentTracking` value that renders `enable-ipv4-fragment-tracking`.
- The Helm and ConfigMap examples used `fragmentmapDynamicSizeRatio` / `bpf-fragment-map-dynamic-size-ratio`. Cilium exposes `bpf-fragments-map-max` for fragment tracking map capacity; the documented dynamic BPF map ratio applies to other large BPF maps, not the fragment tracking map. I replaced the examples with `extraConfig.bpf-fragments-map-max=65536` and `bpf-fragments-map-max: "65536"`.
- The diagnostic command used `cilium monitor --type drop`. Current Cilium documentation uses `cilium-dbg monitor --type drop`, typically executed inside a Cilium agent pod in Kubernetes. I updated the command accordingly.
- The PMTU section only configured the Linux host sysctl and then checked for `mss` in Cilium config. Cilium has a Helm value, `pmtuDiscovery.enabled`, for sending ICMP fragmentation-needed replies. I added that setting and changed verification to `grep -i pmtu`.
- The best-practices section referred to `bpf_fragment_map` utilization. Cilium documents the map pressure metrics for `cilium_ipv4_frag_datagrams` and `cilium_ipv6_frag_datagrams`, so I updated the metric names.

## Review Notes
- Cilium enables IPv4 and IPv6 fragment tracking by default in current documentation, and the feature is marked beta. The post now says to verify or enable it if it has been disabled rather than implying it is always off.
- The MTU Helm value `MTU=1450` is valid, and the VXLAN 50-byte overhead example is technically reasonable for a 1500-byte underlay.
