# Validation Summary: How to Configure Cipher Suites in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio MeshConfig and IstioOperator
- Envoy TLS configuration
- TLS 1.2 and TLS 1.3 cipher suites
- OpenSSL
- nmap ssl-enum-ciphers
- Kubernetes kubectl
- FIPS-oriented TLS configuration

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio Global Mesh Options / MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy TLS parameters reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/common.proto
- Envoy listener TLS statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- RFC 8446, The Transport Layer Security (TLS) Protocol Version 1.3: https://www.rfc-editor.org/rfc/rfc8446.html
- NIST SP 800-52 Rev. 2: https://csrc.nist.gov/pubs/sp/800/52/r2/final
- Local OpenSSL 3.0.13 command behavior for cipher-list validation

## Issues Found
- The TLS 1.3 explanation said TLS 1.3 only uses ECDHE for key exchange. RFC 8446 separates key exchange and authentication from cipher-suite names, and TLS 1.3 can also use PSK modes, so the wording was changed to say these are negotiated separately from the cipher suite.
- The TLS 1.3 section implied a universal fixed set of three TLS 1.3 cipher suites. RFC 8446 defines additional TLS 1.3 cipher suites, while Envoy commonly exposes the three listed suites. The wording was changed to scope the list to the suites commonly enabled by Envoy and to state that Istio's `cipherSuites` setting applies only to TLS 1.0 through TLS 1.2 negotiation.
- The mesh-wide MeshConfig example claimed to configure cipher suites but only set `minProtocolVersion`. Added the supported `meshMTLS.cipherSuites` field with the intended TLS 1.2 cipher suite list.
- The OpenSSL examples used `-cipher` without forcing TLS 1.2. Since `-cipher` does not configure TLS 1.3 cipher suites, `-tls1_2` was added to make the test match the Istio `cipherSuites` behavior.
- The weak-cipher OpenSSL example used `RC4-SHA`, which modern OpenSSL 3 builds may reject locally before testing the server. It was changed to `AES128-SHA`, a legacy TLS 1.2 RSA cipher suite that OpenSSL can still parse and that the recommended Istio configuration rejects.
- The performance section said ECDSA certificates are faster for key exchange than RSA certificates. That confuses certificate authentication with ECDHE key exchange, so it was changed to say ECDSA certificates usually make TLS authentication faster.

## Review Notes
The Gateway `cipherSuites`, `minProtocolVersion`, and OpenSSL-format cipher names match the current Istio Gateway reference. EnvoyFilter-based TLS patching is technically possible but fragile across Istio and Envoy versions; MeshConfig is preferable for mesh-wide ISTIO_MUTUAL cipher-suite policy when it is sufficient.
