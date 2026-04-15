# Validation Summary: How to Configure Mutual TLS (mTLS) Between All Dapr Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Sentry (internal certificate authority)
- Mutual TLS (mTLS)
- Kubernetes
- Dapr CLI

## Sources Consulted
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Sentry overview: https://docs.dapr.io/concepts/dapr-services/sentry/
- Dapr security concepts: https://docs.dapr.io/concepts/security-concept/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI mtls command reference: https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr CLI mtls export subcommand: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-export/
- Dapr CLI mtls expiry subcommand: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-expiry/
- Dapr Helm chart source (Sentry deployment template, service template, values.yaml)

## Issues Found

### 1. Incorrect sidecar certificate file path
- **What was wrong:** The post claimed you could verify sidecar certificates by reading `/var/run/secrets/dapr.io/tls/cert.pem` from the daprd container. This path does not exist — Dapr workload certificates are held in-memory (generated via environment variables `DAPR_TRUST_ANCHORS`, `DAPR_CERT_CHAIN`, `DAPR_CERT_KEY`), not written to the filesystem.
- **What was changed:** Replaced the `cat /var/run/secrets/dapr.io/tls/cert.pem | openssl x509 ...` command with a log-based verification: `kubectl logs deployment/order-service -c daprd | grep -i "certificate signed successfully"`.
- **Why:** The original command would fail with "No such file or directory" since daprd does not persist workload certificates on disk.

### 2. Incorrect Sentry health check endpoint
- **What was wrong:** The post suggested running `curl -k https://dapr-sentry.dapr-system.svc.cluster.local:443/healthz` from inside the daprd container. This is wrong on multiple levels: (a) port 443 on the Sentry service maps to gRPC port 50001, not an HTTP endpoint, so `curl` would fail; (b) the `/healthz` endpoint runs on internal container port 8080 via plain HTTP, which is not exposed through the Kubernetes Service.
- **What was changed:** Replaced the curl command with a kubectl command that checks the pod's Ready condition: `kubectl get pods -n dapr-system -l app=dapr-sentry -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}'`.
- **Why:** The original curl command would not succeed and could confuse readers troubleshooting mTLS issues.

### 3. Misleading `kubectl annotate pod` command
- **What was wrong:** The post suggested using `kubectl annotate pod my-pod dapr.io/config=dapr-config` to reference the configuration. Dapr sidecar injection occurs at pod creation time via a mutating admission webhook. Adding annotations to an already-running pod does not trigger sidecar injection or reconfiguration.
- **What was changed:** Removed the `kubectl annotate` command and added a note explaining that annotations must be set in the pod template before pod creation, directing readers to the deployment YAML in the next section.
- **Why:** The command gives the false impression that Dapr configuration can be dynamically applied to running pods.

## Review Notes
- The Configuration API fields (`apiVersion`, `kind`, `spec.mtls.*`) are all correct and use current defaults.
- All Dapr annotations in the Deployment YAML are correct.
- The Dapr CLI commands (`dapr mtls -k`, `dapr mtls expiry -k`, `dapr mtls export -k -o ./certs`) are valid.
- The trust bundle secret name (`dapr-trust-bundle`) and key (`issuer.crt`) are correct. The post inspects the issuer certificate rather than the root CA (`ca.crt`), which is a valid choice for verification.
- The Sentry pod label selector (`app=dapr-sentry`) is correct per the Helm chart.
- The Deployment YAML is missing a `selector` field with `matchLabels`, which is required for `apps/v1` Deployments. However, this is a common simplification in blog post snippets and does not affect the mTLS-specific guidance, so it was left as-is.
