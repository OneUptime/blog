# How to Use Docker Bench Security to Harden Your Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Security, Benchmarking, CIS, Hardening, Compliance, DevOps, Audit

Description: Learn how to run Docker Bench for Security to audit your Docker installation against CIS benchmarks and fix the most common security findings.

---

Docker Bench for Security is an open source script that checks your Docker installation against the CIS Docker Benchmark. It inspects the host configuration, Docker daemon settings, container runtime parameters, and image configurations. Within minutes, you get a report that tells you exactly where your setup falls short and what to fix.

## What Is the CIS Docker Benchmark?

The Center for Internet Security (CIS) publishes benchmarks for hardening various technologies. The Docker benchmark covers over 100 security recommendations grouped into seven categories:

1. Host Configuration
2. Docker Daemon Configuration
3. Docker Daemon Configuration Files
4. Container Images and Build File
5. Container Runtime
6. Docker Security Operations
7. Docker Swarm Configuration

Each recommendation is classified as either "Scored" (counts toward your security score) or "Not Scored" (advisory). Docker Bench automates the checking of these recommendations.

## Running Docker Bench

Docker Bench runs as a container itself. It needs access to the Docker socket and various host paths to inspect the configuration:

```bash
# Clone the repository
git clone https://github.com/docker/docker-bench-security.git
cd docker-bench-security

# Run with the provided script
sudo sh docker-bench-security.sh
```

Or run it directly as a container:

```bash
# Run Docker Bench for Security as a container
docker run --rm --net host --pid host --userns host --cap-add audit_control \
  -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
  -v /etc:/etc:ro \
  -v /usr/bin/containerd:/usr/bin/containerd:ro \
  -v /usr/bin/runc:/usr/bin/runc:ro \
  -v /usr/lib/systemd:/usr/lib/systemd:ro \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  docker/docker-bench-security
```

The output is color-coded: green for PASS, red for WARN, blue for INFO, and yellow for NOTE.

## Understanding the Output

A typical run produces output like this:

```
[INFO] 1 - Host Configuration
[WARN] 1.1.1 - Ensure a separate partition for containers has been created
[PASS] 1.1.2 - Ensure only trusted users are allowed to control Docker daemon
[WARN] 1.1.3 - Ensure auditing is configured for the Docker daemon
...
[INFO] 2 - Docker daemon configuration
[WARN] 2.1 - Run the Docker daemon as a non-root user
[WARN] 2.2 - Ensure network traffic is restricted between containers
[PASS] 2.3 - Ensure the logging level is set to 'info'
...
```

Each check has a number corresponding to the CIS benchmark section. Let's walk through the most impactful fixes.

## Fixing Common Warnings

### 1.1.1 - Separate Partition for Containers

Docker stores images, containers, and volumes in `/var/lib/docker`. On a shared partition, a runaway container can fill the disk and crash the host.

```bash
# Check current Docker data directory
docker info | grep "Docker Root Dir"

# Create a dedicated partition (example with LVM)
sudo lvcreate -L 100G -n docker vg0
sudo mkfs.xfs /dev/vg0/docker

# Mount it at /var/lib/docker
echo '/dev/vg0/docker /var/lib/docker xfs defaults 0 0' | sudo tee -a /etc/fstab
sudo mount -a

# Restart Docker
sudo systemctl restart docker
```

### 2.2 - Restrict Inter-Container Network Traffic

By default, all containers on the same bridge network can communicate. Disable this and use explicit networking:

```json
{
  "icc": false
}
```

Save this to `/etc/docker/daemon.json` (or merge with existing settings):

```bash
# Edit the daemon configuration
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "icc": false,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker
sudo systemctl restart docker
```

With ICC disabled, containers must use user-defined networks with explicit links or service discovery to communicate.

### 2.4 - Ensure Docker Is Allowed to Make Changes to iptables

Docker needs iptables access for port mapping and inter-container communication:

```json
{
  "iptables": true
}
```

### 2.8 - Enable User Namespace Support

User namespace remapping prevents container root from being host root:

```json
{
  "userns-remap": "default"
}
```

### 2.11 - Enable Live Restore

Live restore keeps containers running during daemon upgrades:

```json
{
  "live-restore": true
}
```

### Comprehensive daemon.json

Combine the recommended settings into a single configuration:

```bash
# Comprehensive hardened daemon.json
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "icc": false,
  "userns-remap": "default",
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  },
  "storage-driver": "overlay2",
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    },
    "nproc": {
      "Name": "nproc",
      "Hard": 4096,
      "Soft": 4096
    }
  }
}
EOF

sudo systemctl restart docker
```

