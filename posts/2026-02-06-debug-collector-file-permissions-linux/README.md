# How to Debug Collector File Permissions Issues on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Troubleshooting, Linux, Permissions, Security, SELinux

Description: A comprehensive guide to diagnosing and fixing file permission issues in OpenTelemetry Collector on Linux, covering common errors, security contexts, user permissions, and production best practices.

---

File permission issues are a common source of frustration when running the OpenTelemetry Collector on Linux. The Collector needs to read configuration files, write queue data to disk, create log files, and sometimes read host metrics. When permissions are wrong, you'll see cryptic "permission denied" errors that can be hard to debug.

This guide covers how to identify permission problems, understand Linux file permissions and security contexts, and configure the Collector with appropriate permissions for production environments.

---

## Common Permission Errors

You'll know you have permission issues when you see errors like:

```bash
# Config file read errors
Error: failed to read config: open /etc/otelcol/config.yaml: permission denied

# Queue storage errors
Error: failed to initialize storage: mkdir /var/lib/otelcol: permission denied

# Log file errors
Error: failed to open log file: open /var/log/otelcol/collector.log: permission denied

# Host metrics errors
Error: failed to scrape filesystem metrics: open /proc/diskstats: permission denied
```

---

## Understanding Linux Permissions

Linux file permissions have three components:

1. **User (owner)**: Permissions for the file owner
2. **Group**: Permissions for the group
3. **Other**: Permissions for everyone else

Each component has three permissions:
- **r (read)**: Can read file content or list directory
- **w (write)**: Can modify file or create/delete files in directory
- **x (execute)**: Can execute file or enter directory

```bash
# View file permissions
ls -l /etc/otelcol/config.yaml

# Example output:
# -rw-r--r-- 1 root root 4096 Feb 06 10:00 config.yaml
# │││││││││  │ │    │    │    │            └─ filename
# │││││││││  │ │    │    │    └─ modification time
# │││││││││  │ │    │    └─ size in bytes
# │││││││││  │ │    └─ group owner
# │││││││││  │ └─ user owner
# │││││││││  └─ number of hard links
# ││││││││└─ other permissions (r--)
# │││││││└─ group permissions (r--)
# ││││││└─ user permissions (rw-)
# │││││└─ special permissions
# ││││└─ directory (d) or regular file (-)
```

---

## Diagnostic Steps

### Step 1: Check Collector Process User

First, identify which user the Collector is running as:

```bash
# Find Collector process
ps aux | grep otelcol

# Output shows user in first column:
# otelcol  12345  0.5  2.1  500000 43000  ?  Ssl  10:00  0:05  /usr/local/bin/otelcol --config=/etc/otelcol/config.yaml

# Or use systemd
systemctl status otelcol-collector
# Look for "Main PID" and "User" in output
```

### Step 2: Check File Ownership and Permissions

Check who owns the files and what permissions they have:

```bash
# Check config file
ls -l /etc/otelcol/config.yaml

# Check data directory
ls -ld /var/lib/otelcol

# Check log directory
ls -ld /var/log/otelcol

# Check recursively
ls -lR /etc/otelcol/
```

### Step 3: Test File Access

Try accessing files as the Collector user:

```bash
# Switch to Collector user
sudo -u otelcol bash

# Try reading config
cat /etc/otelcol/config.yaml

# Try writing to data directory
touch /var/lib/otelcol/test.txt

# Try writing to log directory
touch /var/log/otelcol/test.log

# Exit back to your user
exit
```

### Step 4: Check SELinux Context

On RHEL/CentOS/Fedora, SELinux may be blocking access:

```bash
# Check if SELinux is enabled
getenforce
# Output: Enforcing, Permissive, or Disabled

# Check SELinux context of files
ls -Z /etc/otelcol/config.yaml

# Example output:
# -rw-r--r--. otelcol otelcol system_u:object_r:etc_t:s0 config.yaml

# Check process context
ps -efZ | grep otelcol

# Check for SELinux denials
sudo ausearch -m avc -ts recent | grep otelcol

# Or check audit log
sudo grep otelcol /var/log/audit/audit.log | grep denied
```

---

## Common Scenarios and Fixes

### Scenario 1: Cannot Read Configuration File

**Error:**
```
Error: failed to read config: open /etc/otelcol/config.yaml: permission denied
```

