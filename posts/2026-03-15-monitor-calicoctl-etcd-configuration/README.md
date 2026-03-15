# How to Monitor Calicoctl etcd Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, etcd, Monitoring, Prometheus, Alerts

Description: Monitor your calicoctl etcd datastore configuration to detect connectivity issues, certificate expiration, and etcd cluster health problems.

---

## Introduction

When Calico uses etcd as its datastore, the health of the etcd cluster and the validity of calicoctl's TLS configuration directly affect network policy operations. Monitoring these components proactively prevents outages caused by expired certificates, unhealthy etcd members, or connectivity failures.

Effective monitoring covers etcd cluster health, certificate expiration tracking, calicoctl connectivity checks, and alerting on anomalies. Combining these signals provides a complete picture of your Calico datastore health.

This guide covers practical monitoring setups using shell scripts, Prometheus, and standard alerting tools.

## Prerequisites

- Calico cluster using etcd as the datastore
- `calicoctl` binary installed (v3.25+)
- `etcdctl` available for cluster health checks
- Prometheus and Alertmanager (optional, for metrics and alerts)
- `openssl` for certificate inspection

## Monitoring etcd Cluster Health

Create a health check script for all etcd endpoints:

```bash
#!/bin/bash
# check-etcd-health.sh

ENDPOINTS="https://etcd1:2379,https://etcd2:2379,https://etcd3:2379"
CA_CERT="/etc/calico/certs/ca.pem"
CLIENT_CERT="/etc/calico/certs/client.pem"
CLIENT_KEY="/etc/calico/certs/client-key.pem"

etcdctl --endpoints="$ENDPOINTS" \
  --cacert="$CA_CERT" \
  --cert="$CLIENT_CERT" \
  --key="$CLIENT_KEY" \
  endpoint health --write-out=table

etcdctl --endpoints="$ENDPOINTS" \
  --cacert="$CA_CERT" \
  --cert="$CLIENT_CERT" \
  --key="$CLIENT_KEY" \
  endpoint status --write-out=table
```

## Monitoring Certificate Expiration

Track certificate expiry dates and alert before they expire:

```bash
#!/bin/bash
# check-cert-expiry.sh

WARN_DAYS=30
CERTS=(
  "/etc/calico/certs/ca.pem"
  "/etc/calico/certs/client.pem"
)

for CERT in "${CERTS[@]}"; do
  EXPIRY=$(openssl x509 -in "$CERT" -noout -enddate | cut -d= -f2)
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

  if [ "$DAYS_LEFT" -lt 0 ]; then
    echo "CRITICAL: ${CERT} expired ${DAYS_LEFT#-} days ago"
  elif [ "$DAYS_LEFT" -lt "$WARN_DAYS" ]; then
    echo "WARNING: ${CERT} expires in ${DAYS_LEFT} days"
  else
    echo "OK: ${CERT} expires in ${DAYS_LEFT} days"
  fi
done
```

## Monitoring calicoctl Connectivity

Periodically verify calicoctl can communicate with etcd:

```bash
#!/bin/bash
# calicoctl-health-check.sh

LOGFILE="/var/log/calicoctl-etcd-health.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if calicoctl get nodes > /dev/null 2>&1; then
  NODE_COUNT=$(calicoctl get nodes -o json | jq '.items | length')
  echo "${TIMESTAMP} OK nodes=${NODE_COUNT}" >> "$LOGFILE"
else
  echo "${TIMESTAMP} ERROR datastore_unreachable" >> "$LOGFILE"
fi
```

Run this via cron:

```bash
# Add to crontab
echo "*/5 * * * * /usr/local/bin/calicoctl-health-check.sh" | crontab -
```

## Exposing etcd Metrics to Prometheus

etcd exposes metrics on port 2379 at `/metrics`. Create a Prometheus scrape configuration:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "etcd"
    scheme: https
    tls_config:
      ca_file: /etc/prometheus/etcd-ca.pem
      cert_file: /etc/prometheus/etcd-client.pem
      key_file: /etc/prometheus/etcd-client-key.pem
    static_configs:
      - targets:
          - "etcd1:2379"
          - "etcd2:2379"
          - "etcd3:2379"
```

## Key etcd Metrics to Monitor

Watch these metrics for etcd health:

```
etcd_server_has_leader
etcd_server_leader_changes_seen_total
etcd_disk_wal_fsync_duration_seconds_bucket
etcd_disk_backend_commit_duration_seconds_bucket
etcd_network_peer_round_trip_time_seconds_bucket
etcd_mvcc_db_total_size_in_bytes
```

## Setting Up Prometheus Alerts

Create alerting rules for critical etcd conditions:

```yaml
groups:
  - name: etcd-calico
    rules:
      - alert: EtcdNoLeader
        expr: etcd_server_has_leader == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "etcd member has no leader"

      - alert: EtcdHighFsyncDuration
        expr: histogram_quantile(0.99, etcd_disk_wal_fsync_duration_seconds_bucket) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "etcd WAL fsync taking too long"

      - alert: EtcdDatabaseSizeLarge
        expr: etcd_mvcc_db_total_size_in_bytes > 6442450944
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "etcd database size exceeds 6GB"
```

## Monitoring Calico Key Count in etcd

Track the number of Calico keys stored in etcd:

```bash
#!/bin/bash
KEY_COUNT=$(etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  get /calico --prefix --keys-only | wc -l)

echo "Calico keys in etcd: ${KEY_COUNT}"
```

## Verification

Confirm all monitoring components are working:

```bash
# Run health checks
bash /usr/local/bin/check-etcd-health.sh
bash /usr/local/bin/check-cert-expiry.sh
bash /usr/local/bin/calicoctl-health-check.sh

# Verify Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.job=="etcd") | .health'
```

## Troubleshooting

- **Prometheus cannot scrape etcd**: Ensure Prometheus has the correct TLS certificates and etcd allows connections from the Prometheus server IP.
- **Certificate expiry script shows wrong dates**: Date parsing varies between Linux and macOS. Use the appropriate `date` command syntax for your platform.
- **Health check cron not running**: Verify the cron job is listed in `crontab -l` and the script has execute permissions.
- **etcd metrics endpoint not responding**: Confirm etcd is configured to expose metrics and the metrics URL uses the correct scheme (http vs https).

## Conclusion

Monitoring your calicoctl etcd configuration prevents surprises from expired certificates, unhealthy etcd members, or connectivity failures. Combining health check scripts, Prometheus metrics, and alerting rules provides comprehensive visibility into the datastore layer that Calico depends on.
