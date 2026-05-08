# Automating Cluster Operations with calicoctl ipam release

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Automation, Kubernetes, CI/CD

Description: Integrate calicoctl ipam release into automated workflows for proactive IPAM management and monitoring across your Kubernetes clusters.

---

## Introduction

Manually running `calicoctl ipam release` does not scale across multiple clusters. Automating this command after generating an `ipam check` report ensures consistent IPAM cleanup and early detection of issues.

## Prerequisites

- Kubernetes clusters with Calico IPAM
- CI/CD or scheduling system
- `calicoctl` available in automation environments
- Datastore access configured for `calicoctl`, such as a kubeconfig or in-cluster service account with the required RBAC

## Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-ipam-release-job
  namespace: calico-system
spec:
  schedule: "0 */8 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calicoctl
          initContainers:
          - name: ipam-check
            image: calico/ctl:v3.32.0
            env:
            - name: DATASTORE_TYPE
              value: kubernetes
            args:
            - ipam
            - check
            - -o
            - /work/report.json
            volumeMounts:
            - name: work
              mountPath: /work
          containers:
          - name: ipam-release
            image: calico/ctl:v3.32.0
            env:
            - name: DATASTORE_TYPE
              value: kubernetes
            args:
            - ipam
            - release
            - --from-report=/work/report.json
            volumeMounts:
            - name: work
              mountPath: /work
          restartPolicy: Never
          volumes:
          - name: work
            emptyDir: {}
```

## Multi-Cluster Script

```bash
#!/bin/bash
# fleet-ipam-release.sh

CONTEXTS=$(kubectl config get-contexts -o name)

for CTX in $CONTEXTS; do
  echo "=== $CTX ==="
  REPORT=$(mktemp)
  DATASTORE_TYPE=kubernetes calicoctl --context="$CTX" ipam check -o "$REPORT" &&
    DATASTORE_TYPE=kubernetes calicoctl --context="$CTX" ipam release --from-report="$REPORT" ||
    echo "  Failed"
  rm -f "$REPORT"
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
    env:
      DATASTORE_TYPE: kubernetes
      KUBECONFIG: ${{ runner.temp }}/kubeconfig
    steps:
      - name: Configure kubeconfig
        run: |
          printf '%s' "${{ secrets.KUBECONFIG }}" > "$KUBECONFIG"
      - name: Run calicoctl ipam release
        run: |
          calicoctl ipam check -o report.json
          calicoctl ipam release --from-report=report.json
```

## Verification

```bash
# Test the CronJob

kubectl create job --from=cronjob/calico-ipam-release-job test-job -n calico-system
kubectl logs -n calico-system -l job-name=test-job -f
```

## Troubleshooting

- **CronJob fails**: Check service account RBAC permissions for IPAM resources.
- **Multi-cluster script timeouts**: Verify each kubeconfig context is reachable before running the fleet script.
- **Inconsistent results**: Ensure all clusters use the same calicoctl version.

## Conclusion

Automating `calicoctl ipam check` with report-based `calicoctl ipam release` ensures consistent IPAM operations across all your clusters. Regular automated checks catch issues early and maintain healthy IP address management.
