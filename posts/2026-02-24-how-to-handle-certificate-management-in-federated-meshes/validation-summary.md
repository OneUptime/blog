# Validation Summary: How to Handle Certificate Management in Federated Meshes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- mTLS
- PKI and X.509 certificates
- OpenSSL
- HashiCorp Vault PKI
- cert-manager
- Prometheus
- Kubernetes Secrets encryption at rest

## Sources Consulted
- Istio documentation: Plug in CA Certificates - https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio documentation: Multicluster before you begin - https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio documentation: Custom CA Integration using Kubernetes CSR - https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- Istio documentation: Security FAQ - https://istio.io/latest/about/faq/security/
- Istio documentation: pilot-agent reference - https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio documentation: pilot-discovery reference and exported metrics - https://istio.io/latest/docs/reference/commands/pilot-discovery/
- cert-manager documentation: Securing Istio Service Mesh - https://cert-manager.io/docs/usage/istio-csr/
- cert-manager documentation: CA issuer - https://cert-manager.io/docs/configuration/ca/
- cert-manager documentation: Certificate resources and renewal behavior - https://cert-manager.io/docs/usage/certificate/
- HashiCorp Vault documentation: PKI intermediate CA setup - https://developer.hashicorp.com/vault/docs/secrets/pki/quick-start-intermediate-ca
- Kubernetes documentation: Encrypting Confidential Data at Rest - https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- OpenSSL local command validation with OpenSSL 3.0.13

## Issues Found
- The `istioctl proxy-config secret` examples selected a pod from the `sample` namespace but did not pass `-n sample` to `istioctl`. Added the namespace flag so the command targets the selected pod correctly.
- The Vault example used non-official Istio `VaultCA` environment variables. Replaced it with the supported pattern: issue an intermediate CA from Vault PKI and install `ca-cert.pem`, `ca-key.pem`, `root-cert.pem`, and `cert-chain.pem` into Istio's `cacerts` secret.
- The cert-manager example attempted to use a cert-manager `Certificate` secret as Istio's `cacerts` secret, but cert-manager TLS secrets use different key names than Istio's plugin CA secret. Replaced it with Istio's Kubernetes CSR external CA configuration and noted `istio-csr` as the cert-manager integration path.
- The workload rotation configuration used `SECRET_GRACE_PERIOD`, which is not the current Istio proxy-agent environment variable. Changed it to `SECRET_GRACE_PERIOD_RATIO`.
- The post said workload certificates rotate at 80% of their lifetime. Current Istio documentation confirms the 24-hour default and exposes a grace-period ratio for rotation, so the specific 80% claim was removed.
- The root CA rotation example put the old root in `cert-chain.pem`. Corrected this so multiple roots are placed in the trust bundle `root-cert.pem`, while `cert-chain.pem` contains the issuing chain for the new intermediate.
- The Prometheus alert used `citadel_server_csr_sign_error_count`, but Istio exports `citadel_server_csr_sign_err_count`. Updated the metric name.

## Review Notes
The post is now technically valid as a practical guide. Root CA rotation remains operationally sensitive and version-dependent, especially around multi-root support and rollout sequencing, so production runbooks should be tested in a staging mesh before use.
