# OneUptime Now Speaks Syslog Natively: Bring Legacy Logs into Modern Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Observability, Logs, Logging, Syslog, DevOps

Description: Forward RFC3164 and RFC5424 syslog directly into OneUptime over HTTPS, explore real-world use cases, and learn how to alert on the data immediately.

---

For years, teams have piped syslog through a maze of relay servers, custom translators, or brittle scripts just to land messages in their observability platform. Today, OneUptime closes that gap: we now ingest syslog natively. Point any RFC3164 (BSD) or RFC5424 source straight at OneUptime over HTTPS, and we parse the priority, facility, severity, structured data, and body into searchable, alertable logs. No collector, no adapters, no extra infrastructure.

The native syslog endpoint lives alongside our OpenTelemetry pipeline, so you still get the same retention controls, query language, log monitors, and incident automations you use for every other signal. Syslog is simply another first-class citizen inside OneUptime.

---

## Why native syslog matters

- **Works with what you already own** – firewalls, routers, hypervisors, older Linux hosts, and SaaS appliances that only speak syslog can now stream telemetry without a translation layer.
- **Secure by default** – HTTPS delivery plus project-scoped ingestion tokens keep the transport encrypted and scoped to the right teams.
- **Structured attributes automatically** – we map priority → severity, facility codes → readable labels, and flatten RFC5424 structured data, so you can filter on `syslog.facility.name`, `syslog.hostname`, or any custom fields instantly.
- **Shared tooling** – everything lands in the same Logs explorer, dashboards, and log monitors you already use, cutting down the number of observability tools on call engineers need to understand.

---

## How the endpoint works

1. **Create a telemetry ingestion key** in *Project Settings → Telemetry Ingestion Keys*. Copy the `x-oneuptime-token` value.
2. **Send syslog payloads** to `https://oneuptime.com/syslog/v1/logs` (replace the hostname if you self-host). We accept newline-delimited text, JSON arrays, or gzipped payloads.
3. **Optionally specify the service name** with `x-oneuptime-service-name`. Otherwise we fall back to the syslog `APP-NAME`, hostname, or a default `Syslog` service.

Quick sanity check with `curl`:

```bash
curl \
  -X POST https://oneuptime.com/syslog/v1/logs \
  -H "Content-Type: application/json" \
  -H "x-oneuptime-token: <YOUR_TELEMETRY_KEY>" \
  -H "x-oneuptime-service-name: prod-network" \
  -d '{
    "messages": [
      "<134>1 2025-11-06T02:12:04Z edge-fw-01 paloalto 4021 0 [event@32473 src=192.0.2.10 dst=198.51.100.8 action=allow] SSL inbound inspection active"
    ]
  }'
```

Behind the scenes, OneUptime parses each message, stores the original raw line in `syslog.raw`, and adds attributes like `syslog.severity.name`, `syslog.facility.name`, `syslog.appName`, and any structured values present. Those attributes are queryable without extra parsing steps.

---

## Common use cases we are already seeing

### 1. Network and security appliances

Most network gear still exposes configuration changes, ACL hits, and threat detections exclusively over syslog. Point your existing relay (Palo Alto, Fortinet, Cisco ASA, Juniper, pfSense, and more) directly to OneUptime, or keep an internal relay and forward over HTTPS:

```bash
# rsyslog snippet that batches messages into JSON and posts to OneUptime
module(load="omhttp")

template(name="OneUptimeJSON" type="list") {
  constant(value="{\"messages\":[\"")
  property(name="rawmsg")
  constant(value="\"]}")
}

action(
  type="omhttp"
  server="oneuptime.com"
  serverport="443"
  usehttps="on"
  endpoint="/syslog/v1/logs"
  header="Content-Type: application/json"
  header="x-oneuptime-token: <TOKEN>"
  header="x-oneuptime-service-name: perimeter-firewall"
  template="OneUptimeJSON"
)
```

### 2. Linux servers and cron jobs

Many cron jobs and legacy daemons still log solely through the kernel/syslog facility. Forwarding `/var/log/syslog` or journald entries keeps operational breadcrumbs in one place. Systemd hosts can rely on the journald → syslog bridge:

```bash
# /etc/rsyslog.d/oneuptime.conf
module(load="imjournal" StateFile="imjournal.state")
module(load="omhttp")

action(
  type="omhttp"
  server="oneuptime.com"
  serverport="443"
  usehttps="on"
  endpoint="/syslog/v1/logs"
  header="Content-Type: application/json"
  header="x-oneuptime-token: <TOKEN>"
  header="x-oneuptime-service-name: linux-fleet"
  template="OneUptimeJSON"
)
```

Because we map severity codes, you can alert on `syslog.severity.name = "error"` or slice by `syslog.hostname` to isolate noisy boxes quickly.

### 3. Kubernetes ingress controllers and edge nodes

If you already run Fluent Bit or Fluentd, keep them for container logs and add a lightweight syslog sink for hosts or appliances at the edge. Fluent Bit’s `syslog` input pairs with the HTTP output:

```ini
[INPUT]
    Name              syslog
    Mode              tcp
    Listen            0.0.0.0
    Port              5140

[OUTPUT]
    Name              http
    Match             *
    Host              oneuptime.com
    Port              443
    URI               /syslog/v1/logs
    Format            json
    json_date_key     time
    Header            Content-Type application/json
    Header            x-oneuptime-token <TOKEN>
    Header            x-oneuptime-service-name edge-ingress
    tls               On
```

This setup lets you ingest syslog from bare-metal workers or hardware load balancers without creating another logging stack.

### 4. Compliance archives without the wait

Need to retain firewall logs for PCI or SOX? Send them straight to OneUptime, apply a long retention policy to the telemetry service, and export to cold storage from a single place. No more exporting from multiple syslog relays.

---

## Querying and alerting on syslog in OneUptime

Once messages land, they appear under **Telemetry → Logs**. Filter by any syslog attribute, build saved views, or create dashboards. A few starter queries:

- `syslog.severity.name = "error" AND service.name = "linux-fleet"`
- `syslog.facility.name = "security"`
- `syslog.structured.event@32473.action = "deny"`
- `message CONTAINS "BGP"`

To turn queries into guardrails, create a log monitor (see [Monitor Logs with OneUptime](https://oneuptime.com/blog/post/2025-10-27-monitor-logs-with-oneuptime/view)) and set thresholds:

1. Go to **Monitors → New Monitor → Logs**.
2. Paste the query or add filters for the syslog attributes above.
3. Decide how often to evaluate (every minute is typical for security signals).
4. Route alerts to on-call rotations, Slack, Microsoft Teams, or automated workflows.

Because syslog runs through the same pipeline as OpenTelemetry logs, you can correlate incidents, run playbooks, and push updates to status pages with zero additional wiring.

---

## Documentation & next steps

- We added a dedicated guide at `/docs/telemetry/syslog` with end-to-end setup instructions, ready-to-copy snippets, and a growing list of tools that work out of the box.
- Syslog ingestion is included for every plan that already has log-based telemetry. Usage counts toward existing log retention and billing metrics.
- Roadmap items include S3-compatible archival exports, field-level masking for sensitive structured data, and UI wizards for the most popular forwarders.

If you have a syslog-forwarding pattern we should cover next, let us know. With native syslog support, OneUptime can finally watch the parts of your infrastructure that never made the jump to modern telemetry - without asking you to maintain another collector.
