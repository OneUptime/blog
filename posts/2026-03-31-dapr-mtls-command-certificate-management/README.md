# How to Use the dapr mtls Command for Certificate Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, mTLS, Security, Certificate

Description: Learn how to use the dapr mtls command to check mTLS status, export certificates, and manage certificate expiry in Dapr Kubernetes deployments.

---

## Overview

The `dapr mtls` command provides tools for managing Mutual TLS (mTLS) in Dapr. Dapr uses mTLS to encrypt and authenticate all service-to-service communication. The `dapr mtls` subcommands let you verify mTLS is enabled, inspect certificate expiry, and export trust bundles for external use.

## Checking mTLS Status

```bash
dapr mtls --kubernetes
```

Sample output:

```text
Mutual TLS is enabled in your Kubernetes cluster
```

## Checking Certificate Expiry

The Dapr sentry service manages a certificate chain with a root CA and workload certificates. Check when they expire:

```bash
dapr mtls expiry
```

Sample output:

```text
Root certificate expires: 2027-03-31 10:00:00 +0000 UTC
Issuer service certificate expires: 2026-09-15 10:00:00 +0000 UTC
```

Plan certificate rotation before these dates to avoid service disruptions.

## Exporting the Root Certificate

Export the trust bundle for use in external services or custom mTLS validation:

```bash
dapr mtls export --out ./dapr-certs
```

This creates:
- `ca.crt` - root CA certificate
- `issuer.crt` - issuer certificate
- `issuer.key` - issuer private key (handle with care)

## Rotating Certificates

When certificates approach expiry, rotate them:

```bash
dapr mtls renew-certificate --kubernetes \
                             --valid-until 365
```

This triggers the Dapr sentry to issue new certificates to all sidecars. The rotation is non-disruptive for running workloads.

## Using Custom Root Certificates

Bring your own certificate authority:

```bash
dapr mtls renew-certificate --kubernetes \
                             --ca-root-certificate ./my-ca.crt \
                             --issuer-private-key ./my-issuer.key \
                             --issuer-public-certificate ./my-issuer.crt
```

## Disabling mTLS (Development Only)

In development environments, you can disable mTLS in a Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dev-config
spec:
  mtls:
    enabled: false
```

Warning: never disable mTLS in production environments.

## Verifying mTLS with a Test Service Call

Confirm mTLS is working by checking sidecar logs for TLS handshake messages:

```bash
dapr logs --app-id target-service --kubernetes | grep -i "tls"
```

## Summary

`dapr mtls` is the command suite for monitoring and managing certificate lifecycles in Dapr. Regular certificate expiry checks and proactive rotation are critical for production security. Use `dapr mtls expiry` in your monitoring pipeline to alert before certificates expire, and `dapr mtls renew-certificate` for zero-downtime rotation.
