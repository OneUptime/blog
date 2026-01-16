# How to Audit Docker with CIS Benchmarks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Security, CIS, Benchmarks, Compliance

Description: Learn how to audit Docker installations using CIS (Center for Internet Security) benchmarks, automate compliance checks with Docker Bench, and remediate common security findings.

---

The CIS Docker Benchmark provides prescriptive guidance for establishing a secure configuration for Docker. This guide covers auditing Docker environments, understanding benchmark recommendations, and automating compliance checks.

## Understanding CIS Benchmarks

The CIS Docker Benchmark is organized into sections:

```
CIS Docker Benchmark Structure
┌────────────────────────────────────────────────────────────┐
│ 1. Host Configuration                                       │
│    - Kernel parameters, audit rules                        │
├────────────────────────────────────────────────────────────┤
│ 2. Docker Daemon Configuration                             │
│    - TLS, authorization, logging                           │
├────────────────────────────────────────────────────────────┤
│ 3. Docker Daemon Configuration Files                       │
│    - File permissions, ownership                           │
├────────────────────────────────────────────────────────────┤
│ 4. Container Images and Build Files                        │
│    - Base images, users, secrets                           │
├────────────────────────────────────────────────────────────┤
│ 5. Container Runtime                                        │
│    - Capabilities, mounts, resources                       │
├────────────────────────────────────────────────────────────┤
│ 6. Docker Security Operations                              │
│    - Monitoring, incident response                         │
├────────────────────────────────────────────────────────────┤
│ 7. Docker Swarm Configuration                              │
│    - Cluster security settings                             │
└────────────────────────────────────────────────────────────┘
```

## Docker Bench for Security

### Running Docker Bench

```bash
# Run Docker Bench Security
docker run --rm --net host --pid host --userns host --cap-add audit_control \
  -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
  -v /etc:/etc:ro \
  -v /usr/bin/containerd:/usr/bin/containerd:ro \
  -v /usr/bin/runc:/usr/bin/runc:ro \
  -v /usr/lib/systemd:/usr/lib/systemd:ro \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --label docker_bench_security \
  docker/docker-bench-security
```

### Docker Compose for Bench

```yaml
# docker-compose.bench.yml
version: '3.8'

services:
  docker-bench:
    image: docker/docker-bench-security
    cap_add:
      - audit_control
    network_mode: host
    pid: host
    userns_mode: host
    volumes:
      - /etc:/etc:ro
      - /usr/bin/containerd:/usr/bin/containerd:ro
      - /usr/bin/runc:/usr/bin/runc:ro
      - /usr/lib/systemd:/usr/lib/systemd:ro
      - /var/lib:/var/lib:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    labels:
      - docker_bench_security
```

### Output Formats

```bash
# JSON output
docker run --rm ... docker/docker-bench-security -l /output/bench.log

# Check specific sections
docker run --rm ... docker/docker-bench-security -c container_images
docker run --rm ... docker/docker-bench-security -c container_runtime

# Available sections:
# host_configuration
# docker_daemon_configuration
# docker_daemon_configuration_files
# container_images
# container_runtime
# docker_security_operations
# docker_swarm_configuration
```

## Key Benchmark Recommendations

### Section 1: Host Configuration

#### 1.1 - Keep Docker Updated

```bash
# Check Docker version
docker version

# Update Docker (Ubuntu/Debian)
sudo apt-get update && sudo apt-get install docker-ce docker-ce-cli containerd.io
```

#### 1.2 - Create Separate Partition for Docker

```bash
# Check Docker root directory
docker info | grep "Docker Root Dir"

# Mount separate partition (in /etc/fstab)
# /dev/sdb1  /var/lib/docker  ext4  defaults  0  2
```

#### 1.3 - Audit Docker Files

```bash
# Add audit rules for Docker
sudo tee /etc/audit/rules.d/docker.rules << 'EOF'
-w /usr/bin/dockerd -k docker
-w /var/lib/docker -k docker
-w /etc/docker -k docker
-w /usr/lib/systemd/system/docker.service -k docker
-w /usr/lib/systemd/system/docker.socket -k docker
-w /etc/default/docker -k docker
-w /etc/docker/daemon.json -k docker
-w /usr/bin/containerd -k docker
-w /usr/bin/runc -k docker
EOF

# Reload audit rules
sudo auditctl -R /etc/audit/rules.d/docker.rules
```

