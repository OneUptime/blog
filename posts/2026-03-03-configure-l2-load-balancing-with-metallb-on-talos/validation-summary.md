# Validation Summary: How to Configure L2 Load Balancing with MetalLB on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB (Layer 2 mode)
- Talos Linux
- Kubernetes (LoadBalancer services, dual-stack)
- Helm (MetalLB chart)
- ARP / NDP (Neighbor Discovery)
- hashicorp/memberlist (used internally by MetalLB speaker)
- Prometheus / PrometheusRule (monitoring)
- kubectl, talosctl, arping (tooling)

## Sources Consulted
- MetalLB advanced L2 configuration docs — https://metallb.universe.tf/configuration/_advanced_l2_configuration/
- MetalLB Helm chart values.yaml — https://raw.githubusercontent.com/metallb/metallb/main/charts/metallb/values.yaml
- MetalLB Prometheus metrics docs — https://metallb.io/prometheus-metrics/
- MetalLB speaker source (`speaker/main.go`) for event reasons and the `metallb_speaker_announced` gauge definition
- MetalLB troubleshooting docs — https://metallb.io/troubleshooting/

## Issues Found
- **Fabricated Helm value `speaker.memberlist.deadman-period`.** The original post claimed you could tune failover speed by setting `speaker.memberlist.deadman-period: 5s` in the MetalLB Helm values. No such field exists in the MetalLB Helm chart (the only memberlist keys are `enabled`, `mlBindPort`, `mlBindAddrOverride`, and `mlSecretKeyPath`), and the speaker does not expose memberlist probe/suspicion intervals as configurable flags either — it uses the hashicorp/memberlist library defaults. Replaced the snippet with an accurate note about memberlist defaults and a valid `mlBindPort` example, preserving the author's tone.

## Review Notes
- IPAddressPool / L2Advertisement API (`metallb.io/v1beta1`) with `ipAddressPools`, `nodeSelectors`, and `interfaces` fields is correct per the official MetalLB docs.
- Prometheus metrics used in the alert rules are valid: `metallb_speaker_announced` is defined in the speaker source (subsystem `speaker`, name `announced`, with a `protocol` label), and `metallb_allocator_addresses_in_use_total` / `metallb_allocator_addresses_total` are both documented allocator metrics.
- Event reason `nodeAssigned` is the actual reason emitted by the MetalLB speaker when announcing from a node — `kubectl get events | grep nodeAssigned` works as described.
- `kubectl drain --ignore-daemonsets --delete-emptydir-data` uses the current (post-1.20) flag name; the older `--delete-local-data` is no longer needed here.
- The "default around 10 seconds" failover claim is roughly correct given memberlist's defaults (~1s probe interval with a suspicion multiplier of 4), but exact times depend on cluster size.
- IPv4/IPv6 range syntax (`192.168.1.200-192.168.1.230`, `fd00::200-fd00::230`) and the dual-stack Service `ipFamilyPolicy: PreferDualStack` are all valid.
- `talosctl dmesg --nodes $NODE_IP` is correct Talos CLI syntax.
