# How to Monitor NTP Clock Synchronization with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, NTP, Time Synchronization, Clock Drift, Metrics, Infrastructure, Observability

Description: Learn how to monitor NTP clock synchronization using the OpenTelemetry Collector to detect clock drift and time sync failures across your infrastructure.

---

Time synchronization is one of those infrastructure concerns that is invisible when it works and catastrophic when it fails. Distributed systems depend on synchronized clocks for transaction ordering, log correlation, certificate validation, consensus protocols, and cache expiration. A server with a drifting clock can cause TLS handshakes to fail (because certificates appear expired or not yet valid), distributed database conflicts, authentication token rejections, and log timestamps that make debugging impossible.

NTP (Network Time Protocol) keeps clocks synchronized, but NTP itself needs monitoring. NTP daemons can lose contact with upstream time sources, clocks can drift faster than NTP can correct, and misconfigured NTP clients can silently run with stale time data. The OpenTelemetry Collector lets you track NTP synchronization status and clock offset across your entire infrastructure, catching time problems before they cascade into application failures.

## Why Clock Drift Matters

To understand why a few milliseconds of clock drift matters, consider these scenarios.

In a distributed database like CockroachDB or Spanner, transaction ordering depends on synchronized clocks. CockroachDB rejects transactions when clock skew exceeds a configurable threshold (default 500ms). Spanner uses atomic clocks and GPS receivers specifically to minimize uncertainty about time.

TLS certificate validation checks the current time against the certificate's "Not Before" and "Not After" fields. A clock that is off by even a few minutes in the wrong direction can cause valid certificates to be rejected.

Log correlation across services requires timestamps to be accurate. If server A's clock is 30 seconds ahead of server B, events that happened simultaneously appear 30 seconds apart in your log aggregation tool, making incident investigation significantly harder.

```mermaid
graph TD
    subgraph Time Sources
        S1[NTP Pool Servers]
        S2[Internal NTP Server]
        S3[GPS Time Source]
    end

    subgraph Infrastructure
        H1[Server 1]
        H2[Server 2]
        H3[Server 3]
        H4[Container Host]
    end

    S1 -->|NTP| S2
    S3 -->|PPS| S2
    S2 -->|NTP| H1
    S2 -->|NTP| H2
    S2 -->|NTP| H3
    S2 -->|NTP| H4

    OC[OTel Collector] -->|Read NTP Stats| H1
    OC -->|Read NTP Stats| H2
    OC -->|Read NTP Stats| H3
    OC -->|Read NTP Stats| H4
    OC -->|Export| O[OneUptime]
```

## Collecting NTP Metrics with the Host Metrics Receiver

The OpenTelemetry Collector does not have a dedicated NTP receiver, but you can monitor NTP synchronization through a combination of approaches. The simplest is to use the host metrics receiver, which can report the system clock's offset from its NTP source on supported platforms.

Here is the basic configuration:

```yaml
# config.yaml - NTP monitoring with the OpenTelemetry Collector
receivers:
  hostmetrics:
    collection_interval: 60s
    scrapers:
      # The system scraper provides basic host information
      # including uptime which can indicate recent reboots
      # that might affect time sync
      system: {}

processors:
  batch:
    timeout: 10s
    send_batch_size: 512

  resource:
    attributes:
      - key: service.name
        value: "ntp-monitoring"
        action: upsert

exporters:
  otlp:
    endpoint: "https://otel-ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"

service:
  pipelines:
    metrics:
      receivers: [hostmetrics]
      processors: [resource, batch]
      exporters: [otlp]
```

## Using a Script-Based Approach for Detailed NTP Metrics

For comprehensive NTP monitoring, a script-based approach gives you the most detailed data. NTP daemons (ntpd, chronyd) expose detailed synchronization statistics through their command-line tools. We can parse this data and expose it as metrics.

Create a script that collects NTP statistics and writes them in a format the collector can consume:

