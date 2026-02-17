# How to Fix Elasticsearch 'Too Many Open Files' Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, File Descriptors, Troubleshooting, Linux, System Configuration, Operations

Description: A comprehensive guide to fixing Elasticsearch 'too many open files' errors, covering file descriptor limits, system configuration, and monitoring best practices.

---

Elasticsearch requires a large number of file descriptors to operate efficiently, as it opens many files for indices, segments, network connections, and more. This guide covers diagnosing and resolving file descriptor limit issues.

## Understanding the Problem

Elasticsearch needs file descriptors for:

- Index segment files
- Transaction logs
- Network connections
- Memory-mapped files
- Inter-node communication

Default Linux limits (1024) are insufficient for Elasticsearch.

## Error Symptoms

### Common Error Messages

```
java.io.IOException: Too many open files

ElasticsearchException: Too many open files

max file descriptors [4096] for elasticsearch process is too low, increase to at least [65536]
```

### Log Entries

```
[WARN ][o.e.b.BootstrapChecks] max file descriptors [1024] for elasticsearch process is too low, increase to at least [65536]
```

## Checking Current Limits

### Check Elasticsearch Process Limits

```bash
# Find Elasticsearch PID
pgrep -f elasticsearch

# Check current limits for the process
cat /proc/$(pgrep -f elasticsearch)/limits | grep "Max open files"
```

### Check System-Wide Limits

```bash
# Current hard and soft limits
ulimit -Hn  # Hard limit
ulimit -Sn  # Soft limit

# System maximum
cat /proc/sys/fs/file-max

# Currently open files system-wide
cat /proc/sys/fs/file-nr
```

### Check Via Elasticsearch API

```bash
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/process?pretty" | jq '.nodes[].process.open_file_descriptors'

# Detailed process info
curl -u elastic:password -X GET "localhost:9200/_nodes/process?pretty"
```

## Setting File Descriptor Limits

### Method 1: /etc/security/limits.conf

Edit `/etc/security/limits.conf`:

```bash
# Add these lines
elasticsearch soft nofile 65536
elasticsearch hard nofile 65536
elasticsearch soft nproc 4096
elasticsearch hard nproc 4096

# Or for all users
* soft nofile 65536
* hard nofile 65536
```

Verify PAM is configured to read limits.conf:

```bash
# Check /etc/pam.d/common-session includes:
grep pam_limits /etc/pam.d/common-session

# Should contain:
session required pam_limits.so
```

### Method 2: /etc/security/limits.d/

Create `/etc/security/limits.d/elasticsearch.conf`:

```bash
elasticsearch - nofile 65536
elasticsearch - nproc 4096
```

### Method 3: Systemd Service Override

Create systemd override:

```bash
sudo mkdir -p /etc/systemd/system/elasticsearch.service.d
sudo nano /etc/systemd/system/elasticsearch.service.d/override.conf
```

Add:

```ini
[Service]
LimitNOFILE=65536
LimitNPROC=4096
LimitMEMLOCK=infinity
```

Apply changes:

```bash
sudo systemctl daemon-reload
sudo systemctl restart elasticsearch
```

### Method 4: Edit Elasticsearch Systemd Unit

Edit `/usr/lib/systemd/system/elasticsearch.service`:

```ini
[Service]
LimitNOFILE=65536
LimitNPROC=4096
LimitMEMLOCK=infinity
```

### Method 5: For Docker Containers

In docker-compose.yml:

```yaml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
      nproc:
        soft: 4096
        hard: 4096
      memlock:
        soft: -1
        hard: -1
```

Or with docker run:

```bash
docker run -d \
  --ulimit nofile=65536:65536 \
  --ulimit nproc=4096:4096 \
  --ulimit memlock=-1:-1 \
  elasticsearch:8.11.0
```

## System-Wide Configuration

### Increase System File-Max

Edit `/etc/sysctl.conf`:

```bash
# Maximum number of file handles
fs.file-max = 2097152

# Increase inotify limits
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 512
```

Apply changes:

```bash
sudo sysctl -p
```

### Virtual Memory Settings

Also recommended for Elasticsearch:

```bash
# /etc/sysctl.conf
vm.max_map_count = 262144
vm.swappiness = 1
```

## Verification

### Verify Limits After Restart

