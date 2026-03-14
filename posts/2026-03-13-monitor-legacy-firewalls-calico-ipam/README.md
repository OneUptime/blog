# Monitor Legacy Firewalls with Calico IPAM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, Firewall, LEGACY, Kubernetes, Networking, Integration

Description: Learn how to integrate Calico IPAM with legacy firewall infrastructure, ensuring that dynamically allocated pod IPs can be tracked and firewall rules remain consistent as the pod IP space changes.

---

## Introduction

Legacy firewalls operate on static IP-based rules, while Calico dynamically allocates IPs to pods from configured pools. This fundamental difference creates a challenge: firewall rules written for specific IP addresses become stale when pod IPs change, and it is difficult to keep legacy firewalls synchronized with Calico's dynamic IP assignments.

Calico's predictable IPAM model - where pod IPs come from known CIDR ranges - allows you to write firewall rules against IP pools rather than individual pod IPs. However, maintaining consistency between Calico IP pools and legacy firewall rules requires monitoring to detect when Calico pool configurations change in ways that affect existing firewall rules.

This guide covers designing a Calico IPAM strategy compatible with legacy firewalls, monitoring for IPAM configuration drift, and validating that firewall rules remain effective as the cluster evolves.

## Prerequisites

- Kubernetes cluster with Calico v3.27+ using Calico IPAM
- Legacy firewall with API or CLI access for rule management
- `calicoctl` v3.27+ installed
- `kubectl` with admin access
- Documented firewall rules that reference pod or service CIDRs

## Step 1: Audit Legacy Firewall Rules Against Calico IP Pools

Review existing firewall rules to understand which ones reference Calico-managed IP ranges.

Map firewall rules to Calico IP pool CIDRs:

```bash
# List all Calico IP pools that the legacy firewall needs to know about
calicoctl get ippools -o yaml | grep -E "name:|cidr:|disabled:"

# Document the mapping between pools and firewall rule purposes
# Example mapping:
# production-pod-pool:   10.100.0.0/16  -> FW Rule: allow-k8s-prod-pods
# staging-pod-pool:      10.200.0.0/16  -> FW Rule: allow-k8s-staging-pods
# service-cidr:          10.96.0.0/12   -> FW Rule: allow-k8s-services

# Check if any legacy firewall rules reference individual pod IPs (anti-pattern)
# These will break when pods are rescheduled
echo "Review firewall rules - any rules targeting specific pod IPs will break on reschedule"
```

## Step 2: Configure Stable IPAM for Firewall Compatibility

Design Calico IP pools with predictable, stable CIDRs that legacy firewalls can reference.

Create dedicated IP pools per environment with stable, well-documented CIDRs:

```yaml
# stable-ippools.yaml - stable CIDRs for legacy firewall compatibility
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: production-pods
  annotations:
    # Document firewall rule reference for operational clarity
    firewall.org/rule-name: "FW-K8S-PROD-001"
    firewall.org/rule-description: "Allow production pod traffic"
spec:
  cidr: 10.100.0.0/16    # Stable CIDR - never change this
  blockSize: 26
  encapsulation: VXLAN
  natOutgoing: true
  nodeSelector: "environment == 'production'"
---
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: staging-pods
  annotations:
    firewall.org/rule-name: "FW-K8S-STAGING-001"
    firewall.org/rule-description: "Allow staging pod traffic"
spec:
  cidr: 10.200.0.0/16    # Stable CIDR - never change this
  blockSize: 26
  encapsulation: VXLAN
  natOutgoing: true
  nodeSelector: "environment == 'staging'"
```

Apply the stable IP pools:

```bash
calicoctl apply -f stable-ippools.yaml
```

## Step 3: Monitor for IPAM Configuration Drift

Detect when Calico IP pool configurations change in ways that affect firewall rules.

Create a monitoring check that compares expected versus actual IP pool CIDRs:

```bash
#!/bin/bash
# ipam-firewall-audit.sh - detect Calico IPAM changes that affect legacy firewalls

EXPECTED_POOLS=(
  "production-pods:10.100.0.0/16"
  "staging-pods:10.200.0.0/16"
)

echo "=== Calico IPAM Firewall Compatibility Audit ==="
AUDIT_FAILED=false

for pool_spec in "${EXPECTED_POOLS[@]}"; do
  pool_name="${pool_spec%%:*}"
  expected_cidr="${pool_spec#*:}"
  
  actual_cidr=$(calicoctl get ippool "$pool_name" -o yaml 2>/dev/null | \
    grep "cidr:" | awk '{print $2}')
  
  if [ "$actual_cidr" != "$expected_cidr" ]; then
    echo "DRIFT DETECTED: Pool $pool_name expected CIDR $expected_cidr, got $actual_cidr"
    AUDIT_FAILED=true
  else
    echo "OK: Pool $pool_name CIDR $actual_cidr matches expected"
  fi
done

if $AUDIT_FAILED; then
  echo "ALERT: Calico IPAM drift detected - review legacy firewall rules"
  exit 1
fi
```

## Step 4: Validate Connectivity Through the Legacy Firewall

Test that pod traffic is correctly passing through or being blocked by legacy firewall rules.

Run connectivity tests to validate firewall rule effectiveness:

```bash
# Test that production pods can reach approved external services
kubectl run fw-test-prod --image=curlimages/curl \
  -n production --rm -it -- \
  curl --connect-timeout 5 https://approved-external-service.example.com/health

# Test that production pods cannot reach unapproved services (should be blocked by FW)
kubectl run fw-test-blocked --image=curlimages/curl \
  -n production --rm -it -- \
  curl --connect-timeout 5 http://blocked-service.example.com:8080/

# Test cross-environment isolation (staging should not reach production services)
kubectl run fw-test-cross --image=curlimages/curl \
  -n staging --rm -it -- \
  curl --connect-timeout 5 http://production-db.production.svc.cluster.local:5432
```

## Step 5: Create an IP Pool Change Alert

Alert when Calico IP pools are modified, which may require firewall rule updates.

Set up a Kubernetes event monitor for IP pool changes:

```yaml
# ippool-change-alert.yaml - monitor for IP pool modifications
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-ippool-change-alert
  namespace: monitoring
spec:
  groups:
  - name: calico-ipam-firewall
    rules:
    - alert: CalicoIPPoolModified
      # Alert if the Calico API server reports IP pool changes
      expr: |
        changes(calico_ipam_ippool_size_total[1h]) > 0
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "Calico IP pool size changed - verify legacy firewall rules are up to date"
```

## Best Practices

- Document every Calico IP pool CIDR in your firewall change management system
- Treat Calico IP pool CIDR changes as firewall change events requiring review and approval
- Use Calico annotations on IP pools to record the corresponding legacy firewall rule names
- Never modify production IP pool CIDRs without first updating legacy firewall rules
- Monitor connectivity from pods to services behind the legacy firewall with OneUptime synthetic checks

## Conclusion

Integrating Calico IPAM with legacy firewalls requires a disciplined approach to IP pool design and change management. By using stable, documented CIDRs for IP pools, monitoring for configuration drift, and testing firewall rule effectiveness regularly, you can maintain consistent security enforcement across your hybrid infrastructure. Use OneUptime to continuously validate that pod traffic flows correctly through the legacy firewall to ensure security rules remain effective as the cluster evolves.
