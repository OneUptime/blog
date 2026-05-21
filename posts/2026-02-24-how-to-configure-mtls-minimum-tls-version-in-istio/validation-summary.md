# Validation Summary: How to Configure mTLS Minimum TLS Version in Istio

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Istio
- Envoy sidecars
- Kubernetes
- mTLS
- TLS 1.2 and TLS 1.3
- IstioOperator
- Gateway
- DestinationRule
- kubectl
- istioctl

## Sources Consulted
- Istio official task: Istio Workload Minimum TLS Version Configuration: https://istio.io/latest/docs/tasks/security/tls-configuration/workload-min-tls-version/
- Istio official reference: MeshConfig `meshMTLS`, `tlsDefaults`, and `TLSConfig`: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio official reference: Gateway `ServerTLSSettings`: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio official reference: DestinationRule `ClientTLSSettings`: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- NIST SP 800-52 Rev. 2: Guidelines for TLS Implementations: https://csrc.nist.gov/pubs/sp/800/52/r2/final
- PCI Security Standards Council FAQ on SSL and early TLS: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/does-pci-dss-define-which-versions-of-tls-must-be-used/

## Issues Found
- The post listed `DestinationRule` as a place to configure TLS minimum protocol versions. Istio `DestinationRule` TLS settings do not expose `minProtocolVersion`; changed the overview to point to mesh-wide TLS defaults for non-`ISTIO_MUTUAL` outbound TLS connections.
- The egress Gateway example used `mode: ISTIO_MUTUAL` together with `minProtocolVersion`. Istio documents that other TLS option fields should be empty when `ISTIO_MUTUAL` is used; removed `minProtocolVersion` from that example and added a note to configure Istio-managed mTLS through `meshMTLS`.
- The DestinationRule section implied TLS version settings apply in DestinationRules for `SIMPLE` or `MUTUAL` mode. Replaced that with an `IstioOperator` `meshConfig.tlsDefaults.minProtocolVersion` example for non-`ISTIO_MUTUAL` TLS defaults.
- The mesh-internal cipher-suite snippet did not actually include `cipherSuites`. Added the `cipherSuites` field under `meshConfig.meshMTLS` with Istio-supported TLS 1.2 cipher suite names.

## Review Notes
The remaining commands and configuration examples are consistent with current Istio documentation. Gateway `minProtocolVersion`, `maxProtocolVersion`, and `cipherSuites` are valid fields; mesh mTLS `minProtocolVersion` is valid and defaults to TLS 1.2. TLS 1.3 cipher suites are fixed by the protocol and are not configurable through the TLS 1.2 cipher-suite lists.
