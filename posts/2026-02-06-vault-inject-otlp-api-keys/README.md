# How to Use HashiCorp Vault to Inject OTLP Exporter API Keys and Tokens into Collector Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HashiCorp Vault, Secrets Management, OTLP, Collector

Description: Inject OTLP exporter API keys and authentication tokens from HashiCorp Vault into the OpenTelemetry Collector configuration securely.

Hardcoding API keys in your Collector configuration is a security risk. If your config files are stored in version control or accessible to anyone with host access, those keys are exposed. HashiCorp Vault provides a secure way to manage these secrets and inject them into the Collector at runtime.

## Approaches to Vault Integration

There are several ways to get secrets from Vault into the Collector:

1. **Environment variables** injected by Vault Agent
2. **File-based templates** rendered by Vault Agent
3. **Kubernetes Vault sidecar injector**
4. **Direct Vault config source** in the Collector (contrib feature)

We will cover the most common and production-ready approaches.

## Approach 1: Vault Agent Sidecar with Template

Vault Agent runs alongside the Collector and renders a configuration file with secrets injected:

```hcl
# vault-agent-config.hcl

auto_auth {
  method "kubernetes" {
    mount_path = "auth/kubernetes"
    config = {
      role = "otel-collector"
    }
  }

  sink "file" {
    config = {
      path = "/vault/token/.vault-token"
    }
  }
}

template {
  source      = "/vault/templates/collector-config.yaml.tpl"
  destination = "/vault/secrets/collector-config.yaml"
  # Send SIGHUP to the Collector when the config changes
  command     = "kill -HUP $(cat /tmp/collector.pid) 2>/dev/null || true"
}
```

The template file references Vault secrets:

```yaml
# collector-config.yaml.tpl

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  batch:
    timeout: 5s

exporters:
  otlp/backend:
    endpoint: "backend.example.com:4317"
    headers:
      {{ with secret "secret/data/otel/backend-auth" }}
      Authorization: "Bearer {{ .Data.data.api_key }}"
      {{ end }}

  otlp/secondary:
    endpoint: "secondary.example.com:4317"
    headers:
      {{ with secret "secret/data/otel/secondary-auth" }}
      X-API-Key: "{{ .Data.data.token }}"
      {{ end }}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/backend, otlp/secondary]
```

## Kubernetes Deployment with Vault Sidecar

```yaml
# collector-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
      annotations:
        # Vault sidecar injector annotations
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "otel-collector"
        vault.hashicorp.com/agent-inject-secret-config.yaml: "secret/data/otel/collector-config"
        vault.hashicorp.com/agent-inject-template-config.yaml: |
          {{- with secret "secret/data/otel/backend-auth" -}}
          OTLP_API_KEY={{ .Data.data.api_key }}
          {{- end }}
    spec:
      serviceAccountName: otel-collector
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args: ["--config=/etc/otel/collector-config.yaml"]
          env:
            - name: OTLP_API_KEY
              valueFrom:
                secretKeyRef:
                  name: otel-vault-secrets
                  key: api-key
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

## Approach 2: Environment Variable Injection

The Collector supports environment variable substitution in its config. Use Vault to inject the environment variables:

```yaml
# collector-config.yaml (uses env var substitution)
exporters:
  otlp:
    endpoint: "backend.example.com:4317"
    headers:
      Authorization: "Bearer ${env:OTLP_API_KEY}"
```

With Vault Agent injecting the environment:

```hcl
# vault-agent-config.hcl
template {
  contents    = <<-EOF
    {{ with secret "secret/data/otel/backend-auth" }}
    export OTLP_API_KEY="{{ .Data.data.api_key }}"
    {{ end }}
  EOF
  destination = "/vault/secrets/env.sh"
}
```

Then in your container startup script:

```bash
#!/bin/bash
# Source the Vault-rendered environment file
source /vault/secrets/env.sh
# Start the collector
otelcol-contrib --config /etc/otel/collector-config.yaml
```

## Storing Secrets in Vault

Set up the secrets in Vault that the Collector will use:

```bash
# Store the backend API key
vault kv put secret/otel/backend-auth \
  api_key="your-secret-api-key-here"

# Store TLS certificates
vault kv put secret/otel/tls \
  cert="$(cat /path/to/cert.pem)" \
  key="$(cat /path/to/key.pem)"

# Store multiple backend credentials
vault kv put secret/otel/secondary-auth \
  token="secondary-backend-token"
```

## Vault Policy for the Collector

Create a Vault policy that grants the Collector read-only access to its secrets:

```hcl
# otel-collector-policy.hcl
path "secret/data/otel/*" {
  capabilities = ["read"]
}

# Allow the collector to renew its own token
path "auth/token/renew-self" {
  capabilities = ["update"]
}
```

```bash
vault policy write otel-collector otel-collector-policy.hcl

# Create a Kubernetes auth role for the collector
vault write auth/kubernetes/role/otel-collector \
  bound_service_account_names=otel-collector \
  bound_service_account_namespaces=observability \
  policies=otel-collector \
  ttl=1h
```

## Secret Rotation

When secrets are rotated in Vault, the Vault Agent sidecar detects the change and re-renders the template. If you configured the `command` option in the Vault Agent template, it sends a signal to the Collector to reload its configuration.

For zero-downtime rotation, ensure the old key remains valid during the transition period.

Using Vault for Collector secret management keeps your API keys out of config files and version control. The Vault Agent handles authentication, secret retrieval, and rotation transparently, and the Collector just reads its config as usual.
