# Standardizing Team Workflows Around calicoctl ipam configure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Team Workflows, Best Practices

Description: Establish team-wide standards for IPAM configuration management to ensure consistent IP address allocation behavior across all Calico clusters.

---

## Introduction

IPAM configuration affects every pod in your cluster. When team members change IPAM settings without coordination, it can cause IP allocation failures, routing issues, and difficult-to-diagnose connectivity problems. Standardizing IPAM configuration workflows ensures changes are deliberate, reviewed, and reversible.

## Prerequisites

- A team managing Calico clusters
- Documented IPAM requirements per environment
- Change management process

## IPAM Configuration Standard

```yaml
# ipam-standards.yaml
environments:
  production:
    strictAffinity: true
    reason: "Required for AWS VPC routing and predictable IP-to-node mapping"
    
  staging:
    strictAffinity: true
    reason: "Match production configuration"
    
  development:
    strictAffinity: false
    reason: "Maximize IP utilization in resource-constrained environments"
```

## Change Request Process

```markdown
## IPAM Configuration Change Request Template

### Change Description
- Current setting: StrictAffinity = [current value]
- Proposed setting: StrictAffinity = [new value]
- Affected clusters: [list clusters]

### Justification
[Why is this change needed?]

### Impact Assessment
- [ ] Checked current IP utilization (calicoctl ipam show)
- [ ] Verified no pods will be affected during change
- [ ] Confirmed rollback procedure
- [ ] Tested in non-production environment

### Approval
- [ ] Team lead approval
- [ ] Platform team review
```

## Automated Compliance Check

```bash
#!/bin/bash
# check-ipam-compliance.sh

# Define expected settings per cluster context
declare -A EXPECTED_STRICT_AFFINITY
EXPECTED_STRICT_AFFINITY[production]="true"
EXPECTED_STRICT_AFFINITY[staging]="true"
EXPECTED_STRICT_AFFINITY[development]="false"

CURRENT_CONTEXT=$(kubectl config current-context)
EXPECTED="${EXPECTED_STRICT_AFFINITY[$CURRENT_CONTEXT]}"

if [ -z "$EXPECTED" ]; then
  echo "WARNING: No IPAM standard defined for context $CURRENT_CONTEXT"
  exit 0
fi

ACTUAL=$(calicoctl ipam configure show | grep StrictAffinity | awk '{print $2}')

if [ "$ACTUAL" = "$EXPECTED" ]; then
  echo "COMPLIANT: StrictAffinity=$ACTUAL (expected $EXPECTED for $CURRENT_CONTEXT)"
else
  echo "NON-COMPLIANT: StrictAffinity=$ACTUAL (expected $EXPECTED for $CURRENT_CONTEXT)"
  exit 1
fi
```

## Pre-Change and Post-Change Scripts

```bash
#!/bin/bash
# ipam-change-wrapper.sh
# Usage: ./ipam-change-wrapper.sh <strictaffinity-value>

NEW_VALUE="${1:?Usage: $0 <true|false>}"

echo "=== IPAM Configuration Change ==="
echo "Pre-change state:"
calicoctl ipam configure show
calicoctl ipam show

echo ""
echo "Applying: StrictAffinity=$NEW_VALUE"
calicoctl ipam configure --strictaffinity="$NEW_VALUE"

echo ""
echo "Post-change state:"
calicoctl ipam configure show

echo ""
echo "Verifying IP allocation..."
kubectl run ipam-verify --image=busybox --restart=Never -- sleep 10
sleep 5
kubectl get pod ipam-verify -o wide
kubectl delete pod ipam-verify --grace-period=0 2>/dev/null

echo ""
echo "Change complete. Monitor for issues over the next 15 minutes."
```

## Verification

```bash
# Check compliance
./check-ipam-compliance.sh

# Make a change using the wrapper
./ipam-change-wrapper.sh true
```

## Troubleshooting

- **Team members changing IPAM without the wrapper**: Add monitoring that detects IPAM configuration changes and alerts the team.
- **Different environments need different settings**: Document the rationale in the standards file and enforce per-environment settings.
- **Compliance check gives false negatives**: Verify the context-to-environment mapping is correct.

## Conclusion

Standardizing IPAM configuration management prevents ad-hoc changes that can disrupt IP allocation across your cluster. By defining clear standards, requiring change requests, and automating compliance checking, your team ensures that IPAM configuration is always deliberate, consistent, and reversible.
