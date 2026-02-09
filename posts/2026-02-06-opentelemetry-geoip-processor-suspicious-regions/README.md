# How to Use the OpenTelemetry GeoIP Processor to Flag Requests from Suspicious Geographic Regions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GeoIP, Security, Collector

Description: Configure the OpenTelemetry Collector GeoIP processor to enrich telemetry with location data and flag requests from suspicious regions.

Knowing where your traffic comes from is a basic but powerful security signal. If your application only serves customers in North America and Europe, a burst of requests from an unexpected region is worth investigating. The OpenTelemetry Collector has a GeoIP processor that can enrich your telemetry data with geographic information based on client IP addresses, letting you detect and alert on anomalous geographic patterns.

## How the GeoIP Processor Works

The GeoIP processor looks up IP addresses in your telemetry attributes against a MaxMind GeoLite2 or GeoIP2 database. It adds geographic attributes like country, city, latitude, and longitude to spans, logs, and metrics. You can then use downstream processors to flag or filter based on these attributes.

## Prerequisites

You need a MaxMind GeoLite2 database file. You can get a free one by signing up at maxmind.com:

```bash
# Download and extract the GeoLite2-City database
wget "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=YOUR_KEY&suffix=tar.gz" \
  -O GeoLite2-City.tar.gz
tar -xzf GeoLite2-City.tar.gz
```

## Collector Configuration

Here is the full Collector configuration with the GeoIP processor and a transform processor that flags suspicious regions:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Step 1: Enrich telemetry with geographic data
  geoip:
    context: resource
    providers:
      maxmind:
        database_path: /etc/otel/GeoLite2-City.mmdb
        # The attribute containing the IP address to look up
        source_attribute: "client.address"

  # Step 2: Flag requests from suspicious regions
  transform/flag_suspicious:
    trace_statements:
      - context: span
        statements:
          # Define a list of expected countries
          # Flag anything outside this list as suspicious
          - set(attributes["geo.suspicious"], true)
            where resource.attributes["geo.country_iso_code"] != "US"
            and resource.attributes["geo.country_iso_code"] != "CA"
            and resource.attributes["geo.country_iso_code"] != "GB"
            and resource.attributes["geo.country_iso_code"] != "DE"
            and resource.attributes["geo.country_iso_code"] != "FR"

          - set(attributes["geo.suspicious"], false)
            where attributes["geo.suspicious"] == nil

    log_statements:
      - context: log
        statements:
          - set(attributes["geo.suspicious"], true)
            where resource.attributes["geo.country_iso_code"] != "US"
            and resource.attributes["geo.country_iso_code"] != "CA"
            and resource.attributes["geo.country_iso_code"] != "GB"
            and resource.attributes["geo.country_iso_code"] != "DE"
            and resource.attributes["geo.country_iso_code"] != "FR"

          - set(attributes["geo.suspicious"], false)
            where attributes["geo.suspicious"] == nil

exporters:
  otlp:
    endpoint: "https://otel-backend.yourdomain.com:4317"

  # Send flagged events to a separate pipeline for alerts
  otlp/alerts:
    endpoint: "https://alerts.yourdomain.com:4317"

connectors:
  # Route suspicious events to the alerts exporter
  routing:
    table:
      - statement: route()
        pipelines: [traces/alerts]
        condition: attributes["geo.suspicious"] == true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [geoip, transform/flag_suspicious]
      exporters: [otlp]
    traces/alerts:
      receivers: [routing]
      exporters: [otlp/alerts]
    logs:
      receivers: [otlp]
      processors: [geoip, transform/flag_suspicious]
      exporters: [otlp]
```

## Application-Side: Setting the Client IP Attribute

The GeoIP processor needs an attribute containing the client IP. Make sure your application sets this on spans:

```python
from opentelemetry import trace
from flask import Flask, request

app = Flask(__name__)
tracer = trace.get_tracer("my-service")

@app.before_request
def add_client_ip_to_span():
    """
    Extract the real client IP from the request headers
    and set it as a span attribute. This is what the
    GeoIP processor uses for the lookup.
    """
    span = trace.get_current_span()

    # Check for forwarded headers first (common behind load balancers)
    client_ip = request.headers.get('X-Forwarded-For', '').split(',')[0].strip()
    if not client_ip:
        client_ip = request.headers.get('X-Real-IP', '')
    if not client_ip:
        client_ip = request.remote_addr

    span.set_attribute("client.address", client_ip)
```

## Building Alerts for Suspicious Regions

With the `geo.suspicious` attribute in place, you can set up alerts in your observability platform. Here is an example alert rule in PromQL format, assuming you are exporting metrics:

```yaml
# alert-rules.yaml
groups:
  - name: geo-security-alerts
    rules:
      - alert: SuspiciousGeoTraffic
        expr: |
          sum(rate(http_server_requests_total{geo_suspicious="true"}[5m]))
          /
          sum(rate(http_server_requests_total[5m]))
          > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "More than 10% of traffic is from suspicious geographic regions"
          description: "Check the geo breakdown dashboard for details"

      - alert: NewCountryDetected
        expr: |
          count(
            count by (geo_country_iso_code) (
              rate(http_server_requests_total[1h])
            )
          )
          >
          count(
            count by (geo_country_iso_code) (
              rate(http_server_requests_total[24h] offset 1h)
            )
          )
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "Traffic detected from a new country in the last hour"
```

## Dashboard Panels

Create a dashboard with these panels for geographic monitoring:

- **World map** showing request distribution by country, colored by volume.
- **Table of flagged requests** sorted by time, showing country, IP, endpoint, and response code.
- **Time series of suspicious vs. clean traffic ratio** to spot trends.
- **Top 10 countries by request volume** with a comparison to the previous period.

## Keeping the GeoIP Database Updated

The MaxMind database gets updated regularly. Set up a CronJob in Kubernetes to keep it current:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: geoip-updater
spec:
  schedule: "0 3 * * 3"  # Every Wednesday at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: updater
              image: maxmindinc/geoipupdate:latest
              env:
                - name: GEOIPUPDATE_ACCOUNT_ID
                  valueFrom:
                    secretKeyRef:
                      name: maxmind-credentials
                      key: account-id
                - name: GEOIPUPDATE_LICENSE_KEY
                  valueFrom:
                    secretKeyRef:
                      name: maxmind-credentials
                      key: license-key
                - name: GEOIPUPDATE_EDITION_IDS
                  value: "GeoLite2-City"
              volumeMounts:
                - name: geoip-data
                  mountPath: /usr/share/GeoIP
          volumes:
            - name: geoip-data
              persistentVolumeClaim:
                claimName: geoip-data-pvc
          restartPolicy: OnFailure
```

## Summary

The OpenTelemetry GeoIP processor turns raw IP addresses into actionable geographic intelligence. By combining it with the transform processor and routing connectors, you can automatically flag traffic from unexpected regions and route those events to your alerting pipeline. This is a straightforward way to add geographic awareness to your security monitoring without changing any application code beyond setting the client IP attribute.
