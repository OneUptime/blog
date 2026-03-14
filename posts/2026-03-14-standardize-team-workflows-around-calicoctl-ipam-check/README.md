# Standardizing Team Workflows Around calicoctl ipam check

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Team Workflows, Best Practices

Description: Establish team-wide IPAM auditing procedures using calicoctl ipam check to maintain healthy IP address allocation across all clusters.

---

## Introduction

IPAM issues are insidious because they develop slowly and only become apparent when the IP pool is nearly exhausted. By standardizing regular IPAM audits across your team, you catch problems early and maintain healthy IP utilization.

## Prerequisites

- A team managing Calico clusters
- Scheduled maintenance windows
- Alerting infrastructure

## IPAM Audit Schedule

```yaml
audit_schedule:
  daily:
    - command: "calicoctl ipam check"
    - automated: true
    - alert_on: "any leaked IPs or orphaned blocks"
    
  weekly:
    - command: "calicoctl ipam show"
    - review: "IP utilization trends"
    - action: "Plan capacity if utilization > 80%"
    
  post_incident:
    - command: "calicoctl ipam check"
    - required_after: "node failures, forced pod deletions, cluster scaling"
```

## Standard Audit Script

```bash
#!/bin/bash
# team-ipam-audit.sh

echo "=== Team IPAM Audit ==="
echo "Auditor: $USER"
echo "Date: $(date)"
echo "Cluster: $(kubectl config current-context)"
echo ""

# Run check
echo "--- IPAM Health Check ---"
calicoctl ipam check

# Show utilization
echo ""
echo "--- IP Utilization ---"
calicoctl ipam show

# Show block distribution
echo ""
echo "--- Block Distribution ---"
calicoctl ipam show --show-blocks

echo ""
echo "=== Audit Complete ==="
```

## Response Procedures

```markdown
## IPAM Issue Response Playbook

### Leaked IPs (< 10)
1. Verify they are genuinely leaked (wait 2 min, recheck)
2. Release with: calicoctl ipam release --ip=<ip>
3. Document in audit log

### Leaked IPs (> 10)
1. Investigate root cause (node failure? application crash?)
2. Fix root cause first
3. Batch release: use cleanup script
4. Monitor for recurrence

### Orphaned Blocks
1. Confirm node is permanently removed
2. Release: calicoctl ipam release --node=<node>
3. Verify with: calicoctl ipam check

### IP Pool Near Exhaustion (> 80%)
1. Clean up leaked IPs first
2. Consider adding a new IP pool
3. Review pod density and node count
4. Escalate to capacity planning team
```

## Verification

```bash
# Run the team audit
./team-ipam-audit.sh

# Verify the CronJob is running
kubectl get cronjobs -n calico-system | grep ipam
```

## Troubleshooting

- **Audit shows different results when different team members run it**: Ensure everyone is checking the same cluster context.
- **IP leaks recurring after cleanup**: Investigate the root cause. Check for application bugs that prevent graceful pod termination.
- **Team members not reviewing audit results**: Configure alerts to Slack or email when issues are detected.

## Conclusion

Standardized IPAM auditing transforms IP address management from a reactive firefight into a proactive maintenance practice. By scheduling regular checks, defining clear response procedures, and automating alerting, your team keeps IPAM healthy across all clusters.
