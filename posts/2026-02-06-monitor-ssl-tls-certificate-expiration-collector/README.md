# How to Monitor SSL/TLS Certificate Expiration with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, SSL, TLS, Certificates, Expiration, Security, Monitoring, Observability

Description: Learn how to monitor SSL/TLS certificate expiration dates using the OpenTelemetry Collector to prevent unexpected outages from expired certificates.

---

Expired SSL/TLS certificates cause some of the most embarrassing outages in production. They are entirely preventable, yet they keep happening because certificate renewal processes break silently. A certificate expires, HTTPS connections start failing, and suddenly your website shows security warnings or your API returns connection errors. Major companies have had public outages caused by forgotten certificate renewals. The fix is straightforward: monitor your certificates and alert well before they expire.

The OpenTelemetry Collector can monitor certificate expiration dates and feed that data into your observability platform alongside your other metrics. This gives you a single place to track certificate health across your entire infrastructure.

## The Certificate Expiration Problem

Certificates expire for many reasons. Manual renewal processes get forgotten. Automated renewal tools like certbot fail silently when DNS validation breaks. Internal CA-issued certificates are often tracked in spreadsheets that nobody maintains. Wildcard certificates get deployed to dozens of services, and when they expire, everything goes down at once.

The core challenge is that a certificate can be perfectly healthy for 364 days and then cause a total outage on day 365. You need monitoring that continuously tracks the time remaining and alerts you with enough lead time to investigate and renew.

```mermaid
graph TD
    A[OTel Collector] -->|TLS Handshake| B[Web Server :443]
    A -->|TLS Handshake| C[API Server :443]
    A -->|TLS Handshake| D[Load Balancer :443]
    A -->|TLS Handshake| E[Internal Service :8443]
    A -->|Read Certificate Files| F[Certificate Files on Disk]
    A -->|Export Metrics| G[OneUptime]
    G -->|Alert| H[Ops Team]
```

## Monitoring Certificates with the HTTP Check Receiver

The OpenTelemetry Collector's `httpcheck` receiver can connect to HTTPS endpoints and report TLS certificate information. When it performs health checks against HTTPS URLs, it captures the certificate's expiration date as part of the check.

Here is a configuration that monitors multiple endpoints:

```yaml
# config.yaml - Certificate expiration monitoring
receivers:
  httpcheck:
    targets:
      # Public-facing websites
      - endpoint: "https://www.yourcompany.com"
        method: GET
      - endpoint: "https://api.yourcompany.com/health"
        method: GET
      - endpoint: "https://app.yourcompany.com"
        method: GET

      # Internal services
      - endpoint: "https://grafana.internal:3000"
        method: GET
        tls:
          # Skip verification for self-signed internal certs
          # We still want to check expiration even if the cert is self-signed
          insecure_skip_verify: true
      - endpoint: "https://jenkins.internal:8443"
        method: GET
        tls:
          insecure_skip_verify: true

      # Third-party dependencies
      - endpoint: "https://api.stripe.com"
        method: GET
      - endpoint: "https://api.github.com"
        method: GET

    collection_interval: 1h

processors:
  batch:
    timeout: 10s

  resource:
    attributes:
      - key: service.name
        value: "certificate-monitor"
        action: upsert

exporters:
  otlp:
    endpoint: "https://otel-ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"

service:
  pipelines:
    metrics:
      receivers: [httpcheck]
      processors: [resource, batch]
      exporters: [otlp]
```

The collection interval is set to one hour because certificate expiration dates change very rarely. Checking more frequently wastes resources without providing additional value. The `insecure_skip_verify` option is important for internal services that use self-signed certificates. Without it, the TLS handshake fails before the collector can read the certificate details.

## Using a Custom Script Receiver for Detailed Certificate Metrics

For more detailed certificate monitoring, you can use a script that performs TLS handshakes and extracts certificate details, then feed those metrics into the collector. Here is a script-based approach using the `filelog` receiver to capture structured certificate data:

```bash
#!/bin/bash
# check_certs.sh - Script to check certificate expiration
# Run this on a schedule and write results to a file the collector reads

ENDPOINTS=(
    "www.yourcompany.com:443"
    "api.yourcompany.com:443"
    "app.yourcompany.com:443"
    "mail.yourcompany.com:465"
    "grafana.internal:3000"
)

OUTPUT_FILE="/var/log/cert-check/results.json"

for endpoint in "${ENDPOINTS[@]}"; do
    host=$(echo "$endpoint" | cut -d: -f1)
    port=$(echo "$endpoint" | cut -d: -f2)

    # Connect and extract certificate expiration date
    expiry_date=$(echo | openssl s_client -connect "$endpoint" -servername "$host" 2>/dev/null | \
        openssl x509 -noout -enddate 2>/dev/null | \
        cut -d= -f2)

    if [ -n "$expiry_date" ]; then
        # Calculate days until expiration
        expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry_date" +%s 2>/dev/null)
        now_epoch=$(date +%s)
        days_remaining=$(( (expiry_epoch - now_epoch) / 86400 ))

        # Output structured JSON for the collector to parse
        echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"host\":\"$host\",\"port\":$port,\"expiry_date\":\"$expiry_date\",\"days_remaining\":$days_remaining}" >> "$OUTPUT_FILE"
    fi
done
```

Configure the collector to read these results:

```yaml
receivers:
  filelog/certs:
    include:
      - "/var/log/cert-check/results.json"
    start_at: beginning
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.timestamp
          layout: "%Y-%m-%dT%H:%M:%SZ"
      - type: move
        from: attributes.host
        to: attributes["tls.host"]
      - type: move
        from: attributes.days_remaining
        to: attributes["tls.days_remaining"]

service:
  pipelines:
    logs/certs:
      receivers: [filelog/certs]
      processors: [resource, batch]
      exporters: [otlp]
```

