# Validation Summary: How to Integrate Istio with HashiCorp Vault for Secrets

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Kubernetes
- Kubernetes Secrets
- Istio
- HashiCorp Vault
- Vault Agent Injector
- Vault Kubernetes auth method
- Vault Database secrets engine
- Vault PKI secrets engine
- cert-manager
- cert-manager istio-csr
- Helm

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- HashiCorp Vault Helm on Kubernetes documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/run
- HashiCorp Vault Agent Injector documentation: https://developer.hashicorp.com/vault/docs/platform/k8s/injector
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Kubernetes auth documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes auth API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault Database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault Agent template renewal documentation: https://developer.hashicorp.com/vault/docs/agent/template
- HashiCorp Vault PKI API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio CNI compatibility with init containers: https://istio.io/latest/docs/setup/additional-setup/cni/
- cert-manager Vault issuer documentation: https://cert-manager.io/docs/configuration/vault/
- cert-manager istio-csr documentation: https://cert-manager.io/docs/usage/istio-csr/
- cert-manager istio-csr installation documentation: https://cert-manager.io/docs/usage/istio-csr/installation/

## Issues Found
- The opening Kubernetes Secret explanation said Secrets are not encrypted without noting Kubernetes encryption at rest. Updated it to state that Secret data is base64-encoded and stored unencrypted by default unless encryption at rest is enabled.
- The Vault Kubernetes auth configuration command used a Kubernetes API host environment variable that would be expanded by the local shell before `kubectl exec`. Updated the command to run through `sh -c` in the Vault pod and use `KUBERNETES_SERVICE_HOST` / `KUBERNETES_SERVICE_PORT`.
- The application Deployment referenced `serviceAccountName: myapp`, but the tutorial did not create that service account. Added `kubectl create serviceaccount myapp -n default` before creating the Vault Kubernetes auth role.
- The Istio sidecar ordering section treated `holdApplicationUntilProxyStarts` as a general fix for Vault Agent init-container network access. Clarified that outbound port exclusion bypasses Envoy for matching traffic, added the Istio CNI-compatible `agent-run-as-user: "1337"` option for Vault Agent traffic, and limited `holdApplicationUntilProxyStarts` to application container startup ordering.
- The Vault PKI role for istio-csr allowed only DNS domains under `svc.cluster.local`, but Istio workload identities use SPIFFE URI SANs. Updated the role to allow `spiffe://cluster.local/*` URI SANs and set `require_cn=false`.
- The cert-manager Vault issuer example referenced a Vault Kubernetes auth role that was not created. Added a minimal Vault policy for `pki/sign/istio-ca` and a `cert-manager` Kubernetes auth role.

## Review Notes
- The tutorial still uses Vault dev mode and an HTTP Vault URL for demonstration only; the post correctly warns that dev mode is not for production.
- The database credential example is structurally correct, but production deployments should define database-specific revocation and renewal SQL as appropriate for their database policy.
- A complete production istio-csr deployment also requires installing istio-csr before Istio and configuring Istio to use the istio-csr CA endpoint.
