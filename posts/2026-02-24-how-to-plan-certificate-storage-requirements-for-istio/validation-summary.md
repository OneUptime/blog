# Validation Summary: How to Plan Certificate Storage Requirements for Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio mTLS and workload identity
- Envoy Secret Discovery Service (SDS)
- Kubernetes Secrets and ConfigMaps
- cert-manager
- HashiCorp Vault
- Prometheus metrics
- OpenSSL

## Sources Consulted
- Istio Security concepts: https://istio.io/latest/docs/concepts/security/
- Istio Security FAQ: https://istio.io/latest/about/faq/security/
- Istio Plug in CA Certificates: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio Custom CA Integration using Kubernetes CSR: https://istio.io/latest/docs/tasks/security/cert-management/custom-ca-k8s/
- Istio Secure Gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Envoy statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics

## Issues Found
- The workload certificate flow said Envoy generates the private key and sends the CSR directly to istiod. Current Istio documentation describes the Istio agent generating the private key and CSR, sending it to istiod, and then serving the certificate and key to Envoy over SDS. Updated the flow to match the documented Istio agent/SDS behavior.
- The etcd sizing example counted only one CA root ConfigMap. Istio distributes root CA material through `istio-ca-root-cert` ConfigMaps in mesh namespaces by default, so the storage estimate now scales by namespace count.
- The rotation traffic section said an istiod restart triggers certificate re-issuance. Rotation is driven by certificate expiration and workload startup/reconnect behavior, so this was changed to control-plane or network interruptions causing workloads to reconnect to the CA.
- The cert-manager example used `secretName: cacerts`, which implied cert-manager directly emits Istio's plug-in CA secret format. cert-manager's `Certificate` resource creates a TLS-style secret, while Istio's plug-in CA expects `ca-cert.pem`, `ca-key.pem`, `root-cert.pem`, and `cert-chain.pem`. Updated the secret name and added a short clarification to use Istio's Kubernetes CSR integration or sync into the expected `cacerts` format.
- The monitoring section used `istioctl proxy-config secret --all`, which is not documented in the current `istioctl proxy-config secret` command reference. Replaced it with the documented `istioctl proxy-config rootca-compare` command for comparing trust roots between workloads.
- The gateway certificate backup command used a non-standard `istio-type=tls` label selector. Kubernetes TLS Secrets do not receive that label automatically, so the command now states that gateway TLS secrets should be labeled for backup first.

## Review Notes
The post is technically relevant and mostly accurate after the targeted corrections. `kubectl` and `istioctl` were not installed in the local environment, so command validation was performed against official documentation rather than local CLI help.
