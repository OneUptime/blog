# How to Scan Kubernetes Secrets with NeuVector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Kubernetes Secrets, Secrets Management, Container Security, Vulnerability Scanning

Description: Configure NeuVector to detect hardcoded secrets, exposed credentials, and sensitive data in container images and running workloads.

## Introduction

Secrets management is a critical container security challenge. Developers frequently embed credentials, API keys, and passwords directly in container images or environment variables, creating significant security risks. NeuVector can scan container images and running workloads for embedded secrets, alerting you to credential exposure before it leads to a breach.

## Types of Secrets NeuVector Detects

NeuVector's secret scanner can detect:

- API keys (AWS, GCP, Azure, GitHub, etc.)
- Database credentials
- Private keys (RSA, DSA, EC, OpenSSH)
- JWT tokens
- Generic high-entropy strings (potential passwords)
- Cloud provider credentials

## Prerequisites

- NeuVector with Scanner component running
- Images in accessible registries
- NeuVector Manager access

## Step 1: Enable Secret Scanning

Enable secret scanning in NeuVector's scan configuration:

```bash
# Enable secret scanning via API

curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/scan/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "auto_scan": true,
      "enable_secret_scan": true
    }
  }'
```

In the UI:
1. Go to **Configuration** > **Scanning**
2. Enable **Scan Secrets** toggle
3. Save configuration

## Step 2: Scan an Image for Secrets

```bash
# Scan a specific image for embedded secrets
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/image" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "request": {
      "tag": "myapp:latest",
      "registry": "https://registry.company.com",
      "username": "scanner",
      "password": "token",
      "scan_layers": true
    }
  }'

# Get scan results including secrets
curl -sk \
  "https://neuvector-manager:8443/v1/scan/image/myapp%3Alatest" \
  -H "X-Auth-Token: ${TOKEN}" | jq '{
    total_secrets: (.report.secrets | length),
    secrets: [.report.secrets[] | {
      type: .type,
      evidence: .evidence,
      file: .path,
      layer: .layer
    }]
  }'
```

## Step 3: View Secret Findings in Running Containers

```bash
# Get secrets found in running containers
curl -sk \
  "https://neuvector-manager:8443/v1/scan/workload?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.workloads[] | select(.secret_count > 0) | {
    name: .name,
    namespace: .namespace,
    image: .image,
    secret_count: .secret_count
  }]'

# Get detailed secrets for a specific container
WORKLOAD_ID="abc123"
curl -sk \
  "https://neuvector-manager:8443/v1/scan/workload/${WORKLOAD_ID}/report" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.report.secrets[] | {
    type: .type,
    path: .path,
    evidence: .evidence[:50]  # Truncate to avoid displaying full secrets
  }'
```

## Step 4: Common Secret Types and Patterns

NeuVector detects these patterns:

```yaml
# Example of what NeuVector detects:

# AWS Credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Private Key in image layer
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xHn/ygBBD...

# GitHub Token
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Database URL with credentials
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

## Step 5: Remediate Detected Secrets

When NeuVector finds secrets, follow these remediation steps:

### Remove Secrets from Images

```dockerfile
# BAD - Hardcoded secrets in Dockerfile
FROM python:3.11
ENV DATABASE_PASSWORD=mysecretpassword  # DO NOT DO THIS

# GOOD - Use Kubernetes secrets and environment variables
FROM python:3.11
# Password injected at runtime via Kubernetes secrets
```

### Use Kubernetes Secrets Properly

```yaml
# Store credentials as Kubernetes secrets
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: production
type: Opaque
stringData:
  password: mysecretpassword  # Only in git if encrypted
---
# Reference in deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  template:
    spec:
      containers:
        - name: webapp
          image: myapp:latest
          env:
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
```

### Use External Secrets Manager

```yaml
# external-secrets.yaml (using External Secrets Operator)
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: webapp-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: vault-backend
  target:
    name: webapp-secrets
  data:
    - secretKey: database-password
      remoteRef:
        key: production/webapp
        property: database_password
```

## Step 6: Set Up Admission Control for Secret Detection

Block deployments that expose secrets via environment variables:

```bash
# Create admission rule to block images with secrets
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/admission/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "category": "Kubernetes",
      "comment": "Block images with embedded secrets",
      "criteria": [
        {
          "name": "secretCount",
          "op": "biggerEqualThan",
          "value": "1",
          "type": "secretCount"
        }
      ],
      "rule_type": "deny",
      "cfg_type": "user"
    }
  }'
```

## Step 7: Scan Environment Variables for Secrets

Check running containers for secrets in environment variables:

```bash
#!/bin/bash
# scan-env-vars-for-secrets.sh

# Get all pods and their environment variables
kubectl get pods -A -o json | jq -r '
  .items[] |
  .metadata.namespace as $ns |
  .metadata.name as $pod |
  .spec.containers[] |
  .name as $container |
  (.env // [])[] |
  "\($ns)/\($pod)/\($container): \(.name)=\(.value // "[from secret/configmap]")"
' | grep -iE "password|secret|key|token|credential|pwd" | \
grep -v "\[from secret/configmap\]" | \
awk '{print "WARNING: Potential secret in env var:", $0}'
```

## Step 8: Report on Secret Findings

Generate a secrets report for compliance:

```bash
# Generate secrets exposure report
curl -sk \
  "https://neuvector-manager:8443/v1/scan/workload?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '.workloads[] | select(.secret_count > 0) |
    [.namespace, .name, .image, (.secret_count | tostring)] |
    @csv' | \
  awk 'BEGIN{print "\"Namespace\",\"Container\",\"Image\",\"Secrets Found\""}{print}' \
  > secrets-exposure-report.csv

echo "Report saved: secrets-exposure-report.csv"
```

## Conclusion

Scanning for secrets with NeuVector provides visibility into one of the most common security misconfigurations in containerized environments. By combining image scanning, runtime environment variable inspection, and admission control that blocks images with detected secrets, you create multiple layers of defense against credential exposure. Pair this with a secrets management solution like HashiCorp Vault, AWS Secrets Manager, or the External Secrets Operator to eliminate secrets from your container images entirely.
