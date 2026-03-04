# How to Configure SigV4 Auth Extension for AWS in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Extensions, Authentication, AWS, SigV4, Cloud, Security

Description: Learn how to configure AWS Signature Version 4 authentication in the OpenTelemetry Collector to securely send telemetry data to AWS services like CloudWatch and X-Ray.

AWS Signature Version 4 (SigV4) is the authentication mechanism used by Amazon Web Services to verify the identity and integrity of requests. The OpenTelemetry Collector's SigV4 auth extension enables seamless integration with AWS services by automatically signing requests using AWS credentials, eliminating the need for long-lived API keys or bearer tokens.

## Understanding AWS Signature Version 4

AWS Signature Version 4 is a cryptographic signing protocol that creates a hash-based message authentication code (HMAC) for each request. The signature proves that the request comes from an authenticated AWS principal and that the request has not been tampered with during transit.

The signing process involves:

1. Creating a canonical request that includes the HTTP method, URI, headers, and payload
2. Creating a string to sign that includes the canonical request hash, timestamp, and credential scope
3. Computing the signature using the AWS secret access key
4. Adding the signature to the request headers

The SigV4 auth extension handles this complex process automatically, requiring only AWS credentials to be configured.

## Why Use SigV4 Authentication?

SigV4 authentication provides several advantages for AWS integrations:

**Native AWS Integration**: SigV4 is the standard authentication method for AWS services, ensuring compatibility with CloudWatch, X-Ray, S3, and other AWS APIs.

**IAM-Based Access Control**: Leverage AWS IAM roles and policies for fine-grained access control, enabling secure access without managing separate credentials.

**Temporary Credentials**: Works seamlessly with temporary security credentials from IAM roles, including EC2 instance profiles and EKS pod identities.

**Request Integrity**: The signature includes request metadata, ensuring that requests cannot be modified in transit without invalidating the signature.

**No Token Management**: Unlike bearer tokens or API keys, SigV4 signatures are computed per-request, eliminating token expiration and rotation concerns.

## Architecture Overview

The SigV4 auth extension signs outgoing requests using AWS credentials:

```mermaid
graph TD
    A[Application] -->|Telemetry Data| B[Collector Receiver]
    B --> C[Processor Pipeline]
    C --> D[AWS Exporter]
    E[SigV4 Auth Extension] -->|Signs Requests| D
    F[AWS Credentials Provider] -->|Provides Credentials| E
    D -->|Signed Request| G[AWS Service]
    G -->|Validates Signature| H[CloudWatch/X-Ray]
    style E fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#ff9,stroke:#333,stroke-width:2px
```

The extension retrieves AWS credentials from the standard AWS credential chain (environment variables, EC2 instance metadata, EKS pod identity, or credential files) and uses them to sign requests.

## Basic Configuration

Here's a minimal configuration for using SigV4 authentication with AWS services:

```yaml
# Define the SigV4 auth extension
extensions:
  # sigv4auth extension configuration
  sigv4auth:
    # AWS region where the service is located
    region: "us-east-1"

    # AWS service identifier (e.g., aps, xray, cloudwatch)
    service: "aps"

# Configure receivers
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

# Processors
processors:
  batch:
    timeout: 10s
    send_batch_size: 1024

# Exporters with SigV4 authentication
exporters:
  # Prometheus remote write to Amazon Managed Service for Prometheus
  prometheusremotewrite:
    endpoint: https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-xxxxx/api/v1/remote_write
    # Reference the SigV4 auth extension
    auth:
      authenticator: sigv4auth

# Service configuration
service:
  # Include the extension in the service
  extensions: [sigv4auth]

  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

This configuration automatically signs requests to Amazon Managed Service for Prometheus using credentials from the default AWS credential chain.

## Credential Configuration Options

The SigV4 extension supports multiple methods for providing AWS credentials:

### Using Default Credential Chain

The simplest approach is to rely on the default AWS credential chain:

```yaml
extensions:
  sigv4auth:
    region: "us-east-1"
    service: "aps"
    # No explicit credentials - uses default chain:
    # 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    # 2. Shared credentials file (~/.aws/credentials)
    # 3. EC2 instance metadata (if running on EC2)
    # 4. EKS pod identity (if running on EKS)

receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s

