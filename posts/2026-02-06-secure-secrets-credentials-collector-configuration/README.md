# How to Secure Secrets and Credentials in Collector Configuration Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Security, Secrets Management, Collector, DevOps

Description: Practical guide to securing API keys, tokens, and credentials in your OpenTelemetry Collector configuration files using environment variables, vaults, and providers.

---

If you have ever committed an OpenTelemetry Collector configuration file to version control, you have probably had that moment of panic where you wonder if you accidentally included a plaintext API key or authentication token. It happens more often than anyone admits. Collector configs frequently need credentials for exporters, receivers, and extensions, and it is tempting to just paste them inline while getting things working.

This guide covers practical methods for keeping secrets out of your Collector configuration files. We will go from basic environment variable substitution to advanced secret provider integrations, with real configuration examples at every step.

## The Problem with Plaintext Secrets

A typical Collector config might include credentials in several places: exporter endpoints with API keys, receiver authentication tokens, TLS certificates paths, and extension credentials. Here is what an insecure configuration looks like.

This is an example of what NOT to do. Credentials are hardcoded directly in the config file.

```yaml
# BAD EXAMPLE - Do not do this in production

exporters:
  otlp:
    endpoint: "https://backend.example.com:4317"
    headers:
      # Hardcoded API key - this will end up in version control
      api-key: "sk-abc123def456ghi789jkl012mno345"

  prometheusremotewrite:
    endpoint: "https://prometheus.example.com/api/v1/write"
    headers:
      # Another hardcoded credential
      Authorization: "Basic dXNlcjpwYXNzd29yZDEyMw=="
```

If this file gets committed to Git, those credentials are exposed to everyone with repository access. Even if you delete them later, they persist in Git history. Secrets scanners on GitHub and GitLab will flag these, but by that point the damage may already be done.

## Method 1: Environment Variable Substitution

The simplest and most widely used approach is environment variable substitution. The OpenTelemetry Collector natively supports referencing environment variables in configuration files using the `${env:VARIABLE_NAME}` syntax.

This configuration replaces hardcoded credentials with references to environment variables that are set at runtime.

```yaml
# collector-config.yaml
# Use environment variable references instead of hardcoded values
exporters:
  otlp:
    endpoint: "${env:OTEL_EXPORTER_ENDPOINT}"
    headers:
      # Reference the API key from an environment variable
      api-key: "${env:OTEL_EXPORTER_API_KEY}"

  prometheusremotewrite:
    endpoint: "${env:PROMETHEUS_ENDPOINT}"
    headers:
      # Pull authorization header from environment
      Authorization: "Basic ${env:PROMETHEUS_AUTH_TOKEN}"
```

You then set these variables in your deployment environment. For a systemd service, you would use an environment file.

This systemd environment file stores the actual secret values separately from the Collector config.

```bash
# /etc/otelcol/env
# Environment variables for the OpenTelemetry Collector service
OTEL_EXPORTER_ENDPOINT=https://backend.example.com:4317
OTEL_EXPORTER_API_KEY=sk-abc123def456ghi789jkl012mno345
PROMETHEUS_ENDPOINT=https://prometheus.example.com/api/v1/write
PROMETHEUS_AUTH_TOKEN=dXNlcjpwYXNzd29yZDEyMw==
```

Make sure to set appropriate file permissions on the environment file so only the Collector service user can read it.

```bash
# Restrict permissions so only the otelcol user can read the env file
sudo chown otelcol:otelcol /etc/otelcol/env
sudo chmod 600 /etc/otelcol/env
```

## Method 2: Kubernetes Secrets

If you are running the Collector in Kubernetes, you should use Kubernetes Secrets to inject credentials. This keeps secrets managed by the cluster's secret management system rather than in config files.

This Kubernetes Secret manifest defines the credentials that the Collector needs.

```yaml
# k8s-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: otel-collector-secrets
  namespace: observability
type: Opaque
stringData:
  # Store each credential as a separate key in the secret
  exporter-api-key: "sk-abc123def456ghi789jkl012mno345"
  prometheus-auth-token: "dXNlcjpwYXNzd29yZDEyMw=="
  backend-endpoint: "https://backend.example.com:4317"
```

Then reference these secrets as environment variables in your Collector deployment.

This Deployment spec mounts Kubernetes secrets as environment variables in the Collector container.

```yaml
# collector-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:latest
          env:
            # Map each secret key to an environment variable
            - name: OTEL_EXPORTER_API_KEY
              valueFrom:
                secretKeyRef:
                  name: otel-collector-secrets
                  key: exporter-api-key
            - name: PROMETHEUS_AUTH_TOKEN
              valueFrom:
                secretKeyRef:
                  name: otel-collector-secrets
                  key: prometheus-auth-token
            - name: OTEL_EXPORTER_ENDPOINT
              valueFrom:
                secretKeyRef:
                  name: otel-collector-secrets
                  key: backend-endpoint
```

## Method 3: Google Secret Manager Provider

