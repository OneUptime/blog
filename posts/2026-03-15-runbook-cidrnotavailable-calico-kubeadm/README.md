# How to Build a Runbook for CIDRNotAvailable Errors with Calico and kubeadm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, kubeadm, CIDR, IPAM, Kubernetes, Runbook, Incident Response, SRE

Description: A complete guide to building an operational runbook for diagnosing and resolving CIDRNotAvailable errors in Calico-based Kubernetes clusters.

---

## Introduction

A runbook transforms tribal knowledge into repeatable, reliable procedures that any operator on call can follow. For CIDRNotAvailable errors in Calico and kubeadm clusters, a well-structured runbook reduces mean time to resolution by eliminating guesswork and providing clear decision trees.

CIDRNotAvailable errors have multiple possible root causes, each requiring a different resolution. Without a runbook, on-call engineers must rely on memory or documentation scattered across wikis, Slack threads, and post-incident reports. A centralized runbook brings all of this together.

This guide walks through building a production-ready runbook, including the alert response flow, diagnostic steps, resolution procedures, and escalation paths.

## Prerequisites

- Familiarity with Calico networking and kubeadm clusters
- Access to your team's runbook platform (PagerDuty, Confluence, Git repo, etc.)
- Knowledge of your cluster's CIDR configuration
- Understanding of your team's incident response process

## Runbook Structure

Organize the runbook with these sections:

```markdown
# CIDRNotAvailable Runbook

## Alert Information
- Alert name: CalicoIPAMCriticalUtilization / CIDRNotAvailable
- Severity: High
- Impact: Pod scheduling failures
- On-call team: Platform Engineering
- Escalation: Network Engineering Lead

## Symptoms
- Pods stuck in ContainerCreating or Pending state
- Events showing "CIDRNotAvailable" or "no available CIDR"
- IPAM utilization alerts from Prometheus
```

## Step 1: Initial Assessment

Include these commands in the runbook for the initial assessment:

```bash
# Assess the scope of impact
echo "=== Affected Pods ==="
kubectl get pods --all-namespaces --field-selector=status.phase=Pending --no-headers | wc -l

echo "=== Recent CIDR Events ==="
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | grep -i "cidr\|ipam" | tail -10

echo "=== IPAM Status ==="
calicoctl ipam show

echo "=== Node CIDR Assignments ==="
kubectl get nodes -o custom-columns=NAME:.metadata.name,CIDR:.spec.podCIDR
```

## Step 2: Root Cause Decision Tree

Build a decision tree into the runbook:

```markdown
## Root Cause Decision Tree

1. Is IPAM utilization above 90%?
   - YES -> Go to "Resolution: CIDR Exhaustion"
   - NO  -> Continue to step 2

2. Does the Calico IPPool CIDR match kubeadm's podSubnet?
   - NO  -> Go to "Resolution: CIDR Mismatch"
   - YES -> Continue to step 3

3. Are there nodes without pod CIDR assignments?
   - YES -> Go to "Resolution: Missing Node CIDRs"
   - NO  -> Continue to step 4

4. Are there stale IPAM blocks for removed nodes?
   - YES -> Go to "Resolution: Stale IPAM Cleanup"
   - NO  -> Escalate to Network Engineering Lead
```

Implement the decision tree as a diagnostic script:

```bash
#!/bin/bash
# cidr-diagnose.sh - Runbook diagnostic script

echo "=== CIDRNotAvailable Diagnostic ==="

# Check 1: IPAM utilization
echo "Step 1: Checking IPAM utilization..."
calicoctl ipam show

# Check 2: CIDR alignment
echo "Step 2: Checking CIDR alignment..."
KUBEADM_CIDR=$(kubectl get configmap -n kube-system kubeadm-config -o jsonpath='{.data.ClusterConfiguration}' 2>/dev/null | grep podSubnet | awk '{print $2}')
CALICO_CIDR=$(calicoctl get ippools -o jsonpath='{.items[0].spec.cidr}' 2>/dev/null)
echo "kubeadm: $KUBEADM_CIDR"
echo "Calico:  $CALICO_CIDR"
if [ "$KUBEADM_CIDR" != "$CALICO_CIDR" ]; then
  echo "FINDING: CIDR mismatch detected"
fi

# Check 3: Node CIDR assignments
echo "Step 3: Checking node CIDR assignments..."
NO_CIDR=$(kubectl get nodes -o json | jq '[.items[] | select(.spec.podCIDR == null)] | length')
if [ "$NO_CIDR" -gt 0 ]; then
  echo "FINDING: $NO_CIDR nodes without CIDR assignment"
fi

# Check 4: Stale blocks
echo "Step 4: Checking for stale IPAM blocks..."
calicoctl ipam check 2>&1
```

