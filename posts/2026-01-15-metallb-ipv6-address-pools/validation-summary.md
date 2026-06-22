# Validation Summary: How to Set Up MetalLB with IPv6 Address Pools

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- MetalLB (v0.13+ CRD-based configuration, install manifest v0.14.9)
- Kubernetes (LoadBalancer services, dual-stack, `ipFamilyPolicy`/`ipFamilies`)
- IPv6 / dual-stack networking (NDP, address planning)
- BGP and ECMP (BGPPeer, BGPAdvertisement, BFDProfile)
- FRRouting (FRR) router configuration
- Prometheus / Grafana (ServiceMonitor, MetalLB metrics, PromQL)
- Kubernetes NetworkPolicy

## Sources Consulted
- MetalLB Usage docs (specific IP assignment, address-pool annotation, `metallb.io/loadBalancerIPs`): https://metallb.io/usage/
- MetalLB Configuration docs (CRDs, IPAddressPool, L2Advertisement, BGPPeer): https://metallb.io/configuration/
- MetalLB Prometheus Metrics reference (exact metric names): https://metallb.io/prometheus-metrics/
- MetalLB GitHub issue confirming `metallb_speaker_announced` as the L2 announce metric: https://github.com/metallb/metallb/issues/1972
- MetalLB installation docs (`kubectl wait --selector=app=metallb`): https://metallb.io/installation/
- RFC 4291 (IPv6 addressing architecture — hexadecimal group requirement)

## Issues Found
1. **Invalid IPv6 addresses with non-hexadecimal characters.** Several example configs used placeholder strings that are not valid IPv6 (groups must be hex digits only), so the manifests would be rejected by the API server:
   - `2001:db8:prod::100-2001:db8:prod::1ff` → `2001:db8:1234:1000::100-2001:db8:1234:1000::1ff`
   - `2001:db8:stage::100-2001:db8:stage::1ff` → `2001:db8:1234:2000::100-2001:db8:1234:2000::1ff`
   - `2001:db8:dev::100-2001:db8:dev::1ff` → `2001:db8:1234:3000::100-2001:db8:1234:3000::1ff`
   - `2001:db8:rack1::1` → `2001:db8:1234:a001::1`
   - `2001:db8:rack2::1` → `2001:db8:1234:a002::1`
   - `2001:db8:allowed::/48` → `2001:db8:1::/48`
   - `2001:db8:office::/64` → `2001:db8:2:1::/64`
2. **Deprecated annotation prefix.** The `metallb.universe.tf/` annotation prefix is deprecated in favor of `metallb.io/`. Updated both occurrences of `metallb.universe.tf/address-pool` to `metallb.io/address-pool`.
3. **Deprecated `spec.loadBalancerIP`.** The "Service with Specific IPv6 Address" example used `spec.loadBalancerIP`, which is deprecated in the Kubernetes API (and cannot express multiple IPs for dual-stack). Replaced it with the recommended `metallb.io/loadBalancerIPs` annotation.
4. **Non-existent Prometheus metric.** `metallb_layer2_leader` is not a metric MetalLB exposes. Replaced both occurrences (the metrics list and the Grafana `changes()` query) with `metallb_speaker_announced{protocol="layer2"}`, which is the actual metric reporting which node is announcing a given service IP in Layer 2 mode.

## Review Notes
- The address-allocation and BGP metrics referenced in the post (`metallb_allocator_addresses_in_use_total`, `metallb_allocator_addresses_total`, `metallb_bgp_session_up`, `metallb_bgp_announced_prefixes_total`) all match the official metrics reference and were left unchanged.
- BGPPeer fields (`peerAddress`, `peerASN`, `myASN`, `holdTime: 90s`, `keepaliveTime: 30s`, `bfdProfile`, `nodeSelectors`) and the BFDProfile fields (`receiveInterval`, `transmitInterval`, `detectMultiplier`, `minimumTtl`) are valid; duration strings such as `90s` are accepted by the CRD.
- The `kubectl wait --selector=app=metallb` selector matches the label MetalLB applies to its pods and aligns with the official install docs.
- The "IPsec built into the protocol" claim in the intro table is a common simplification; IPsec support was originally mandatory for IPv6 but was downgraded to a recommendation by RFC 6434. Not a blocking error, but worth softening in a future revision.
- The install manifest URL pins MetalLB v0.14.9 and the recommended `config/manifests/metallb-native.yaml` path; if the post is refreshed later, bump to the then-current release tag.
- `ipFamilyPolicy`/`ipFamilies`, `RequireDualStack`/`PreferDualStack`/`SingleStack`, and the dual-stack service ordering semantics are all accurate for current Kubernetes.
