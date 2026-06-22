# How to Ship Syslog to Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Syslog, Legacy Systems, Log Collection, RFC5424, RFC3164

Description: A comprehensive guide to shipping syslog messages to Grafana Loki, covering syslog receivers, parsing RFC3164 and RFC5424 formats, and integrating legacy systems with modern log aggregation.

---

Syslog remains a critical log transport protocol for network devices, legacy systems, and enterprise infrastructure. This guide covers how to collect syslog messages and ship them to Loki for centralized log management.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki deployed and accessible
- Systems configured to send syslog (or ability to configure)
- Grafana Alloy, Syslog-ng, Rsyslog, Fluent Bit, Vector, or Promtail installed (Promtail is deprecated and has reached end-of-life)
- Understanding of syslog formats (RFC3164, RFC5424)

## Understanding Syslog Formats

### RFC3164 (BSD Syslog)

Traditional syslog format:

```text
<PRI>TIMESTAMP HOSTNAME TAG: MESSAGE
<34>Oct 11 22:14:15 server01 sshd[12345]: Failed password for root
```

### RFC5424 (Modern Syslog)

Structured syslog format:

```text
<PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID STRUCTURED-DATA MSG
<165>1 2024-01-15T10:30:00.000Z server01 sshd 12345 - - Failed password
```

## Method 1: Promtail Syslog Receiver

Promtail's syslog receiver is deprecated with Promtail itself. For new deployments, prefer Grafana Alloy; use Promtail only for existing environments that still run it.

### Promtail Configuration

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: syslog
    syslog:
      listen_address: 0.0.0.0:1514
      idle_timeout: 60s
      label_structured_data: yes
      use_incoming_timestamp: true
      labels:
        job: syslog
    relabel_configs:
      - source_labels: [__syslog_message_hostname]
        target_label: host
      - source_labels: [__syslog_message_severity]
        target_label: severity
      - source_labels: [__syslog_message_facility]
        target_label: facility
      - source_labels: [__syslog_message_app_name]
        target_label: app
```

### UDP Syslog Forwarder

This Promtail example listens on TCP. To accept UDP syslog while keeping Promtail behind a TCP receiver, put a syslog forwarder in front of Promtail:

```conf
# /etc/rsyslog.d/50-udp-to-promtail.conf

module(load="imudp")
module(load="omfwd")

input(type="imudp" port="514")

*.* action(
    type="omfwd"
    target="promtail-syslog"
    port="1514"
    protocol="tcp"
    template="RSYSLOG_SyslogProtocol23Format"
)
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: promtail-syslog
  namespace: loki
spec:
  replicas: 2
  selector:
    matchLabels:
      app: promtail-syslog
  template:
    metadata:
      labels:
        app: promtail-syslog
    spec:
      containers:
        - name: promtail
          image: grafana/promtail:2.9.4
          args:
            - -config.file=/etc/promtail/config.yaml
          ports:
            - name: http
              containerPort: 9080
            - name: syslog-tcp
              containerPort: 1514
              protocol: TCP
          volumeMounts:
            - name: config
              mountPath: /etc/promtail
            - name: positions
              mountPath: /tmp
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
      volumes:
        - name: config
          configMap:
            name: promtail-syslog-config
        - name: positions
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: promtail-syslog
  namespace: loki
spec:
  type: LoadBalancer
  ports:
    - name: syslog-tcp
      port: 1514
      targetPort: 1514
      protocol: TCP
  selector:
    app: promtail-syslog
```

## Method 2: Rsyslog to Loki

### Rsyslog with omhttp (Direct HTTP to Loki)

```conf
# /etc/rsyslog.d/50-loki.conf

# Load modules

module(load="imudp")
module(load="imtcp")
module(load="omhttp")

# Input listeners
input(type="imudp" port="514")
input(type="imtcp" port="514")

# Template for Loki JSON
template(name="LokiFormat" type="list") {
    constant(value="{\"streams\":[{\"stream\":{")
    constant(value="\"job\":\"syslog\",")
    constant(value="\"host\":\"")
    property(name="hostname")
    constant(value="\",")
    constant(value="\"facility\":\"")
    property(name="syslogfacility-text")
    constant(value="\",")
    constant(value="\"severity\":\"")
    property(name="syslogseverity-text")
    constant(value="\"},\"values\":[[\"")
    property(name="timegenerated" dateformat="unixtimestamp")
    constant(value="000000000\",\"")
    property(name="msg" format="json")
    constant(value="\"]]}]}")
}

# Send to Loki
action(
    type="omhttp"
    server="loki.example.com"
    serverport="3100"
    restpath="loki/api/v1/push"
    template="LokiFormat"
    httpContentType="application/json"
    action.resumeRetryCount="-1"
)
```

### Rsyslog with File Output to Promtail

```conf
# /etc/rsyslog.d/50-json.conf

