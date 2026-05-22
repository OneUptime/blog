# Validation Summary: How to Handle Certificate Rotation During Istio Upgrades

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecars
- mTLS
- X.509 certificates
- cert-manager
- kubectl
- istioctl

## Sources Consulted
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Security FAQ: https://istio.io/latest/about/faq/security/
- Istio pilot-discovery reference and exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Custom CA Integration using Kubernetes CSR: https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- Istio MeshConfig reference for CA certificates: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/

## Issues Found
- The certificate hierarchy description implied istiod always acts as an intermediate CA. Updated it to distinguish plugged-in CA setups from Istio's default self-signed CA.
- The built-in CA inspection command read `ca-cert.pem` while describing the root certificate. Changed it to read `root-cert.pem`.
- The command for listing `cacerts` keys piped kubectl JSONPath map output into `jq`, which is not valid JSON. Changed it to use `-o json | jq -r '.data | keys[]'`.
- The custom CA rotation text referred to trust domain migration, which is a different Istio concept. Changed it to staged root CA migration.
- The cert-manager example wrote directly to `secretName: cacerts`, but cert-manager `Certificate` resources create TLS-style Secrets rather than Istio's required `ca-cert.pem`, `ca-key.pem`, `cert-chain.pem`, and `root-cert.pem` layout. Updated the example and text to clarify that a sync step, operator, or Istio Kubernetes CSR integration is required.
- The root CA rotation sequence switched the signing CA at the same time it first distributed the combined trust bundle. Added a step to distribute both roots while still signing with the old CA before switching to the new signing CA.
- The workload restart loop only covered namespaces labeled `istio-injection=enabled`. Added a second loop for revision-labeled namespaces using `istio.io/rev`.
- The certificate metric description mixed timestamp metrics with seconds-until-expiry semantics, and the signing error metric name was incorrect. Added the `_expiry_seconds` metrics and changed `citadel_server_csr_sign_error_count` to `citadel_server_csr_sign_err_count`.

## Review Notes
The `istioctl proxy-config listeners` example can help inspect TLS transport socket configuration, but it is not a full end-to-end mTLS test. A future improvement could show an application-level request between two workloads and inspect the resulting mTLS evidence, but the existing command is still valid as an inspection aid.