exporters:
  prometheusremotewrite:
    endpoint: https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-xxxxx/api/v1/remote_write
    auth:
      authenticator: sigv4auth

service:
  extensions: [sigv4auth]
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

### Using Environment Variables

Explicitly provide credentials via environment variables:

```yaml
extensions:
  sigv4auth:
    region: "us-east-1"
    service: "aps"
    # Credentials will be read from environment variables:
    # AWS_ACCESS_KEY_ID
    # AWS_SECRET_ACCESS_KEY
    # AWS_SESSION_TOKEN (for temporary credentials)

receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s

exporters:
  prometheusremotewrite:
    endpoint: https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-xxxxx/api/v1/remote_write
    auth:
      authenticator: sigv4auth

service:
  extensions: [sigv4auth]
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

Start the collector with AWS credentials:

```bash
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
./otelcol --config=config.yaml
```

### Using IAM Role with AssumeRole

For cross-account access or role assumption:

```yaml
extensions:
  sigv4auth:
    region: "us-east-1"
    service: "xray"

    # Assume a specific IAM role
    assume_role:
      # ARN of the role to assume
      arn: "arn:aws:iam::123456789012:role/OtelCollectorRole"
      # Optional: Session name for CloudTrail logging
      session_name: "otel-collector-session"
      # Optional: External ID for additional security
      external_id: "unique-external-id"

receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s

exporters:
  # AWS X-Ray exporter
  awsxray:
    region: us-east-1
    auth:
      authenticator: sigv4auth

service:
  extensions: [sigv4auth]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [awsxray]
```

## Integration with Amazon Managed Service for Prometheus

Configure the collector to send metrics to Amazon Managed Service for Prometheus (AMP):

```yaml
extensions:
  sigv4auth:
    region: "us-west-2"
    # Service identifier for AMP
    service: "aps"

receivers:
  # Prometheus receiver to scrape metrics
  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          scrape_interval: 30s
          static_configs:
            - targets: ['localhost:8888']

  # OTLP receiver for application metrics
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 30s
    send_batch_size: 1024

  # Add resource attributes for better organization
  resource:
    attributes:
      - key: cluster.name
        value: "production-cluster"
        action: upsert
      - key: aws.region
        value: "us-west-2"
        action: upsert

exporters:
  # Prometheus remote write to AMP
  prometheusremotewrite:
    endpoint: https://aps-workspaces.us-west-2.amazonaws.com/workspaces/ws-12345678-abcd-efgh-ijkl-123456789012/api/v1/remote_write
    auth:
      authenticator: sigv4auth
    # Additional AMP configuration
    external_labels:
      environment: production
      collector: otel
    # Retry configuration
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

service:
  extensions: [sigv4auth]

  pipelines:
    metrics:
      receivers: [prometheus, otlp]
      processors: [resource, batch]
      exporters: [prometheusremotewrite]
```

## Integration with AWS X-Ray

Send distributed traces to AWS X-Ray using SigV4 authentication:

```yaml
extensions:
  sigv4auth:
    region: "us-east-1"
    # Service identifier for X-Ray
    service: "xray"

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
    send_batch_size: 50

  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

  # Resource detection for AWS metadata
  resourcedetection:
    detectors: [env, ec2, ecs, eks]
    timeout: 5s

exporters:
  # AWS X-Ray exporter
  awsxray:
    # Region is required
    region: us-east-1
    # Use SigV4 auth extension
    auth:
      authenticator: sigv4auth
    # X-Ray specific configuration
    indexed_attributes:
      - "http.status_code"
      - "error"
    # Disable local mode (use API instead of daemon)
    local_mode: false

service:
  extensions: [sigv4auth]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [awsxray]
```

## Integration with CloudWatch Logs

Send logs to Amazon CloudWatch Logs:

```yaml
extensions:
  sigv4auth:
    region: "us-east-1"
    # Service identifier for CloudWatch Logs
    service: "logs"

receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s

  # Add log group context
  resource:
    attributes:
      - key: log.group.name
        value: "/aws/otel/application-logs"
        action: upsert

exporters:
  # CloudWatch Logs exporter
  awscloudwatchlogs:
    region: us-east-1
    log_group_name: "/aws/otel/application-logs"
    log_stream_name: "collector-stream"
    auth:
      authenticator: sigv4auth
    # Retry configuration
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

