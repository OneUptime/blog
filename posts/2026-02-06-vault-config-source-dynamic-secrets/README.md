# How to Configure the Vault Config Source Provider for Dynamic Secret Injection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HashiCorp Vault, Dynamic Secret, Config Source, Collector

Description: Configure the Vault config source provider to dynamically inject secrets from HashiCorp Vault into the OpenTelemetry Collector config.

The Splunk Distribution of the OpenTelemetry Collector supports config source providers that can pull configuration values from external systems. The Vault config source provider connects directly to HashiCorp Vault, removing the need for a separate Vault Agent sidecar. Secrets are fetched when the Collector resolves its configuration, and KV v2 secrets can be refreshed on a configurable poll interval.

## How Config Source Providers Work

Config source providers extend the Collector's configuration resolution. Instead of reading values from environment variables or static files, they fetch values from external sources like Vault, etcd, or Zookeeper. In the config file, you reference these sources with a URI-like syntax.

## Setting Up the Vault Config Source

The Vault config source is available in the Splunk Distribution of the OpenTelemetry Collector as an alpha config source. Configure it in the Collector's config file:

```yaml
# config_sources section defines available sources

config_sources:
  vault/backend:
    endpoint: "https://vault.internal:8200"
    path: "secret/data/otel/backend"
    # Authentication method
    auth:
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
      # Pull the API key from Vault at config resolution time
      Authorization: "Bearer $vault/backend:data.api_key"
```

The syntax `$vault/backend:data.api_key` tells the Collector to read the `api_key` field from the `data` object returned by the Vault KV v2 path `secret/data/otel/backend`.

## Authentication Methods

### Token Auth

The simplest method, suitable for development:

```yaml
config_sources:
  vault/backend:
    endpoint: "https://vault.internal:8200"
    path: "secret/data/otel/backend"
    auth:
      token: "${env:VAULT_TOKEN}"
```

### AWS IAM Auth

For AWS deployments:

```yaml
config_sources:
  vault/backend:
    endpoint: "https://vault.internal:8200"
    path: "secret/data/otel/backend"
    auth:
      iam:
        mount: "aws"
        role: "otel-collector"
        aws_access_key_id: "${env:AWS_ACCESS_KEY_ID}"
        aws_secret_access_key: "${env:AWS_SECRET_ACCESS_KEY}"
        aws_security_token: "${env:AWS_SESSION_TOKEN}"
```

This uses Vault's AWS auth method to generate the Vault token. No static Vault token is needed.

### GCP Auth

For GCP deployments:

```yaml
config_sources:
  vault/backend:
    endpoint: "https://vault.internal:8200"
    path: "secret/data/otel/backend"
    auth:
      gcp:
        mount: "gcp"
        role: "otel-collector"
        service_account: "otel-collector@example-project.iam.gserviceaccount.com"
        project: "example-project"
```

## Complete Collector Configuration

```yaml
config_sources:
  vault/primary:
    endpoint: "https://vault.internal:8200"
    path: "secret/data/otel/primary-backend"
    auth:
      token: "${env:VAULT_TOKEN}"
    # Poll Vault KV v2 metadata for secret changes every 5 minutes
    poll_interval: 5m

  vault/secondary:
    endpoint: "https://vault.internal:8200"
    path: "secret/data/otel/secondary-backend"
    auth:
      token: "${env:VAULT_TOKEN}"
    poll_interval: 5m

  vault/tls:
    endpoint: "https://vault.internal:8200"
    path: "secret/data/otel/tls-certs"
    auth:
      token: "${env:VAULT_TOKEN}"
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
      Authorization: "Bearer $vault/primary:data.api_key"
    tls:
      cert_pem: "$vault/tls:data.client_cert"
      key_pem: "$vault/tls:data.client_key"

  otlp/secondary:
    endpoint: "secondary-backend.example.com:4317"
    headers:
      X-API-Token: "$vault/secondary:data.token"

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

Vault dynamic secrets (like database credentials or AWS IAM keys) are generated on-demand and have a TTL. The config source provider uses Vault's lease watcher for renewable secrets:

```yaml
config_sources:
  vault/clickhouse:
    endpoint: "https://vault.internal:8200"
    path: "database/creds/otel-writer"
    auth:
      token: "${env:VAULT_TOKEN}"

exporters:
  # Use a dynamically generated database credential
  # for an exporter that writes to a database
  clickhouse:
    endpoint: "tcp://clickhouse.internal:9000"
    username: "$vault/clickhouse:username"
    password: "$vault/clickhouse:password"
    database: "traces"
```

The provider renews renewable leases through Vault's lifetime watcher. If renewal stops, the Collector is notified to re-resolve the configuration and request a new credential.

## Multiple Vault Instances

You can configure multiple Vault sources for different secret stores:

```yaml
config_sources:
  vault/production:
    endpoint: "https://vault-prod.internal:8200"
    path: "secret/data/otel/prod-backend"
    auth:
      token: "${env:VAULT_PROD_TOKEN}"

  vault/shared:
    endpoint: "https://vault-shared.internal:8200"
    path: "secret/data/otel/monitoring"
    auth:
      token: "${env:VAULT_SHARED_TOKEN}"

exporters:
  otlp/prod:
    endpoint: "prod-backend.example.com:4317"
    headers:
      Authorization: "Bearer $vault/production:data.api_key"

  otlp/monitoring:
    endpoint: "monitoring.example.com:4317"
    headers:
      X-API-Key: "$vault/shared:data.api_key"
```

## Error Handling

If the Vault config source cannot connect to Vault or cannot read the configured path while resolving the configuration, the Collector will fail to start. This is the desired behavior since running without proper authentication would mean data is not being exported.

For Vault errors after startup, the config source reports a change event with the error. KV v2 secrets are checked by polling metadata at the configured interval, and dynamic secrets use Vault lease renewal events to trigger re-resolution when renewal stops.

## Vault Policy for Config Source

```hcl
# otel-collector-config-source.hcl
path "secret/data/otel/*" {
  capabilities = ["read"]
}

path "secret/metadata/otel/*" {
  capabilities = ["read"]
}

path "database/creds/otel-writer" {
  capabilities = ["read"]
}
```

The Vault config source provider gives you a direct integration between the Collector and Vault in distributions that include it. No sidecar containers, no template rendering, and no startup scripts. Secrets are resolved inline in the config file, and the provider handles authentication, KV v2 metadata polling, and dynamic secret lease renewal.
