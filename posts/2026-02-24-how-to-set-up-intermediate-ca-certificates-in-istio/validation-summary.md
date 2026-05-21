# Validation Summary: How to Set Up Intermediate CA Certificates in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio certificate management
- Istio CA and workload certificates
- Intermediate CA and PKI hierarchy
- OpenSSL
- Kubernetes Secrets
- Prometheus alerting

## Sources Consulted
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Certificate Management: https://istio.io/latest/docs/tasks/security/cert-management/
- Istio multicluster setup / before you begin: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio multi-primary install guide: https://istio.io/latest/docs/setup/install/multicluster/multi-primary/
- Istio pilot-discovery exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- OpenSSL x509 command documentation: https://docs.openssl.org/3.0/man1/openssl-x509/
- OpenSSL verify command documentation: https://docs.openssl.org/3.1/man1/openssl-verify/

## Issues Found
- The intermediate CSR configuration used `authorityKeyIdentifier` in the same extension section referenced by `req_extensions`. OpenSSL rejects this for a CSR because there is no issuer certificate while creating the request. I split the CSR extensions into `v3_intermediate_req` without `authorityKeyIdentifier` and kept `authorityKeyIdentifier` in the signing extension section.
- The chain verification example used `openssl verify -CAfile root-cert.pem cert-chain.pem` and described it as verifying the full chain. That command only verifies the first certificate in the concatenated input as a target certificate. I changed it to inspect the chain file order and issuers with `openssl crl2pkcs7` and `openssl pkcs7`.
- The multi-cluster mTLS statement said sharing the same root makes cross-cluster mTLS work. A shared root is required for a common trust setup, but Istio multi-cluster mTLS also depends on the clusters being configured as part of a multi-cluster mesh. I added that caveat.
- The Prometheus alert used `citadel_server_root_cert_expiry_timestamp` while describing the intermediate CA. I changed it to `citadel_server_cert_chain_expiry_timestamp`, which Istio documents as the generated cert chain expiry timestamp.

## Review Notes
The OpenSSL certificate-generation flow was tested locally with OpenSSL 3.0.13 after the corrections. `kubectl` and `istioctl` were not installed in the local environment, so their command forms were checked against official Kubernetes and Istio documentation instead of executed.