For production environments with strict security requirements, the OpenTelemetry Collector supports configuration providers. The Google Secret Manager provider lets you fetch secrets directly from Google Secret Manager at Collector startup.

```mermaid
sequenceDiagram
    participant C as Collector
    participant S as Google Secret Manager
    participant B as Telemetry Backend
    C->>S: Authenticate with Application Default Credentials
    S->>C: Return secrets
    C->>C: Resolve config placeholders
    C->>B: Connect with resolved credentials
```

First, you need to build or use a Collector distribution that includes the Google Secret Manager config provider. Then reference the secrets in the Collector's configuration.

This configuration references secrets stored in Google Secret Manager.

```yaml
# collector-with-secret-manager.yaml
exporters:
  otlp:
    # Reference secrets stored in Google Secret Manager
    endpoint: "${googlesecretmanager:projects/my-project/secrets/otel-endpoint/versions/latest}"
    headers:
      api-key: "${googlesecretmanager:projects/my-project/secrets/otel-api-key/versions/latest}"
```

The Google Secret Manager approach has several advantages: secrets are centrally managed, access is audited, and secrets can be rotated in one place. The Collector resolves these values during configuration loading, so restart or reload the Collector when it needs to pick up a rotated value.

## Method 4: File-Based Secrets with Docker/Podman

Container runtimes support mounting secrets as files. Docker Swarm and Podman both have native secret management. You can use the Collector's file provider to read secrets from mounted files.

This Docker Compose configuration mounts secrets as files inside the Collector container.

```yaml
# docker-compose.yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config=/etc/otelcol/config.yaml"]
    secrets:
      - otel_api_key
      - prometheus_authorization
    volumes:
      - ./collector-config.yaml:/etc/otelcol/config.yaml

# Define secrets that Docker manages
secrets:
  otel_api_key:
    file: ./secrets/otel_api_key.txt
  prometheus_authorization:
    file: ./secrets/prometheus_authorization.txt
```

Then use the file provider to read those mounted secret files from the Collector configuration.

This Collector configuration reads file-based secrets directly from `/run/secrets`.

```yaml
# collector-config.yaml
exporters:
  otlp:
    endpoint: "https://backend.example.com:4317"
    headers:
      api-key: "${file:/run/secrets/otel_api_key}"

  prometheusremotewrite:
    endpoint: "https://prometheus.example.com/api/v1/write"
    headers:
      Authorization: "${file:/run/secrets/prometheus_authorization}"
```

## Method 5: Sealed Secrets for GitOps Workflows

If you practice GitOps and want to store encrypted secrets in your Git repository, Bitnami Sealed Secrets is a great option. Secrets are encrypted with a cluster-specific key and can only be decrypted by the Sealed Secrets controller running in your cluster.

This SealedSecret resource contains an encrypted version of the credentials that is safe to commit to Git.

```yaml
# sealed-secret.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: otel-collector-secrets
  namespace: observability
spec:
  encryptedData:
    # These values are encrypted and safe to store in Git
    exporter-api-key: AgBy3i4OJSWK+PiTySYZZA9rO...encrypted...
    prometheus-auth-token: AgCtr85WkJnR+FPnKz...encrypted...
  template:
    metadata:
      name: otel-collector-secrets
      namespace: observability
    type: Opaque
```

The Sealed Secrets controller decrypts these into regular Kubernetes Secrets at runtime, which you then reference in your Collector deployment as shown in Method 2.

## Preventing Accidental Commits

Regardless of which secret management method you use, add safeguards to prevent accidental credential exposure.

Create a `.gitignore` entry for common secret file patterns.

```gitignore
# .gitignore
# Ignore environment files containing secrets
*.env
.env.*
secrets/
*-secret.yaml
!*-sealed-secret.yaml

# Ignore TLS certificate private keys
*.key
*.pem
```

You should also set up a pre-commit hook that scans for potential secrets before allowing commits.

This pre-commit configuration uses detect-secrets to catch credentials before they enter version control.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      # Scan staged files for potential secrets
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

## Quick Reference: Which Method to Use

Here is a decision flow for choosing the right secret management approach.

```mermaid
flowchart TD
    A[Where is the Collector running?] --> B{Kubernetes?}
    B -->|Yes| C{Need central secret management?}
    B -->|No| D{Docker/Containers?}
    C -->|Yes| E[Use Google Secret Manager Provider or External Secrets Operator]
    C -->|No| F[Use Kubernetes Secrets]
    D -->|Yes| G[Use Docker Secrets or Env Vars]
    D -->|No| H[Use Environment Variables with Restricted File Permissions]
```

## Summary

The golden rule is simple: never put secrets directly in your Collector configuration files. Start with environment variable substitution since it works everywhere and requires no additional tooling. As your infrastructure matures, move to Kubernetes Secrets, Google Secret Manager, or another external secrets system for centralized management and audit trails.

Whatever method you choose, combine it with pre-commit hooks and secret scanning in your CI pipeline. Defense in depth matters here because a single leaked API key can compromise your entire telemetry pipeline and potentially the systems it monitors.