```bash
#!/bin/bash
# ntp_metrics.sh - Collect NTP synchronization metrics
# This script works with both chrony and ntpd

OUTPUT_DIR="/var/lib/otel/ntp-metrics"
mkdir -p "$OUTPUT_DIR"

# Determine which NTP daemon is running
if command -v chronyc &> /dev/null && chronyc tracking &> /dev/null; then
    NTP_DAEMON="chrony"
elif command -v ntpq &> /dev/null && ntpq -p &> /dev/null; then
    NTP_DAEMON="ntpd"
else
    echo "No NTP daemon found"
    exit 1
fi

TIMESTAMP=$(date +%s)
HOSTNAME=$(hostname)

if [ "$NTP_DAEMON" = "chrony" ]; then
    # Parse chronyc tracking output
    TRACKING=$(chronyc tracking)

    # Extract system clock offset in seconds
    # "System time" line shows offset from NTP time
    OFFSET=$(echo "$TRACKING" | grep "System time" | awk '{print $4}')
    OFFSET_DIRECTION=$(echo "$TRACKING" | grep "System time" | awk '{print $5}')

    # Extract root delay (round-trip time to the reference)
    ROOT_DELAY=$(echo "$TRACKING" | grep "Root delay" | awk '{print $4}')

    # Extract root dispersion (estimated error)
    ROOT_DISPERSION=$(echo "$TRACKING" | grep "Root dispersion" | awk '{print $4}')

    # Extract stratum
    STRATUM=$(echo "$TRACKING" | grep "Stratum" | awk '{print $3}')

    # Extract frequency error in ppm
    FREQ_ERROR=$(echo "$TRACKING" | grep "Frequency" | awk '{print $3}')

    # Check sync status
    LEAP_STATUS=$(echo "$TRACKING" | grep "Leap status" | awk '{print $4}')
    if [ "$LEAP_STATUS" = "Normal" ]; then
        SYNCED=1
    else
        SYNCED=0
    fi

    # Write metrics in a structured format
    cat > "$OUTPUT_DIR/metrics.json" << EOF
{
  "timestamp": $TIMESTAMP,
  "hostname": "$HOSTNAME",
  "ntp_daemon": "chrony",
  "synced": $SYNCED,
  "offset_seconds": $OFFSET,
  "root_delay_seconds": $ROOT_DELAY,
  "root_dispersion_seconds": $ROOT_DISPERSION,
  "stratum": $STRATUM,
  "frequency_error_ppm": $FREQ_ERROR
}
EOF

elif [ "$NTP_DAEMON" = "ntpd" ]; then
    # Parse ntpq output for the active peer (marked with *)
    PEER_LINE=$(ntpq -p | grep '^\*')

    if [ -n "$PEER_LINE" ]; then
        SYNCED=1
        # Extract offset in milliseconds and convert to seconds
        OFFSET_MS=$(echo "$PEER_LINE" | awk '{print $9}')
        OFFSET=$(echo "scale=6; $OFFSET_MS / 1000" | bc)
        # Extract jitter in milliseconds
        JITTER_MS=$(echo "$PEER_LINE" | awk '{print $10}')
        STRATUM=$(echo "$PEER_LINE" | awk '{print $3}')
    else
        SYNCED=0
        OFFSET=0
        JITTER_MS=0
        STRATUM=16
    fi

    cat > "$OUTPUT_DIR/metrics.json" << EOF
{
  "timestamp": $TIMESTAMP,
  "hostname": "$HOSTNAME",
  "ntp_daemon": "ntpd",
  "synced": $SYNCED,
  "offset_seconds": $OFFSET,
  "jitter_ms": $JITTER_MS,
  "stratum": $STRATUM
}
EOF
fi
```

Schedule this script to run every minute via cron or systemd timer:

```bash
# Cron entry - run NTP metrics collection every minute
* * * * * /opt/otel/scripts/ntp_metrics.sh
```

Then configure the collector to read the metrics file:

```yaml
receivers:
  filelog/ntp:
    include:
      - "/var/lib/otel/ntp-metrics/metrics.json"
    start_at: beginning
    # Re-read the file on each poll since it is overwritten
    poll_interval: 60s
    operators:
      - type: json_parser
      - type: move
        from: attributes.hostname
        to: resource["host.name"]
      - type: move
        from: attributes.offset_seconds
        to: attributes["ntp.offset_seconds"]
      - type: move
        from: attributes.synced
        to: attributes["ntp.synced"]
      - type: move
        from: attributes.stratum
        to: attributes["ntp.stratum"]

service:
  pipelines:
    logs/ntp:
      receivers: [filelog/ntp]
      processors: [resource, batch]
      exporters: [otlp]
```

## Monitoring NTP with Prometheus Exposition

If you prefer a metrics-based approach over log-based, you can use the `node_exporter` (which many teams already have deployed) and scrape its NTP metrics with the collector's Prometheus receiver:

```yaml
receivers:
  prometheus/ntp:
    config:
      scrape_configs:
        - job_name: "node-ntp-metrics"
          scrape_interval: 60s
          static_configs:
            - targets:
                - "server-1.internal:9100"
                - "server-2.internal:9100"
                - "server-3.internal:9100"
          # Only keep NTP-related metrics to reduce volume
          metric_relabel_configs:
            - source_labels: [__name__]
              regex: "node_timex_.*|node_ntp_.*"
              action: keep

service:
  pipelines:
    metrics/ntp:
      receivers: [prometheus/ntp]
      processors: [resource, batch]
      exporters: [otlp]
```

The `node_exporter` exposes several time-related metrics:

```yaml
# Key NTP metrics from node_exporter
#
# node_timex_offset_seconds
#   Current clock offset from the NTP reference
#   This is the most important metric - it tells you how far off the clock is
#
# node_timex_sync_status
#   1 if the clock is synchronized, 0 if not
#   A value of 0 means the NTP daemon has lost contact with its time source
#
# node_timex_maxerror_seconds
#   Maximum estimated error of the system clock
#   This grows when the NTP daemon cannot reach its source
#
# node_timex_frequency_adjustment_ratio
#   Rate at which the kernel is adjusting the clock frequency
#   Large adjustments indicate the hardware clock has significant drift
#
# node_ntp_stratum
#   NTP stratum of the current time source
#   Stratum 1 = directly connected to a reference clock
#   Stratum 2 = one hop from a stratum 1 source
#   Stratum 16 = unsynchronized
```

