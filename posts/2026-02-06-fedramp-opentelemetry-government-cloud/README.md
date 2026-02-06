# How to Configure OpenTelemetry for FedRAMP-Compliant Government Cloud Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, FedRAMP, Government Cloud, Security

Description: Configure OpenTelemetry Collectors and SDKs to meet FedRAMP security controls in government cloud environments.

FedRAMP (Federal Risk and Authorization Management Program) sets the bar for cloud security when working with US federal agencies. If your application runs in a FedRAMP-authorized environment like AWS GovCloud, Azure Government, or Google Cloud for Government, your telemetry pipeline must comply with the same NIST 800-53 security controls that govern the rest of your system.

This means encrypted transport, FIPS-validated cryptography, strict access controls, and audit logging for the telemetry pipeline itself. Here is how to configure OpenTelemetry to meet these requirements.

## FedRAMP-Relevant NIST 800-53 Controls for Telemetry

The controls that directly affect your telemetry pipeline include:

- **SC-8** (Transmission Confidentiality): All telemetry must be encrypted in transit using FIPS 140-2 validated cryptographic modules
- **SC-28** (Protection of Information at Rest): Telemetry stored in backends must be encrypted at rest
- **AU-2** (Audit Events): The telemetry system itself must generate audit records
- **AU-3** (Content of Audit Records): Audit records must contain specific fields
- **AU-6** (Audit Review, Analysis, and Reporting): Telemetry data must support regular review
- **AC-6** (Least Privilege): Collector service accounts must have minimal permissions
- **SI-4** (Information System Monitoring): Continuous monitoring is mandatory

## FIPS-Compliant TLS Configuration

The most critical requirement is FIPS 140-2 validated cryptography for all data in transit. The OpenTelemetry Collector must be built with a FIPS-compliant TLS library and configured to use only FIPS-approved cipher suites.

Build and configure the collector with FIPS-validated TLS:

```yaml
# fedramp-collector.yaml
# Requires the collector to be compiled with GOEXPERIMENT=boringcrypto
# which uses BoringSSL's FIPS-validated crypto module

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        tls:
          # Require mutual TLS - both client and server authenticate
          cert_file: /etc/pki/tls/certs/collector-server.crt
          key_file: /etc/pki/tls/private/collector-server.key
          client_ca_file: /etc/pki/tls/certs/fedramp-ca.crt
          # Only allow FIPS-approved TLS versions and cipher suites
          min_version: "1.2"
          max_version: "1.3"
          cipher_suites:
            - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
            - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
            - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384
            - TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256

exporters:
  otlp/fedramp_backend:
    endpoint: https://telemetry.govcloud.internal:4317
    tls:
      cert_file: /etc/pki/tls/certs/collector-client.crt
      key_file: /etc/pki/tls/private/collector-client.key
      ca_file: /etc/pki/tls/certs/fedramp-ca.crt
      min_version: "1.2"
      cipher_suites:
        - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
        - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
```

## Building a FIPS-Compliant Collector Binary

The standard OpenTelemetry Collector binary does not use FIPS-validated cryptography. You need to build it with Go's BoringCrypto experiment flag.

Build the collector with FIPS crypto support:

```dockerfile
# Dockerfile.fedramp-collector
# Build the collector with FIPS 140-2 validated BoringCrypto
FROM golang:1.22-bookworm AS builder

# Enable BoringCrypto - uses FIPS-validated BoringSSL
ENV GOEXPERIMENT=boringcrypto
ENV CGO_ENABLED=1

# Install the OpenTelemetry Collector builder
RUN go install go.opentelemetry.io/collector/cmd/builder@latest

# Copy the collector build manifest
COPY builder-config.yaml /build/builder-config.yaml
WORKDIR /build

# Build the collector with FIPS crypto
RUN builder --config=builder-config.yaml

# Runtime image - use a FIPS-enabled base
FROM redhat/ubi9-minimal:latest

# Install FIPS-validated OpenSSL
RUN microdnf install -y openssl && microdnf clean all

# Enable FIPS mode at the OS level
RUN fips-mode-setup --enable || true

COPY --from=builder /build/otelcol-fedramp /usr/local/bin/otelcol
COPY fedramp-collector.yaml /etc/otel/config.yaml

# Run as non-root (AC-6 Least Privilege)
RUN useradd -r -s /sbin/nologin otelcol
USER otelcol

ENTRYPOINT ["/usr/local/bin/otelcol"]
CMD ["--config=/etc/otel/config.yaml"]
```

## Audit Logging for the Collector Itself (AU-2, AU-3)

FedRAMP requires audit logging for security-relevant events within the telemetry system itself. Configure the collector to log its own operations:

