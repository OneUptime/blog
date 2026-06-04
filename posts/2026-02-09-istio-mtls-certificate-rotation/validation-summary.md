# Validation Summary: How to Automate Istio mTLS Certificate Rotation with Custom CA Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio mTLS and workload certificates
- SPIFFE identities
- Kubernetes CertificateSigningRequest API
- cert-manager and istio-csr
- HashiCorp Vault PKI
- Prometheus alerting
- Envoy TLS configuration

## Sources Consulted
- Istio certificate management overview: https://istio.io/latest/docs/tasks/security/cert-management/
- Istio plug-in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio custom CA integration using Kubernetes CSR: https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- Istio MeshConfig / ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio DestinationRule TLS reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio pilot-agent command and environment variable reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio pilot-discovery metrics and environment variable reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- cert-manager installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager istio-csr documentation: https://cert-manager.io/docs/usage/istio-csr/
- cert-manager istio-csr installation guide: https://cert-manager.io/docs/usage/istio-csr/installation/
- cert-manager Vault issuer documentation: https://cert-manager.io/docs/configuration/vault/
- HashiCorp Vault Kubernetes auth documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault PKI API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki

## Issues Found
- The Kubernetes CA section incorrectly configured `meshConfig.ca.address` to `kubernetes.default:443` and `pilotCertProvider: kubernetes`. Replaced it with the supported Kubernetes CSR external CA pattern using `EXTERNAL_CA: ISTIOD_RA_KUBERNETES_API`, signer metadata, signer approval RBAC, and `meshConfig.caCertificates`.
- The cert-manager section incorrectly implied that a cert-manager `Certificate` named `cacerts` would be consumed directly by istiod for workload signing. Updated it to use cert-manager's supported `istio-csr` integration and configured Istio with `values.global.caAddress` plus `ENABLE_CA_SERVER=false`.
- The cert-manager install URL referenced v1.13.0. Updated the example to the current documented static manifest version, v1.20.2.
- The certificate lifetime snippet used unsupported `meshConfig.defaultConfig.secretTtl` and placed `SECRET_TTL` under pilot. Updated it to set `SECRET_TTL` and `SECRET_GRACE_PERIOD_RATIO` as proxy environment variables.
- The rotation timing explanation was inverted. Corrected it to say a 25% grace period starts renewal when about 15 minutes remain on a 1-hour certificate.
- The rotation verification log command searched for an unverified istiod log string. Replaced it with watching cert-manager `CertificateRequest` resources for the `istio-csr` flow.
- The Vault section configured unsupported `VAULT_*` environment variables on Istio. Reworked it to use cert-manager's Vault issuer with `istio-csr`, including Vault Kubernetes auth and TokenRequest RBAC.
- The Vault PKI role did not account for Istio SPIFFE URI SANs. Added URI SAN and CSR settings needed for Istio workload certificate signing.
- The Prometheus alerts used a non-existent `istio_certificate_expiration_timestamp` metric and an unrelated XDS rejection metric for rotation failure. Replaced them with documented Istio control-plane certificate and SDS certificate error metrics.
- The DestinationRule example set `caCertificates` with `ISTIO_MUTUAL`, which Istio documents as invalid because other TLS fields must be empty in `ISTIO_MUTUAL` mode. Changed the example to `MUTUAL` and included the required client certificate and private key.
- The custom certificate mount only mounted a ConfigMap containing a CA while the DestinationRule referenced client cert and key files. Updated it to mount a Secret containing the referenced materials.
- The load-test snippet patched a likely non-existent `IstioOperator` object and an unsupported `secretTtl` path. Replaced it with an `istioctl install --set values.global.proxy.env.SECRET_TTL=10m` example and a workload rollout.
- The root rotation snippet edited `istio-ca-root-cert` directly. Replaced it with a `cacerts` secret update containing the new intermediate, key, combined roots, and chain.

## Review Notes
- Several examples still require environment-specific values such as real root certificates, signer names, service names, and Vault addresses.
- Root CA rotation remains operationally sensitive; the post now shows the correct secret shape, but production rotations should be rehearsed in a staging mesh.