service:
  extensions: [sigv4auth]

  pipelines:
    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [awscloudwatchlogs]
```

## Multiple AWS Services Configuration

Configure multiple SigV4 auth extensions for different AWS services:

```yaml
extensions:
  # SigV4 for Amazon Managed Service for Prometheus
  sigv4auth/amp:
    region: "us-west-2"
    service: "aps"

  # SigV4 for AWS X-Ray
  sigv4auth/xray:
    region: "us-west-2"
    service: "xray"

  # SigV4 for CloudWatch Logs
  sigv4auth/logs:
    region: "us-west-2"
    service: "logs"

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch/traces:
    timeout: 10s

  batch/metrics:
    timeout: 30s

  batch/logs:
    timeout: 10s

  # Detect AWS resource attributes
  resourcedetection:
    detectors: [env, ec2, ecs, eks]

exporters:
  # Metrics to AMP
  prometheusremotewrite:
    endpoint: https://aps-workspaces.us-west-2.amazonaws.com/workspaces/ws-xxxxx/api/v1/remote_write
    auth:
      authenticator: sigv4auth/amp

  # Traces to X-Ray
  awsxray:
    region: us-west-2
    auth:
      authenticator: sigv4auth/xray

  # Logs to CloudWatch
  awscloudwatchlogs:
    region: us-west-2
    log_group_name: "/aws/otel/app-logs"
    auth:
      authenticator: sigv4auth/logs

service:
  extensions: [sigv4auth/amp, sigv4auth/xray, sigv4auth/logs]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [resourcedetection, batch/traces]
      exporters: [awsxray]

    metrics:
      receivers: [otlp]
      processors: [resourcedetection, batch/metrics]
      exporters: [prometheusremotewrite]

    logs:
      receivers: [otlp]
      processors: [resourcedetection, batch/logs]
      exporters: [awscloudwatchlogs]
```

## EKS Deployment with IAM Roles for Service Accounts (IRSA)

Deploy the collector on Amazon EKS using IAM Roles for Service Accounts:

```yaml
# IAM Role for Service Account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector
  namespace: observability
  annotations:
    # ARN of the IAM role
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/OtelCollectorRole
---
# ConfigMap with collector configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    extensions:
      sigv4auth:
        region: "us-west-2"
        service: "aps"
        # No explicit credentials needed - uses IRSA

    receivers:
      otlp:
        protocols:
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 30s

      resourcedetection:
        detectors: [env, eks]

      resource:
        attributes:
          - key: k8s.cluster.name
            value: "production-cluster"
            action: upsert

    exporters:
      prometheusremotewrite:
        endpoint: https://aps-workspaces.us-west-2.amazonaws.com/workspaces/ws-xxxxx/api/v1/remote_write
        auth:
          authenticator: sigv4auth

    service:
      extensions: [sigv4auth]
      pipelines:
        metrics:
          receivers: [otlp]
          processors: [resourcedetection, resource, batch]
          exporters: [prometheusremotewrite]
---
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      # Use the service account with IAM role
      serviceAccountName: otel-collector
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        env:
        # AWS region from downward API
        - name: AWS_REGION
          value: "us-west-2"
        volumeMounts:
        - name: config
          mountPath: /etc/otel
          readOnly: true
        args:
        - --config=/etc/otel/config.yaml
        ports:
        - containerPort: 4318
          name: otlp-http
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

The IAM role policy for the service account:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "aps:RemoteWrite",
        "aps:GetSeries",
        "aps:GetLabels",
        "aps:GetMetricMetadata"
      ],
      "Resource": "arn:aws:aps:us-west-2:123456789012:workspace/ws-xxxxx"
    }
  ]
}
```

## EC2 Deployment with Instance Profile

Deploy the collector on EC2 using an instance profile:

```yaml
extensions:
  sigv4auth:
    region: "us-east-1"
    service: "xray"
    # No explicit credentials needed - uses EC2 instance profile

receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s

  # Detect EC2 metadata
  resourcedetection:
    detectors: [env, ec2, system]
    ec2:
      # Tags to add as resource attributes
      tags:
        - "^name"
        - "^environment"
    timeout: 5s

exporters:
  awsxray:
    region: us-east-1
    auth:
      authenticator: sigv4auth

