# How to Migrate from Datadog to OneUptime

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, Comparison, Open Source

Description: A practical guide to migrating from Datadog to OneUptime - covering infrastructure monitoring, APM, logs, status pages, and on-call - without losing visibility.

Your Datadog bill doubled again. You've tried optimizing - reducing log retention, sampling traces, negotiating with your account rep. But here's the thing: per-GB pricing in a world of AI agents and ever-growing telemetry is a losing battle. The more you instrument, the more you pay.

This guide walks you through migrating from Datadog to OneUptime step by step. Not theory. Not a feature comparison matrix. Actual migration steps for each capability, so you can make the switch with confidence.

## Why Teams Are Leaving Datadog

Let's skip the marketing pitch and talk about why this conversation keeps happening:

**Cost unpredictability.** Datadog's pricing has multiple billing dimensions - per-host for infrastructure, per-GB for logs, per-span for APM, per-million for custom metrics. Teams regularly report bills 2-3x what they budgeted. With AI agents now generating 4-8x more telemetry than traditional services, this problem is only accelerating.

**Vendor lock-in.** Datadog's proprietary agents and query languages make migration feel daunting. Your dashboards, monitors, and alerts are trapped in a format only Datadog understands.

**You probably don't need 400 integrations.** Most teams use monitoring, APM, logs, status pages, and on-call. Datadog charges separately for each. OneUptime bundles them all - open source and free to self-host, or SaaS with simple usage-based pricing starting at $0.10/GB ingested.

## Before You Start

### Inventory What You Actually Use

Before migrating anything, audit your Datadog usage:

```bash
# Check your Datadog integration list
# In Datadog: Integrations → Installed Integrations

# Document:
# 1. Infrastructure hosts monitored
# 2. APM services instrumented
# 3. Log sources and daily volume
# 4. Custom dashboards (screenshot them)
# 5. Monitors/alerts configured
# 6. Status pages (if using Datadog Synthetics for uptime)
# 7. On-call schedules and escalation policies
```

Most teams discover they're paying for capabilities they never configured. That's the first win.

### Choose Your Deployment Model

OneUptime gives you two options:

- **SaaS** (oneuptime.com) - zero ops, usage-based pricing
- **Self-hosted** (open source, free) - run on your own infrastructure via Docker or Kubernetes

For teams leaving Datadog primarily over cost, self-hosting is often the move. You trade a SaaS bill for compute costs you already control.

```bash
# Self-hosted quickstart (Docker)
git clone https://github.com/OneUptime/oneuptime.git
cd oneuptime
docker compose up -d
```

## Step 1: Migrate Infrastructure Monitoring

### What You're Replacing
Datadog Agent → OneUptime Infrastructure Agent or OpenTelemetry Collector

### The Migration

OneUptime uses OpenTelemetry natively. If you're already using the OTel Collector alongside Datadog, you're halfway there.

**Option A: OpenTelemetry Collector (Recommended)**

If you already have the OTel Collector deployed, just add OneUptime as an exporter:

```yaml
# otel-collector-config.yaml
exporters:
  otlp/oneuptime:
    endpoint: "https://oneuptime.com/otlp"
    headers:
      x-oneuptime-token: "YOUR_PROJECT_TOKEN"

service:
  pipelines:
    metrics:
      exporters: [otlp/oneuptime]
    traces:
      exporters: [otlp/oneuptime]
    logs:
      exporters: [otlp/oneuptime]
```

**Option B: OneUptime Infrastructure Agent**

For VM and server monitoring:

```bash
# Install the OneUptime infrastructure agent
curl -sSL https://oneuptime.com/docs/static/scripts/infrastructure-agent/install.sh | sudo bash

# Configure with your secret key (created in the OneUptime dashboard)
sudo oneuptime-infrastructure-agent configure \
  --secret-key=YOUR_SECRET_KEY \
  --oneuptime-url=https://oneuptime.com

# Start the agent
sudo oneuptime-infrastructure-agent start
```

This monitors CPU, memory, disk, network - the same basics the Datadog Agent covers, without the per-host pricing.

### Run Both in Parallel

Don't rip out Datadog immediately. Run both for 1-2 weeks:

