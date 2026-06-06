# How to Configure Azure Auth Extension in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Extension, Azure, Authentication, Microsoft, Cloud Security

Description: Complete guide to configuring Azure authentication extension in OpenTelemetry Collector for secure access to Azure Monitor and other Microsoft cloud services.

Authenticating with Azure services from your OpenTelemetry Collector requires proper configuration of Microsoft Entra ID credentials. The Azure Auth extension provides a streamlined way to authenticate using managed identities, workload identity, service principals, and default Azure credentials.

## Understanding the Azure Auth Extension

The Azure Auth extension enables the OpenTelemetry Collector to authenticate with Azure services using Microsoft Entra ID. This extension is particularly important when exporting telemetry data to Azure Monitor OTLP ingestion endpoints or other Azure services that accept Microsoft Entra bearer tokens.

The extension implements Microsoft's authentication protocols and automatically manages token acquisition and refresh, ensuring your collector maintains authenticated connections without manual intervention.

## Supported Authentication Methods

The Azure Auth extension supports multiple authentication mechanisms to accommodate different deployment scenarios:

**Managed Identity**: The recommended approach for Azure-hosted resources like Virtual Machines, App Service, and Azure Functions. Eliminates the need to manage credentials.

**Workload Identity**: The recommended approach for Kubernetes workloads such as AKS pods using Azure Workload Identity.

**Service Principal with Client Secret**: Uses an application ID and secret for authentication, suitable for non-Azure environments or CI/CD pipelines.

**Service Principal with Certificate**: More secure than client secrets, uses X.509 certificates for authentication.

**Default Credentials**: Uses Azure SDK default credential resolution, useful for development and testing but not recommended for production.

## Basic Configuration with Managed Identity

When running on Azure infrastructure, managed identity is the simplest and most secure authentication method.

```yaml
# collector-config.yaml

extensions:
  # Configure Azure auth with system-assigned managed identity
  azure_auth:
    managed_identity: {}
    scopes:
      - https://monitor.azure.com/.default

    # Use system-assigned managed identity (default behavior)
    # No additional credentials needed

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  # Azure Monitor OTLP ingestion using the auth extension
  otlphttp/azuremonitor:
    traces_endpoint: "https://<logs-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Microsoft-OTLP-Traces/otlp/v1/traces"
    metrics_endpoint: "https://<metrics-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Custom-Metrics-Otel/otlp/v1/metrics"
    auth:
      authenticator: azure_auth

service:
  extensions: [azure_auth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/azuremonitor]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/azuremonitor]
```

This configuration automatically uses the system-assigned managed identity attached to your Azure resource. Ensure the managed identity has the "Monitoring Metrics Publisher" role on the target resources.

## Using User-Assigned Managed Identity

For environments with multiple managed identities, specify which user-assigned identity to use:

```yaml
extensions:
  azure_auth:
    managed_identity:
      # Specify a user-assigned managed identity
      client_id: "12345678-1234-1234-1234-123456789abc"
    scopes:
      - https://monitor.azure.com/.default


receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

  # Add resource attributes for better observability
  resource:
    attributes:
      - key: deployment.environment
        value: "production"
        action: upsert
      - key: cloud.provider
        value: "azure"
        action: upsert

exporters:
  otlphttp/azuremonitor:
    traces_endpoint: "https://<logs-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Microsoft-OTLP-Traces/otlp/v1/traces"
    auth:
      authenticator: azure_auth

service:
  extensions: [azure_auth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlphttp/azuremonitor]
```

The `client_id` identifies the specific user-assigned managed identity to use for authentication. You can find this ID in the Azure portal under the managed identity resource.

## Service Principal Authentication

For collectors running outside Azure or in environments without managed identity support, use service principal authentication:

```yaml
extensions:
  azure_auth:
    scopes:
      - https://monitor.azure.com/.default

    # Service principal credentials
    service_principal:
      tenant_id: "your-tenant-id"
      client_id: "your-app-id"
      client_secret: "your-client-secret"

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Add memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

exporters:
  otlphttp/azuremonitor:
    traces_endpoint: "https://<logs-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Microsoft-OTLP-Traces/otlp/v1/traces"
    metrics_endpoint: "https://<metrics-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Custom-Metrics-Otel/otlp/v1/metrics"
    auth:
      authenticator: azure_auth

service:
  extensions: [azure_auth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/azuremonitor]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/azuremonitor]
```