## Monitoring Certificate Files on Disk

Sometimes you need to monitor certificate files directly, not just their network endpoints. This is useful for catching renewal failures before the certificate is even deployed. For example, if certbot renews a certificate but the web server has not reloaded, the new certificate is on disk but not yet in use.

```bash
#!/bin/bash
# check_cert_files.sh - Monitor certificate files on disk
# Useful for catching renewal failures

CERT_FILES=(
    "/etc/letsencrypt/live/yourcompany.com/fullchain.pem"
    "/etc/ssl/certs/internal-ca.pem"
    "/opt/app/certs/api-server.crt"
)

for cert_file in "${CERT_FILES[@]}"; do
    if [ -f "$cert_file" ]; then
        # Extract subject and expiration
        subject=$(openssl x509 -in "$cert_file" -noout -subject 2>/dev/null | sed 's/subject= //')
        expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
        issuer=$(openssl x509 -in "$cert_file" -noout -issuer 2>/dev/null | sed 's/issuer= //')

        expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null)
        now_epoch=$(date +%s)
        days_remaining=$(( (expiry_epoch - now_epoch) / 86400 ))

        echo "{\"cert_file\":\"$cert_file\",\"subject\":\"$subject\",\"issuer\":\"$issuer\",\"days_remaining\":$days_remaining}"
    fi
done
```

Run this script on a cron schedule (daily is sufficient) and have the collector pick up the output.

## Key Metrics to Track

When monitoring certificates, these are the metrics and attributes that matter:

**Days until expiration** is the primary metric. Everything else is secondary. You need this number for every certificate in your infrastructure, both at the network endpoint level and at the file level.

**Certificate subject and SANs** (Subject Alternative Names) tell you which domains a certificate covers. This is important for wildcard certificates and certificates with multiple SANs, because the same certificate might protect several different services.

**Issuer information** tells you whether the certificate is from Let's Encrypt, your internal CA, or a commercial CA. This matters because different issuers have different renewal processes and lead times.

**Certificate chain validity** catches problems where the intermediate certificate is missing or expired. Even if the leaf certificate is valid, a broken chain causes TLS errors in many clients.

## Alerting Strategy

Certificate alerts should use multiple thresholds with increasing urgency:

```yaml
# Certificate expiration alerting thresholds
- alert: CertExpiring90Days
  # 90 days - informational, start planning renewal
  condition: tls.days_remaining < 90
  severity: info
  description: "Certificate for {{ host }} expires in less than 90 days"

- alert: CertExpiring30Days
  # 30 days - warning, renewal should be in progress
  condition: tls.days_remaining < 30
  severity: warning
  description: "Certificate for {{ host }} expires in less than 30 days"

- alert: CertExpiring7Days
  # 7 days - critical, immediate action required
  condition: tls.days_remaining < 7
  severity: critical
  description: "Certificate for {{ host }} expires in less than 7 days"

- alert: CertExpired
  # 0 days - the certificate has expired
  condition: tls.days_remaining <= 0
  severity: critical
  description: "Certificate for {{ host }} has EXPIRED"
```

The 90-day alert is especially important for certificates that require manual renewal or involve procurement processes. Let's Encrypt certificates are valid for 90 days and typically auto-renew at 30 days remaining, so a 30-day alert for Let's Encrypt certs means auto-renewal has failed.

For internal CA certificates that may have one-year or multi-year validity, the 90-day alert gives your team plenty of time to generate new certificates, get them signed, and deploy them without rushing.

## Handling Different Certificate Types

Not all certificates need the same monitoring approach.

**Let's Encrypt certificates** should auto-renew via certbot or similar tools. Monitor both the endpoint and the file on disk. If the file shows a newer expiration than the endpoint, the web server needs a reload.

**Wildcard certificates** need special attention because a single expiration affects many services. Track all endpoints that use the same wildcard certificate and alert on the certificate once, not on every endpoint individually.

**Client certificates** used for mutual TLS (mTLS) are often overlooked. If your services authenticate to each other using client certificates, monitor those files too. An expired client certificate causes connection failures that look like network problems.

**CA certificates** for internal certificate authorities should be monitored with longer horizons. Internal root CA certificates often have 10-year validity, but intermediate CA certificates might only be valid for 2-3 years. An expired intermediate CA breaks every certificate it has issued.

## Tracking Renewal History

Beyond just monitoring current expiration dates, it is useful to track when certificates were renewed. This helps you verify that automated renewal is working consistently. Create a simple log entry each time a certificate file changes:

```yaml
receivers:
  filelog/cert_changes:
    include:
      - "/etc/letsencrypt/live/*/fullchain.pem"
    # Only watch for file changes, do not parse content
    start_at: end
    poll_interval: 1h
    operators:
      - type: add
        field: attributes.event_type
        value: "certificate_renewed"
```

This creates a log entry every time a certificate file is modified, giving you a timeline of renewals in your observability platform.

## Conclusion

Certificate expiration monitoring is one of the simplest and highest-value things you can add to your observability stack. The OpenTelemetry Collector gives you the building blocks through the `httpcheck` receiver for endpoint monitoring and the `filelog` receiver for file-based monitoring. Set up tiered alerts at 90, 30, and 7 days before expiration. Monitor both the certificates served by your endpoints and the certificate files on disk. And do not forget about client certificates, intermediate CAs, and internal CA certificates. The cost of monitoring is trivial compared to the cost of an outage caused by an expired certificate.