```bash
# Restart Elasticsearch
sudo systemctl restart elasticsearch

# Check new limits
cat /proc/$(pgrep -f elasticsearch)/limits | grep -E "open files|processes"

# Via API
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/process?pretty" | jq '.nodes[].process.max_file_descriptors'
```

### Expected Output

```
Max open files            65536                65536                files
Max processes             4096                 4096                 processes
```

### Check Bootstrap Checks

```bash
curl -u elastic:password -X GET "localhost:9200/_nodes/_local?pretty" | jq '.nodes[].settings.bootstrap'
```

## Monitoring File Descriptors

### Monitor Open Files

```bash
# Current open files by Elasticsearch
lsof -p $(pgrep -f elasticsearch) | wc -l

# Breakdown by type
lsof -p $(pgrep -f elasticsearch) | awk '{print $5}' | sort | uniq -c | sort -rn
```

### Set Up Alerting

Create monitoring script:

```bash
#!/bin/bash
ES_PID=$(pgrep -f elasticsearch)
OPEN_FILES=$(ls /proc/$ES_PID/fd 2>/dev/null | wc -l)
MAX_FILES=$(cat /proc/$ES_PID/limits | grep "Max open files" | awk '{print $4}')
USAGE_PCT=$((OPEN_FILES * 100 / MAX_FILES))

if [ $USAGE_PCT -gt 80 ]; then
    echo "WARNING: Elasticsearch file descriptor usage at ${USAGE_PCT}%"
    # Send alert
fi
```

### Prometheus Metrics

```bash
curl -u elastic:password -X GET "localhost:9200/_nodes/stats/process?pretty" | jq '
  .nodes | to_entries[] | {
    node: .key,
    open_fds: .value.process.open_file_descriptors,
    max_fds: .value.process.max_file_descriptors,
    pct: ((.value.process.open_file_descriptors / .value.process.max_file_descriptors) * 100 | floor)
  }'
```

## Troubleshooting

### Limits Not Taking Effect

Check if PAM is loading limits:

```bash
# Ensure this line exists in /etc/pam.d/common-session
session required pam_limits.so

# For su, also check /etc/pam.d/su
session required pam_limits.so
```

### Systemd Ignoring Limits

Systemd services don't read `/etc/security/limits.conf`. Use systemd overrides:

```bash
sudo systemctl edit elasticsearch

# Add:
[Service]
LimitNOFILE=65536
```

### SSH Sessions Not Getting Limits

Edit `/etc/ssh/sshd_config`:

```
UsePAM yes
```

Restart SSH:

```bash
sudo systemctl restart sshd
```

### Container Limits

For containers, limits must be set at container runtime, not inside the container.

## Best Practices

### 1. Recommended Values

| Setting | Recommended Value |
|---------|------------------|
| nofile | 65536 (minimum) |
| nproc | 4096 |
| memlock | unlimited |
| vm.max_map_count | 262144 |

### 2. Production Configuration

Create `/etc/elasticsearch/jvm.options.d/production.options`:

```
# Avoid file descriptor issues
-XX:+HeapDumpOnOutOfMemoryError
```

### 3. Regular Monitoring

Add to monitoring:
- Open file descriptor count
- File descriptor usage percentage
- Max file descriptors setting

### 4. Infrastructure as Code

Ansible example:

```yaml
- name: Configure file descriptor limits
  pam_limits:
    domain: elasticsearch
    limit_type: "{{ item.type }}"
    limit_item: nofile
    value: "65536"
  loop:
    - { type: 'soft' }
    - { type: 'hard' }

- name: Configure sysctl
  sysctl:
    name: "{{ item.name }}"
    value: "{{ item.value }}"
    state: present
    reload: yes
  loop:
    - { name: 'vm.max_map_count', value: '262144' }
    - { name: 'fs.file-max', value: '2097152' }
```

## Summary

Fixing "too many open files" errors in Elasticsearch requires:

1. **Understand the cause** - Elasticsearch needs many file descriptors
2. **Check current limits** - Both process and system-wide
3. **Configure appropriate limits** - At least 65536 for Elasticsearch
4. **Use correct method** - limits.conf for interactive, systemd for services
5. **Verify changes** - After restart, confirm new limits
6. **Monitor continuously** - Track file descriptor usage

With proper configuration, Elasticsearch can operate without file descriptor limitations affecting performance or stability.
