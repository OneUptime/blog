# Standardizing Team Workflows Around calicoctl ipam release

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Team Workflows, Best Practice

Description: Establish consistent team procedures for using calicoctl ipam release as part of regular IPAM operations and maintenance.

---

## Introduction

When team members use `calicoctl ipam check` and `calicoctl ipam release` inconsistently or infrequently, IPAM issues go unresolved. Standardizing how and when these commands are used ensures consistent IP address management across all environments.

## Prerequisites

- A team managing Calico clusters
- Documented operational procedures
- Scheduling or automation infrastructure
- A `calicoctl` version that matches the Calico version running in the cluster

## Standard Operating Procedures

### When to Run

```yaml
scheduled:
  - frequency: "Daily"
    purpose: "Routine IPAM integrity check"
    
  - frequency: "After node changes"
    purpose: "Verify IPAM consistency before releasing leaked addresses"
    
  - frequency: "After pod issues"
    purpose: "Check for leaked or incorrectly allocated addresses"
```

### Team Script

```bash
#!/bin/bash
# team-ipam-release.sh

set -euo pipefail

REPORT="${REPORT:-ipam-report.json}"

echo "=== calicoctl ipam check and release ==="
echo "Operator: $USER"
echo "Cluster: $(kubectl config current-context)"
echo "Date: $(date)"
echo ""
calicoctl datastore migrate lock
trap 'calicoctl datastore migrate unlock' EXIT
calicoctl ipam check -o "$REPORT"
calicoctl ipam release --from-report "$REPORT"
echo ""
echo "=== Complete ==="
```

### Review Checklist

```markdown
After running calicoctl ipam check and calicoctl ipam release:
- [ ] Output reviewed for errors or warnings
- [ ] Results compared with expected state
- [ ] Only leaked addresses from the report were released
- [ ] Any issues documented and assigned
- [ ] Results shared with team if noteworthy
```

## Automated Monitoring

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: team-ipam-release
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
            image: calico/ctl:v3.32.0
            env:
            - name: DATASTORE_TYPE
              value: kubernetes
            command: ["/bin/sh", "-c", "calicoctl ipam check --show-problem-ips -o /tmp/ipam-report.json"]
          restartPolicy: Never
```

## Verification

```bash
./team-ipam-release.sh
```

## Troubleshooting

- **Team members not running checks**: Automate with CronJobs and send results to a shared channel.
- **Different results across team members**: Ensure everyone targets the same cluster context.
- **Results not being acted upon**: Define clear escalation procedures for each type of finding.

## Conclusion

Standardizing `calicoctl ipam check` and `calicoctl ipam release` usage across your team ensures consistent IPAM visibility and controlled cleanup of leaked addresses. By defining when to run the commands, how to interpret results, and what actions to take, your team maintains healthy IP address management.
