# Standardizing Team Workflows Around calicoctl node status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, BGP, Team Workflows, Monitoring, Best Practices

Description: Establish team-wide practices for using calicoctl node status as part of operational runbooks, incident response, and regular health monitoring.

---

## Introduction

When every team member uses `calicoctl node status` differently, or worse, does not use it at all, BGP issues go undetected until they cause application-level failures. Standardizing how your team uses this command as part of regular operations creates a consistent diagnostic practice that catches networking issues early.

This guide establishes standard operating procedures for `calicoctl node status`, covering when to run it, how to interpret the results, and what actions to take based on the output.

## Prerequisites

- A team managing Calico in one or more clusters
- Shared documentation system for runbooks
- Monitoring infrastructure for automated checks
- Agreement on operational standards

## Standard Operating Procedures

### When to Run calicoctl node status

Define clear triggers for running this command:

1. **During daily operational checks**: Include as part of morning cluster health review
2. **After any network change**: BGP configuration, IP pool, or node changes
3. **During incident response**: First command to run for connectivity issues
4. **After node maintenance**: Reboot, upgrade, or scaling operations
5. **After Calico upgrades**: Verify BGP mesh is re-established

### Standard Check Script

```bash
#!/bin/bash
# team-bgp-check.sh
# Standard team script for BGP health assessment

echo "=== BGP Health Check ==="
echo "Operator: ${USER}"
echo "Date: $(date)"
echo "Node: $(hostname)"
echo ""

# Run the status check
STATUS=$(sudo calicoctl node status 2>&1)
echo "$STATUS"

# Parse results
if echo "$STATUS" | grep -q "Calico process is running"; then
  TOTAL=$(echo "$STATUS" | grep -cE "node-to-node|global" || echo 0)
  ESTABLISHED=$(echo "$STATUS" | grep -c "Established" || echo 0)
  DOWN=$((TOTAL - ESTABLISHED))
  
  echo ""
  echo "--- Assessment ---"
  echo "Total peers: $TOTAL"
  echo "Established: $ESTABLISHED"
  echo "Down: $DOWN"
  
  if [ "$DOWN" -eq 0 ]; then
    echo "Status: HEALTHY"
  elif [ "$DOWN" -le 1 ]; then
    echo "Status: DEGRADED - investigate and monitor"
  else
    echo "Status: CRITICAL - escalate immediately"
  fi
else
  echo ""
  echo "--- Assessment ---"
  echo "Status: CRITICAL - Calico process not running"
  echo "Action: Restart calico-node and escalate"
fi
```

## Incident Response Runbook

```markdown
## BGP Incident Response Runbook

### Step 1: Assess
Run on affected node:
```
sudo calicoctl node status
```text

### Step 2: Classify
- All peers down: CRITICAL - likely node or Calico process issue
- Some peers down: HIGH - specific peer connectivity issue
- All peers up but flapping: MEDIUM - stability concern

### Step 3: Investigate
For each down peer:
```
ping <peer-ip>
nc -zv <peer-ip> 179
```text

### Step 4: Remediate
- Process not running: restart calico-node pod
- Firewall blocking: check iptables rules
- AS mismatch: verify BGP configuration
- Network unreachable: check host networking

### Step 5: Verify
```
sudo calicoctl node status
kubectl run test --image=busybox --rm -it -- ping -c 3 <cross-node-pod-ip>
```text

### Step 6: Document
Record incident details, root cause, and resolution.
```

## Regular Health Monitoring Schedule

```yaml
# monitoring-schedule.yaml
daily_checks:
  - name: "Morning BGP Health"
    schedule: "08:00"
    script: "team-bgp-check.sh"
    scope: "all nodes"
    
  - name: "Evening BGP Health"
    schedule: "17:00"
    script: "team-bgp-check.sh"
    scope: "all nodes"

post_change_checks:
  - trigger: "Any BGP configuration change"
    script: "team-bgp-check.sh"
    wait: "30 seconds after change"
    
  - trigger: "Node addition or removal"
    script: "cluster-bgp-monitor.sh"
    wait: "60 seconds after change"

weekly_checks:
  - name: "Full BGP audit"
    schedule: "Monday 09:00"
    script: "cluster-bgp-monitor.sh"
    includes:
      - "Route count validation"
      - "Session stability check"
      - "Cross-node connectivity test"
```

## Shared Team Dashboard Query

If using Grafana with Prometheus, standardize dashboard panels:

```bash
# Generate metrics for team dashboard
#!/bin/bash
# generate-bgp-dashboard-metrics.sh

NODES=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')

for NODE in $NODES; do
  POD=$(kubectl get pod -n calico-system -l k8s-app=calico-node \
    --field-selector spec.nodeName="$NODE" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
  
  if [ -n "$POD" ]; then
    ESTABLISHED=$(kubectl exec -n calico-system "$POD" -- calicoctl node status 2>/dev/null | grep -c "Established" || echo 0)
    TOTAL=$(kubectl exec -n calico-system "$POD" -- calicoctl node status 2>/dev/null | grep -cE "node-to-node|global" || echo 0)
    echo "node=$NODE established=$ESTABLISHED total=$TOTAL"
  fi
done
```

## Verification

Test your standardized workflows:

```bash
# Run the team check script
sudo ./team-bgp-check.sh

# Run the cluster monitor
./cluster-bgp-monitor.sh

# Verify the monitoring schedule is configured
kubectl get cronjobs -n calico-system
```

## Troubleshooting

- **Team members skipping health checks**: Automate checks as CronJobs and send results to a shared Slack channel or dashboard.
- **Different output formats across Calico versions**: Standardize the calicoctl version used across all clusters to ensure consistent output parsing.
- **Health check scripts failing on specific nodes**: Ensure hostNetwork access is available for pods running the checks, and that RBAC is properly configured.

## Conclusion

Standardizing `calicoctl node status` workflows turns ad-hoc debugging into proactive health management. By defining when to run checks, how to interpret results, and what actions to take, your team responds faster to BGP issues and maintains healthier Calico networks. Consistent practices across the team also make incident handoffs smoother and post-incident analysis more effective.