```yaml
# Extension of fedramp-collector.yaml - audit logging section
extensions:
  # Health check for monitoring the collector
  health_check:
    endpoint: 0.0.0.0:13133

  # zpages for debugging (restrict access in production)
  zpages:
    endpoint: localhost:55679

service:
  extensions: [health_check, zpages]

  # Configure collector telemetry (about the collector itself)
  telemetry:
    logs:
      level: info
      # Structured JSON logs for the collector's own operations
      encoding: json
      output_paths:
        - /var/log/otel/collector-audit.log
      # Include caller information for traceability
      initial_fields:
        component: "otel-collector"
        environment: "fedramp-high"
        system_boundary: "govcloud-east"

    metrics:
      level: detailed
      address: 0.0.0.0:8888

  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - transform/fedramp_metadata
        - filter/sensitive_data
        - batch
      exporters: [otlp/fedramp_backend]
```

## Sensitive Data Filtering (SC-28)

Government telemetry often contains CUI (Controlled Unclassified Information). Configure strict data filtering to ensure nothing sensitive leaves the boundary:

```yaml
# Processors for FedRAMP-compliant data handling
processors:
  # Add FedRAMP boundary metadata to all telemetry
  transform/fedramp_metadata:
    trace_statements:
      - context: resource
        statements:
          - set(attributes["fedramp.boundary"], "govcloud-east")
          - set(attributes["fedramp.impact_level"], "high")
          - set(attributes["fedramp.system_id"], "FRA-2024-0042")

  # Remove any attributes that might contain CUI
  filter/sensitive_data:
    error_mode: ignore

  transform/scrub_cui:
    trace_statements:
      - context: span
        statements:
          # Remove database queries that might contain CUI
          - delete_key(attributes, "db.statement")
          # Remove request/response bodies
          - delete_key(attributes, "http.request.body")
          - delete_key(attributes, "http.response.body")
          # Scrub potential PII from URLs
          - replace_pattern(attributes["url.path"],
              "/users/[^/]+", "/users/{id}")
          - replace_pattern(attributes["url.path"],
              "/cases/[^/]+", "/cases/{id}")
    log_statements:
      - context: log
        statements:
          # Redact SSNs and other identifiers from log messages
          - replace_pattern(body,
              "[0-9]{3}-[0-9]{2}-[0-9]{4}",
              "[REDACTED]")
          - replace_pattern(body,
              "[0-9]{9}", "[REDACTED-ID]")

  batch:
    timeout: 5s
    send_batch_size: 500
```

## Kubernetes Deployment with Security Constraints

Deploy the collector with Kubernetes security policies that satisfy FedRAMP access control requirements:

```yaml
# k8s-fedramp-collector.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector-fedramp
  namespace: observability
  labels:
    app: otel-collector
    fedramp.impact-level: "high"
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
      # AC-6: Run as non-root with minimal capabilities
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        fsGroup: 10001
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: collector
          image: registry.govcloud.internal/otel-collector-fedramp:latest
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          ports:
            - containerPort: 4317
              name: otlp-grpc
          resources:
            requests:
              cpu: "1"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "2Gi"
          volumeMounts:
            - name: config
              mountPath: /etc/otel
              readOnly: true
            - name: tls
              mountPath: /etc/pki/tls
              readOnly: true
            - name: audit-logs
              mountPath: /var/log/otel
          env:
            # Enforce FIPS mode
            - name: GOFIPS
              value: "1"
      volumes:
        - name: config
          configMap:
            name: fedramp-collector-config
        - name: tls
          secret:
            secretName: collector-tls-fedramp
        - name: audit-logs
          persistentVolumeClaim:
            claimName: collector-audit-logs
      # Schedule only on FedRAMP-authorized nodes
      nodeSelector:
        fedramp.authorized: "true"
      tolerations:
        - key: "fedramp.workload"
          operator: "Equal"
          value: "high"
          effect: "NoSchedule"
```

## SDK Configuration for Application Services

Application services in the FedRAMP boundary also need to use FIPS-compliant TLS when exporting telemetry:

```python
# Python SDK configuration for FedRAMP environments
import ssl
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Create a FIPS-compliant SSL context
ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
ssl_context.load_cert_chain(
    certfile="/etc/pki/tls/certs/app-client.crt",
    keyfile="/etc/pki/tls/private/app-client.key",
)
ssl_context.load_verify_locations("/etc/pki/tls/certs/fedramp-ca.crt")

# Configure the exporter with mutual TLS
exporter = OTLPSpanExporter(
    endpoint="otel-collector-fedramp.observability:4317",
    credentials=ssl_context,
)
```

## Summary

Configuring OpenTelemetry for FedRAMP boils down to three areas: cryptographic compliance (FIPS 140-2 validated TLS everywhere), strict data handling (scrub CUI and PII at the collector), and security hardening (least-privilege service accounts, read-only filesystems, audit logging for the collector itself). The most labor-intensive part is building the collector binary with BoringCrypto, but once that is done, the rest is configuration. Make sure to document your telemetry pipeline in your System Security Plan (SSP) and include it in your continuous monitoring program.
