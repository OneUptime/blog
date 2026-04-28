# How to Run CIS Benchmarks with NeuVector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, CIS Benchmark, Kubernetes Security, Compliance, Container Security

Description: Run and interpret CIS Benchmark compliance checks for Docker and Kubernetes using NeuVector to harden your container infrastructure.

## Introduction

The Center for Internet Security (CIS) publishes detailed security benchmarks for Docker and Kubernetes. NeuVector automates these benchmark checks, running hundreds of security tests against your nodes and containers to identify misconfigurations. This guide explains how to run CIS Benchmarks with NeuVector and remediate the most common findings.

## CIS Benchmark Sections

NeuVector covers these CIS Benchmark sections:

**CIS Docker Benchmark:**
- Section 1: Host Configuration
- Section 2: Docker Daemon Configuration
- Section 3: Docker Daemon Files
- Section 4: Container Images and Build File
- Section 5: Container Runtime
- Section 6: Docker Security Operations

**CIS Kubernetes Benchmark:**
- Section 1: Control Plane Components
- Section 2: Etcd
- Section 3: Control Plane Configuration
- Section 4: Worker Nodes
- Section 5: Kubernetes Policies

## Prerequisites

- NeuVector with Enforcer running on all nodes
- Cluster admin access to NeuVector
- SSH access to nodes (for remediation)

## Step 1: Run Docker CIS Benchmark

The NeuVector benchmark API is keyed by host ID (not node name), so first list your hosts and grab the ID for the node you want to scan:

```bash
# List hosts to find the host ID for each node
curl -sk \
  "https://neuvector-manager:8443/v1/host" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.hosts[] | {name, id}'

# Trigger the Docker benchmark on a specific host
HOST_ID="<host-id-from-above>"
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/docker" \
  -H "X-Auth-Token: ${TOKEN}"

# Get Docker benchmark results for that host
curl -sk \
  "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/docker" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.'
```

## Step 2: Run Kubernetes CIS Benchmark

```bash
# Run Kubernetes benchmark
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/kubernetes" \
  -H "X-Auth-Token: ${TOKEN}"

# Get Kubernetes benchmark results
curl -sk \
  "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/kubernetes" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.items[] | select(.level == "FAIL") | {
    id: .test_number,
    description: .description,
    remediation: .remediation
  }'
```

## Step 3: Parse Benchmark Results

Analyze results programmatically:

```bash
#!/bin/bash
# parse-cis-results.sh

HOST_ID="$1"
TOKEN="$2"

# Get all failed checks
echo "=== FAILED CIS Checks for ${HOST_ID} ==="
curl -sk \
  "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/docker" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '.items[] | select(.level == "FAIL") |
    "[\(.test_number)] \(.description)\n  Remediation: \(.remediation)\n"'

# Count by level
echo "=== Summary ==="
curl -sk \
  "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/docker" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '{
    passed: [.items[] | select(.level == "PASS")] | length,
    warned: [.items[] | select(.level == "WARN")] | length,
    failed: [.items[] | select(.level == "FAIL")] | length
  }'
```

## Step 4: Common CIS Docker Findings and Remediation

### Check 4.5: Enable Content Trust

```bash
# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1

# Make it permanent in /etc/environment
echo "DOCKER_CONTENT_TRUST=1" >> /etc/environment
```

### Check 2.8: Enable User Namespace Support

```bash
# Edit Docker daemon configuration
cat >> /etc/docker/daemon.json << EOF
{
  "userns-remap": "default"
}
EOF

systemctl restart docker
```

### Check 5.28: Use PIDs cgroup limit

The PIDs cgroup limit is enforced by Docker's `--pids-limit` flag at container runtime, or by setting `default-pids-limit` in `daemon.json` (Docker 20.10+) so every container inherits a default cap. Note that this is distinct from check 2.8's `default-ulimits` (`nofile`/`nproc`), which sets per-user RLIMITs and does not satisfy 5.28.

```bash
# Set the default container PIDs cgroup limit in daemon.json
cat >> /etc/docker/daemon.json << EOF
{
  "default-pids-limit": 1024
}
EOF

systemctl restart docker
```

### Check 4.1: Create a non-root user in Dockerfile

```dockerfile
# Dockerfile - bad (runs as root)
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y myapp

# Dockerfile - good (non-root user)
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y myapp && \
    useradd -r -u 1001 appuser
USER appuser
```

### Check 5.1: Restrict AppArmor profile

```yaml
# Kubernetes pod with AppArmor annotation
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  annotations:
    container.apparmor.security.beta.kubernetes.io/myapp: runtime/default
spec:
  containers:
  - name: myapp
    image: myapp:latest
    securityContext:
      runAsNonRoot: true
      runAsUser: 1001
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop:
          - ALL
```

## Step 5: Common CIS Kubernetes Findings and Remediation

### Check 1.2.1: Enable Anonymous Auth is Disabled

```bash
# On API server, ensure:
# --anonymous-auth=false

# Edit kube-apiserver manifest
sudo vim /etc/kubernetes/manifests/kube-apiserver.yaml
# Add: --anonymous-auth=false
```

### Check 4.2.1: Kubelet Authentication is Not Anonymous

```bash
# On each worker node, update kubelet config
cat >> /var/lib/kubelet/config.yaml << EOF
authentication:
  anonymous:
    enabled: false
  webhook:
    enabled: true
authorization:
  mode: Webhook
EOF

systemctl restart kubelet
```

## Step 6: Track Remediation Progress

Monitor improvement over time:

```bash
#!/bin/bash
# track-compliance.sh
# Run before and after remediation to track progress

# List NeuVector host IDs (the bench API is keyed by host ID, not node name)
HOST_IDS=$(curl -sk \
  "https://neuvector-manager:8443/v1/host" \
  -H "X-Auth-Token: ${TOKEN}" | jq -r '.hosts[].id')

for HOST_ID in $HOST_IDS; do
  echo "Scanning ${HOST_ID}..."
  curl -sk -X POST \
    "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/docker" \
    -H "X-Auth-Token: ${TOKEN}"
  curl -sk -X POST \
    "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/kubernetes" \
    -H "X-Auth-Token: ${TOKEN}"
done

sleep 30  # Wait for scans to complete

echo "=== Compliance Scores (Docker) ==="
for HOST_ID in $HOST_IDS; do
  curl -sk \
    "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/docker" \
    -H "X-Auth-Token: ${TOKEN}" | \
    jq -r --arg id "$HOST_ID" '"\($id): \([.items[] | select(.level == "PASS")] | length)/\(.items | length) passed (\([.items[] | select(.level == "FAIL")] | length) failed)"'
done
```

## Conclusion

Running CIS Benchmarks with NeuVector gives you an automated, repeatable way to measure and improve your Kubernetes cluster's security posture. By regularly running benchmarks, tracking failed checks, and systematically remediating them, you can achieve and maintain CIS compliance. Use NeuVector's integration with compliance frameworks to map benchmark findings directly to regulatory requirements for PCI DSS, HIPAA, and other standards.
