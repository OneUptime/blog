# Validation Summary: How to Use Linkerd for mTLS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Linkerd service mesh
- Linkerd automatic mTLS
- Kubernetes
- Helm
- cert-manager
- Prometheus / PromQL
- Linkerd authorization policy resources

## Sources Consulted
- Linkerd Automatic mTLS: https://linkerd.io/2-edge/features/automatic-mtls/
- Linkerd generating mTLS root certificates: https://linkerd.io/2-edge/tasks/generate-certificates/
- Linkerd install CLI reference: https://linkerd.io/2-edge/reference/cli/install/
- Linkerd Helm install documentation: https://linkerd.io/2-edge/tasks/install-helm/
- Linkerd authorization policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd validating mTLS traffic: https://linkerd.io/2-edge/tasks/validating-your-traffic/
- Linkerd proxy metrics reference: https://linkerd.io/2-edge/reference/proxy-metrics/
- Linkerd supported Kubernetes versions: https://linkerd.io/2-edge/reference/k8s-versions/
- Linkerd identity CLI reference: https://linkerd.io/2-edge/reference/cli/identity/
- Linkerd automatic control plane TLS rotation: https://linkerd.io/2-edge/tasks/automatically-rotating-control-plane-tls-credentials/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The prerequisite Kubernetes version was listed as v1.21+. Current Linkerd 2.19 documentation lists v1.22 as the minimum supported Kubernetes version, so the prerequisite was updated to say readers should use a Kubernetes version supported by their Linkerd release, with Linkerd 2.19 supporting v1.22+.
- The `linkerd check --pre` expected output mentioned Pod Security Policies. PSP is obsolete in modern Kubernetes and not a useful current expected check, so it was changed to "required Kubernetes permissions and resources."
- The Helm example used `--set identity.trustAnchorsPEM="$(cat ca.crt)"`, but current Linkerd Helm documentation uses the top-level `identityTrustAnchorsPEM` value and recommends `--set-file`. The Helm command was corrected to use `--set-file identityTrustAnchorsPEM=ca.crt` and matching `--set-file` flags for the issuer certificate and key.
- The `AuthorizationPolicy` and `MeshTLSAuthentication` examples used `policy.linkerd.io/v1beta1`. Current Linkerd documentation shows `AuthorizationPolicy` and `MeshTLSAuthentication` as `policy.linkerd.io/v1alpha1`, while `Server` remains `policy.linkerd.io/v1beta1`. The API versions were corrected.
- The enforcement section described Linkerd's default behavior as allowing both mTLS and plaintext connections. This was tightened to clarify that Linkerd requires mTLS between meshed pods but accepts plaintext from non-meshed sources by default.
- The `linkerd viz stat` example was described as checking mTLS success rate, but the command reports service success rate and meshed pod counts. The comment was corrected.
- The Prometheus examples used `inbound_http_errors_total{error="tls"}`, which is not listed in the current Linkerd proxy metrics reference. The query and alert were changed to detect inbound HTTP requests where the Linkerd `tls` label is not true: `request_total{direction="inbound",tls!="true"}`.
- The troubleshooting section suggested annotating the namespace with `config.linkerd.io/default-inbound-policy=all-unauthenticated` to temporarily disable policy enforcement. Linkerd default inbound policy annotations are fixed at proxy startup and do not override existing `Server` resources, so the command was updated to use `--overwrite`, restart workloads, and note that matching `Server` or authorization policy resources must be removed or relaxed separately.

## Review Notes
The post is now technically accurate for current Linkerd documentation. The cert-manager rotation example is still intentionally high-level; a production-ready cert-manager setup also needs the referenced issuer or cluster issuer and, for full trust-anchor automation, trust-manager or an equivalent trust bundle workflow.
