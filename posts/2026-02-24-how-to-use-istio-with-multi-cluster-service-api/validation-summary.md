# Validation Summary: How to Use Istio with Multi-Cluster Service API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes Multi-Cluster Services API
- Kubernetes CRDs
- ServiceExport and ServiceImport
- Istio primary-remote multicluster installation
- Istio east-west gateways
- Istio telemetry and Kiali

## Sources Consulted
- Istio primary-remote multicluster installation: https://istio.io/latest/docs/setup/install/multicluster/primary-remote_multi-network/
- Istio deployment models and endpoint discovery: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio command reference and MCS environment variables: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio plug-in CA certificate documentation: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- SIG Multicluster MCS API overview: https://multicluster.sigs.k8s.io/concepts/multicluster-services-api/
- SIG Multicluster ServiceExport reference: https://multicluster.sigs.k8s.io/api-types/service-export/
- Kubernetes SIGs MCS API repository and v0.5.0 release: https://github.com/kubernetes-sigs/mcs-api
- Kiali multicluster documentation: https://kiali.io/docs/features/multi-cluster/

## Issues Found
- The MCS CRD install URL used `releases/latest/download/mcs-api-crds.yaml`, but the current latest MCS API release has no such asset and the URL returns 404 after redirect. Replaced it with direct raw CRD URLs for `v0.5.0`.
- The MCS examples used `multicluster.x-k8s.io/v1alpha1`. Updated them to `v1beta1`, matching the current MCS API release while noting Istio's MCS API version setting.
- The Istio configuration did not enable MCS service discovery or clusterset hosts. Added `ENABLE_MCS_SERVICE_DISCOVERY`, `ENABLE_MCS_HOST`, and `MCS_API_VERSION`.
- The primary-remote Istio install flow omitted required primary-remote pieces: `externalIstiod`, the remote profile, control-plane namespace annotation, `remotePilotAddress`, exposing `istiod`, and creating the remote secret. Added the missing commands and fields.
- The remote IstioOperator example used an environment variable inside YAML without a substitution step. Updated the install command to pipe the file through `envsubst`.
- The certificate example referenced `cluster1-cert-chain.pem` without creating it and did not mark the intermediate certificate as a CA. Added the certificate chain creation and CA extensions.
- The east-west gateway section used the wrong ordering and missed the `istio-system` namespace when applying `expose-services.yaml`. Corrected the flow and namespace.
- The traffic management section said it used a VirtualService but showed a DestinationRule, and it targeted `svc.cluster.local` instead of the exported clusterset host. Corrected the wording and host.
- The post claimed locality-aware load balancing automatically prefers local endpoints. Istio defaults to balancing across discovered endpoints unless locality load balancing is configured, so the claim was corrected.
- The debugging section used the removed `istioctl authn tls-check` command and an incorrect east-west gateway service name. Replaced these with current `proxy-config` checks and the `istio-eastwestgateway` service.
- The summary implied automatic failover without the required traffic policy. Updated it to state failover depends on configuring the relevant Istio policy.

## Review Notes
The post is now technically accurate for current Istio documentation and the MCS API v0.5.0 release as of 2026-05-21. The tutorial remains a high-level guide; a production-ready version should add provider-specific MCS controller setup, namespace sameness details, and handling for load balancers that expose hostnames instead of IP addresses.
