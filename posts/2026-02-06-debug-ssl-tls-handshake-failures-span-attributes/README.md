# How to Debug SSL/TLS Handshake Failures Using OpenTelemetry HTTP Connection Span Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, SSL, TLS, HTTPS, Connection Debugging

Description: Diagnose SSL/TLS handshake failures by capturing connection-level span attributes with OpenTelemetry HTTP instrumentation.

TLS handshake failures are particularly painful to debug because they happen before your application code runs. The connection fails at the protocol layer, and all you typically see is a generic "connection reset" or "SSL error" message. By instrumenting the TLS handshake as a separate OpenTelemetry span with detailed attributes, you can capture the exact point of failure and the negotiation parameters that led to it.

## Why TLS Failures Are Hard to Debug

A TLS handshake involves multiple steps: the client sends supported cipher suites and protocol versions, the server picks one, certificates are exchanged and verified, and keys are derived. A failure at any of these steps produces a vague error. Was it a certificate expiration? A cipher mismatch? A protocol version incompatibility? An intermediate CA issue? The standard error messages rarely tell you.

## Instrumenting the TLS Handshake

Here is a Python implementation that wraps the SSL handshake with OpenTelemetry spans:

```python
import ssl
import socket
import time
from opentelemetry import trace

tracer = trace.get_tracer("tls-debugger")

def instrumented_tls_connect(host, port=443, timeout=10):
    """
    Establish a TLS connection with detailed span instrumentation
    for debugging handshake failures.
    """
    with tracer.start_as_current_span("tls.connect") as connect_span:
        connect_span.set_attribute("server.address", host)
        connect_span.set_attribute("server.port", port)

        # Phase 1: TCP connection
        with tracer.start_as_current_span("tcp.connect") as tcp_span:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            try:
                sock.connect((host, port))
                tcp_span.set_attribute("net.peer.ip", sock.getpeername()[0])
            except socket.error as e:
                tcp_span.set_attribute("error", True)
                tcp_span.set_attribute("tcp.error", str(e))
                raise

        # Phase 2: TLS handshake
        with tracer.start_as_current_span("tls.handshake") as tls_span:
            context = ssl.create_default_context()

            # Record what the client is offering
            tls_span.set_attribute(
                "tls.client.min_version", context.minimum_version.name
            )
            tls_span.set_attribute(
                "tls.client.max_version", context.maximum_version.name
            )

            handshake_start = time.monotonic()

            try:
                wrapped = context.wrap_socket(sock, server_hostname=host)

                handshake_ms = (time.monotonic() - handshake_start) * 1000
                tls_span.set_attribute("tls.handshake_time_ms", handshake_ms)

                # Record what was negotiated
                tls_span.set_attribute("tls.protocol", wrapped.version())
                tls_span.set_attribute("tls.cipher", wrapped.cipher()[0])
                tls_span.set_attribute("tls.cipher.bits", wrapped.cipher()[2])

                # Record certificate details
                cert = wrapped.getpeercert()
                if cert:
                    record_cert_attributes(tls_span, cert)

                return wrapped

            except ssl.SSLCertVerificationError as e:
                tls_span.set_attribute("error", True)
                tls_span.set_attribute("tls.error.type", "certificate_verification")
                tls_span.set_attribute("tls.error.message", str(e))
                tls_span.set_attribute("tls.error.verify_code", e.verify_code)
                tls_span.set_attribute("tls.error.verify_message", e.verify_message)
                raise

            except ssl.SSLError as e:
                tls_span.set_attribute("error", True)
                tls_span.set_attribute("tls.error.type", "ssl_error")
                tls_span.set_attribute("tls.error.reason", e.reason)
                tls_span.set_attribute("tls.error.library", e.library)
                tls_span.set_attribute("tls.error.message", str(e))
                raise


def record_cert_attributes(span, cert):
    """Record certificate details as span attributes."""
    subject = dict(x[0] for x in cert.get("subject", []))
    issuer = dict(x[0] for x in cert.get("issuer", []))

    span.set_attribute("tls.cert.subject.cn", subject.get("commonName", ""))
    span.set_attribute("tls.cert.issuer.cn", issuer.get("commonName", ""))
    span.set_attribute("tls.cert.issuer.org", issuer.get("organizationName", ""))
    span.set_attribute("tls.cert.not_before", cert.get("notBefore", ""))
    span.set_attribute("tls.cert.not_after", cert.get("notAfter", ""))
    span.set_attribute(
        "tls.cert.san",
        str(cert.get("subjectAltName", [])),
    )

    # Check if certificate is close to expiration
    from datetime import datetime
    not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z")
    days_until_expiry = (not_after - datetime.utcnow()).days
    span.set_attribute("tls.cert.days_until_expiry", days_until_expiry)

    if days_until_expiry < 30:
        span.add_event("tls.cert.expiring_soon", attributes={
            "days_remaining": days_until_expiry,
        })
```