1. Deploy OneUptime monitoring alongside Datadog
2. Compare metrics between both platforms
3. Verify alert coverage matches
4. Once confident, remove the Datadog Agent

## Step 2: Migrate APM / Traces

### What You're Replacing
Datadog APM → OneUptime Telemetry (OpenTelemetry-native)

### The Migration

This is where OpenTelemetry makes migration straightforward. If you're using Datadog's `dd-trace` libraries, you'll swap them for OpenTelemetry SDKs.

**For Node.js:**

```bash
# Remove Datadog
npm uninstall dd-trace

# Install OpenTelemetry
npm install @opentelemetry/api @opentelemetry/sdk-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/auto-instrumentations-node
```

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'https://oneuptime.com/otlp/v1/traces',
    headers: {
      'x-oneuptime-token': process.env.ONEUPTIME_TOKEN,
    },
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

**For Python:**

```bash
# Remove Datadog
pip uninstall ddtrace

# Install OpenTelemetry
pip install opentelemetry-api opentelemetry-sdk \
  opentelemetry-exporter-otlp opentelemetry-instrumentation
```

```python
# Configure via environment variables
export OTEL_EXPORTER_OTLP_ENDPOINT="https://oneuptime.com/otlp"
export OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=YOUR_TOKEN"
export OTEL_SERVICE_NAME="your-service"

# Auto-instrument
opentelemetry-instrument python app.py
```

**For Java, Go, .NET:** The pattern is the same - swap the Datadog library for the OpenTelemetry SDK and point the OTLP exporter at OneUptime. The OpenTelemetry documentation covers each language in detail.

### What About Custom Spans and Tags?

If you've added custom instrumentation with `dd-trace`:

```javascript
// Datadog (before)
const tracer = require('dd-trace');
const span = tracer.startSpan('process.order');
span.setTag('order.id', orderId);

// OpenTelemetry (after)
const { trace } = require('@opentelemetry/api');
const span = trace.getTracer('app').startSpan('process.order');
span.setAttribute('order.id', orderId);
```

The concepts map directly. Spans are spans. Tags become attributes. The mental model is the same.

## Step 3: Migrate Logs

### What You're Replacing
Datadog Log Management → OneUptime Logs Management

### The Migration

OneUptime ingests logs via OpenTelemetry, Fluentd, and over 1000 other sources.

**If you use Fluentd/Fluent Bit:**

```xml
# fluent.conf - just change the output
<match **>
  @type http
  endpoint https://oneuptime.com/fluentd/logs
  content_type application/json
  json_array true
  headers {"x-oneuptime-token":"YOUR_TOKEN", "x-oneuptime-service-name":"YOUR_SERVICE_NAME"}
  <format>
    @type json
  </format>
  <buffer>
    flush_interval 5s
  </buffer>
</match>
```

**If you use the OTel Collector for logs:**

You already configured this in Step 1. Your logs pipeline is pointing at OneUptime.

**If you use Datadog's log forwarder directly:**

Replace it with the OpenTelemetry Collector's filelog receiver:

```yaml
receivers:
  filelog:
    include:
      - /var/log/app/*.log
    operators:
      - type: json_parser

exporters:
  otlp/oneuptime:
    endpoint: "https://oneuptime.com/otlp"
    headers:
      x-oneuptime-token: "YOUR_TOKEN"

service:
  pipelines:
    logs:
      receivers: [filelog]
      exporters: [otlp/oneuptime]
```

### Cost Impact

This is where the savings hit hardest. Datadog charges $0.10/GB for log ingestion *plus* $1.70/GB for 15-day retention. A team ingesting 50GB/day pays roughly $13,500/month just for logs.

OneUptime charges $0.10/GB for ingestion with 15 days of retention included. Same team, same volume: roughly $150/month. That's not a typo.

## Step 4: Migrate Status Pages

### What You're Replacing
StatusPage.io / Datadog Synthetics → OneUptime Status Pages

### The Migration

If you're using a separate status page tool (StatusPage.io, Instatus, etc.), OneUptime replaces that too. Status pages are built in.