To create a service principal and obtain credentials:

```bash
# Create service principal
az ad sp create-for-rbac --name "otel-collector-sp" \
  --role "Monitoring Metrics Publisher" \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID

# Output contains appId, password, and tenant values for the service principal.
```

## Certificate-Based Authentication

For enhanced security, use certificate-based authentication instead of client secrets:

```yaml
extensions:
  azure_auth:
    scopes:
      - https://monitor.azure.com/.default

    # Service principal with certificate
    service_principal:
      tenant_id: "your-tenant-id"
      client_id: "your-app-id"
      client_certificate_path: "/path/to/certificate.pem"

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp/azuremonitor:
    traces_endpoint: "https://<logs-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Microsoft-OTLP-Traces/otlp/v1/traces"
    auth:
      authenticator: azure_auth

service:
  extensions: [azure_auth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/azuremonitor]
```

To configure certificate authentication, first create and upload a certificate to your service principal in the Azure portal.

## Authentication Flow Architecture

Here's how the Azure Auth extension manages the authentication lifecycle:

```mermaid
sequenceDiagram
    participant C as Collector
    participant A as Azure Auth Extension
    participant E as Microsoft Entra ID
    participant M as Azure Monitor

    C->>A: Initialize extension
    A->>A: Detect auth method
    A->>E: Request OAuth token
    E->>A: Return access token
    Note over A: Cache token

    loop Every export
        C->>A: Export telemetry
        A->>A: Validate token expiry
        alt Token expired
            A->>E: Refresh token
            E->>A: New access token
        end
        A->>M: Send data with bearer token
        M->>A: HTTP 200 OK
        A->>C: Delivery confirmed
    end
```

## Multi-Resource Authentication

Configure separate authenticators for different Azure resources or subscriptions:

```yaml
extensions:
  # Authentication for Azure Monitor
  azure_auth/monitor:
    scopes:
      - https://monitor.azure.com/.default
    service_principal:
      tenant_id: "tenant-1"
      client_id: "client-1"
      client_secret: "${env:AZURE_CLIENT_SECRET_1}"

  # Authentication for a second Azure Monitor endpoint
  azure_auth/monitor_secondary:
    scopes:
      - https://monitor.azure.com/.default
    service_principal:
      tenant_id: "tenant-2"
      client_id: "client-2"
      client_secret: "${env:AZURE_CLIENT_SECRET_2}"

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  # Export metrics to Azure Monitor
  otlphttp/azuremonitor:
    metrics_endpoint: "https://<metrics-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Custom-Metrics-Otel/otlp/v1/metrics"
    auth:
      authenticator: azure_auth/monitor

  # Export logs to another Azure Monitor ingestion endpoint
  otlphttp/azuremonitor_secondary:
    logs_endpoint: "https://<logs-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Microsoft-OTLP-Logs/otlp/v1/logs"
    auth:
      authenticator: azure_auth/monitor_secondary

service:
  extensions: [azure_auth/monitor, azure_auth/monitor_secondary]
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/azuremonitor]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/azuremonitor_secondary]
```

This configuration demonstrates how to authenticate with multiple Azure Monitor ingestion endpoints simultaneously, each potentially using different credentials or tenants.

## Using Environment Variables for Secrets

Store sensitive credentials in environment variables instead of hardcoding them:

```yaml
extensions:
  azure_auth:
    scopes:
      - https://monitor.azure.com/.default
    service_principal:
      tenant_id: "${env:AZURE_TENANT_ID}"
      client_id: "${env:AZURE_CLIENT_ID}"
      client_secret: "${env:AZURE_CLIENT_SECRET}"

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp/azuremonitor:
    traces_endpoint: "${env:AZURE_MONITOR_TRACES_ENDPOINT}"
    auth:
      authenticator: azure_auth

service:
  extensions: [azure_auth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/azuremonitor]
```

Set the environment variables before starting the collector:

```bash
export AZURE_TENANT_ID="your-tenant-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"
export AZURE_MONITOR_TRACES_ENDPOINT="https://<logs-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Microsoft-OTLP-Traces/otlp/v1/traces"

# Start the collector
./otelcol --config=collector-config.yaml
```

