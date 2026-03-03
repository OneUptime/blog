# How to Send Talos Linux Logs to a Remote Syslog Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Logging, Syslog, Observability, System Administration

Description: Learn how to send Talos Linux system logs to a remote syslog server for centralized logging and compliance requirements

---

Many organizations already have syslog infrastructure in place for collecting logs from servers, network devices, and applications. If you are running Talos Linux in such an environment, you will want to integrate your cluster's logs into that existing syslog infrastructure. This guide explains how to send Talos Linux logs to a remote syslog server.

## Why Use Syslog with Talos Linux

Syslog has been the standard protocol for log transmission for decades. Many organizations use it because:

- It is supported by virtually every network device and operating system
- Existing log management infrastructure is built around it
- Compliance regulations often require centralized syslog collection
- Security teams monitor syslog for threat detection
- It integrates with SIEM (Security Information and Event Management) systems

Even though Talos Linux sends logs in JSON lines format rather than traditional syslog format, many modern syslog servers can accept and parse JSON logs.

## Setting Up the Talos Linux Side

Talos Linux forwards logs using its built-in logging mechanism. Configure it in the machine configuration to point at your syslog server:

```yaml
# Machine configuration for syslog forwarding
machine:
  logging:
    destinations:
      - endpoint: "udp://syslog.example.com:514/"
        format: json_lines
      - endpoint: "tcp://syslog.example.com:5514/"
        format: json_lines
```

Standard syslog uses UDP port 514, but many modern syslog servers also accept TCP connections on port 514 or alternate ports like 5514 or 6514.

## Understanding the Format Difference

Traditional syslog messages follow the RFC 3164 or RFC 5424 format:

```
<134>Mar 01 12:00:00 hostname servicename: Log message here
```

Talos Linux sends logs in JSON lines format:

```json
{"msg":"Log message here","talos-level":"info","talos-service":"machined","talos-time":"2024-03-01T12:00:00Z"}
```

Your syslog server needs to be configured to parse JSON logs. Most modern syslog implementations like rsyslog, syslog-ng, and others support JSON parsing.

## Configuring rsyslog to Receive Talos Logs

If you are using rsyslog as your syslog server, here is how to set it up:

```bash
# /etc/rsyslog.d/talos-json.conf

# Load the UDP input module
module(load="imudp")
input(type="imudp" port="5514")

# Load the TCP input module
module(load="imtcp")
input(type="imtcp" port="5514")

# Parse JSON messages from Talos
module(load="mmjsonparse")

# Template for writing Talos logs
template(name="TalosLogFormat" type="list") {
    property(name="timereported" dateformat="rfc3339")
    constant(value=" ")
    property(name="fromhost-ip")
    constant(value=" ")
    property(name="$!msg")
    constant(value="\n")
}

# Rule to handle Talos logs
if $inputname == "imudp" or $inputname == "imtcp" then {
    action(type="mmjsonparse" cookie="")
    action(type="omfile"
           file="/var/log/talos/talos.log"
           template="TalosLogFormat")
    stop
}
```

Restart rsyslog after adding this configuration:

```bash
sudo systemctl restart rsyslog
```

## Configuring syslog-ng to Receive Talos Logs

For syslog-ng, the configuration looks like this:

```
# /etc/syslog-ng/conf.d/talos.conf

# Source for Talos logs
source s_talos_udp {
    network(
        transport("udp")
        port(5514)
    );
};

source s_talos_tcp {
    network(
        transport("tcp")
        port(5514)
    );
};

# Parse JSON format
parser p_json {
    json-parser(prefix(".talos."));
};

# Destination file
destination d_talos {
    file("/var/log/talos/${HOST}/talos.log"
        create-dirs(yes)
    );
};

# Log path
log {
    source(s_talos_udp);
    source(s_talos_tcp);
    parser(p_json);
    destination(d_talos);
};
```

## Using Vector as a Syslog Bridge

If your syslog server does not handle JSON well, you can use Vector as a bridge to convert Talos JSON logs to syslog format:

```toml
# vector.toml

# Receive Talos logs
[sources.talos_logs]
type = "socket"
address = "0.0.0.0:5514"
mode = "tcp"
decoding.codec = "json"

# Transform to syslog format
[transforms.to_syslog]
type = "remap"
inputs = ["talos_logs"]
source = '''
  .facility = "local0"
  .severity = if .talos-level == "error" { "err" }
    else if .talos-level == "warning" { "warning" }
    else { "info" }
  .appname = .talos-service
  .message = .msg
'''

# Forward to traditional syslog server
[sinks.syslog_out]
type = "socket"
inputs = ["to_syslog"]
address = "syslog.example.com:514"
mode = "udp"
encoding.codec = "text"
```

Deploy Vector as a service on a dedicated machine or as a container:

```bash
# Run Vector with the configuration
vector --config /etc/vector/vector.toml
```

Then point your Talos nodes at the Vector instance:

```yaml
machine:
  logging:
    destinations:
      - endpoint: "tcp://vector.example.com:5514/"
        format: json_lines
```

## Applying Configuration to All Nodes

Apply the logging configuration across your entire cluster:

