# Validation Summary: How to Use cert-manager Istio Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Istio
- cert-manager
- cert-manager istio-csr
- TLS and mutual TLS
- HashiCorp Vault issuer configuration
- Helm

## Sources Consulted
- cert-manager istio-csr installation documentation: https://cert-manager.io/docs/usage/istio-csr/installation/
- cert-manager istio-csr usage documentation: https://cert-manager.io/docs/usage/istio-csr/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Vault issuer documentation: https://cert-manager.io/v1.14-docs/configuration/vault/
- Istio custom CA integration using Kubernetes CSR: https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- Istio cert-manager gateway integration documentation: https://istio.io/latest/docs/ops/integrations/certmanager/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/

## Issues Found
- The Istio install example mixed the Kubernetes CSR external CA setting with the istio-csr gRPC CA address. Replaced it with an IstioOperator manifest that sets `values.global.caAddress` and disables istiod's CA server with `ENABLE_CA_SERVER: "false"`, matching the cert-manager istio-csr documentation.
- The post implied Istio could be installed before istio-csr. Added wording that Istio installation should happen after cert-manager, the Issuer, and istio-csr are installed, because installing istio-csr after Istio is unsupported by cert-manager.
- The istio-csr Helm examples used the legacy Jetstack chart repository and omitted current recommended root CA mounting. Updated them to use the OCI chart, configure `app.certmanager.issuer.group`, mount a static root CA with `app.tls.rootCAFile`, and create the `istio-system` namespace before installing istio-csr.
- The CA setup created only the signing key pair. Added creation of the separate `istio-root-ca` Secret used by istio-csr's root CA mount.
- The sidecar certificate verification commands read `/etc/certs/cert-chain.pem`, which is outdated for current Istio sidecars. Replaced them with `istioctl proxy-config secret` commands that inspect Envoy's active SDS secret.
- The monitoring and troubleshooting examples used old label selectors and the wrong namespace for istio-csr-generated `CertificateRequest` resources. Updated selectors to `app.kubernetes.io/name=cert-manager-istio-csr` and checked `CertificateRequest` resources in `istio-system`.
- The rotation example used a non-existent `app.server.servingCertificateDuration` Helm value. Replaced it with `app.tls.certificateDuration`, the chart value for the istio-csr serving certificate duration.
- The examples used the removed `istioctl authn tls-check` command. Replaced it with current `istioctl proxy-config secret`, `istioctl analyze`, and `istioctl experimental authz check` commands.
- Updated Istio security API examples from `security.istio.io/v1beta1` to current `security.istio.io/v1`.

## Review Notes
The gateway certificate examples are technically valid, but real Let's Encrypt wildcard certificates require DNS-01 validation and an existing `letsencrypt-prod` ClusterIssuer. The article assumes cert-manager is already installed in the `cert-manager` namespace.
