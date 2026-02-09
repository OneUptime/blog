# How to Fix TLS Handshake Failures When Certificate SANs Do Not Match the Collector Endpoint Hostname

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, TLS, Security, Collector

Description: Fix TLS handshake errors when your certificate Subject Alternative Names do not match the Collector endpoint hostname.

TLS handshake failures are one of the more confusing errors you can encounter in an OpenTelemetry deployment. The Collector is running, the network is fine, but the connection dies during the TLS handshake with an error about certificate verification. The most common root cause is a mismatch between the hostname you are connecting to and the Subject Alternative Names (SANs) listed in the certificate.

## Understanding the Error

When a gRPC or HTTPS client connects to the Collector, it checks that the hostname in the URL matches one of the SANs in the server's TLS certificate. If there is no match, the handshake fails.

Typical error messages look like this:

```
transport: authentication handshake failed: x509: certificate is valid for
otel-collector.observability.svc.cluster.local, not otel-collector.default.svc.cluster.local
```

Or from the SDK side:

```
OTLP exporter error: tls: failed to verify certificate: x509: certificate is
valid for localhost, not otel-collector.monitoring
```

## Step 1: Inspect the Certificate

First, find out what SANs the current certificate contains:

```bash
# If the cert is in a Kubernetes secret
kubectl get secret otel-collector-tls -n observability -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -text -noout | grep -A1 "Subject Alternative Name"

# Output might look like:
# X509v3 Subject Alternative Name:
#     DNS:otel-collector.observability.svc.cluster.local, DNS:localhost
```

You can also connect directly to check what the server presents:

```bash
# Connect to the Collector and dump the certificate
openssl s_client -connect otel-collector.observability.svc.cluster.local:4317 \
  -servername otel-collector.observability.svc.cluster.local < /dev/null 2>/dev/null | \
  openssl x509 -text -noout | grep -A2 "Subject Alternative Name"
```

## Step 2: Identify the Mismatch

Compare the SANs in the certificate with the endpoint your application is using. Common mismatches include:

- Certificate has `otel-collector.observability.svc.cluster.local` but the app connects to `otel-collector.observability` (short form)
- Certificate has `localhost` only but pods connect via the service name
- Certificate has an old hostname from before a namespace migration

## Step 3: Fix the Certificate

The right fix is to regenerate the certificate with all the hostnames that clients will use to connect. If you are using cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: otel-collector-cert
  namespace: observability
spec:
  secretName: otel-collector-tls
  issuerRef:
    name: cluster-issuer
    kind: ClusterIssuer
  # Include ALL hostnames clients might use
  dnsNames:
    - otel-collector
    - otel-collector.observability
    - otel-collector.observability.svc
    - otel-collector.observability.svc.cluster.local
    - "*.observability.svc.cluster.local"  # Wildcard if needed
  ipAddresses:
    - "127.0.0.1"  # For local testing
```

If you are generating certificates manually with openssl:

```bash
# Create an openssl config with SANs
cat > otel-collector-cert.conf << 'EOF'
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name

[req_distinguished_name]

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = otel-collector
DNS.2 = otel-collector.observability
DNS.3 = otel-collector.observability.svc
DNS.4 = otel-collector.observability.svc.cluster.local
IP.1 = 127.0.0.1
EOF

# Generate the certificate with the SANs
openssl req -new -key server.key -out server.csr -config otel-collector-cert.conf \
  -subj "/CN=otel-collector.observability.svc.cluster.local"

openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 365 -extensions v3_req -extfile otel-collector-cert.conf
```

## Step 4: Update the Collector Configuration

Make sure the Collector loads the new certificate:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        tls:
          cert_file: /certs/tls.crt
          key_file: /certs/tls.key
          # Optionally require client certificates (mTLS)
          client_ca_file: /certs/ca.crt
```

## Step 5: Update the Client

Make sure your exporter references the correct hostname that matches a SAN:

```python
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
import ssl

# The endpoint hostname MUST match a SAN in the certificate
exporter = OTLPSpanExporter(
    endpoint="otel-collector.observability.svc.cluster.local:4317",
    credentials=ssl.create_default_context(cafile="/certs/ca.crt"),
)
```

## Quick Workaround (Not for Production)

If you need to get things working quickly in a dev environment, you can skip TLS verification. Never do this in production:

```bash
# Environment variable to skip TLS verification
export OTEL_EXPORTER_OTLP_INSECURE="true"
```

The proper fix is always to make sure the SANs match the hostname. Take the time to configure your certificates correctly and you will avoid hours of debugging later.