```bash
#!/bin/bash
# setup-syslog.sh - Configure syslog forwarding on all Talos nodes

SYSLOG_SERVER="tcp://syslog.example.com:5514/"
ALL_NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"

for node in $ALL_NODES; do
  echo "Configuring log forwarding on $node..."

  talosctl patch machineconfig --nodes "$node" \
    --patch "[{
      \"op\": \"add\",
      \"path\": \"/machine/logging\",
      \"value\": {
        \"destinations\": [{
          \"endpoint\": \"$SYSLOG_SERVER\",
          \"format\": \"json_lines\"
        }]
      }
    }]"
done

echo "Syslog forwarding configured on all nodes."
```

## Verifying Logs Are Arriving

On the syslog server, verify that logs are being received:

```bash
# Check if the syslog server is listening
ss -ulnp | grep 5514
ss -tlnp | grep 5514

# Watch the log file for incoming Talos logs
tail -f /var/log/talos/talos.log

# Or check the syslog server's own logs
tail -f /var/log/syslog | grep talos
```

To generate test traffic, restart a service on one of the Talos nodes:

```bash
# Restart a service to generate log entries
talosctl service kubelet restart --nodes 192.168.1.20

# Check the syslog server for the restart events
```

## Filtering and Routing Logs

On the syslog server side, you can filter and route Talos logs based on their content:

```
# rsyslog example: Route logs by service
template(name="TalosServiceLog" type="string"
    string="/var/log/talos/%fromhost-ip%/%$!talos-service%.log")

if $!talos-service != "" then {
    action(type="omfile" dynaFile="TalosServiceLog")
}
```

This creates separate log files for each Talos service (machined, kubelet, etcd, etc.) from each node.

## Handling High Availability

For production environments, set up redundant syslog receivers:

```yaml
# Send logs to multiple syslog servers
machine:
  logging:
    destinations:
      - endpoint: "tcp://syslog-primary.example.com:5514/"
        format: json_lines
      - endpoint: "tcp://syslog-secondary.example.com:5514/"
        format: json_lines
```

You can also use a load balancer in front of your syslog servers:

```yaml
machine:
  logging:
    destinations:
      - endpoint: "tcp://syslog-lb.example.com:5514/"
        format: json_lines
```

## Security Considerations

### Encrypted Transport

For sensitive environments, use TLS-encrypted syslog (port 6514 by convention):

```yaml
machine:
  logging:
    destinations:
      - endpoint: "tcp://syslog.example.com:6514/"
        format: json_lines
```

Make sure your syslog server is configured to accept TLS connections.

### Network Segmentation

Keep your syslog traffic on a management network:

```yaml
# If your nodes have multiple interfaces, the logging traffic
# will use the default route. Make sure the syslog server is
# reachable from your management network.
machine:
  logging:
    destinations:
      - endpoint: "tcp://10.0.100.50:5514/"
        format: json_lines
```

## Compliance and Retention

Many compliance frameworks (PCI-DSS, HIPAA, SOC 2) require:

- Centralized log collection from all systems
- Log retention for a specified period (often 1 year or more)
- Tamper-proof log storage
- Access controls on log data

Configure your syslog server's retention policy to meet these requirements:

```bash
# Example logrotate configuration for Talos logs
# /etc/logrotate.d/talos
/var/log/talos/*.log {
    daily
    rotate 365
    compress
    delaycompress
    missingok
    notifempty
    create 0640 syslog adm
}
```

## Monitoring the Logging Pipeline

Do not forget to monitor the logging pipeline itself:

```bash
#!/bin/bash
# check-log-freshness.sh - Verify Talos logs are arriving

LOG_FILE="/var/log/talos/talos.log"
MAX_AGE_MINUTES=5

if [ ! -f "$LOG_FILE" ]; then
  echo "CRITICAL: Talos log file does not exist"
  exit 2
fi

LAST_MODIFIED=$(stat -c %Y "$LOG_FILE" 2>/dev/null || stat -f %m "$LOG_FILE")
CURRENT_TIME=$(date +%s)
AGE_MINUTES=$(( (CURRENT_TIME - LAST_MODIFIED) / 60 ))

if [ "$AGE_MINUTES" -gt "$MAX_AGE_MINUTES" ]; then
  echo "WARNING: No Talos logs received in $AGE_MINUTES minutes"
  exit 1
fi

echo "OK: Talos logs are current (last update $AGE_MINUTES minutes ago)"
exit 0
```

## Best Practices

- Use TCP for reliable log delivery when compliance requires guaranteed delivery.
- Use UDP for lower overhead when some log loss is acceptable.
- Configure multiple syslog destinations for redundancy.
- Set up log rotation and retention policies that meet your compliance requirements.
- Parse the JSON format on the syslog server side for structured log analysis.
- Monitor the logging pipeline to know when logs stop arriving.
- Secure log transport with TLS in environments handling sensitive data.
- Test the logging configuration in staging before deploying to production.
- Include the syslog server in your infrastructure monitoring.

Sending Talos Linux logs to syslog integrates your Kubernetes infrastructure into your existing log management workflow. This gives your operations and security teams the visibility they need to keep your systems running reliably.