**Diagnosis:**
```bash
# Check file permissions
ls -l /etc/otelcol/config.yaml
# -rw------- 1 root root 4096 Feb 06 10:00 config.yaml

# Collector running as user 'otelcol' cannot read this file
```

**Fix Option 1 - Change Ownership:**
```bash
# Make otelcol user the owner
sudo chown otelcol:otelcol /etc/otelcol/config.yaml

# Set appropriate permissions
sudo chmod 640 /etc/otelcol/config.yaml
# 640 = owner can read/write, group can read, others cannot access
```

**Fix Option 2 - Add User to Group:**
```bash
# If file is owned by root:otelcol
sudo usermod -a -G otelcol otelcol

# Ensure group can read
sudo chmod 640 /etc/otelcol/config.yaml
```

**Fix Option 3 - Make Config World-Readable:**
```bash
# Only if config contains no secrets
sudo chmod 644 /etc/otelcol/config.yaml
# 644 = owner can read/write, everyone can read
```

**Best Practice - Keep Secrets Separate:**
```yaml
# config.yaml
exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      # Reference env var instead of hardcoding secret
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
```

```bash
# Store secret in environment file with restricted permissions
sudo tee /etc/otelcol/env > /dev/null <<EOF
ONEUPTIME_TOKEN=your-secret-token
EOF

sudo chown otelcol:otelcol /etc/otelcol/env
sudo chmod 400 /etc/otelcol/env
# 400 = only owner can read

# Update systemd to load env file
sudo tee /etc/systemd/system/otelcol.service.d/override.conf > /dev/null <<EOF
[Service]
EnvironmentFile=/etc/otelcol/env
EOF

sudo systemctl daemon-reload
sudo systemctl restart otelcol
```

### Scenario 2: Cannot Write to Data Directory

**Error:**
```
Error: failed to initialize storage: mkdir /var/lib/otelcol/queue: permission denied
```

**Diagnosis:**
```bash
# Check directory permissions
ls -ld /var/lib/otelcol
# drwxr-xr-x 2 root root 4096 Feb 06 10:00 /var/lib/otelcol

# Collector needs write permission
```

**Fix - Set Correct Ownership:**
```bash
# Create directory if it doesn't exist
sudo mkdir -p /var/lib/otelcol/queue

# Change ownership to collector user
sudo chown -R otelcol:otelcol /var/lib/otelcol

# Set appropriate permissions
sudo chmod 750 /var/lib/otelcol
# 750 = owner full, group read/execute, others none

sudo chmod 750 /var/lib/otelcol/queue
```

**Update Configuration:**
```yaml
extensions:
  file_storage:
    # Ensure path is writable by Collector user
    directory: /var/lib/otelcol/queue
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    sending_queue:
      enabled: true
      storage: file_storage  # References extension above
```

### Scenario 3: Cannot Create Log Files

**Error:**
```
Error: failed to open log file: open /var/log/otelcol/collector.log: permission denied
```

**Fix - Create Log Directory with Correct Permissions:**
```bash
# Create log directory
sudo mkdir -p /var/log/otelcol

# Set ownership
sudo chown otelcol:otelcol /var/log/otelcol

# Set permissions (owner can write, group can read)
sudo chmod 750 /var/log/otelcol

# Create log file with correct permissions
sudo touch /var/log/otelcol/collector.log
sudo chown otelcol:otelcol /var/log/otelcol/collector.log
sudo chmod 640 /var/log/otelcol/collector.log
```

**Configure Log Rotation:**
```bash
# Create logrotate config
sudo tee /etc/logrotate.d/otelcol > /dev/null <<'EOF'
/var/log/otelcol/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 otelcol otelcol
    sharedscripts
    postrotate
        # Signal Collector to reopen log files
        systemctl reload otelcol 2>/dev/null || true
    endscript
}
EOF
```

### Scenario 4: Cannot Read Host Metrics

**Error:**
```
Error: failed to scrape metrics: open /proc/diskstats: permission denied
```

**Context:**
When Collector needs to read host-level metrics (CPU, memory, disk), it needs access to `/proc` and `/sys`.

**Fix for Systemd Services:**
```bash
# Edit systemd service
sudo systemctl edit otelcol

# Add these directives
[Service]
# Allow reading /proc files
ProtectSystem=true
# Allow reading /sys files
ProtectHome=true
# Don't restrict /proc access
PrivateTmp=false

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart otelcol
```

