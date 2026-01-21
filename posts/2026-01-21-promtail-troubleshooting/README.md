# How to Debug Promtail Not Shipping Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Promtail, Grafana Loki, Troubleshooting, Log Collection, Agent Debugging

Description: A comprehensive guide to troubleshooting Promtail when logs are not being shipped to Loki, covering configuration issues, permissions, connectivity, and pipeline debugging.

---

Promtail is the primary log collection agent for Grafana Loki. When logs stop appearing in Loki, the issue often lies with Promtail configuration, file permissions, network connectivity, or pipeline processing. This guide provides a systematic approach to diagnosing and resolving Promtail issues.

## Common Symptoms

- No new logs appearing in Grafana/Loki
- Partial log collection (some sources working, others not)
- Logs appearing with wrong timestamps or labels
- Promtail using high CPU/memory
- Promtail crashing or restarting

## Diagnostic Steps

### Step 1: Check Promtail Status

```bash
# Check if Promtail is running
systemctl status promtail
# or
docker logs promtail --tail 100

# Check Promtail metrics
curl -s http://localhost:9080/metrics | head -50

# Check Promtail targets
curl -s http://localhost:9080/targets
```

### Step 2: Review Promtail Logs

```bash
# View Promtail logs
journalctl -u promtail -f

# Docker logs
docker logs -f promtail

# Look for errors
docker logs promtail 2>&1 | grep -i "error\|warn\|fail"
```

### Step 3: Check Promtail Ready Endpoint

```bash
# Check if Promtail is ready
curl -s http://localhost:9080/ready

# Should return "Ready"
```

## Configuration Issues

### Verify Configuration Syntax

```bash
# Validate configuration
promtail -config.file=/etc/promtail/config.yaml -check-syntax

# Dry run
promtail -config.file=/etc/promtail/config.yaml -dry-run
```

### Common Configuration Mistakes

**Wrong path pattern:**

```yaml
# Incorrect: Missing double asterisk for recursive
scrape_configs:
  - job_name: app
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          __path__: /var/log/app/*.log  # Only matches immediate directory

# Correct: Recursive matching
scrape_configs:
  - job_name: app
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          __path__: /var/log/app/**/*.log  # Matches all subdirectories
```

**Incorrect Loki URL:**

```yaml
# Check the Loki endpoint
clients:
  - url: http://loki:3100/loki/api/v1/push  # Must include full path
```

**Missing job or path labels:**

```yaml
# Always include job and __path__
scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: syslog  # Required
          __path__: /var/log/syslog  # Required
```

### Validate Configuration

```yaml
# Minimal working configuration
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: test
    static_configs:
      - targets:
          - localhost
        labels:
          job: test
          __path__: /var/log/test.log
```

## File Permission Issues

### Check File Permissions

```bash
# Check log file permissions
ls -la /var/log/app/

# Check if Promtail user can read files
sudo -u promtail cat /var/log/app/app.log

# Check positions file permissions
ls -la /var/promtail/positions.yaml
```

### Fix Permissions

```bash
# Add promtail user to appropriate groups
usermod -aG adm promtail
usermod -aG docker promtail

# Set file permissions
chmod 644 /var/log/app/*.log
chown root:adm /var/log/app

# For Docker logs
chmod 755 /var/lib/docker/containers
```

### Docker Volume Permissions

```yaml
# docker-compose.yaml
services:
  promtail:
    image: grafana/promtail:2.9.4
    user: root  # Run as root to access all files
    volumes:
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock  # For Docker service discovery
```

## Connectivity Issues

### Test Loki Connection

```bash
# Test Loki endpoint
curl -v http://loki:3100/ready

# Test push endpoint
curl -X POST "http://loki:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d '{"streams":[{"stream":{"job":"test"},"values":[["'$(date +%s)'000000000","test log"]]}]}'

# Check from Promtail container
docker exec promtail wget -q -O- http://loki:3100/ready
```

### Network Issues

```bash
# Check DNS resolution
docker exec promtail nslookup loki

# Check network connectivity
docker exec promtail nc -zv loki 3100

# Check if Loki port is open
netstat -tlnp | grep 3100
```

### TLS/SSL Issues

```yaml
# Promtail TLS configuration
clients:
  - url: https://loki:3100/loki/api/v1/push
    tls_config:
      ca_file: /etc/promtail/ca.crt
      cert_file: /etc/promtail/client.crt
      key_file: /etc/promtail/client.key
      # For self-signed certs (development only)
      insecure_skip_verify: false
```

## Positions File Issues

### Check Positions File

```bash
# View current positions
cat /var/promtail/positions.yaml

# Sample output
positions:
  /var/log/app/app.log: "12345678"
  /var/log/syslog: "87654321"
```

### Reset Positions

```bash
# Stop Promtail
systemctl stop promtail

# Remove positions file (will re-read all logs)
rm /var/promtail/positions.yaml

# Or reset specific file position
# Edit positions.yaml and set position to "0"

# Start Promtail
systemctl start promtail
```

### Positions File Location