### Section 2: Docker Daemon Configuration

#### 2.1 - Enable TLS Authentication

```json
// /etc/docker/daemon.json
{
  "tls": true,
  "tlscacert": "/etc/docker/certs/ca.pem",
  "tlscert": "/etc/docker/certs/server-cert.pem",
  "tlskey": "/etc/docker/certs/server-key.pem",
  "tlsverify": true,
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2376"]
}
```

#### 2.2 - Configure Logging

```json
// /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

#### 2.3 - Enable User Namespace Remapping

```json
// /etc/docker/daemon.json
{
  "userns-remap": "default"
}
```

```bash
# Verify user namespace
cat /etc/subuid
cat /etc/subgid
```

#### 2.4 - Disable Legacy Registry

```json
// /etc/docker/daemon.json
{
  "disable-legacy-registry": true
}
```

#### 2.5 - Enable Live Restore

```json
// /etc/docker/daemon.json
{
  "live-restore": true
}
```

### Section 3: Docker Daemon Configuration Files

#### 3.1 - Set Ownership and Permissions

```bash
# Docker socket
sudo chown root:docker /var/run/docker.sock
sudo chmod 660 /var/run/docker.sock

# Docker daemon config
sudo chown root:root /etc/docker/daemon.json
sudo chmod 644 /etc/docker/daemon.json

# Docker service file
sudo chown root:root /usr/lib/systemd/system/docker.service
sudo chmod 644 /usr/lib/systemd/system/docker.service

# Docker data directory
sudo chown root:root /var/lib/docker
sudo chmod 710 /var/lib/docker
```

### Section 4: Container Images

#### 4.1 - Create Non-Root User

```dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -D appuser

WORKDIR /app
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

CMD ["node", "app.js"]
```

#### 4.2 - Use COPY Instead of ADD

```dockerfile
# Good - COPY is explicit
COPY package.json ./

# Avoid - ADD has extra features that may be misused
# ADD http://example.com/file.tar.gz /app/
```

#### 4.3 - Don't Store Secrets in Dockerfiles

```dockerfile
# Bad - secrets in build
ARG DB_PASSWORD
ENV DB_PASSWORD=$DB_PASSWORD

# Good - use runtime secrets
# Pass secrets at runtime or use secret management
```

#### 4.4 - Include HEALTHCHECK

```dockerfile
FROM nginx

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1
```

### Section 5: Container Runtime

#### 5.1 - AppArmor Profile

```bash
# Run with AppArmor
docker run --security-opt apparmor=docker-default nginx
```

#### 5.2 - SELinux Labels

```bash
# Run with SELinux
docker run --security-opt label=type:container_t nginx
```

#### 5.3 - Drop Capabilities

```bash
# Drop all, add only needed
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE nginx
```

#### 5.4 - No New Privileges

```bash
docker run --security-opt=no-new-privileges:true nginx
```

#### 5.5 - Read-Only Root Filesystem

```bash
docker run --read-only --tmpfs /var/cache/nginx --tmpfs /var/run nginx
```

#### 5.6 - Limit Resources

```bash
docker run \
  --memory=512m \
  --memory-swap=512m \
  --cpus=1 \
  --pids-limit=100 \
  nginx
```

## Complete Secure Configuration

### Daemon Configuration

```json
// /etc/docker/daemon.json
{
  "icc": false,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "storage-driver": "overlay2",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65535,
      "Soft": 65535
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 4096,
      "Soft": 4096
    }
  }
}
```

### Secure Container Launch

```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    read_only: true
    tmpfs:
      - /tmp:size=100M,noexec,nosuid
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
      - apparmor:docker-default
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1'
          pids: 100
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    user: "1000:1000"
    networks:
      - internal

networks:
  internal:
    internal: true
```

## Automated Compliance

### CI/CD Integration

```yaml
# .github/workflows/security-bench.yml
name: Docker Security Benchmark