## Common TLS Failure Patterns and Their Span Signatures

### Certificate Expiration

```
tls.error.type = "certificate_verification"
tls.error.verify_code = 10
tls.error.verify_message = "certificate has expired"
tls.cert.not_after = "Jan 15 00:00:00 2026 UTC"
```

### Certificate Name Mismatch

```
tls.error.type = "certificate_verification"
tls.error.verify_code = 62
tls.error.verify_message = "hostname mismatch"
server.address = "api.example.com"
tls.cert.subject.cn = "old.example.com"
```

### Protocol Version Mismatch

```
tls.error.type = "ssl_error"
tls.error.reason = "TLSV1_ALERT_PROTOCOL_VERSION"
tls.client.max_version = "TLSv1.2"
```

This happens when the server requires TLS 1.3 but the client only supports up to TLS 1.2.

## Building a Certificate Expiry Monitor

Use the span data to proactively monitor certificate expiry across all your service-to-service connections:

```python
def check_certificate_health(traces):
    """
    Scan TLS handshake spans to find certificates
    approaching expiration.
    """
    certs_seen = {}

    for trace_data in traces:
        for span in trace_data["spans"]:
            if span["name"] != "tls.handshake":
                continue

            attrs = span.get("attributes", {})
            host = attrs.get("server.address", "unknown")
            days_left = attrs.get("tls.cert.days_until_expiry")

            if days_left is None:
                continue

            # Track the minimum days seen per host
            if host not in certs_seen or days_left < certs_seen[host]["days"]:
                certs_seen[host] = {
                    "days": days_left,
                    "issuer": attrs.get("tls.cert.issuer.cn"),
                    "subject": attrs.get("tls.cert.subject.cn"),
                    "not_after": attrs.get("tls.cert.not_after"),
                }

    # Sort by urgency
    expiring = sorted(certs_seen.items(), key=lambda x: x[1]["days"])
    return expiring
```

## Instrumenting Mutual TLS (mTLS)

In service mesh environments, both sides present certificates. Instrument the client certificate as well:

```python
def create_mtls_context(client_cert_path, client_key_path, ca_cert_path):
    """Create an SSL context with client certificate instrumentation."""
    span = trace.get_current_span()

    context = ssl.create_default_context(cafile=ca_cert_path)
    context.load_cert_chain(client_cert_path, client_key_path)

    # Record client cert info
    import cryptography.x509
    with open(client_cert_path, "rb") as f:
        cert = cryptography.x509.load_pem_x509_certificate(f.read())
        days_left = (cert.not_valid_after - datetime.utcnow()).days
        span.set_attribute("tls.client_cert.subject", str(cert.subject))
        span.set_attribute("tls.client_cert.days_until_expiry", days_left)

    return context
```

## Summary

TLS handshake failures are a black box without proper instrumentation. By breaking the connection into separate TCP and TLS spans, recording the negotiation parameters (protocol versions, cipher suites, certificate details), and capturing structured error information, you turn cryptic SSL errors into actionable debugging data. The same spans double as a certificate health monitoring system, catching expiring certificates before they cause outages.
