# How to Instrument mTLS Certificate Validation and Handshake Failures with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, mTLS, Certificates, Security

Description: Monitor mTLS certificate validation and TLS handshake failures with OpenTelemetry metrics to catch certificate issues before they cause outages.

Mutual TLS (mTLS) is a cornerstone of zero trust architecture. Every service authenticates itself to every other service using certificates. When mTLS works, it is invisible. When it breaks, you get cascading connection failures across your infrastructure, and the error messages are notoriously unhelpful. "TLS handshake failed" tells you almost nothing about the root cause.

By instrumenting your mTLS layer with OpenTelemetry, you can track certificate expiration, validation errors, handshake latency, and cipher negotiation. This gives you the visibility to catch problems before they cascade.

## What to Monitor

There are four categories of mTLS events worth tracking:

1. **Handshake success/failure rates** - The basic health signal.
2. **Certificate validation errors** - Why handshakes fail (expired, wrong CA, hostname mismatch).
3. **Certificate expiration timeline** - How close your certs are to expiring.
4. **Handshake latency** - TLS handshakes should be fast; slow ones indicate infrastructure problems.

## Instrumenting a Go TLS Server

Go gives you access to the TLS handshake through the `tls.Config` struct. Here is how to instrument it:

```go
package main

import (
    "crypto/tls"
    "crypto/x509"
    "net/http"
    "time"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
    otelmetric "go.opentelemetry.io/otel/sdk/metric"
)

var (
    meter = otelmetric.NewMeterProvider().Meter("mtls-monitor")

    handshakeCounter, _ = meter.Int64Counter(
        "tls.handshake.total",
        metric.WithDescription("Total TLS handshakes by result"),
    )

    handshakeDuration, _ = meter.Float64Histogram(
        "tls.handshake.duration",
        metric.WithDescription("TLS handshake duration in milliseconds"),
        metric.WithUnit("ms"),
    )

    certExpiryGauge, _ = meter.Float64ObservableGauge(
        "tls.certificate.days_until_expiry",
        metric.WithDescription("Days until the server certificate expires"),
    )

    validationErrorCounter, _ = meter.Int64Counter(
        "tls.validation.errors",
        metric.WithDescription("TLS certificate validation errors by type"),
    )
)

func createMTLSConfig(certFile, keyFile, caFile string) *tls.Config {
    // Load the CA cert pool for client certificate validation
    caCert, _ := loadCACert(caFile)
    clientCAs := x509.NewCertPool()
    clientCAs.AppendCertsFromPEM(caCert)

    return &tls.Config{
        ClientAuth: tls.RequireAndVerifyClientCert,
        ClientCAs:  clientCAs,
        MinVersion: tls.VersionTLS12,

        // This callback fires after every successful handshake
        VerifyConnection: func(state tls.ConnectionState) error {
            return recordHandshakeMetrics(state)
        },
    }
}

func recordHandshakeMetrics(state tls.ConnectionState) error {
    // Record the TLS version and cipher suite
    attrs := []attribute.KeyValue{
        attribute.String("tls.version", tlsVersionString(state.Version)),
        attribute.String("tls.cipher_suite",
            tls.CipherSuiteName(state.CipherSuite)),
        attribute.Bool("tls.resumed", state.DidResume),
    }

    // Record client certificate information
    if len(state.PeerCertificates) > 0 {
        clientCert := state.PeerCertificates[0]
        daysUntilExpiry := time.Until(clientCert.NotAfter).Hours() / 24

        attrs = append(attrs,
            attribute.String("tls.client.subject",
                clientCert.Subject.CommonName),
            attribute.String("tls.client.issuer",
                clientCert.Issuer.CommonName),
            attribute.Float64("tls.client.days_until_expiry",
                daysUntilExpiry),
        )

        // Warn if the client cert is close to expiring
        if daysUntilExpiry < 30 {
            validationErrorCounter.Add(nil, 1,
                metric.WithAttributes(
                    attribute.String("error.type", "near_expiry"),
                    attribute.String("tls.client.subject",
                        clientCert.Subject.CommonName),
                ),
            )
        }
    }

    handshakeCounter.Add(nil, 1,
        metric.WithAttributes(
            append(attrs, attribute.String("result", "success"))...,
        ),
    )

    return nil
}

func tlsVersionString(version uint16) string {
    switch version {
    case tls.VersionTLS10:
        return "TLS 1.0"
    case tls.VersionTLS11:
        return "TLS 1.1"
    case tls.VersionTLS12:
        return "TLS 1.2"
    case tls.VersionTLS13:
        return "TLS 1.3"
    default:
        return "unknown"
    }
}
```