service:
  extensions: [sigv4auth]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [resourcedetection, batch]
      exporters: [awsxray]
```

Attach an IAM role to the EC2 instance with the necessary permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
```

## Production Configuration

Here's a comprehensive production configuration for AWS:

```yaml
extensions:
  # SigV4 for metrics
  sigv4auth/metrics:
    region: "us-west-2"
    service: "aps"

  # SigV4 for traces
  sigv4auth/traces:
    region: "us-west-2"
    service: "xray"

  # Health check endpoint
  health_check:
    endpoint: 0.0.0.0:13133

  # Performance profiling
  pprof:
    endpoint: localhost:1777

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Prometheus scraping for internal metrics
  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          scrape_interval: 30s
          static_configs:
            - targets: ['localhost:8888']

processors:
  # Memory management
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

  # AWS resource detection
  resourcedetection:
    detectors: [env, ec2, ecs, eks, lambda]
    timeout: 5s
    override: false

  # Batching for efficiency
  batch/traces:
    timeout: 10s
    send_batch_size: 50

  batch/metrics:
    timeout: 30s
    send_batch_size: 1024

  # Add metadata
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert
      - key: collector.version
        value: "1.0.0"
        action: upsert

  # Remove sensitive attributes
  attributes:
    actions:
      - key: password
        action: delete
      - key: secret
        action: delete

exporters:
  # Metrics to AMP
  prometheusremotewrite:
    endpoint: https://aps-workspaces.us-west-2.amazonaws.com/workspaces/ws-xxxxx/api/v1/remote_write
    auth:
      authenticator: sigv4auth/metrics
    external_labels:
      environment: production
      cluster: prod-cluster
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

  # Traces to X-Ray
  awsxray:
    region: us-west-2
    auth:
      authenticator: sigv4auth/traces
    indexed_attributes:
      - "http.status_code"
      - "error"
      - "aws.operation"
    local_mode: false

  # Logging for troubleshooting
  logging:
    loglevel: info
    sampling_initial: 5
    sampling_thereafter: 200

service:
  extensions: [sigv4auth/metrics, sigv4auth/traces, health_check, pprof]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, attributes, resource, batch/traces]
      exporters: [awsxray, logging]

    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, resourcedetection, resource, batch/metrics]
      exporters: [prometheusremotewrite]
```

## Troubleshooting

**Signature Mismatch Errors**: Verify that the system clock is synchronized using NTP. AWS rejects requests with timestamps that differ by more than 5 minutes from AWS servers.

**Credential Not Found**: Check that AWS credentials are available through one of the credential chain mechanisms. Use AWS CLI (`aws sts get-caller-identity`) to verify credentials.

**Permission Denied**: Ensure the IAM role or user has the necessary permissions for the target AWS service. Check CloudTrail logs for detailed error messages.

**Region Mismatch**: Verify that the region in the configuration matches the region where your AWS resources are located.

**AssumeRole Failures**: When using role assumption, ensure the IAM entity has permissions to assume the target role and that the trust policy allows it.

## Security Best Practices

Use IAM roles instead of long-lived access keys whenever possible. EC2 instance profiles, EKS pod identities, and ECS task roles provide temporary credentials automatically.

Follow the principle of least privilege by granting only the minimum permissions required for collector operations.

Enable AWS CloudTrail to audit API calls made by the collector and detect potential security issues.

Use resource-based policies on AWS services to restrict which principals can send telemetry data.

Regularly rotate access keys if you must use them instead of IAM roles.

Monitor CloudWatch metrics and CloudTrail logs for unusual authentication patterns or failures.

## Related Resources

For more information about OpenTelemetry Collector authentication, check out these related posts:

- [How to Configure Bearer Token Auth Extension in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-bearer-token-auth-extension-opentelemetry-collector/view)
- [How to Configure OAuth2 Client Auth Extension in the OpenTelemetry Collector](https://oneuptime.com/blog/post/2026-02-06-oauth2-client-auth-extension-opentelemetry-collector/view)

The SigV4 auth extension provides seamless integration with AWS services by implementing the standard AWS authentication mechanism. By leveraging IAM roles and temporary credentials, you can securely send telemetry data to AWS services without managing long-lived credentials or API keys.
