# Validation Summary: How to Rotate mTLS Certificates Without Downtime in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy SDS
- mTLS
- X.509 certificates
- cert-manager and istio-csr
- Helm
- Prometheus alerting

## Sources Consulted
- Istio Security FAQ: https://istio.io/latest/about/faq/security/
- Istio `istioctl proxy-config secret` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Plug in CA Certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Custom CA Integration using Kubernetes CSR task: https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- cert-manager istio-csr documentation: https://cert-manager.io/docs/usage/istio-csr/
- cert-manager istio-csr installation guide: https://cert-manager.io/docs/usage/istio-csr/installation/
- Istio pilot-discovery metric reference: https://preliminary.istio.io/latest/docs/reference/commands/pilot-discovery/

## Issues Found
- The certificate lifecycle section said the Envoy sidecar generates the private key and CSR. Updated it to say `istio-agent` generates the key and CSR and provides the certificate to Envoy through SDS.
- The certificate inspection examples read workload certificates directly from `/var/run/secrets/istio/cert-chain.pem`. Updated them to use `istioctl proxy-config secret` and decode the SDS certificate bytes, matching current Istio inspection guidance.
- The root CA rotation example generated only a new root CA, then referenced new signing CA files that did not exist and used the root key as `ca-key.pem`. Updated the steps to generate a new intermediate CA, sign it with the new root, and use the intermediate key for Istiod signing.
- The trust-bundle check piped a multi-cert bundle into `openssl x509`, which only inspects the first certificate. Replaced it with a certificate-count check so the overlap bundle can be verified.
- The final CA secret example also used the root key as `ca-key.pem`. Updated it to use the new intermediate CA key.
- The cert-manager / istio-csr snippet used older Helm chart syntax and implied that installing the chart alone was enough. Updated it to current OCI chart syntax and added the required note that Istio must be installed with its built-in CA disabled and `caAddress` pointed at istio-csr.
- The mesh-wide certificate expiry command used `istioctl proxy-config secret --all`, which is not a valid current `istioctl proxy-config secret` usage. Replaced it with a loop over pods.

## Review Notes
The post is technically relevant and valid after the corrections. The root CA rotation procedure remains a high-level operational guide; production environments should still validate the exact CA hierarchy, trust domain, revisioned control plane rollout, and rollback plan against their installed Istio version before applying it.
