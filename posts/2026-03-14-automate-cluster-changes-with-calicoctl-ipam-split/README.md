# Automating Cluster Operations with calicoctl ipam split

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Automation, Kubernetes, CI/CD

Description: Integrate calicoctl ipam split into automated workflows for proactive IPAM management and monitoring across your Kubernetes clusters.

---

## Introduction

Manually running `calicoctl ipam split` does not scale across multiple clusters. Automating this command as part of an approved maintenance workflow ensures consistent IP pool changes and repeatable execution.

## Prerequisites

- Kubernetes clusters with Calico IPAM and a Calico version that supports `calicoctl ipam split`
- CI/CD or scheduling system
- `calicoctl` available in automation environments
- A maintenance window for locking and unlocking the Calico datastore

## Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-ipam-split-job
  namespace: calico-system
spec:
  schedule: "0 */8 * * *"
  suspend: true
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calicoctl
          containers:
          - name: ipam-task
            image: calico/ctl:v3.32.0
            command:
            - /bin/sh
            - -c
            - |
              set -e
              echo "Running calicoctl ipam split at $(date)"
              calicoctl datastore migrate lock
              trap 'calicoctl datastore migrate unlock' EXIT
              calicoctl ipam split --cidr=10.244.0.0/24 4
              echo "Complete."
          restartPolicy: Never
```

## Multi-Cluster Script

```bash
#!/bin/bash
# fleet-ipam-split.sh

CONTEXTS=$(kubectl config get-contexts -o name)

for CTX in $CONTEXTS; do
  echo "=== $CTX ==="
  JOB="calico-ipam-split-$(date +%s)"
  kubectl --context="$CTX" create job --from=cronjob/calico-ipam-split-job "$JOB" -n calico-system &&
    kubectl --context="$CTX" logs -n calico-system -l job-name="$JOB" -f ||
    echo "  Failed"
  echo ""
done
```

## CI/CD Integration

```yaml
name: IPAM Operations
on:
  workflow_dispatch:
jobs:
  ipam-check:
    runs-on: self-hosted
    steps:
      - name: Run calicoctl ipam split
        run: |
          calicoctl datastore migrate lock
          trap 'calicoctl datastore migrate unlock' EXIT
          calicoctl ipam split --cidr=10.244.0.0/24 4
```

## Verification

```bash
# Test the CronJob

kubectl create job --from=cronjob/calico-ipam-split-job test-job -n calico-system
kubectl logs -n calico-system -l job-name=test-job -f
```

## Troubleshooting

- **CronJob fails**: Check service account RBAC permissions for IPAM resources and datastore lock operations.
- **Multi-cluster script timeouts**: Add `--request-timeout` to kubectl create job and logs calls.
- **Inconsistent results**: Ensure all clusters use the same calicoctl version.

## Conclusion

Automating `calicoctl ipam split` through approved maintenance workflows ensures consistent IP pool changes across all your clusters. Keeping the execution repeatable helps teams manage IPAM changes safely.
