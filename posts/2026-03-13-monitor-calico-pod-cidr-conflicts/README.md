# How to Monitor Calico Pod CIDR Conflicts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting

Description: Monitor for Calico pod CIDR conflicts using regular IPAM checks, pod IP allocation audits, and routing table anomaly detection.

---

## Introduction

Monitoring for CIDR conflicts in Calico involves periodic IPAM audits and routing anomaly detection. While conflicts are typically created at provisioning time, they can also emerge when the node network changes (e.g., cluster expansion into a new subnet) or when a second IP pool is added that overlaps with existing infrastructure.

The most direct monitoring approach is to combine a scheduled `calicoctl ipam check` CronJob with explicit node and pod address audits. The `ipam check` command validates Calico IPAM state against Kubernetes and can report leaked or incorrectly allocated pod addresses; node-network overlaps still need to be checked against the cluster's node and IP pool ranges.

## Symptoms

- Pod connectivity anomalies affecting specific IP address ranges
- New nodes joining a subnet that overlaps with the pod CIDR

## Root Causes

- No scheduled IPAM audit to detect conflicts early
- Node CIDR expands into pod CIDR range during cluster scaling

## Diagnosis Steps

```bash
calicoctl ipam check
calicoctl ipam show --show-blocks
```

## Solution

**Step 1: Schedule regular IPAM checks**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-ipam-audit
  namespace: kube-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calico-node
          containers:
          - name: checker
            image: calico/ctl:v3.27.0
            env:
            - name: DATASTORE_TYPE
              value: kubernetes
            command:
            - /bin/sh
            - -c
            - |
              OUTPUT=$(calicoctl ipam check --show-problem-ips 2>&1)
              STATUS=$?
              echo "$OUTPUT"
              if [ "$STATUS" -ne 0 ] || echo "$OUTPUT" | grep -Eiq "leaked|not allocated|problem|error"; then
                echo "ALERT: IPAM integrity issue detected"
                exit 1
              fi
              echo "IPAM check: no integrity issues found"
          restartPolicy: Never
```

**Step 2: Alert on pod IP duplication**

```bash
# Check for pod IPs that match node IPs (sign of CIDR conflict)

NODE_IPS=$(kubectl get nodes \
  -o jsonpath='{range .items[*]}{.status.addresses[?(@.type=="InternalIP")].address}{" "}{end}')
POD_IPS=$(kubectl get pods --all-namespaces \
  -o jsonpath='{range .items[*]}{.status.podIP}{" "}{end}')

for IP in $NODE_IPS; do
  if printf '%s\n' $POD_IPS | grep -Fxq "$IP"; then
    echo "CONFLICT: Pod has same IP as node: $IP"
  fi
done
```

**Step 3: Monitor routing table for anomalies**

```bash
# Watch for unexpected IP-in-IP tunnel routes when Calico IP-in-IP is enabled
ip route show dev tunl0 | while read ROUTE; do
  echo "Tunnel route: $ROUTE"
  # Flag if the destination overlaps with known node or infrastructure ranges
done
```

```mermaid
flowchart LR
    A[CronJob: calicoctl ipam check every 6h] --> B{Integrity issues found?}
    B -- Yes --> C[Job fails]
    C --> D[Alert fires]
    D --> E[On-call investigates CIDR overlap]
    B -- No --> F[Log: IPAM clean]
    G[Node IP vs Pod IP audit] --> H{Overlap found?}
    H -- Yes --> D
```

## Prevention

- Run IPAM checks as part of cluster health reporting
- Alert on IPAM CronJob failures
- Audit node IPs when adding new nodes to confirm they do not overlap with pod CIDR

## Conclusion

Monitoring Calico CIDR conflicts requires scheduled IPAM audits and cross-checking pod IPs against node IPs and infrastructure ranges. A CronJob running `calicoctl ipam check` every 6 hours helps detect IPAM integrity issues before they cause production traffic issues.
