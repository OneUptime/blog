# How to Handle Dapr Security in Development vs Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Development, Production, Best Practice

Description: Learn the key differences in Dapr security configuration between development and production environments, and how to avoid insecure defaults shipping to production.

---

## Overview

Dapr's default configuration prioritizes developer experience in local environments, which means many security features are either disabled or minimal by default. Promoting services to production without adjusting these settings is a common source of security vulnerabilities. This guide maps the differences and shows how to manage both environments safely.

## mTLS: Off Locally, On in Kubernetes

In self-hosted (local) mode, mTLS is disabled because all communication is on localhost:

```bash
# Self-hosted: no mTLS, no identity
dapr run --app-id my-service --app-port 3000 -- node app.js
```

In Kubernetes, mTLS is enabled by default. Never disable it in production:

```yaml
# Production: always verify this is true
spec:
  mtls:
    enabled: true
```

## API Token: Optional Locally, Required in Production

Locally you can call the Dapr HTTP API without any token. In production, set an API token:

```bash
# Development: no token needed
curl http://localhost:3500/v1.0/metadata

# Production: token required
export DAPR_API_TOKEN="$(openssl rand -hex 32)"
dapr run ... -- ./service
```

Use Kubernetes secrets in production:

```bash
kubectl create secret generic dapr-api-token \
  --from-literal=token="$(openssl rand -hex 32)"
```

```yaml
annotations:
  dapr.io/api-token-secret: "dapr-api-token"
```

## Secret Management: Files Locally, Vault in Production

Development can use local file-based secrets for convenience:

```yaml
# Development only
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secrets
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: "./secrets.json"
```

Production should use Kubernetes secrets or HashiCorp Vault:

```yaml
# Production
spec:
  type: secretstores.kubernetes
  version: v1
```

## Access Control: Open Locally, Restricted in Production

Skip ACLs during development to reduce friction. Add them before promoting to production:

```yaml
# Production configuration
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
    - appId: trusted-caller
      defaultAction: allow
      namespace: "default"
```

## Using Profiles for Environment-Specific Config

Keep environment-specific component files in separate directories and apply by environment:

```bash
# Development
kubectl apply -f ./config/development/ -n development

# Production
kubectl apply -f ./config/production/ -n production
```

Use Helm values files to parameterize:

```yaml
# values-dev.yaml
dapr:
  mtls: false
  apiToken: ""

# values-prod.yaml
dapr:
  mtls: true
  apiTokenSecret: "dapr-api-token"
```

## Pre-Production Security Checklist

```bash
#!/bin/bash
# security-check.sh

echo "Checking mTLS..."
kubectl get configuration daprsystem -n dapr-system \
  -o jsonpath='{.spec.mtls.enabled}' | grep -q "true" && echo "PASS" || echo "FAIL"

echo "Checking for plaintext secrets in components..."
kubectl get components -A -o yaml \
  | grep -E "value:.*password|value:.*key|value:.*secret" \
  && echo "FAIL: Found plaintext secrets" || echo "PASS"

echo "Checking API token secrets..."
kubectl get deployments -A -o jsonpath='{range .items[*]}{.spec.template.metadata.annotations.dapr\.io/api-token-secret}{"\n"}{end}' \
  | grep -v "^$" | wc -l
```

## Summary

Dapr security defaults are intentionally permissive for developer convenience. Before promoting to production, enable mTLS, set API token authentication, replace local file secrets with Kubernetes or Vault secrets, and configure access control lists. Automating a pre-production security checklist in your CI pipeline prevents insecure configurations from shipping.
