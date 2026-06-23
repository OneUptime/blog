# Validation Summary: How to Secure Pod-to-Pod Communication with mTLS using Istio

## Status
validated

## Post Type
Tutorial / Guide (hands-on, step-by-step implementation guide)

## Technologies Covered
- Istio service mesh (PeerAuthentication, DestinationRule, AuthorizationPolicy, IstioOperator)
- mutual TLS (mTLS)
- Kubernetes (Deployments, Services, Namespaces, Secrets)
- Envoy proxy / istio-proxy sidecar
- istioctl CLI
- SPIFFE-style service identities

## Sources Consulted
- Istio mutual TLS / PeerAuthentication docs — https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/ and https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule TLS settings — https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference — https://istio.io/latest/docs/reference/config/security/authorization-policy/
- istioctl command reference — https://istio.io/latest/docs/reference/commands/istioctl/ (confirmed `verify-install`, `experimental authz check`, `experimental describe pod`, `proxy-config secret`)
- "Introducing istiod: simplifying the control plane" — https://istio.io/latest/blog/2020/istiod/ (Citadel consolidated into istiod)
- pilot-agent options / certificate rotation — https://github.com/istio/istio/blob/master/pilot/cmd/pilot-agent/options/options.go (`SECRET_GRACE_PERIOD_RATIO` default 0.5)
- Istio identity & certificate architecture — https://github.com/istio/istio/blob/master/architecture/security/istio-agent.md

## Issues Found
1. **Outdated certificate architecture diagram (Citadel as a separate component).** The Mermaid diagram showed `Istiod --Signs Certificates--> Citadel --Issues Certs--> Envoy`, depicting Citadel as a distinct component receiving certificates from istiod. Since Istio 1.5, Citadel's CA functionality is embedded directly inside the `istiod` binary; there is no standalone Citadel component, and istiod itself acts as the CA issuing workload certificates over SDS. Updated the diagram so `Istiod CA (formerly Citadel)` issues certs directly to the Envoy proxies.

2. **Incorrect auto-rotation threshold (80%).** A comment stated "Auto-rotation happens at 80% of validity." Istio's pilot-agent rotates workload certificates based on `SECRET_GRACE_PERIOD_RATIO`, which defaults to 0.5 — i.e., rotation occurs at roughly 50% of the certificate lifetime (around the 12-hour mark for a 24h cert), not 80%. Corrected the comment to "Auto-rotation happens at 50% of validity (SECRET_GRACE_PERIOD_RATIO default: 0.5)".

3. **Wrong command for verifying mTLS status.** The "Verify mTLS is Active" section used `istioctl x authz check <pod>` with the comment "Check if mTLS is enabled between services." `istioctl experimental authz check` reports the Envoy RBAC/AuthorizationPolicy configuration applied to a pod — it does not report mTLS mode. Replaced it with `istioctl x describe pod <pod-name> -n <namespace>`, which reports the effective mTLS mode and applicable PeerAuthentication/DestinationRule policies for a workload.

## Review Notes
- The mTLS mode table (STRICT / PERMISSIVE / DISABLE), PeerAuthentication examples (namespace-wide, mesh-wide via `istio-system`, workload selector, `portLevelMtls`), and DestinationRule examples (`ISTIO_MUTUAL`, `*.local` mesh-wide host) are all accurate and use current `security.istio.io/v1beta1` and `networking.istio.io/v1beta1` API versions (these remain valid; `v1` also exists in recent releases but `v1beta1` is not deprecated).
- The custom CA `cacerts` Secret field names (`ca-cert.pem`, `ca-key.pem`, `cert-chain.pem`, `root-cert.pem`) and the `kubectl create secret generic cacerts` command are correct.
- The `istioctl proxy-config secret ... | jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | base64 -d | openssl x509 -text -noout` pipeline uses the correct config-dump JSON path.
- The `deny-all` AuthorizationPolicy with an empty `spec: {}` correctly denies all traffic in the namespace; the SPIFFE principal format `cluster.local/ns/<ns>/sa/<sa>` is correct.
- The "Certificate validity duration (default: 24h)" comment is attached to `PILOT_CERT_PROVIDER: istiod`, which technically controls the cert provider rather than the validity duration; the 24h default itself is accurate. Left as-is since it is a non-blocking comment-placement nuance, not a factual error.
- `istioctl install --set profile=default`, `istioctl verify-install`, `istioctl analyze`, and `istioctl proxy-config {secret,listener,cluster,all}` are all valid current commands.