## Step 3: Resolution Procedures

Include specific resolution steps for each root cause:

```markdown
## Resolution: CIDR Exhaustion

**Risk**: Low (additive change)
**Maintenance window**: Not required

1. Add a supplementary IPPool:
```

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: supplementary-pool
spec:
  cidr: 10.245.0.0/16
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
  blockSize: 26
EOF
```

```markdown
## Resolution: CIDR Mismatch

**Risk**: Medium (may require pod restarts)
**Maintenance window**: Recommended

1. Back up current IPPool configuration
2. Delete incorrect IPPool
3. Create IPPool matching kubeadm CIDR
4. Restart calico-node DaemonSet
5. Verify new pods receive correct IPs
```

## Step 4: Verification Steps

Every resolution should end with verification:

```bash
# Post-resolution verification
echo "=== Verification ==="

# 1. IPAM health
calicoctl ipam show
calicoctl ipam check

# 2. Test pod creation
kubectl run runbook-test --image=busybox --command -- sleep 60
sleep 10
kubectl get pod runbook-test -o wide
kubectl delete pod runbook-test

# 3. Check previously pending pods
kubectl get pods --all-namespaces --field-selector=status.phase=Pending --no-headers | wc -l

# 4. Verify events have stopped
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | grep -i "cidr" | tail -5
```

## Step 5: Escalation Criteria

Document when to escalate:

```markdown
## Escalation Criteria

Escalate to Network Engineering Lead if:
- Diagnostic script does not identify a root cause
- Resolution steps do not resolve the issue within 30 minutes
- More than 50% of cluster pods are affected
- The issue recurs within 24 hours of resolution
- CIDR changes require coordination with external network teams

Escalation contact: [Network Engineering Lead - PagerDuty]
```

## Step 6: Post-Incident Tasks

Include post-incident procedures:

```markdown
## Post-Incident Tasks

1. Update IPAM capacity monitoring thresholds if needed
2. File a post-incident report documenting:
   - Root cause
   - Resolution applied
   - Time to detection and resolution
   - Prevention measures for the future
3. Review CIDR capacity for other clusters
4. Update this runbook with any new findings
```

## Verification

Test your runbook by conducting a tabletop exercise:

```bash
# Simulate the diagnostic flow without making changes
bash cidr-diagnose.sh

# Verify all commands in the runbook are valid
# Run each diagnostic command and confirm expected output format
kubectl get pods --all-namespaces --field-selector=status.phase=Pending --no-headers | wc -l
calicoctl ipam show
calicoctl get ippools -o wide
```

## Troubleshooting

**Runbook commands fail**: Verify that `calicoctl` is installed and configured on the jump host or operator workstation used during incidents. Include installation steps in the runbook prerequisites.

**Decision tree does not match the issue**: The runbook should be a living document. After each incident, review whether the decision tree covered the actual root cause and add new branches as needed.

**Multiple root causes**: Some incidents have compound causes (e.g., CIDR mismatch combined with stale blocks). The diagnostic script should check all conditions regardless of earlier findings.

## Conclusion

A well-built runbook for CIDRNotAvailable errors transforms a stressful incident into a systematic process. By combining an initial assessment, a root cause decision tree, specific resolution procedures, verification steps, and escalation criteria, any on-call operator can resolve the issue efficiently. Keep the runbook in version control, test it periodically with tabletop exercises, and update it after every real incident.
