# Validation Summary: How to Create Runbook for Istio Security Incidents

## Status
validated

## Post Type
Runbook / Technical guide

## Technologies Covered
- Istio service mesh
- Kubernetes
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- Istio CA certificate management
- istioctl
- kubectl
- Envoy proxy admin stats
- Prometheus / PromQL
- OpenSSL

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio plug in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio check-inject diagnostic documentation: https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The policy verification command omitted the source pod namespace. Added `-n <source-namespace>` so the command works outside the default namespace.
- The source identity check decoded the first dynamic secret and printed the certificate subject. Istio workload identity is carried in the certificate SAN, and the first dynamic secret can be the wrong secret. Updated the command to select the `default` workload secret and print `subjectAltName`.
- The workload restart loop only covered namespaces labeled `istio-injection=enabled`. Istio also supports revision-based injection with `istio.io/rev`, so the loop now includes both label styles.
- The CA incident step said strict mTLS prevents old certificates. Strict mTLS rejects plaintext traffic; certificate trust depends on CA/root rotation. Clarified the comment to avoid overstating what PeerAuthentication does.
- The certificate issuer verification command used the first dynamic secret. Updated it to select the `default` workload secret before decoding.
- The mTLS bypass detection commands implied Envoy connection counters identify non-mTLS traffic. Replaced that with a Prometheus query using Istio's `connection_security_policy` metric label.
- The sidecar detection command treated pods with one container as pods without sidecars, which misses multi-container workloads without an Istio sidecar and can produce false results. Updated it to check for the actual `istio-proxy` container name.
- The sidecar injection exception check only inspected annotations. Istio documents `sidecar.istio.io/inject` as a pod label for controlling injection, so the command now checks both labels and annotations.

## Review Notes
The runbook uses current Istio `security.istio.io/v1` APIs and the deny-all AuthorizationPolicy pattern is valid. The CA rotation section is still an emergency-oriented example; production environments should use an established CA workflow, protect the root CA offline, and plan trust-domain/root rotation carefully.