**Fix for Docker/Containers:**
```yaml
# docker-compose.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      # Mount host /proc as read-only
      - /proc:/host/proc:ro
      # Mount host /sys as read-only
      - /sys:/host/sys:ro
    environment:
      # Tell Collector where to find host proc
      - HOST_PROC=/host/proc
      - HOST_SYS=/host/sys
```

```yaml
# Collector config for host metrics
receivers:
  hostmetrics:
    collection_interval: 30s
    root_path: /host
    scrapers:
      cpu:
      disk:
      filesystem:
      memory:
      network:
```

### Scenario 5: SELinux Blocking Access

**Error:**
```
Error: permission denied
# But file permissions look correct
```

**Diagnosis:**
```bash
# Check for SELinux denials
sudo ausearch -m avc -ts recent | grep otelcol

# Example output:
# type=AVC msg=audit(1612345678.123:456): avc: denied { write } for pid=12345 comm="otelcol" name="queue" dev="dm-0" ino=98765 scontext=system_u:system_r:unconfined_service_t:s0 tcontext=system_u:object_r:var_lib_t:s0 tclass=dir permissive=0
```

**Fix Option 1 - Set Correct Context:**
```bash
# Check current context
ls -Z /var/lib/otelcol

# Set appropriate context
sudo semanage fcontext -a -t usr_t "/var/lib/otelcol(/.*)?"
sudo restorecon -Rv /var/lib/otelcol

# For log directory
sudo semanage fcontext -a -t var_log_t "/var/log/otelcol(/.*)?"
sudo restorecon -Rv /var/log/otelcol
```

**Fix Option 2 - Create Custom Policy:**
```bash
# Generate policy from denials
sudo ausearch -m avc -ts recent | grep otelcol | audit2allow -M otelcol_custom

# Review the policy
cat otelcol_custom.te

# Apply the policy
sudo semodule -i otelcol_custom.pp
```

**Fix Option 3 - Temporarily Disable (NOT for production):**
```bash
# Set SELinux to permissive mode
sudo setenforce 0

# Test if issue is resolved
sudo systemctl restart otelcol

# If resolved, create proper policy (Option 2)
# Then re-enable
sudo setenforce 1
```

---

## Production Setup with Correct Permissions

Here's a complete setup for production Linux deployment:

### 1. Create Dedicated User and Group

```bash
# Create system user and group (no login shell)
sudo useradd -r -M -s /sbin/nologin otelcol

# Verify creation
id otelcol
# uid=995(otelcol) gid=993(otelcol) groups=993(otelcol)
```

### 2. Create Directory Structure

```bash
# Configuration directory
sudo mkdir -p /etc/otelcol
sudo chown root:otelcol /etc/otelcol
sudo chmod 750 /etc/otelcol

# Data directory
sudo mkdir -p /var/lib/otelcol/queue
sudo chown -R otelcol:otelcol /var/lib/otelcol
sudo chmod 750 /var/lib/otelcol

# Log directory
sudo mkdir -p /var/log/otelcol
sudo chown otelcol:otelcol /var/log/otelcol
sudo chmod 750 /var/log/otelcol

# Binary location
sudo cp otelcol /usr/local/bin/
sudo chown root:root /usr/local/bin/otelcol
sudo chmod 755 /usr/local/bin/otelcol
```

### 3. Set File Permissions

```bash
# Config file (readable by root and otelcol group)
sudo chown root:otelcol /etc/otelcol/config.yaml
sudo chmod 640 /etc/otelcol/config.yaml

# Environment file with secrets (only owner can read)
sudo chown otelcol:otelcol /etc/otelcol/env
sudo chmod 400 /etc/otelcol/env
```

### 4. Create Systemd Service

```bash
# Create service file
sudo tee /etc/systemd/system/otelcol.service > /dev/null <<'EOF'
[Unit]
Description=OpenTelemetry Collector
Documentation=https://opentelemetry.io/docs/collector/
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=otelcol
Group=otelcol

# Load environment variables from file
EnvironmentFile=/etc/otelcol/env

# Collector binary and config
ExecStart=/usr/local/bin/otelcol \
    --config=/etc/otelcol/config.yaml

# Restart on failure
Restart=always
RestartSec=10s

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/otelcol /var/log/otelcol

# Capabilities (if needed for host metrics)
AmbientCapabilities=CAP_SYS_PTRACE CAP_DAC_READ_SEARCH

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=otelcol

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable otelcol
sudo systemctl start otelcol

# Check status
sudo systemctl status otelcol
```

### 5. Verify Permissions