## Section 3: Docker Daemon Configuration Files

These checks verify file permissions on Docker-related configuration files:

```bash
# Fix file permissions for Docker configuration files
# 3.1 - docker.service file permissions
sudo chmod 644 /usr/lib/systemd/system/docker.service

# 3.2 - docker.socket file permissions
sudo chmod 644 /usr/lib/systemd/system/docker.socket

# 3.3 - /etc/docker directory permissions
sudo chmod 755 /etc/docker

# 3.4 - Registry certificate permissions
if [ -d /etc/docker/certs.d ]; then
    sudo chmod 444 /etc/docker/certs.d/*/*
fi

# 3.15 - daemon.json file permissions
sudo chmod 644 /etc/docker/daemon.json

# 3.17 - Docker socket file permissions
sudo chmod 660 /var/run/docker.sock
sudo chgrp docker /var/run/docker.sock
```

## Section 4: Container Images and Build Files

These recommendations affect how you build images:

```dockerfile
# 4.1 - Create a user for the container (do not run as root)
FROM node:20-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --chown=appuser:appgroup . .
USER appuser
CMD ["node", "server.js"]

# 4.6 - Add HEALTHCHECK instruction
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1
```

## Section 5: Container Runtime

Runtime checks verify how containers are launched. Fix these by changing your `docker run` commands:

```bash
# 5.1 - Do not disable AppArmor profile
docker run -d --security-opt apparmor=docker-default myapp:latest

# 5.2 - Ensure SELinux security options are set (if SELinux is enabled)
docker run -d --security-opt label=level:s0:c100,c200 myapp:latest

# 5.4 - Do not run containers in privileged mode
# BAD:
docker run -d --privileged myapp:latest
# GOOD:
docker run -d --cap-drop ALL --cap-add NET_BIND_SERVICE myapp:latest

# 5.10 - Set memory limits
docker run -d --memory=512m --memory-swap=1g myapp:latest

# 5.11 - Set CPU limits
docker run -d --cpus=1.0 myapp:latest

# 5.12 - Mount root filesystem as read-only
docker run -d --read-only --tmpfs /tmp myapp:latest

# 5.25 - Restrict container from acquiring additional privileges
docker run -d --security-opt no-new-privileges myapp:latest

# 5.28 - Ensure PIDs cgroup limit is set
docker run -d --pids-limit 100 myapp:latest
```

Combine these into a Docker Compose service:

```yaml
# docker-compose.yml with hardened runtime settings
services:
  app:
    image: myapp:latest
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
      - apparmor:docker-default
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
          pids: 100
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

## Automating Audits in CI/CD

Run Docker Bench as part of your infrastructure testing:

```yaml
# .github/workflows/security-audit.yml
name: Docker Security Audit
on:
  schedule:
    - cron: "0 6 * * 1"  # Weekly on Monday at 6 AM
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Run Docker Bench Security
        run: |
          docker run --rm --net host --pid host --userns host \
            --cap-add audit_control \
            -v /etc:/etc:ro \
            -v /var/lib:/var/lib:ro \
            -v /var/run/docker.sock:/var/run/docker.sock:ro \
            docker/docker-bench-security 2>&1 | tee bench-results.txt

      - name: Check for Critical Warnings
        run: |
          WARN_COUNT=$(grep -c "\[WARN\]" bench-results.txt || true)
          echo "Total warnings: $WARN_COUNT"
          if [ "$WARN_COUNT" -gt 20 ]; then
            echo "Too many security warnings. Review the results."
            exit 1
          fi

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: docker-bench-results
          path: bench-results.txt
```

## Tracking Progress Over Time

Save benchmark results in a structured format and track improvements:

```bash
# Run Docker Bench and save results as JSON
docker run --rm --net host --pid host --userns host \
  --cap-add audit_control \
  -v /etc:/etc:ro \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  docker/docker-bench-security -l /dev/stdout 2>/dev/null | \
  grep -E '(PASS|WARN|INFO|NOTE)' | \
  awk '{print $1, $2, $3}' > bench-summary.txt

# Count results
echo "PASS: $(grep -c PASS bench-summary.txt)"
echo "WARN: $(grep -c WARN bench-summary.txt)"
echo "INFO: $(grep -c INFO bench-summary.txt)"
```

## Wrapping Up

Docker Bench for Security gives you a concrete, actionable list of hardening tasks. Run it on every Docker host, fix the high-priority warnings first (daemon configuration, container runtime settings, and file permissions), and schedule regular audits. Most fixes are configuration changes that take minutes to apply but significantly improve your security posture.