```yaml
# Ensure positions directory exists and is writable
positions:
  filename: /var/promtail/positions.yaml
  sync_period: 10s  # How often to sync positions
```

## Pipeline Issues

### Debug Pipeline Stages

```yaml
# Add debug output
scrape_configs:
  - job_name: app
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          __path__: /var/log/app/*.log
    pipeline_stages:
      # First, see raw log
      - match:
          selector: '{job="app"}'
          stages:
            - regex:
                expression: '.*'
            - output:
                source: output

      # Then your actual pipeline
      - json:
          expressions:
            level: level
            msg: message
      - labels:
          level:
```

### Common Pipeline Errors

**JSON parsing failure:**

```yaml
# Check for JSON parsing errors
pipeline_stages:
  - json:
      expressions:
        level: level
    # Add error handling
  - match:
      selector: '{__error__="JSONParseError"}'
      stages:
        - drop:
            drop_counter_reason: json_parse_error
```

**Timestamp parsing failure:**

```yaml
pipeline_stages:
  - timestamp:
      source: time
      format: RFC3339
      # Add fallback
      fallback_formats:
        - "2006-01-02 15:04:05"
        - UnixMs
      action_on_failure: keep  # Keep log with current time
```

### Test Pipeline Locally

```bash
# Use promtail to test pipeline
echo '{"level":"error","message":"test"}' | promtail \
  -config.file=/etc/promtail/config.yaml \
  -stdin \
  -dry-run
```

## Target Discovery Issues

### Check Discovered Targets

```bash
# List all targets
curl -s http://localhost:9080/targets | jq

# Check specific target status
curl -s http://localhost:9080/targets | jq '.[] | select(.labels.job=="app")'
```

### File Discovery Not Working

```yaml
# Verify file patterns
scrape_configs:
  - job_name: app
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          # Use absolute paths
          __path__: /var/log/app/**/*.log

# Test the glob pattern
ls -la /var/log/app/**/*.log
```

### Kubernetes Discovery Issues

```yaml
# Check Kubernetes API access
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
        # Specify namespace if needed
        namespaces:
          names:
            - default
            - production
```

```bash
# Check service account permissions
kubectl auth can-i list pods --as=system:serviceaccount:loki:promtail
```

## Performance Issues

### High Memory Usage

```yaml
# Limit batch size
clients:
  - url: http://loki:3100/loki/api/v1/push
    batchsize: 1048576  # 1MB
    batchwait: 1s

# Limit concurrent targets
target_config:
  sync_period: 10s
```

### High CPU Usage

```yaml
# Simplify pipelines
pipeline_stages:
  # Avoid complex regex
  - regex:
      expression: '^(?P<simple>\w+)'  # Simple pattern

  # Instead of
  - regex:
      expression: '.*(?P<complex>(?:error|warn|info)).*'  # Complex pattern
```

### Log Volume Too High

```yaml
# Drop unneeded logs
pipeline_stages:
  - drop:
      expression: "healthcheck"
      drop_counter_reason: healthcheck

  - drop:
      source: level
      value: debug
      drop_counter_reason: debug_logs
```

## Monitoring Promtail

### Key Metrics

```promql
# Bytes read rate
rate(promtail_read_bytes_total[5m])

# Lines sent rate
rate(promtail_sent_entries_total[5m])

# Entries dropped
rate(promtail_dropped_entries_total[5m])

# Target sync failures
rate(promtail_targets_failed_total[5m])

# Client request errors
rate(promtail_request_duration_seconds_count{status_code!="204"}[5m])
```

### Alerting Rules

```yaml
groups:
  - name: promtail
    rules:
      - alert: PromtailNotSendingLogs
        expr: |
          rate(promtail_sent_entries_total[5m]) == 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Promtail is not sending logs"

      - alert: PromtailHighDropRate
        expr: |
          rate(promtail_dropped_entries_total[5m])
          / rate(promtail_read_lines_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Promtail dropping >10% of logs"
```

## Quick Troubleshooting Checklist

1. **Promtail running?**
   ```bash
   systemctl status promtail
   ```

2. **Can read log files?**
   ```bash
   sudo -u promtail cat /var/log/app/app.log
   ```

3. **Can reach Loki?**
   ```bash
   curl http://loki:3100/ready
   ```

4. **Configuration valid?**
   ```bash
   promtail -config.file=/etc/promtail/config.yaml -check-syntax
   ```

5. **Targets discovered?**
   ```bash
   curl http://localhost:9080/targets
   ```

6. **Logs being sent?**
   ```bash
   curl -s http://localhost:9080/metrics | grep promtail_sent_entries_total
   ```

## Conclusion

Troubleshooting Promtail requires systematically checking configuration, permissions, connectivity, and pipeline processing. By following the diagnostic steps in this guide, you can identify and resolve most Promtail issues that prevent logs from being shipped to Loki.

Key takeaways:
- Verify configuration syntax before deployment
- Check file permissions for log access
- Test Loki connectivity from Promtail
- Monitor positions file for read progress
- Debug pipelines with dry-run mode
- Monitor Promtail metrics for issues
- Use the targets endpoint to verify discovery
