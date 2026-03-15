# Standardizing Team Workflows Around calicoctl ipam split

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Team Workflows, Best Practices

Description: Establish consistent team procedures for using calicoctl ipam split as part of regular IPAM operations and maintenance.

---

## Introduction

When team members use `calicoctl ipam split` inconsistently or infrequently, IPAM issues go undetected. Standardizing how and when this command is used ensures consistent IP address management across all environments.

## Prerequisites

- A team managing Calico clusters
- Documented operational procedures
- Scheduling or automation infrastructure

## Standard Operating Procedures

### When to Run

```yaml
scheduled:
  - frequency: "Daily"
    purpose: "Routine IPAM health check"
    
  - frequency: "After node changes"
    purpose: "Verify IPAM consistency"
    
  - frequency: "After pod issues"
    purpose: "Check for IP-related problems"
```

### Team Script

```bash
#!/bin/bash
# team-ipam-split.sh
echo "=== calicoctl ipam split ==="
echo "Operator: $USER"
echo "Cluster: $(kubectl config current-context)"
echo "Date: $(date)"
echo ""
calicoctl ipam split 4 --cidr=10.244.0.0/24
echo ""
echo "=== Complete ==="
```

### Review Checklist

```markdown
After running calicoctl ipam split:
- [ ] Output reviewed for errors or warnings
- [ ] Results compared with expected state
- [ ] Any issues documented and assigned
- [ ] Results shared with team if noteworthy
```

## Automated Monitoring

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: team-ipam-split
  namespace: calico-system
spec:
  schedule: "0 8 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calicoctl
          containers:
          - name: task
            image: calico/ctl:v3.27.0
            command: ["/bin/sh", "-c", "calicoctl ipam split 4 --cidr=10.244.0.0/24"]
          restartPolicy: Never
```

## Verification

```bash
./team-ipam-split.sh
```

## Troubleshooting

- **Team members not running checks**: Automate with CronJobs and send results to a shared channel.
- **Different results across team members**: Ensure everyone targets the same cluster context.
- **Results not being acted upon**: Define clear escalation procedures for each type of finding.

## Conclusion

Standardizing `calicoctl ipam split` usage across your team ensures consistent IPAM visibility and proactive issue detection. By defining when to run the command, how to interpret results, and what actions to take, your team maintains healthy IP address management.
