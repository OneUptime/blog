# How to Configure Prometheus Pushgateway to Listen on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Pushgateway, IPv4, Metric, Configuration, Short-lived Jobs, Monitoring

Description: Learn how to configure the Prometheus Pushgateway to listen on a specific IPv4 address and accept metrics from batch jobs and short-lived processes.

---

Prometheus normally pulls metrics from long-running services. For short-lived batch jobs that exit before Prometheus can scrape them, the Pushgateway acts as an intermediary - jobs push metrics to it, and Prometheus scrapes the Pushgateway.

## Installing Pushgateway

```bash
# Download Pushgateway binary

VERSION=1.11.2
wget https://github.com/prometheus/pushgateway/releases/download/v${VERSION}/pushgateway-${VERSION}.linux-amd64.tar.gz
tar xzf pushgateway-${VERSION}.linux-amd64.tar.gz
mv pushgateway-${VERSION}.linux-amd64/pushgateway /usr/local/bin/

# Create a systemd service
cat > /etc/systemd/system/pushgateway.service << 'EOF'
[Unit]
Description=Prometheus Pushgateway
After=network.target

[Service]
# Bind to a specific IPv4 address on port 9091
ExecStart=/usr/local/bin/pushgateway \
  --web.listen-address="10.0.0.5:9091" \
  --web.telemetry-path="/metrics"
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl enable --now pushgateway
```

## Verifying the Binding

```bash
ss -tlnp | grep pushgateway
# LISTEN 10.0.0.5:9091

curl -s http://10.0.0.5:9091/metrics | grep pushgateway_build
```

## Pushing Metrics from a Batch Job

```bash
#!/bin/bash
# backup_job.sh - run nightly backup and push metrics

START=$(date +%s)

# ... run backup logic here ...
/usr/local/bin/backup.sh

STATUS=$?
END=$(date +%s)
DURATION=$((END - START))

# Push metrics to Pushgateway
# Format: metric_name metric_value
{
  if [ "$STATUS" -eq 0 ]; then
    cat <<EOF
# HELP backup_last_success_timestamp Unix timestamp of the last successful backup
# TYPE backup_last_success_timestamp gauge
backup_last_success_timestamp $(date +%s)
EOF
  fi

  cat <<EOF
# HELP backup_duration_seconds Duration of the last backup in seconds
# TYPE backup_duration_seconds gauge
backup_duration_seconds $DURATION

# HELP backup_exit_code Exit code of the backup (0=success)
# TYPE backup_exit_code gauge
backup_exit_code $STATUS
EOF
} | curl --data-binary @- http://10.0.0.5:9091/metrics/job/backup_job/instance/server-01
```

## Configuring Prometheus to Scrape Pushgateway

```yaml
# /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'pushgateway'
    static_configs:
      - targets: ['10.0.0.5:9091']
    honor_labels: true    # Preserve labels pushed to the Pushgateway
```

## Viewing Pushed Metrics

```bash
# List pushed metric groups in JSON format
curl -s http://10.0.0.5:9091/api/v1/metrics | python3 -m json.tool

# View the web UI
# Open http://10.0.0.5:9091 in your browser
```

## Deleting Pushed Metrics

```bash
# Delete metrics for a specific job + instance combination
curl -X DELETE http://10.0.0.5:9091/metrics/job/backup_job/instance/server-01

# Delete metrics for the job-only group (does not delete groups with additional labels such as instance)
curl -X DELETE http://10.0.0.5:9091/metrics/job/backup_job
```

## Key Takeaways

- Use `--web.listen-address=ip:port` to bind Pushgateway to a specific IPv4 address.
- Set `honor_labels: true` in the Prometheus scrape config so labels pushed by the client are preserved.
- Manage metric lifecycle explicitly because Pushgateway retains pushed metrics until you delete or overwrite them.
- Pushgateway is NOT a replacement for Prometheus scraping long-lived services - use it primarily for service-level batch jobs. For machine-level cron jobs, prefer the Node Exporter's textfile collector.
