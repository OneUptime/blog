# Validation Summary: How to Troubleshoot Dapr Certificate Issuance Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Sentry (certificate authority service)
- mTLS (mutual TLS) in Dapr
- Kubernetes (kubectl, Secrets, NetworkPolicies, Deployments)
- OpenSSL (certificate generation and inspection)
- Dapr CLI (mtls subcommands)

## Sources Consulted
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Sentry service overview: https://docs.dapr.io/concepts/dapr-services/sentry/
- Dapr CLI mtls reference: https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr Configuration spec (allowedClockSkew, workloadCertTTL): https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Sentry Helm chart values (service port vs targetPort)

## Issues Found

1. **Sentry service port incorrect (High severity)**: The post stated sidecars connect to Sentry on port 50001 and used `nc -zv ... 50001` for connectivity testing. The Dapr Sentry Kubernetes Service exposes port **443** (with targetPort 50001). Connecting via the service DNS name requires port 443, not 50001. Fixed the `nc` command, descriptive text, and summary to reference port 443.

2. **Trust bundle referenced as ConfigMap instead of Secret (High severity)**: The "Diagnosing Trust Bundle Issues" section used `kubectl get configmap dapr-trust-bundle` and `kubectl describe configmap dapr-trust-bundle`. The Dapr trust bundle is stored as a Kubernetes **Secret**, not a ConfigMap. Changed both commands to use `secret` instead of `configmap`.

3. **Misleading comment on `dapr mtls export` (Low severity)**: The comment `# Generate new CA` preceded the `dapr mtls export` command, which only exports existing certificates — it does not generate new ones. Changed the comment to `# Export existing CA to inspect it`.

4. **Incomplete CA rotation procedure (High severity)**: The secret update only included `ca.crt`, but the `dapr-trust-bundle` secret requires three keys: `ca.crt`, `issuer.crt`, and `issuer.key`. Without all three, Sentry cannot issue workload certificates. Fixed by: (a) adding the recommended `dapr mtls renew-certificate -k` approach first, (b) adding issuer certificate/key generation steps for manual rotation, and (c) updating the `kubectl create secret` command to include all three files.

## Review Notes
- The `dapr mtls renew-certificate -k` CLI command is the recommended approach for certificate rotation and is safer than manual OpenSSL-based rotation. The post now mentions this as the primary approach.
- The 24-hour workload certificate TTL and 15-minute allowedClockSkew defaults are both correctly stated and match current Dapr documentation.
- The `kubectl exec -n dapr-system -l app=dapr-sentry -- date -u` command uses a label selector which will target all matching pods; this is acceptable but may produce interleaved output if multiple Sentry replicas are running.
- The `kubectl get nodes -o custom-columns` command for checking node heartbeat times is a reasonable approximation for detecting clock skew but is not a direct measurement of node clock time.
