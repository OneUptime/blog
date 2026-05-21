# Validation Summary: How to Configure Trust Across Federated Istio Meshes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- mTLS
- Certificate authorities and trust bundles
- SPIFFE trust domains
- OpenSSL
- kubectl
- istioctl

## Sources Consulted
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio multicluster setup prerequisites: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Mutual TLS Migration: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- OpenSSL local CLI verification: `openssl version`

## Issues Found
- The `PeerAuthentication` example used `security.istio.io/v1beta1`. Updated it to the current `security.istio.io/v1` API shown in current Istio documentation.
- The post said `PeerAuthentication` configures trust at a more granular level. Corrected this because `PeerAuthentication` controls whether workloads accept plaintext or mTLS traffic; it does not configure certificate trust roots.
- The `istioctl proxy-config secret` command omitted the workload namespace and selected the first dynamic secret blindly. Added `-n sample` and filtered for secrets that contain a TLS certificate.
- The mTLS verification command used application `curl` output and grepped for `SSL`. That would not prove mTLS because application traffic to the local sidecar is plaintext while Envoy handles mTLS. Replaced it with an `openssl s_client -showcerts` check from the `istio-proxy` container, matching Istio's documented certificate verification pattern.
- The root CA rotation guidance said to add both roots to `cert-chain.pem`. Corrected this to distribute both roots through the trust bundle, such as `root-cert.pem` or `MeshConfig.caCertificates`, while keeping `cert-chain.pem` aligned with the active signing chain.

## Review Notes
The OpenSSL certificate-generation examples are acceptable for demonstration, but Istio's official documentation recommends using its provided certificate Makefile for examples and a production-ready CA, with the root CA kept offline, for production environments.