1. Create a new status page in OneUptime
2. Add your services/components (map them from your existing page)
3. Configure your custom domain (OneUptime provides SSL automatically)
4. Add subscriber notification settings (email, SMS, RSS)
5. Update your DNS CNAME to point at OneUptime

OneUptime status pages support custom branding, custom domains, subscriber notifications, and incident management - all included in the base product.

## Step 5: Migrate On-Call and Alerting

### What You're Replacing
PagerDuty / Datadog On-Call → OneUptime On-Call

### The Migration

1. **Recreate your escalation policies** - map your Datadog/PagerDuty escalation chains to OneUptime
2. **Set up on-call rotations** - OneUptime supports the same rotation patterns (daily, weekly, custom)
3. **Configure alert rules** - create monitors in OneUptime that match your Datadog monitors
4. **Test the notification chain** - trigger a test incident and verify SMS, email, and phone alerts reach the right people

OneUptime supports SMS ($0.10/SMS), phone calls ($0.10/min), email (free), and webhook alerts. You can also bring your own Twilio account.

## Step 6: Recreate Dashboards and Monitors

This is the tedious part, but also the most useful. Migration forces you to audit what you actually monitor.

### The Honest Truth About Dashboards

Most Datadog dashboards are zombie dashboards - created months ago, never looked at. Migration is a natural cleanup opportunity.

For each dashboard, ask:
- Does anyone actually look at this?
- Does it drive decisions?
- Does it help during incidents?

Keep only the ones that matter. Rebuild those in OneUptime.

### Monitors

Export your Datadog monitors and recreate the important ones:

```bash
# Export Datadog monitors via API (for reference)
curl -s "https://api.datadoghq.com/api/v1/monitor" \
  -H "DD-API-KEY: ${DD_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" | jq '.[].name'
```

Focus on monitors that have actually fired and required action. If a monitor has never triggered, you probably don't need it.

## Migration Timeline

Here's a realistic timeline for a mid-sized team (20-50 engineers, 30-100 services):

| Week | Action |
|------|--------|
| 1 | Deploy OneUptime (SaaS signup or self-host). Start infrastructure monitoring in parallel. |
| 2 | Migrate APM instrumentation for 2-3 critical services. Compare traces. |
| 3 | Migrate log pipelines. Validate log search and alerting. |
| 4 | Set up status pages, on-call rotations, and escalation policies. |
| 5-6 | Migrate remaining services. Rebuild critical dashboards and monitors. |
| 7-8 | Run both platforms in parallel. Verify coverage. |
| 9 | Decommission Datadog agents and cancel subscription. |

## What You'll Miss (Honest Assessment)

No migration guide should pretend everything is better. Here's what Datadog does that OneUptime currently doesn't:

- **400+ turn-key integrations** - OneUptime relies on OpenTelemetry's ecosystem instead. This covers most use cases but isn't as plug-and-play for niche integrations.
- **Network Performance Monitoring** - Datadog's NPM is a standalone product. OneUptime doesn't have a direct equivalent.
- **Security Monitoring (SIEM)** - If you use Datadog's security products, you'll need a separate solution.
- **Massive scale dashboarding** - Datadog's dashboarding is mature and feature-rich. OneUptime's is functional and improving.

For most teams, these gaps don't matter. You're monitoring web services, APIs, and infrastructure - not running a SOC.

## What You'll Gain

- **Predictable costs** - no billing surprises
- **One platform** - monitoring, APM, logs, status pages, on-call, error tracking, all in one
- **Open source** - no vendor lock-in, self-host if you want
- **OpenTelemetry native** - industry-standard instrumentation that works with any backend
- **AI-powered incident analysis** - automatic root cause suggestions and runbook generation

## The Bottom Line

Migrating from Datadog isn't trivial, but it's not as scary as it looks. OpenTelemetry has made observability tooling genuinely portable. The hardest part isn't the technical migration - it's convincing yourself that the tool you've invested years in isn't the only option.

Your observability spend should scale with value delivered, not with data volume generated. If your Datadog bill is growing faster than your infrastructure, it's time to look at alternatives.

Start with a free account at [oneuptime.com](https://oneuptime.com), or clone the [repo](https://github.com/OneUptime/oneuptime) and self-host. Run both in parallel. Let the data speak for itself.
