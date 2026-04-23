# Validation Summary: How to Configure mTLS Between Services in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- Istio
- Linkerd
- cert-manager
- Kubernetes `kubectl`
- Mutual TLS (mTLS)
- TLS/PKI

## Sources Consulted
- Istio PeerAuthentication: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Authentication Policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Linkerd `viz` CLI reference: https://linkerd.io/2.19/reference/cli/viz/
- Linkerd `diagnostics` CLI reference: https://linkerd.io/2.19/reference/cli/diagnostics/
- Linkerd automatic proxy injection: https://linkerd.io/2.15/features/proxy-injection/
- Linkerd validating mTLS traffic: https://linkerd.io/2.15/tasks/validating-your-traffic/
- Linkerd proxy metrics reference: https://linkerd.io/2.16/reference/proxy-metrics/
- cert-manager SelfSigned issuer docs: https://cert-manager.io/docs/configuration/selfsigned/
- cert-manager CA issuer docs: https://cert-manager.io/docs/configuration/ca/
- cert-manager Certificate resource docs: https://cert-manager.io/docs/usage/certificate/
- cert-manager trust distribution docs: https://cert-manager.io/docs/trust/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The Istio examples used the older `security.istio.io/v1beta1` API version. I updated the `PeerAuthentication` and `AuthorizationPolicy` manifests to the current `security.istio.io/v1` form used in current Istio docs.
- The post used `istioctl authn tls-check`, which is not present in the current `istioctl` command reference. I replaced it with a valid connectivity check from an injected client pod and kept `istioctl proxy-config secret` for certificate inspection.
- The workload-level Istio example used a redundant `STRICT` per-port override and `PERMISSIVE` for a port described as plaintext. I corrected it to a workload-port `DISABLE` example and clarified that `portLevelMtls` applies to workload ports, not Service ports.
- The Linkerd verification example used `linkerd viz edges deployment/backend`, but `edges` expects a resource type rather than a `TYPE/NAME` target. I changed it to `linkerd viz edges deploy -n production`.
- The Linkerd injection annotation was incorrect. I replaced `config.linkerd.io/proxy-inject: enabled` with the supported `linkerd.io/inject: enabled` annotation and moved it into a valid `Deployment` pod template example.
- The Linkerd metrics example grepped for `inbound_http_route`, which is not a supported proxy metric name in current docs. I replaced it with a supported identity certificate expiry metric and added `linkerd viz tap` as the live traffic validation example documented by Linkerd.
- The cert-manager CA example referenced `internal-ca-secret` without creating it. I corrected the flow by bootstrapping a root CA with a `SelfSigned` `ClusterIssuer`, storing the generated CA secret in the `cert-manager` namespace, and then creating a `CA` `ClusterIssuer` from that secret.
- The manual mTLS section issued only a backend certificate even though the test commands assumed a frontend client certificate existed. I added a separate frontend client certificate and set explicit `usages` for server and client certificates.
- The `apps/v1` Deployment example was incomplete because it lacked the required `.spec.selector` and matching pod labels. I added both fields and removed the unverifiable, application-specific environment variables so the guidance stays technically accurate and generic.
- The failing `curl` example omitted the CA bundle, which could cause failure because of server trust rather than missing client authentication. I updated it to still provide the CA bundle so the failure specifically reflects missing client certificate presentation.
- The monitoring section used `istioctl proxy-config secret --all-namespaces`, which is not a valid current command. I replaced it with a valid shell loop that runs `istioctl proxy-config secret` against Istio-injected workloads discovered via `kubectl`.
- The cert-manager “Alert on expiring certificates” example printed Ready-condition messages rather than certificate renewal timing. I changed it to report `status.renewalTime`, which better reflects certificate lifecycle health.

## Review Notes
- `linkerd viz` commands require the Linkerd Viz extension, and `linkerd viz tap` also requires tap to be available in the cluster.
- The manual cert-manager approach still requires application-specific TLS configuration and separate CA trust distribution. cert-manager automates issuance and renewal, but it does not by itself distribute trust bundles; `trust-manager` is a common follow-on tool for that.
