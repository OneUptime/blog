# Standardizing Team Workflows Around calicoctl ipam split

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Team Workflows, Best Practice

Description: Establish consistent team procedures for using calicoctl ipam split as part of regular IPAM operations and maintenance.

---

## Introduction

When team members use `calicoctl ipam split` inconsistently, planned IP pool changes become risky. Standardizing how and when this command is used ensures consistent IP address management across all environments.

## Prerequisites

- A team managing Calico clusters
- Documented operational procedures
- A maintenance window for locking and unlocking the Calico datastore

## Standard Operating Procedures

### When to Run

```yaml
scheduled:
  - frequency: "During planned IP pool maintenance"
    purpose: "Split an existing IP pool into smaller pools"
    
  - frequency: "After a clean IPAM check"
    purpose: "Confirm there are no IPAM issues before splitting"
    
  - frequency: "After change approval"
    purpose: "Ensure the team is ready for a datastore lock"
```

### Team Script

```bash
#!/bin/bash
# team-ipam-split.sh

set -euo pipefail

echo "=== calicoctl ipam split ==="
echo "Operator: $USER"
echo "Cluster: $(kubectl config current-context)"
echo "Date: $(date)"
echo ""
calicoctl ipam check
calicoctl datastore migrate lock
trap 'calicoctl datastore migrate unlock' EXIT
calicoctl ipam split --cidr=10.244.0.0/24 4
echo ""
echo "=== Complete ==="
```

### Review Checklist

```markdown
After running calicoctl ipam split:
- [ ] Output reviewed for errors or warnings
- [ ] Calico datastore unlocked successfully
- [ ] Results compared with expected state
- [ ] Any issues documented and assigned
- [ ] Results shared with team if noteworthy
```

## Automated Runbook

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: team-ipam-split
  namespace: calico-system
spec:
  schedule: "0 8 * * *"
  suspend: true
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calicoctl
          containers:
          - name: task
            image: calico/ctl:v3.32.0
            command:
            - /bin/sh
            - -c
            - |
              set -e
              calicoctl ipam check
              calicoctl datastore migrate lock
              trap 'calicoctl datastore migrate unlock' EXIT
              calicoctl ipam split --cidr=10.244.0.0/24 4
          restartPolicy: Never
```

## Verification

```bash
./team-ipam-split.sh
```

## Troubleshooting

- **Team members running splits without review**: Keep the CronJob suspended by default and require approval before unsuspending it.
- **Different results across team members**: Ensure everyone targets the same cluster context.
- **Results not being acted upon**: Define clear escalation procedures for each type of finding.

## Conclusion

Standardizing `calicoctl ipam split` usage across your team ensures consistent IPAM maintenance. By defining when to run the command, how to interpret results, and what actions to take, your team maintains healthy IP address management.