## Key Metrics and What They Mean

**Clock Offset** is the primary metric. It measures the difference between the local clock and the NTP reference. A positive offset means the local clock is ahead; negative means it is behind. For most applications, offsets under 10ms are fine. For distributed databases, you want offsets under 1ms. Offsets above 100ms are cause for concern, and offsets above 1 second are a serious problem.

**Sync Status** is a binary indicator. When it drops to zero, the NTP daemon has lost synchronization. This could mean the NTP server is unreachable, the local clock has drifted too far for NTP to correct gradually, or the NTP daemon has crashed.

**Stratum** indicates the distance from the reference clock. Lower is better. Stratum 1 means connected directly to a GPS or atomic clock. Stratum 2 means synchronized with a stratum 1 server. A stratum of 16 means unsynchronized. If your stratum suddenly increases, it means your preferred NTP source has become unavailable and the daemon has fallen back to a more distant source.

**Root Delay** measures the round-trip time to the reference clock through all intermediate NTP servers. Higher root delay means more uncertainty in the time offset calculation. This increases when network paths between NTP servers become congested.

**Frequency Error** (in parts per million) shows how fast the hardware clock drifts. Most commodity server hardware drifts between 1 and 100 ppm. A sudden change in frequency error can indicate hardware problems (failing crystal oscillator) or thermal issues affecting the clock.

## Alerting on Time Synchronization Issues

```yaml
# NTP alerting rules
- alert: NTPSyncLost
  # Clock is not synchronized with any NTP source
  condition: node_timex_sync_status == 0
  for: 5m
  severity: critical
  description: "NTP synchronization lost on {{ host.name }}"

- alert: NTPOffsetHigh
  # Clock offset exceeds 100ms
  condition: abs(node_timex_offset_seconds) > 0.1
  for: 5m
  severity: warning
  description: "Clock offset on {{ host.name }} exceeds 100ms"

- alert: NTPOffsetCritical
  # Clock offset exceeds 1 second
  condition: abs(node_timex_offset_seconds) > 1.0
  for: 1m
  severity: critical
  description: "Clock offset on {{ host.name }} exceeds 1 second"

- alert: NTPStratumHigh
  # NTP stratum is higher than expected
  condition: node_ntp_stratum > 4
  for: 10m
  severity: warning
  description: "NTP stratum on {{ host.name }} is {{ stratum }}"

- alert: NTPMaxErrorGrowing
  # Maximum error estimate is growing, indicating NTP cannot reach source
  condition: rate(node_timex_maxerror_seconds[10m]) > 0
  for: 15m
  severity: warning
  description: "NTP max error growing on {{ host.name }}"
```

The sync loss alert is critical because it means the clock will begin drifting immediately. The 5-minute grace period allows for brief NTP restarts during updates. The offset alerts use different thresholds because different applications have different tolerance for clock skew.

## Special Considerations for Containers and VMs

Containers share the host's clock, so NTP monitoring only needs to happen at the host level. However, if you are running containers in Kubernetes, you should still verify that every node has NTP configured and synchronized.

Virtual machines add another layer of complexity. Hypervisors often provide their own time synchronization mechanism (VMware Tools, Hyper-V Integration Services, KVM guest agent). These can conflict with NTP if both are trying to adjust the clock. Best practice is to disable hypervisor time sync and rely solely on NTP, or to use the hypervisor as the primary time source and disable NTP.

Check for VMware Tools time sync:

```bash
# Check if VMware Tools time sync is enabled
vmware-toolbox-cmd timesync status

# Disable VMware Tools time sync (use NTP instead)
vmware-toolbox-cmd timesync disable
```

## NTP Server Monitoring

If you run your own NTP servers (which is recommended for internal infrastructure), monitor them separately with higher attention:

```yaml
receivers:
  prometheus/ntp_servers:
    config:
      scrape_configs:
        - job_name: "ntp-servers"
          scrape_interval: 30s
          static_configs:
            - targets:
                - "ntp-1.internal:9100"
                - "ntp-2.internal:9100"
              labels:
                role: "ntp-server"
```

Your internal NTP servers should be stratum 2 or 3. They should have multiple upstream sources configured for redundancy. Monitor that they maintain low offset and that the number of reachable upstream sources does not drop to zero.

## Conclusion

NTP monitoring is a small investment that prevents a large category of hard-to-diagnose problems. Use the OpenTelemetry Collector with either the Prometheus receiver (scraping node_exporter) or a script-based approach to track clock offset, sync status, and stratum across all your servers. Alert on sync loss immediately and on offset thresholds appropriate for your applications. Pay special attention to NTP in virtual machine and container environments where time synchronization has additional complexity. With NTP metrics in your observability platform, you can catch clock drift before it causes application failures and quickly identify the root cause when time-related issues do occur.
