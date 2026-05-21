# Validation Summary: How to Configure Separate Control Planes in Multi-Cluster Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio multi-cluster service mesh
- Istio multi-primary control planes
- Kubernetes
- IstioOperator installation configuration
- Istio east-west gateways
- Istio remote secrets
- Istio CA certificate management
- OpenSSL

## Sources Consulted
- Istio multi-cluster installation overview: https://istio.io/latest/docs/setup/install/multicluster/
- Istio multi-primary installation: https://istio.io/latest/docs/setup/install/multicluster/multi-primary/
- Istio multi-primary installation on different networks: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio multi-cluster prerequisites and trust setup: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio plug-in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio in-place upgrade documentation: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio canary upgrade documentation: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio sample expose-services manifest: https://raw.githubusercontent.com/istio/istio/master/samples/multicluster/expose-services.yaml
- Istio certificate generation Makefile: https://raw.githubusercontent.com/istio/istio/master/tools/certs/Makefile.selfsigned.mk

## Issues Found
- The post called the topology "primary-primary"; Istio documentation refers to this as "multi-primary." Updated the wording.
- The post created `istio-system` before installing Istio but did not label it with `topology.istio.io/network`. Official multi-primary multi-network docs require this label when the namespace already exists. Added network labels for both clusters.
- The hand-written OpenSSL intermediate CA generation did not add CA extensions, and `cert-chain.pem` contained only the intermediate certificate. Istio's CA certificate guidance expects CA-capable intermediate certificates and a generated certificate chain used by istiod. Added CA extensions and generated a chain file containing the intermediate and root certificates.
- The Gateway snippets used `networking.istio.io/v1beta1`; current Istio examples use `networking.istio.io/v1`. Updated both Gateway manifests.
- The sample deployment URLs pinned Istio `release-1.20`, which is outdated for a current guide. Updated them to the current upstream sample path.

## Review Notes
- The local environment did not have `istioctl` installed, so command validation was performed against official Istio documentation rather than local CLI help.
- The guide uses the IstioOperator API, which remains documented by Istio, but Helm-based installation is now also prominently documented in the official multi-cluster guides.