## Catching and Classifying Handshake Failures

Handshake failures are trickier because they happen before the connection is established. You need to wrap the TLS listener:

```go
package main

import (
    "crypto/tls"
    "net"
    "strings"
    "time"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
)

// InstrumentedListener wraps a TLS listener and records
// handshake failures with detailed error classification
type InstrumentedListener struct {
    net.Listener
    tlsConfig *tls.Config
}

func (l *InstrumentedListener) Accept() (net.Conn, error) {
    conn, err := l.Listener.Accept()
    if err != nil {
        return nil, err
    }

    tlsConn := tls.Server(conn, l.tlsConfig)

    start := time.Now()
    handshakeErr := tlsConn.Handshake()
    duration := time.Since(start).Milliseconds()

    // Record handshake duration
    handshakeDuration.Record(nil, float64(duration))

    if handshakeErr != nil {
        // Classify the error
        errorType := classifyTLSError(handshakeErr)
        remoteAddr := conn.RemoteAddr().String()

        handshakeCounter.Add(nil, 1,
            metric.WithAttributes(
                attribute.String("result", "failure"),
                attribute.String("error.type", errorType),
                attribute.String("error.message", handshakeErr.Error()),
                attribute.String("remote.addr", remoteAddr),
            ),
        )

        validationErrorCounter.Add(nil, 1,
            metric.WithAttributes(
                attribute.String("error.type", errorType),
            ),
        )

        conn.Close()
        return nil, handshakeErr
    }

    return tlsConn, nil
}

func classifyTLSError(err error) string {
    msg := err.Error()

    switch {
    case strings.Contains(msg, "certificate has expired"):
        return "cert_expired"
    case strings.Contains(msg, "unknown certificate authority"):
        return "unknown_ca"
    case strings.Contains(msg, "certificate signed by unknown authority"):
        return "untrusted_ca"
    case strings.Contains(msg, "bad certificate"):
        return "bad_certificate"
    case strings.Contains(msg, "certificate required"):
        return "missing_client_cert"
    case strings.Contains(msg, "protocol version"):
        return "protocol_mismatch"
    case strings.Contains(msg, "no mutual cipher"):
        return "cipher_mismatch"
    case strings.Contains(msg, "hostname"):
        return "hostname_mismatch"
    default:
        return "other"
    }
}
```

## Monitoring Certificate Expiration

Set up a periodic check that reports how many days each certificate has until it expires:

```go
// RegisterCertExpiryCallback sets up periodic certificate
// expiry reporting as an observable gauge
func RegisterCertExpiryCallback(certPaths []string) {
    meter.Float64ObservableGauge(
        "tls.certificate.days_until_expiry",
        metric.WithFloat64Callback(func(ctx context.Context,
            observer metric.Float64Observer) error {

            for _, certPath := range certPaths {
                cert, err := loadCertificate(certPath)
                if err != nil {
                    continue
                }

                daysUntilExpiry := time.Until(cert.NotAfter).Hours() / 24
                observer.Observe(daysUntilExpiry,
                    metric.WithAttributes(
                        attribute.String("certificate.path", certPath),
                        attribute.String("certificate.subject",
                            cert.Subject.CommonName),
                        attribute.String("certificate.issuer",
                            cert.Issuer.CommonName),
                    ),
                )
            }
            return nil
        }),
    )
}
```

## Alert Rules

```yaml
groups:
  - name: mtls-monitoring
    rules:
      - alert: TLSHandshakeFailureRate
        expr: |
          rate(tls_handshake_total{result="failure"}[5m])
          /
          rate(tls_handshake_total[5m])
          > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "TLS handshake failure rate exceeds 5%"

      - alert: CertificateExpiringSoon
        expr: tls_certificate_days_until_expiry < 14
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Certificate {{ $labels.certificate_subject }} expires in {{ $value }} days"

      - alert: CertificateExpired
        expr: tls_certificate_days_until_expiry < 0
        labels:
          severity: critical
        annotations:
          summary: "Certificate {{ $labels.certificate_subject }} has expired"

      - alert: UnknownCAErrors
        expr: rate(tls_validation_errors_total{error_type="unknown_ca"}[5m]) > 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Clients presenting certificates from unknown CAs"
```

## Summary

mTLS failures are some of the hardest issues to debug because the error messages are vague and the failures cascade quickly. By instrumenting your TLS layer with OpenTelemetry metrics, you get detailed visibility into handshake success rates, error types, certificate expiration timelines, and handshake latency. This lets you catch certificate rotation problems, CA trust issues, and protocol mismatches before they take down your service-to-service communication.
