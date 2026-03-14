# Standardizing Team Workflows Around calicoctl node run

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Team Workflows, Node Management, Best Practices, DevOps

Description: Create standardized procedures for deploying and managing Calico nodes with calicoctl node run across your team, ensuring consistent bare-metal networking deployments.

---

## Introduction

In environments where `calicoctl node run` is the primary method for deploying Calico, team-wide standardization is essential. Different team members using different image versions, flags, or IP detection methods will create an inconsistent cluster that is difficult to troubleshoot and maintain.

Standardizing the `calicoctl node run` workflow means defining approved configurations, creating shared deployment scripts, establishing review processes for changes, and automating compliance checks. These practices ensure that every node in your fleet is deployed consistently, regardless of which engineer performs the deployment.

This guide provides a complete framework for standardizing node deployment workflows across your team.

## Prerequisites

- A team managing bare-metal or non-Kubernetes Calico deployments
- A shared configuration management repository
- Agreement on target Calico version and deployment architecture
- SSH or configuration management access to all hosts

## Standard Configuration Repository

Create a central repository for all node configurations:

```
calico-node-config/
  ├── README.md
  ├── versions.yaml              # Approved versions
  ├── defaults.env               # Default environment variables
  ├── hosts/
  │   ├── worker-01.env          # Per-host overrides
  │   ├── worker-02.env
  │   └── worker-03.env
  ├── scripts/
  │   ├── deploy-node.sh         # Standard deployment script
  │   ├── validate-node.sh       # Post-deployment validation
  │   ├── rollback-node.sh       # Rollback script
  │   └── pre-deploy-check.sh    # Pre-deployment validation
  └── certs/
      ├── ca.pem
      ├── cert.pem
      └── key.pem
```

### Versions File

```yaml
# versions.yaml
calico_node_image: "calico/node:v3.27.0"
calicoctl_version: "v3.27.0"
minimum_docker_version: "24.0"
approved_date: "2026-03-01"
approved_by: "platform-team"
```

### Default Environment File

```bash
# defaults.env
DATASTORE_TYPE=etcdv3
ETCD_ENDPOINTS=https://10.0.1.5:2379,https://10.0.1.6:2379,https://10.0.1.7:2379
ETCD_KEY_FILE=/etc/calico/certs/key.pem
ETCD_CERT_FILE=/etc/calico/certs/cert.pem
ETCD_CA_CERT_FILE=/etc/calico/certs/ca.pem
CALICO_IP=autodetect
CALICO_IP_AUTODETECTION_METHOD=interface=ens192
FELIX_LOGSEVERITYSCREEN=Info
CALICO_NETWORKING_BACKEND=bird
```

## Standard Deployment Script

```bash
#!/bin/bash
# scripts/deploy-node.sh
# Team-standard script for deploying a Calico node
# Usage: ./deploy-node.sh <hostname>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_HOST="${1:?Usage: $0 <hostname>}"

# Load versions
CALICO_IMAGE=$(grep "calico_node_image:" "$SCRIPT_DIR/versions.yaml" | awk '{print $2}' | tr -d '"')

# Load defaults
source "$SCRIPT_DIR/defaults.env"

# Load host-specific overrides if they exist
HOST_ENV="$SCRIPT_DIR/hosts/${TARGET_HOST}.env"
if [ -f "$HOST_ENV" ]; then
  echo "Loading host overrides from $HOST_ENV"
  source "$HOST_ENV"
fi

echo "=== Deploying Calico Node ==="
echo "Host: $TARGET_HOST"
echo "Image: $CALICO_IMAGE"
echo ""

# Pre-deployment checks
echo "Running pre-deployment checks..."
ssh "$TARGET_HOST" "docker info > /dev/null 2>&1" || { echo "FAIL: Docker not running on $TARGET_HOST"; exit 1; }
echo "Pre-deployment checks passed."

# Copy certificates if needed
echo "Ensuring certificates are present..."
ssh "$TARGET_HOST" "mkdir -p /etc/calico/certs"
scp "$SCRIPT_DIR/certs/"*.pem "$TARGET_HOST:/etc/calico/certs/"

# Deploy
echo "Starting calico-node..."
ssh "$TARGET_HOST" bash -s << REMOTE
  docker stop calico-node 2>/dev/null || true
  docker rm calico-node 2>/dev/null || true
  
  export DATASTORE_TYPE=${DATASTORE_TYPE}
  export ETCD_ENDPOINTS=${ETCD_ENDPOINTS}
  export ETCD_KEY_FILE=${ETCD_KEY_FILE}
  export ETCD_CERT_FILE=${ETCD_CERT_FILE}
  export ETCD_CA_CERT_FILE=${ETCD_CA_CERT_FILE}
  
  calicoctl node run \
    --node-image=${CALICO_IMAGE} \
    --name=\$(hostname) \
    --ip=${CALICO_IP} \
    --ip-autodetection-method=${CALICO_IP_AUTODETECTION_METHOD}
REMOTE

# Post-deployment validation
echo ""
echo "Running validation..."
sleep 10
ssh "$TARGET_HOST" "sudo calicoctl node status"

echo ""
echo "Deployment complete."
```