# JSON template
template(name="json-template"
  type="list") {
    constant(value="{")
    constant(value="\"@timestamp\":\"")     property(name="timereported" dateFormat="rfc3339")
    constant(value="\",\"host\":\"")        property(name="hostname")
    constant(value="\",\"severity\":\"")    property(name="syslogseverity-text")
    constant(value="\",\"facility\":\"")    property(name="syslogfacility-text")
    constant(value="\",\"tag\":\"")         property(name="syslogtag" format="json")
    constant(value="\",\"message\":\"")     property(name="msg" format="json")
    constant(value="\"}\n")
}

# Write to file
*.* action(type="omfile"
           file="/var/log/syslog.json"
           template="json-template")
```

Promtail scrapes the JSON file:

```yaml
scrape_configs:
  - job_name: syslog-json
    static_configs:
      - targets: [localhost]
        labels:
          job: syslog
          __path__: /var/log/syslog.json
    pipeline_stages:
      - json:
          expressions:
            timestamp: '@timestamp'
            host: host
            severity: severity
            facility: facility
            message: message
      - labels:
          host:
          severity:
          facility:
      - timestamp:
          source: timestamp
          format: RFC3339
      - output:
          source: message
```

## Method 3: Syslog-ng to Loki

### Syslog-ng Configuration

```conf
# /etc/syslog-ng/conf.d/loki.conf

@version: 4.7

source s_network {
    network(
        transport("tcp")
        port(514)
    );
    network(
        transport("udp")
        port(514)
    );
};

destination d_loki {
    loki(
        url("loki:9095")
        labels(
            "job" => "syslog",
            "host" => "$HOST",
            "facility" => "$FACILITY",
            "severity" => "$LEVEL"
        )
        template("${MSG}")
        timestamp(msg)
    );
};

log {
    source(s_network);
    destination(d_loki);
};
```

### Syslog-ng with Batching

```conf
destination d_loki_batch {
    loki(
        url("loki:9095")
        labels("job" => "syslog")
        template("${HOST} ${FACILITY} ${LEVEL}: ${MSG}")
        timestamp(msg)
        batch-lines(100)
        batch-timeout(5000)
    );
};
```

## Method 4: Fluent Bit Syslog Input

### Fluent Bit Configuration

```ini
[SERVICE]
    Flush         5
    Log_Level     info
    Parsers_File  parsers.conf

[INPUT]
    Name          syslog
    Tag           syslog.*
    Mode          tcp
    Listen        0.0.0.0
    Port          5140
    Parser        syslog-rfc3164

[INPUT]
    Name          syslog
    Tag           syslog.*
    Mode          udp
    Listen        0.0.0.0
    Port          5140
    Parser        syslog-rfc3164

[FILTER]
    Name          modify
    Match         syslog.*
    Add           job syslog

[OUTPUT]
    Name          loki
    Match         syslog.*
    Host          loki
    Port          3100
    Labels        job=syslog
    Label_Keys    $host, $ident, $pid
    Remove_Keys   host, ident, pid
```

### Parsers Configuration

```ini
# parsers.conf

[PARSER]
    Name        syslog-rfc3164
    Format      regex
    Regex       ^\<(?<pri>[0-9]+)\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$
    Time_Key    time
    Time_Format %b %d %H:%M:%S

[PARSER]
    Name        syslog-rfc5424
    Format      regex
    Regex       ^\<(?<pri>[0-9]{1,5})\>1 (?<time>[^ ]+) (?<host>[^ ]+) (?<ident>[^ ]+) (?<pid>[^ ]+) (?<msgid>[^ ]+) (?<extradata>(\[(.*?)\]|-)+) (?<message>.+)$
    Time_Key    time
    Time_Format %Y-%m-%dT%H:%M:%S.%L%z
```

## Method 5: Vector Syslog to Loki

### Vector Configuration

```toml
# vector.toml

[sources.syslog_tcp]
type = "syslog"
address = "0.0.0.0:514"
mode = "tcp"

[sources.syslog_udp]
type = "syslog"
address = "0.0.0.0:514"
mode = "udp"

[transforms.parse_syslog]
type = "remap"
inputs = ["syslog_tcp", "syslog_udp"]
source = '''
.job = "syslog"
.severity = to_string(.severity) ?? "info"
.facility = to_string(.facility) ?? "user"
.host = .hostname ?? "unknown"
.app = .appname ?? "unknown"
'''

[sinks.loki]
type = "loki"
inputs = ["parse_syslog"]
endpoint = "http://loki:3100"
encoding.codec = "text"
labels.job = "{{ job }}"
labels.host = "{{ host }}"
labels.severity = "{{ severity }}"
labels.facility = "{{ facility }}"
labels.app = "{{ app }}"
```

## Configuring Syslog Sources

### Linux rsyslog Client

```conf
# /etc/rsyslog.d/90-remote.conf

# Send all logs to remote syslog server
*.* @@loki-syslog.example.com:1514

# Or UDP
*.* @loki-syslog.example.com:514
```

### Network Devices (Cisco)

```text
! Cisco IOS
logging host 192.168.1.100 transport tcp port 1514
logging trap informational
logging source-interface Loopback0
```

### Firewall (pfSense/OPNsense)

Navigate to Status > System Logs > Settings:
- Enable Remote Logging
- Remote Syslog Server: `loki-syslog.example.com:514`
- Remote Syslog Contents: Everything

### Windows Event Log to Syslog

Using NXLog:

```conf
# nxlog.conf

