# Automating Cluster Operations with calicoctl ipam split

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, IPAM, Automation, Kubernetes, CI/CD

Description: Integrate calicoctl ipam split into automated workflows for proactive IPAM management and monitoring across your Kubernetes clusters.

---

## Introduction

Manually running `calicoctl ipam split` does not scale across multiple clusters. Automating this command as part of your operational workflows ensures consistent IPAM management and early detection of issues.

## Prerequisites

- Kubernetes clusters with Calico IPAM
- CI/CD or scheduling system
- `calicoctl` available in automation environments

## Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-ipam-split-job
  namespace: calico-system
spec:
  schedule: "0 */8 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calicoctl
          containers:
          - name: ipam-task
            image: calico/ctl:v3.27.0
            command:
            - /bin/sh
            - -c
            - |
              echo "Running calicoctl ipam split at $(date)"
              calicoctl ipam split 10.244.0.0/24 --cidr-size=26
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
  kubectl --context="$CTX" exec -n calico-system \
    $(kubectl --context="$CTX" get pod -n calico-system -l k8s-app=calico-kube-controllers -o jsonpath='{.items[0].metadata.name}' 2>/dev/null) \
    -- calicoctl ipam split 10.244.0.0/24 --cidr-size=26 2>/dev/null || echo "  Failed"
  echo ""
done
```

## CI/CD Integration

```yaml
name: IPAM Operations
on:
  schedule:
    - cron: '0 6 * * *'
jobs:
  ipam-check:
    runs-on: ubuntu-latest
    steps:
      - name: Run calicoctl ipam split
        run: |
          calicoctl ipam split 10.244.0.0/24 --cidr-size=26
```

## Verification

```bash
# Test the CronJob
kubectl create job --from=cronjob/calico-ipam-split-job test-job -n calico-system
kubectl logs -n calico-system -l job-name=test-job -f
```

## Troubleshooting

- **CronJob fails**: Check service account RBAC permissions for IPAM resources.
- **Multi-cluster script timeouts**: Add `--request-timeout` to kubectl exec calls.
- **Inconsistent results**: Ensure all clusters use the same calicoctl version.

## Conclusion

Automating `calicoctl ipam split` ensures consistent IPAM operations across all your clusters. Regular automated execution catches issues early and maintains healthy IP address management.
