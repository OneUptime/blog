# Validation Summary: How to Configure Dapr Sentry for Multi-Cluster Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Sentry, mTLS, service invocation)
- Kubernetes (multi-cluster, secrets, Helm)
- OpenSSL (certificate generation, CA hierarchy)
- HashiCorp Consul (name resolution)

## Sources Consulted
- OpenSSL `x509` man page / `openssl x509 --help` — confirmed `-extensions` requires `-extfile` to take effect
- Dapr mTLS documentation (https://docs.dapr.io/operations/security/mtls/) — verified Helm chart certificate values and trust bundle secret management
- Dapr Helm chart README (https://github.com/dapr/dapr/blob/master/charts/dapr/README.md) — confirmed `dapr_sentry.tls.root.certPEM`, `dapr_sentry.tls.issuer.certPEM`, `dapr_sentry.tls.issuer.keyPEM` value names
- Dapr Consul name resolution docs (https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-consul/) — confirmed Configuration resource format and nested `client.address` field

## Issues Found

### 1. OpenSSL `-extensions v3_ca` silently ignored without `-extfile` (Critical)
**What was wrong:** In Step 2, the `openssl x509 -req` commands used `-extensions v3_ca` without specifying `-extfile`. The `-extensions` flag is a section selector for the file specified by `-extfile`; without it, the flag is silently ignored. The resulting issuer certificates would lack the `CA:TRUE` basic constraint and `keyCertSign` key usage, making them invalid as CA/issuer certificates. Dapr Sentry would be unable to issue workload certificates from them.

**What was changed:** Added a `ca-ext.cnf` file creation step containing the `[v3_ca]` section with `basicConstraints = critical, CA:TRUE, pathlen:0` and `keyUsage = critical, keyCertSign, cRLSign`. Added `-extfile ca-ext.cnf` to both `openssl x509 -req` commands.

### 2. Helm chart overwrites manually created trust bundle secret (Critical)
**What was wrong:** Step 3 created the `dapr-trust-bundle` secret manually via `kubectl create secret`, and Step 4 ran `helm install dapr dapr/dapr` without passing any certificate values. The Dapr Helm chart manages the `dapr-trust-bundle` secret internally — installing without certificate values causes the chart to generate and deploy auto-generated self-signed certificates, overwriting the manually created secret.

**What was changed:** Merged Steps 3 and 4 into a single Step 3 that passes the certificate files via `--set-file` Helm values (`dapr_sentry.tls.root.certPEM`, `dapr_sentry.tls.issuer.certPEM`, `dapr_sentry.tls.issuer.keyPEM`) during `helm install`. Removed the `kubectl create secret` commands.

### 3. Consul name resolution used wrong resource kind and metadata format (Significant)
**What was wrong:** Step 5 configured Consul name resolution as a `kind: Component` resource with a flat `clientAddress` metadata key. Dapr name resolution is configured through the `kind: Configuration` resource under `spec.nameResolution`, not as a Component. The Consul client address uses a nested `configuration.client.address` structure, not a flat `clientAddress` key.

**What was changed:** Changed the resource from `kind: Component` to `kind: Configuration` with the correct `spec.nameResolution` structure. Replaced the flat `clientAddress` metadata key with the nested `configuration.client.address` format. Added `selfRegister: true` as it is commonly needed for service registration. Renumbered from Step 5 to Step 4 to match the consolidated step numbering.

## Review Notes
- The `openssl genrsa` command is still functional but has been superseded by `openssl genpkey` in newer OpenSSL versions. Not changed as `genrsa` remains widely supported and commonly used in tutorials.
- The Dapr service invocation URL format (`http://localhost:3500/v1.0/invoke/target-service/method/health`) is correct.
- The root CA uses a 4096-bit key and the issuer certs use 2048-bit keys, which are reasonable choices.
- The post does not specify a Dapr version. The Helm values and Configuration resource format are accurate for Dapr 1.10+.
