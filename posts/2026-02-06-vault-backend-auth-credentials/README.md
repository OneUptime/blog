# How to Store and Retrieve Backend Authentication Credentials from HashiCorp Vault for Collector Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HashiCorp Vault, Authentication, Credentials, Collector

Description: Store backend authentication credentials in HashiCorp Vault and securely retrieve them for OpenTelemetry Collector pipeline exporters.

Every OpenTelemetry Collector pipeline that exports data to a backend needs authentication. Whether it is an API key, OAuth token, or mTLS certificate, these credentials need to be managed securely. HashiCorp Vault is the standard tool for this, and there are several patterns for organizing and retrieving these credentials.

## Organizing Secrets in Vault

A well-organized secret structure makes it easy to manage credentials for multiple backends and environments:

```bash
# Create a structured secret hierarchy
# Pattern: secret/otel/<environment>/<backend-name>

# Production backend credentials
vault kv put secret/otel/production/primary-backend \
  api_key="pk_live_abc123def456" \
  endpoint="traces.prod.example.com:4317"

vault kv put secret/otel/production/metrics-backend \
  token="metrics-auth-token-prod" \
  endpoint="metrics.prod.example.com:4317"

# Staging backend credentials
vault kv put secret/otel/staging/primary-backend \
  api_key="pk_test_xyz789" \
  endpoint="traces.staging.example.com:4317"

# TLS certificates for mTLS authentication
vault kv put secret/otel/production/tls \
  ca_cert="$(cat ca.pem)" \
  client_cert="$(cat client.pem)" \
  client_key="$(cat client-key.pem)"
```

## Vault Policy Design

Create fine-grained policies that limit each Collector instance to only the secrets it needs:

```hcl
# policy: otel-collector-production
# Production collectors can only read production secrets
path "secret/data/otel/production/*" {
  capabilities = ["read"]
}

# policy: otel-collector-staging
# Staging collectors can only read staging secrets
path "secret/data/otel/staging/*" {
  capabilities = ["read"]
}
```

```bash
# Create policies
vault policy write otel-collector-production policy-production.hcl
vault policy write otel-collector-staging policy-staging.hcl

# Bind policies to Kubernetes service accounts
vault write auth/kubernetes/role/otel-collector-prod \
  bound_service_account_names=otel-collector \
  bound_service_account_namespaces=production \
  policies=otel-collector-production \
  ttl=1h

vault write auth/kubernetes/role/otel-collector-staging \
  bound_service_account_names=otel-collector \
  bound_service_account_namespaces=staging \
  policies=otel-collector-staging \
  ttl=1h
```

## Retrieving Credentials with Vault Agent

The most battle-tested approach uses Vault Agent to render credentials into a file the Collector reads:

```hcl
# vault-agent-config.hcl
auto_auth {
  method "kubernetes" {
    mount_path = "auth/kubernetes"
    config = {
      role = "otel-collector-prod"
    }
  }
}

template {
  contents = <<-EOF
    {{ with secret "secret/data/otel/production/primary-backend" }}
    OTLP_PRIMARY_API_KEY={{ .Data.data.api_key }}
    OTLP_PRIMARY_ENDPOINT={{ .Data.data.endpoint }}
    {{ end }}
    {{ with secret "secret/data/otel/production/metrics-backend" }}
    OTLP_METRICS_TOKEN={{ .Data.data.token }}
    OTLP_METRICS_ENDPOINT={{ .Data.data.endpoint }}
    {{ end }}
  EOF
  destination = "/vault/secrets/otel-env"
}

# Render TLS certs to files
template {
  contents = <<-EOF
    {{ with secret "secret/data/otel/production/tls" }}{{ .Data.data.client_cert }}{{ end }}
  EOF
  destination = "/vault/secrets/client.pem"
}

template {
  contents = <<-EOF
    {{ with secret "secret/data/otel/production/tls" }}{{ .Data.data.client_key }}{{ end }}
  EOF
  destination = "/vault/secrets/client-key.pem"
}

template {
  contents = <<-EOF
    {{ with secret "secret/data/otel/production/tls" }}{{ .Data.data.ca_cert }}{{ end }}
  EOF
  destination = "/vault/secrets/ca.pem"
}
```

## Collector Configuration Using Vault-Injected Values

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        tls:
          cert_file: /vault/secrets/client.pem
          key_file: /vault/secrets/client-key.pem

processors:
  batch:
    timeout: 5s

exporters:
  otlp/primary:
    endpoint: "${env:OTLP_PRIMARY_ENDPOINT}"
    headers:
      Authorization: "Bearer ${env:OTLP_PRIMARY_API_KEY}"
    tls:
      cert_file: /vault/secrets/client.pem
      key_file: /vault/secrets/client-key.pem
      ca_file: /vault/secrets/ca.pem

  otlp/metrics:
    endpoint: "${env:OTLP_METRICS_ENDPOINT}"
    headers:
      X-Auth-Token: "${env:OTLP_METRICS_TOKEN}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/primary]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/metrics]
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: production
spec:
  replicas: 2
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "otel-collector-prod"
        vault.hashicorp.com/agent-inject-secret-otel-env: "secret/data/otel/production/primary-backend"
        vault.hashicorp.com/agent-inject-template-otel-env: |
          {{ with secret "secret/data/otel/production/primary-backend" }}
          export OTLP_PRIMARY_API_KEY={{ .Data.data.api_key }}
          export OTLP_PRIMARY_ENDPOINT={{ .Data.data.endpoint }}
          {{ end }}
    spec:
      serviceAccountName: otel-collector
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          command: ["/bin/sh", "-c"]
          args:
            - source /vault/secrets/otel-env && otelcol-contrib --config /etc/otel/config.yaml
```

## Secret Rotation Workflow

When you need to rotate a backend credential:

```bash
# Step 1: Update the secret in Vault
vault kv put secret/otel/production/primary-backend \
  api_key="pk_live_new_key_abc123" \
  endpoint="traces.prod.example.com:4317"

# Step 2: Vault Agent detects the change and re-renders templates
# Step 3: The Collector picks up new values on restart or config reload
```

For zero-downtime rotation, keep the old key valid for a grace period while the new key propagates to all Collector instances.

## Auditing Secret Access

Vault audit logs track every secret access. Enable the audit log to monitor which Collectors are reading which secrets:

```bash
vault audit enable file file_path=/var/log/vault/audit.log
```

This gives you a complete trail of secret access for compliance and security monitoring. Each entry shows the accessor identity, the secret path, and the timestamp.

Centralizing backend credentials in Vault and retrieving them through a consistent pattern keeps your Collector pipelines secure. It eliminates hardcoded secrets, provides audit trails, and supports automated rotation without Collector code changes.