## Kubernetes Deployment with Azure Workload Identity

For collectors running on Azure Kubernetes Service (AKS), use Azure Workload Identity:

```yaml
# collector-config.yaml
extensions:
  azure_auth:
    workload_identity:
      client_id: "${env:AZURE_CLIENT_ID}"
      tenant_id: "${env:AZURE_TENANT_ID}"
      federated_token_file: "${env:AZURE_FEDERATED_TOKEN_FILE}"
    scopes:
      - https://monitor.azure.com/.default

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

  # Detect and add Azure resource attributes
  resourcedetection:
    detectors: [azure]
    timeout: 5s

exporters:
  otlphttp/azuremonitor:
    traces_endpoint: "https://<logs-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Microsoft-OTLP-Traces/otlp/v1/traces"
    auth:
      authenticator: azure_auth

service:
  extensions: [azure_auth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resourcedetection, batch]
      exporters: [otlphttp/azuremonitor]
```

Configure the Kubernetes service account with Azure Workload Identity annotations:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector
  namespace: monitoring
  annotations:
    azure.workload.identity/client-id: "your-managed-identity-client-id"
    azure.workload.identity/tenant-id: "your-tenant-id"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  template:
    metadata:
      labels:
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: otel-collector
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        volumeMounts:
        - name: config
          mountPath: /etc/otel
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

## Security Best Practices

Follow these guidelines to secure your Azure authentication:

**Prefer Managed Identity**: When running on Azure, always use managed identity to avoid managing credentials.

**Rotate secrets regularly**: If using service principals with secrets, implement a rotation policy (recommended every 90 days).

**Use certificate authentication**: When service principals are necessary, prefer certificates over client secrets.

**Apply least privilege**: Grant only the minimum required Azure RBAC roles to your identities.

**Store secrets securely**: Use Azure Key Vault, Kubernetes Secrets, or environment variables instead of hardcoding credentials.

**Monitor authentication failures**: Set up alerts in Azure Monitor for authentication errors.

## Troubleshooting Common Issues

**"Authentication failed" errors**: Verify your tenant_id, client_id, and credentials are correct. Check Microsoft Entra audit logs for details.

**"Insufficient permissions" errors**: Ensure the service principal or managed identity has the required RBAC roles (typically "Monitoring Metrics Publisher").

**Token refresh failures**: Check network connectivity to Microsoft Entra ID endpoints. Ensure no firewall rules block access to `login.microsoftonline.com`.

**Certificate validation errors**: Verify the certificate path is correct and the collector process has read permissions. Check certificate expiration dates.

**Managed identity not found**: Ensure managed identity is enabled on the Azure resource and that you're using the correct client_id for user-assigned identities.

## Integration with Azure Services

The Azure Auth extension works with various Azure services:

```yaml
extensions:
  azure_auth:
    managed_identity: {}
    scopes:
      - https://monitor.azure.com/.default

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  # Azure Monitor OTLP ingestion for traces, metrics, and logs
  otlphttp/azuremonitor:
    traces_endpoint: "https://<logs-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Microsoft-OTLP-Traces/otlp/v1/traces"
    metrics_endpoint: "https://<metrics-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Custom-Metrics-Otel/otlp/v1/metrics"
    logs_endpoint: "https://<logs-dce-domain>/datacollectionRules/<dcr-immutable-id>/streams/Microsoft-OTLP-Logs/otlp/v1/logs"
    auth:
      authenticator: azure_auth

service:
  extensions: [azure_auth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/azuremonitor]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/azuremonitor]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/azuremonitor]
```

## Conclusion

The Azure Auth extension simplifies authentication between your OpenTelemetry Collector and Azure services. By supporting multiple authentication methods and handling token lifecycle automatically, it enables secure and reliable telemetry export to Azure Monitor and other Microsoft cloud services.

For related authentication topics, see guides on [Google Client Auth](https://oneuptime.com/blog/post/2026-02-06-google-client-auth-extension-opentelemetry-collector/view) and [OpAMP extension for remote management](https://oneuptime.com/blog/post/2026-02-06-opamp-extension-remote-collector-management/view).