on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  bench:
    runs-on: ubuntu-latest
    steps:
      - name: Run Docker Bench
        run: |
          docker run --rm \
            --net host --pid host --userns host \
            --cap-add audit_control \
            -v /etc:/etc:ro \
            -v /var/lib:/var/lib:ro \
            -v /var/run/docker.sock:/var/run/docker.sock:ro \
            docker/docker-bench-security \
            -l /dev/stdout 2>&1 | tee bench-results.txt

      - name: Check for Failures
        run: |
          if grep -q "\[WARN\]" bench-results.txt; then
            echo "Security warnings found"
            exit 1
          fi

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: docker-bench-results
          path: bench-results.txt
```

### Ansible Remediation

```yaml
# docker-cis-hardening.yml
---
- name: Docker CIS Hardening
  hosts: docker_hosts
  become: yes

  tasks:
    - name: Configure Docker daemon
      copy:
        content: |
          {
            "icc": false,
            "log-driver": "json-file",
            "log-opts": {
              "max-size": "10m",
              "max-file": "3"
            },
            "live-restore": true,
            "userland-proxy": false,
            "no-new-privileges": true
          }
        dest: /etc/docker/daemon.json
        mode: '0644'
      notify: Restart Docker

    - name: Set Docker socket permissions
      file:
        path: /var/run/docker.sock
        owner: root
        group: docker
        mode: '0660'

    - name: Enable audit rules for Docker
      copy:
        content: |
          -w /usr/bin/dockerd -k docker
          -w /var/lib/docker -k docker
          -w /etc/docker -k docker
        dest: /etc/audit/rules.d/docker.rules
      notify: Reload audit rules

  handlers:
    - name: Restart Docker
      service:
        name: docker
        state: restarted

    - name: Reload audit rules
      command: auditctl -R /etc/audit/rules.d/docker.rules
```

## Compliance Reporting

### Generate Compliance Report

```bash
#!/bin/bash
# generate-report.sh

OUTPUT_DIR="/var/log/docker-compliance"
DATE=$(date +%Y%m%d)
REPORT="${OUTPUT_DIR}/docker-bench-${DATE}.json"

mkdir -p "$OUTPUT_DIR"

docker run --rm \
  --net host --pid host --userns host \
  --cap-add audit_control \
  -v /etc:/etc:ro \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v "${OUTPUT_DIR}:/output" \
  docker/docker-bench-security \
  --json-output-file "/output/docker-bench-${DATE}.json"

# Generate summary
jq '{
  date: now | strftime("%Y-%m-%d"),
  total_checks: .checks | length,
  passed: [.checks[] | select(.result == "PASS")] | length,
  warnings: [.checks[] | select(.result == "WARN")] | length,
  info: [.checks[] | select(.result == "INFO")] | length,
  failures: [.checks[] | select(.result == "WARN")] | .[].desc
}' "$REPORT" > "${OUTPUT_DIR}/summary-${DATE}.json"
```

### Monitoring with Prometheus

```yaml
# prometheus-docker-bench.yml
# Use docker-bench-security exporter
version: '3.8'

services:
  bench-exporter:
    image: alexeiled/docker-bench-metrics
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /etc:/etc:ro
      - /var/lib:/var/lib:ro
    ports:
      - "9011:9011"
```

## Summary

| Section | Key Recommendations |
|---------|---------------------|
| Host | Separate partition, audit rules, update |
| Daemon | TLS, logging, user namespaces |
| Files | Ownership, permissions |
| Images | Non-root user, HEALTHCHECK, no secrets |
| Runtime | Drop caps, read-only, resource limits |
| Operations | Monitoring, incident response |

Regular CIS benchmark audits ensure your Docker environment maintains security best practices. Automate compliance checks in CI/CD pipelines, remediate findings promptly, and maintain documentation for audit purposes. For additional security hardening, see our posts on [Dropping Capabilities](https://oneuptime.com/blog/post/2026-01-16-docker-drop-capabilities/view) and [Read-Only Containers](https://oneuptime.com/blog/post/2026-01-16-docker-read-only-containers/view).

