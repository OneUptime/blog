# How to Configure the Vault Config Source Provider for Dynamic Secret Injection in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HashiCorp Vault, Dynamic Secrets, Config Source, Collector

Description: Configure the Vault config source provider to dynamically inject secrets from HashiCorp Vault into the OpenTelemetry Collector config.

The OpenTelemetry Collector supports config source providers that can pull configuration values from external systems at startup time. The Vault config source provider connects directly to HashiCorp Vault, removing the need for a separate Vault Agent sidecar. Secrets are fetched when the Collector starts and can be refreshed on a configurable interval.

## How Config Source Providers Work

Config source providers extend the Collector's configuration resolution. Instead of reading values from environment variables or static files, they fetch values from external sources like Vault, AWS Secrets Manager, or etcd. In the config file, you reference these sources with a URI-like syntax.

## Setting Up the Vault Config Source

The Vault config source is available in the OpenTelemetry Collector Contrib distribution. Configure it in the Collector's config file:

```yaml
# config-sources section defines available sources
config_sources:
  vault:
    endpoint: "https://vault.internal:8200"
    # Authentication method
    auth:
      method: token
      token: "${env:VAULT_TOKEN}"

# Now use vault references in any config field
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

exporters:
  otlp:
    endpoint: "backend.example.com:4317"
    headers:
      # Pull the API key from Vault at startup
      Authorization: "Bearer ${vault:secret/data/otel/backend#api_key}"
```

The syntax `${vault:secret/data/otel/backend#api_key}` tells the Collector to read the `api_key` field from the Vault path `secret/data/otel/backend`.

## Authentication Methods

### Token Auth

The simplest method, suitable for development:

```yaml
config_sources:
  vault:
    endpoint: "https://vault.internal:8200"
    auth:
      method: token
      token: "${env:VAULT_TOKEN}"
```

### Kubernetes Auth

For production Kubernetes deployments:

```yaml
config_sources:
  vault:
    endpoint: "https://vault.internal:8200"
    auth:
      method: kubernetes
      mount_path: "auth/kubernetes"
      role: "otel-collector"
```

This uses the pod's service account token to authenticate with Vault. No static tokens needed.

### AppRole Auth

For non-Kubernetes deployments:

```yaml
config_sources:
  vault:
    endpoint: "https://vault.internal:8200"
    auth:
      method: approle
      mount_path: "auth/approle"
      role_id: "${env:VAULT_ROLE_ID}"
      secret_id: "${env:VAULT_SECRET_ID}"
```

## Complete Collector Configuration

```yaml
config_sources:
  vault:
    endpoint: "https://vault.internal:8200"
    auth:
      method: kubernetes
      role: "otel-collector"
    # Poll Vault for secret changes every 5 minutes
    poll_interval: 5m

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

processors:
  batch:
    timeout: 5s

exporters:
  otlp/primary:
    endpoint: "primary-backend.example.com:4317"
    headers:
      Authorization: "Bearer ${vault:secret/data/otel/primary-backend#api_key}"
    tls:
      cert_pem: "${vault:secret/data/otel/tls-certs#client_cert}"
      key_pem: "${vault:secret/data/otel/tls-certs#client_key}"

  otlp/secondary:
    endpoint: "secondary-backend.example.com:4317"
    headers:
      X-API-Token: "${vault:secret/data/otel/secondary-backend#token}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/primary, otlp/secondary]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/primary]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/primary]
```

## Using Dynamic Secrets

Vault dynamic secrets (like database credentials or AWS IAM keys) are generated on-demand and have a TTL. The config source provider handles lease renewal:

```yaml
config_sources:
  vault:
    endpoint: "https://vault.internal:8200"
    auth:
      method: kubernetes
      role: "otel-collector"

exporters:
  # Use a dynamically generated database credential
  # for an exporter that writes to a database
  clickhouse:
    endpoint: "tcp://clickhouse.internal:9000"
    username: "${vault:database/creds/otel-writer#username}"
    password: "${vault:database/creds/otel-writer#password}"
    database: "traces"
```

The provider automatically renews the lease before it expires. If the lease cannot be renewed, the Collector will request a new credential.

## Multiple Vault Instances

You can configure multiple Vault sources for different secret stores:

```yaml
config_sources:
  vault/production:
    endpoint: "https://vault-prod.internal:8200"
    auth:
      method: kubernetes
      role: "otel-collector"

  vault/shared:
    endpoint: "https://vault-shared.internal:8200"
    auth:
      method: kubernetes
      role: "otel-collector-readonly"

exporters:
  otlp/prod:
    endpoint: "prod-backend.example.com:4317"
    headers:
      Authorization: "Bearer ${vault/production:secret/data/otel/prod-backend#api_key}"

  otlp/monitoring:
    endpoint: "monitoring.example.com:4317"
    headers:
      X-API-Key: "${vault/shared:secret/data/otel/monitoring#api_key}"
```

## Error Handling

If the Vault config source cannot connect to Vault at startup, the Collector will fail to start. This is the desired behavior since running without proper authentication would mean data is not being exported.

For transient Vault outages after startup, the config source caches the last known good values and logs warnings. When Vault becomes available again, values are refreshed on the next poll interval.

## Vault Policy for Config Source

```hcl
# otel-collector-config-source.hcl
path "secret/data/otel/*" {
  capabilities = ["read"]
}

path "database/creds/otel-writer" {
  capabilities = ["read"]
}

# Allow lease renewal for dynamic secrets
path "sys/leases/renew" {
  capabilities = ["update"]
}
```

The Vault config source provider gives you the cleanest integration between the Collector and Vault. No sidecar containers, no template rendering, and no startup scripts. Secrets are resolved inline in the config file, and the provider handles authentication, caching, and renewal.
