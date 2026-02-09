# How to Troubleshoot mTLS Authentication Errors Between Application SDKs and the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, mTLS, Security, SDK

Description: Step-by-step guide to diagnosing mutual TLS authentication errors between OpenTelemetry SDKs and the Collector.

Mutual TLS (mTLS) adds a layer of security where both the client and the server present certificates to each other. When it works, it is great. When it breaks, the error messages can be misleading. This post covers the most common mTLS issues between OpenTelemetry SDKs and the Collector, and how to fix each one.

## How mTLS Works in OpenTelemetry

In a standard TLS setup, only the server (Collector) presents a certificate. With mTLS, the client (your application SDK) also presents a certificate, and the server verifies it against a trusted CA. Both sides must trust each other.

```
Application SDK                    Collector
    |                                  |
    |--- ClientHello ----------------->|
    |<-- ServerHello + Server Cert ----|
    |--- Client Cert ----------------->|  <-- This is the mTLS part
    |<-- Verified, Connection Open ----|
```

## Common Error Messages

Here are the errors you will encounter and what they mean:

```
# Client certificate not sent
tls: certificate required

# Client certificate sent but not trusted by the server
tls: unknown certificate authority

# Client certificate expired
tls: expired certificate

# Certificate chain incomplete
tls: failed to verify client certificate: x509: certificate signed by unknown authority
```

## Setting Up the Collector for mTLS

The Collector needs three things: its own certificate, its private key, and the CA certificate used to verify client certificates.

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        tls:
          cert_file: /certs/server.crt       # Collector's certificate
          key_file: /certs/server.key         # Collector's private key
          client_ca_file: /certs/client-ca.crt # CA that signed client certs
```

Mount the certificates in the Collector pod:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
        - name: collector
          volumeMounts:
            - name: tls-certs
              mountPath: /certs
              readOnly: true
      volumes:
        - name: tls-certs
          secret:
            secretName: otel-collector-mtls
```

## Configuring the SDK Client

The SDK exporter needs its own client certificate, private key, and the CA certificate used to verify the server.

For the Go SDK:

```go
package main

import (
    "crypto/tls"
    "crypto/x509"
    "os"

    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "google.golang.org/grpc/credentials"
)

func newExporter() (*otlptracegrpc.Exporter, error) {
    // Load client certificate and key
    clientCert, err := tls.LoadX509KeyPair("/certs/client.crt", "/certs/client.key")
    if err != nil {
        return nil, err
    }

    // Load the CA certificate to verify the server
    caCert, err := os.ReadFile("/certs/server-ca.crt")
    if err != nil {
        return nil, err
    }
    caCertPool := x509.NewCertPool()
    caCertPool.AppendCertsFromPEM(caCert)

    tlsConfig := &tls.Config{
        Certificates: []tls.Certificate{clientCert},
        RootCAs:      caCertPool,
    }

    return otlptracegrpc.New(
        context.Background(),
        otlptracegrpc.WithEndpoint("otel-collector.observability:4317"),
        otlptracegrpc.WithTLSCredentials(credentials.NewTLS(tlsConfig)),
    )
}
```

For Python:

```python
import grpc
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Read certificate files
with open('/certs/client.crt', 'rb') as f:
    client_cert = f.read()
with open('/certs/client.key', 'rb') as f:
    client_key = f.read()
with open('/certs/server-ca.crt', 'rb') as f:
    ca_cert = f.read()

# Create gRPC channel credentials with mTLS
credentials = grpc.ssl_channel_credentials(
    root_certificates=ca_cert,
    private_key=client_key,
    certificate_chain=client_cert,
)

exporter = OTLPSpanExporter(
    endpoint="otel-collector.observability:4317",
    credentials=credentials,
)
```

## Debugging Steps

When mTLS is failing, work through these checks in order:

```bash
# 1. Verify the client certificate is valid and not expired
openssl x509 -in /certs/client.crt -text -noout | grep -E "Not Before|Not After"

# 2. Verify the client cert was signed by the CA the server trusts
openssl verify -CAfile /certs/client-ca.crt /certs/client.crt

# 3. Verify the server cert was signed by the CA the client trusts
openssl verify -CAfile /certs/server-ca.crt /certs/server.crt

# 4. Test the mTLS handshake directly
openssl s_client -connect otel-collector:4317 \
  -cert /certs/client.crt \
  -key /certs/client.key \
  -CAfile /certs/server-ca.crt
```

## The Most Common Mistake

The single most common mistake is mixing up the CA files. The Collector's `client_ca_file` must be the CA that signed the **client** certificates. The SDK's root CA must be the CA that signed the **server** certificate. If you use the same CA for both, this is not an issue. But in organizations with separate CAs for different purposes, getting them swapped is easy.

Always verify the chain: `CA -> Certificate -> Key` must be consistent on both sides.