## Change Management Process

Define a clear process for node changes:

```
1. PROPOSE: Engineer creates a PR with configuration changes
   - Modified host/*.env files
   - Updated versions.yaml
   - Justification in PR description

2. REVIEW: At least one team member reviews
   - Verify version compatibility
   - Check configuration values
   - Review impact assessment

3. TEST: Deploy to staging first
   - ./deploy-node.sh staging-worker-01
   - Run full validation suite
   - Monitor for 1 hour

4. DEPLOY: Roll out to production
   - One node at a time
   - Validate between each node
   - Document in deployment log

5. VERIFY: Post-deployment checks
   - Full cluster validation
   - BGP mesh health
   - Network policy enforcement
```

## Compliance Checking

Automated script to verify all nodes match the standard:

```bash
#!/bin/bash
# scripts/check-fleet-compliance.sh
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

EXPECTED_IMAGE=$(grep "calico_node_image:" "$SCRIPT_DIR/versions.yaml" | awk '{print $2}' | tr -d '"')
EXPECTED_VERSION=$(echo "$EXPECTED_IMAGE" | cut -d: -f2)
ISSUES=0

echo "=== Fleet Compliance Check ==="
echo "Expected image: $EXPECTED_IMAGE"
echo ""

for HOST_FILE in "$SCRIPT_DIR/hosts/"*.env; do
  HOST=$(basename "$HOST_FILE" .env)
  echo "--- $HOST ---"
  
  # Check container image
  ACTUAL_IMAGE=$(ssh "$HOST" "docker inspect calico-node --format '{{.Config.Image}}'" 2>/dev/null)
  if [ "$ACTUAL_IMAGE" = "$EXPECTED_IMAGE" ]; then
    echo "  Image: OK ($ACTUAL_IMAGE)"
  else
    echo "  Image: MISMATCH (expected=$EXPECTED_IMAGE actual=${ACTUAL_IMAGE:-NOT_RUNNING})"
    ISSUES=$((ISSUES + 1))
  fi
  
  # Check node is healthy
  if ssh "$HOST" "sudo calicoctl node status 2>&1 | grep -q 'Calico process is running'" 2>/dev/null; then
    echo "  Status: healthy"
  else
    echo "  Status: UNHEALTHY"
    ISSUES=$((ISSUES + 1))
  fi
done

echo ""
echo "Issues found: $ISSUES"
exit $ISSUES
```

## Verification

Test the standardized workflow:

```bash
# Run compliance check
./scripts/check-fleet-compliance.sh

# Deploy a node using the standard script
./scripts/deploy-node.sh worker-01

# Run validation
./scripts/validate-node.sh worker-01
```

## Troubleshooting

- **Host-specific overrides not loading**: Verify the filename matches the hostname exactly in the `hosts/` directory.
- **Certificates out of date**: Implement certificate rotation as part of the maintenance workflow. Add certificate expiration checks to the compliance script.
- **Team members deploying manually**: Add CI/CD hooks that detect out-of-spec node configurations and alert the team.
- **Staging and production drift**: Run the compliance check on a schedule (daily or weekly) and alert on any drift.

## Conclusion

Standardizing `calicoctl node run` workflows creates a reliable, auditable process for managing Calico nodes across your fleet. By centralizing configuration, enforcing review processes, and automating compliance checks, your team can confidently deploy and maintain Calico networking at scale while minimizing the risk of configuration drift and human error.