```bash
# Verify everything is correct
sudo -u otelcol cat /etc/otelcol/config.yaml  # Should work
sudo -u otelcol touch /var/lib/otelcol/test   # Should work
sudo -u otelcol touch /var/log/otelcol/test   # Should work

# Check process
ps aux | grep otelcol
# Should show User=otelcol

# Check open files
sudo lsof -u otelcol
```

---

## Kubernetes Permissions

In Kubernetes, file permissions work differently with SecurityContext:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
          http:
    exporters:
      otlphttp:
        endpoint: https://oneuptime.com/otlp
    service:
      pipelines:
        traces:
          receivers: [otlp]
          exporters: [otlphttp]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: observability
spec:
  template:
    spec:
      # Run as non-root user
      securityContext:
        runAsUser: 10001
        runAsGroup: 10001
        fsGroup: 10001
        # Prevent privilege escalation
        seccompProfile:
          type: RuntimeDefault

      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest

        # Container-level security
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          capabilities:
            drop:
              - ALL

        volumeMounts:
        - name: config
          mountPath: /etc/otelcol
          readOnly: true
        # Writable volume for queue
        - name: queue-storage
          mountPath: /var/lib/otelcol
        # Writable tmp
        - name: tmp
          mountPath: /tmp

      volumes:
      - name: config
        configMap:
          name: otel-collector-config
          defaultMode: 0640
      - name: queue-storage
        persistentVolumeClaim:
          claimName: otel-queue
      - name: tmp
        emptyDir: {}
```

**For Host Metrics in Kubernetes:**
```yaml
# Need privileged access to read host /proc
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector-host
spec:
  template:
    spec:
      # Host metrics require host access
      hostPID: true
      hostNetwork: true

      containers:
      - name: otel-collector
        securityContext:
          privileged: true  # Required for host metrics
        volumeMounts:
        - name: host-proc
          mountPath: /host/proc
          readOnly: true
        - name: host-sys
          mountPath: /host/sys
          readOnly: true

      volumes:
      - name: host-proc
        hostPath:
          path: /proc
      - name: host-sys
        hostPath:
          path: /sys
```

---

## Troubleshooting Checklist

When you encounter permission errors:

1. **Identify the error** - Read the full error message
2. **Check process user** - `ps aux | grep otelcol`
3. **Check file ownership** - `ls -l /path/to/file`
4. **Check file permissions** - Look for r, w, x bits
5. **Test access** - `sudo -u otelcol cat /path/to/file`
6. **Check SELinux** - `ausearch -m avc | grep otelcol`
7. **Check AppArmor** - `dmesg | grep -i apparmor | grep otelcol`
8. **Review systemd** - `systemctl status otelcol`
9. **Check logs** - `journalctl -u otelcol -n 100`

---

## Security Best Practices

1. **Run as non-root user** - Never run Collector as root
2. **Minimal permissions** - Only grant necessary permissions
3. **Separate secrets** - Store credentials in environment files with 400 permissions
4. **Use SecurityContext** - In Kubernetes, always set securityContext
5. **Enable SELinux/AppArmor** - Don't disable for convenience
6. **Regular audits** - Periodically review file permissions
7. **Principle of least privilege** - Grant minimum required access

---

## Related Resources

- [How to Fix Collector Connection Refused on OTLP Ports](https://oneuptime.com/blog/post/2026-02-06-fix-collector-connection-refused-otlp-ports/view)
- [How to Troubleshoot Collector Pipeline Blocked Errors](https://oneuptime.com/blog/post/2026-02-06-troubleshoot-collector-pipeline-blocked-errors/view)
- [How to Fix Invalid Configuration Errors in Collector](https://oneuptime.com/blog/post/2026-02-06-fix-invalid-configuration-errors-collector/view)

---

## Summary

File permission issues in OpenTelemetry Collector on Linux typically involve:

1. Config files not readable by Collector user
2. Data directories not writable
3. Log directories not accessible
4. SELinux or AppArmor blocking access
5. Missing capabilities for host metrics

Fix permission issues by:
- Running Collector as dedicated non-root user
- Setting correct ownership (chown) and permissions (chmod)
- Configuring SELinux contexts properly
- Using systemd security features
- Following the principle of least privilege

Always test permissions before deploying to production and maintain security hardening while ensuring functionality.

[OneUptime](https://oneuptime.com) provides managed OpenTelemetry Collector hosting with security best practices built in.