<Input eventlog>
    Module      im_msvistalog
</Input>

<Output syslog>
    Module      om_tcp
    Host        loki-syslog.example.com
    Port        1514
    Exec        to_syslog_bsd();
</Output>

<Route 1>
    Path        eventlog => syslog
</Route>
```

## Parsing and Labeling

### Severity to Label Mapping

```yaml
pipeline_stages:
  - match:
      selector: '{job="syslog"}'
      stages:
        - replace:
            expression: '(.*)'
            source: severity
            replace: '{{ .Value | ToLower }}'
        - labels:
            level: severity
```

### Extract Application Information

```yaml
pipeline_stages:
  - match:
      selector: '{job="syslog"}'
      stages:
        - regex:
            expression: '^(?P<app>\w+)\[(?P<pid>\d+)\]:\s*(?P<message>.*)'
        - labels:
            app:
            pid:
        - output:
            source: message
```

### Handle Multiple Formats

```yaml
pipeline_stages:
  # Try RFC5424 first
  - match:
      selector: '{job="syslog"}'
      stages:
        - regex:
            expression: '^\<\d+\>1\s+(?P<timestamp>\S+)\s+(?P<host>\S+)\s+(?P<app>\S+)\s+(?P<pid>\S+)\s+(?P<msgid>\S+)\s+(?P<sd>\[.*\]|-)\s+(?P<message>.*)'
        - labels:
            host:
            app:

  # Fall back to RFC3164
  - match:
      selector: '{job="syslog", app=""}'
      stages:
        - regex:
            expression: '^(?P<timestamp>\w+\s+\d+\s+[\d:]+)\s+(?P<host>\S+)\s+(?P<tag>[^\[:\s]+)(?:\[(?P<pid>\d+)\])?[:\s]+(?P<message>.*)'
        - labels:
            host:
            app: tag
```

## LogQL Queries for Syslog

### Query by Severity

```logql
# Error and above
{job="syslog", severity=~"err|crit|alert|emerg"}

# All authentication messages
{job="syslog", facility="auth"}
```

### Search Specific Hosts

```logql
# Logs from specific host
{job="syslog", host="firewall01"} |= "denied"

# Multiple hosts
{job="syslog", host=~"router.*"} | json
```

### Count by Severity

```logql
sum by (severity) (
  count_over_time({job="syslog"}[1h])
)
```

### Error Rate

```logql
sum(rate({job="syslog", severity=~"err|crit|alert|emerg"}[5m]))
/
sum(rate({job="syslog"}[5m]))
```

## High Availability Setup

### Load Balanced Syslog Receivers

```yaml
apiVersion: v1
kind: Service
metadata:
  name: syslog-lb
  namespace: loki
  annotations:
    metallb.universe.tf/address-pool: syslog-pool
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
    - name: syslog-tcp
      port: 514
      targetPort: 1514
      protocol: TCP
  selector:
    app: promtail-syslog
```

### Multiple Receivers

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: promtail-syslog
spec:
  replicas: 3
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: promtail-syslog
                topologyKey: kubernetes.io/hostname
```

## Monitoring and Alerting

### Alloy Syslog Metrics

```promql
# Syslog messages received
rate(loki_source_syslog_entries_total[5m])

# Parse errors
rate(loki_source_syslog_parsing_errors_total[5m])
```

### Alert Rules

```yaml
groups:
  - name: syslog-alerts
    rules:
      - alert: HighSyslogErrorRate
        expr: |
          sum(rate({job="syslog", severity=~"err|crit"}[5m])) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High syslog error rate"

      - alert: SyslogSourceMissing
        expr: |
          absent_over_time({job="syslog", host="firewall01"}[10m])
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "No syslog from firewall01"
```

## Best Practices

### Label Cardinality

Keep label cardinality low:

```yaml
# Good - limited label values
labels:
  job: syslog
  severity: error
  facility: auth

# Avoid - high cardinality
labels:
  pid: "12345"  # Too many unique values
  message_id: "abc123"  # Too many unique values
```

### Security

1. Use TLS for syslog transport
2. Implement IP allowlists
3. Validate and sanitize input
4. Rate limit connections

### Performance

1. Use TCP for reliability
2. Batch messages when possible
3. Configure appropriate timeouts
4. Monitor receiver lag

## Conclusion

Shipping syslog to Loki enables centralized log management for legacy systems and network infrastructure. Key takeaways:

- Use Grafana Alloy's syslog receiver for new direct ingestion, or Promtail only for existing deployments
- Configure proper parsing for RFC3164 and RFC5424
- Map syslog severity and facility to Loki labels
- Implement high availability for critical infrastructure
- Monitor syslog receivers and alert on failures

With proper syslog integration, you can consolidate logs from diverse sources into Loki for unified observability.
