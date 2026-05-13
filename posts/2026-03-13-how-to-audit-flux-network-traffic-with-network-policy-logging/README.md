# How to Audit Flux Network Traffic with Network Policy Logging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Network Policies, Logging, Auditing, Observability, Calico, Cilium

Description: Enable network policy logging to audit and monitor all traffic flowing to and from Flux controllers for security compliance and troubleshooting.

---

Network policies are only useful if you can verify they are working correctly. Without visibility into which connections are being allowed and denied, you cannot audit your security posture or debug connectivity issues. Network policy logging gives you records of matching connection attempts, and CNI observability tools can add policy verdicts and source and destination details. This is essential for security audits, compliance reporting, and operational troubleshooting of Flux deployments.

This guide covers how to enable and use network policy logging with Calico, Cilium, and native Kubernetes tools to audit all Flux controller traffic.

## Prerequisites

- A Kubernetes cluster (v1.24+) with one of: Calico, Cilium, or another CNI that supports policy logging
- Flux installed in the flux-system namespace
- kubectl with cluster-admin access
- A log aggregation system (Elasticsearch, Loki, CloudWatch, or similar) for production use

## Option A: Auditing with Calico Policy Logging

### Step 1: Enable Flow Logs in Calico

Calico Enterprise includes built-in flow logs. For open-source Calico, enable logging on individual policies using the Log action.

Create a GlobalNetworkPolicy that logs all traffic in flux-system before the deny rule:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: flux-audit-log
spec:
  order: 999
  selector: projectcalico.org/namespace == 'flux-system'
  types:
    - Ingress
    - Egress
  ingress:
    - action: Log
    - action: Deny
  egress:
    - action: Log
    - action: Deny
```

This logs and then denies any traffic not matched by earlier allow policies (which should have lower order numbers).

```bash
calicoctl apply -f flux-audit-log.yaml
```

### Step 2: View Calico Policy Logs

Calico writes policy logs to the node's syslog or iptables log target. View them:

```bash
# On each node

journalctl -k | grep "calico-packet"

# Common syslog locations
grep "calico-packet" /var/log/syslog /var/log/kern.log 2>/dev/null
```

For a more structured approach, keep the Calico policy log prefix predictable and configure rate limits before forwarding the node syslog or kernel log to your logging system:

```yaml
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logPrefix: "calico-packet"
  logActionRateLimit: "100/second"
  logActionRateLimitBurst: 100
```

### Step 3: Parse Calico Log Entries

Each log entry contains the following fields:

```text
calico-packet: IN=<interface> OUT=<interface> SRC=<source-ip> DST=<dest-ip> PROTO=<protocol> SPT=<src-port> DPT=<dst-port> MARK=<policy-mark>
```

Create a script to extract and summarize Flux traffic:

```bash
#!/bin/bash
# Extract logged connections for Flux controllers from node kernel logs
flux_ips=$(kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.status.podIP}{"|"}{end}' | sed 's/|$//')

journalctl -k --since "24 hours ago" | \
  grep "calico-packet" | \
  grep -E "SRC=(${flux_ips})|DST=(${flux_ips})" | \
  sort | uniq -c | sort -rn | head -20
```

## Option B: Auditing with Cilium and Hubble

### Step 1: Enable Hubble

Cilium includes Hubble, a network observability platform. Enable it if not already active:

```bash
cilium hubble enable --ui
```

Verify Hubble is running:

```bash
cilium hubble status
```

### Step 2: Monitor Flux Traffic in Real Time

Watch all traffic for the flux-system namespace:

```bash
hubble observe --namespace flux-system --follow
```

Filter for dropped (denied) traffic only:

```bash
hubble observe --namespace flux-system --verdict DROPPED --follow
```

Watch traffic from a specific controller:

```bash
hubble observe --namespace flux-system --from-pod flux-system/source-controller --follow
```

### Step 3: Export Policy Verdicts

Export traffic data as JSON for analysis:

```bash
hubble observe --namespace flux-system --output json --last 1000 > flux-traffic.json
```

Parse the JSON to build a traffic audit report:

```bash
cat flux-traffic.json | jq -r '[
  .flow.time,
  ((.flow.source.namespace // "-") + "/" + (.flow.source.pod_name // "-")),
  ((.flow.destination.namespace // "-") + "/" + (.flow.destination.pod_name // "-")),
  (.flow.l4.TCP.destination_port // .flow.l4.UDP.destination_port // "-"),
  .flow.verdict
] | @tsv' | column -t
```

### Step 4: Enable Hubble Metrics for Prometheus

Configure Hubble to export policy verdict metrics. Add namespace labels to the flow metric so you can query Flux traffic specifically:

```bash
cilium hubble enable \
  --helm-set hubble.metrics.enabled="{dns,drop,tcp,flow:labelsContext=source_namespace\\,destination_namespace,icmp,httpV2}" \
  --helm-set hubble.metrics.serviceMonitor.enabled=true
```

Query policy verdicts in Prometheus:

```bash
hubble_flows_processed_total{source_namespace="flux-system", verdict="DROPPED"}
```

Create a Grafana dashboard to visualize Flux network activity:

```bash
rate(hubble_flows_processed_total{source_namespace="flux-system"}[5m])
```

### Step 5: Set Up Alerts on Denied Traffic

Create a PrometheusRule to alert when Flux traffic is denied:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-network-alerts
  namespace: monitoring
spec:
  groups:
    - name: flux-network
      rules:
        - alert: FluxNetworkPolicyDrop
          expr: rate(hubble_flows_processed_total{source_namespace="flux-system", verdict="DROPPED"}[5m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller traffic is being dropped by network policy"
            description: "Dropped traffic detected in flux-system namespace. This may indicate a misconfigured network policy or an attack attempt."
```

```bash
kubectl apply -f flux-network-alerts.yaml
```

## Option C: Using Kubernetes Audit Logs

### Step 1: Enable API Server Audit Logging

Even without CNI-specific logging, you can audit Flux API calls through the Kubernetes audit log. Create an audit policy:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
metadata:
  name: flux-audit
rules:
  - level: Metadata
    users:
      - system:serviceaccount:flux-system:source-controller
      - system:serviceaccount:flux-system:kustomize-controller
      - system:serviceaccount:flux-system:helm-controller
      - system:serviceaccount:flux-system:notification-controller
    resources:
      - group: "*"
        resources: ["*"]
  - level: None
```

This logs all API server requests made by Flux service accounts at the Metadata level.

### Step 2: View Audit Logs

The audit log location depends on your cluster setup. Common locations:

```bash
# Managed clusters (EKS, GKE, AKS)
# Check your cloud provider's logging service

# Self-managed clusters
cat /var/log/kubernetes/audit.log | jq 'select(.user.username | startswith("system:serviceaccount:flux-system"))'
```

## Building a Comprehensive Audit Dashboard

### Step 1: Forward Logs to a Central System

Configure Fluent Bit to collect network policy logs and forward them:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Path              /var/log/syslog,/var/log/kern.log
        Tag               calico.*

    [FILTER]
        Name              grep
        Match             calico.*
        Regex             log calico-packet

    [OUTPUT]
        Name              es
        Match             calico.*
        Host              elasticsearch.logging.svc
        Port              9200
        Index             flux-network-audit
```

### Step 2: Create a Summary Report Script

Generate a periodic audit report of Flux network activity:

```bash
#!/bin/bash
# flux-network-audit.sh
# Run this script daily from an admin host, or adapt it for a CronJob with access to your log backend

echo "=== Flux Network Audit Report ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

echo "--- Active Network Policies ---"
kubectl get networkpolicies -n flux-system -o wide
echo ""

echo "--- Flux Controller Status ---"
flux get sources all 2>/dev/null
echo ""

echo "--- Recent Denied Connections (last 24h) ---"
if command -v hubble &> /dev/null; then
    hubble observe --namespace flux-system --verdict DROPPED --since 24h --output compact 2>/dev/null | tail -50
else
    echo "Hubble CLI not found. Query your centralized Calico node logs for calico-packet entries."
fi
echo ""

echo "--- Recent Namespace Events (last 24h) ---"
kubectl get events -n flux-system --sort-by='.lastTimestamp' 2>/dev/null | tail -20
```

Make the script executable and schedule it:

```bash
chmod +x flux-network-audit.sh
```

## Verification

Confirm logging is capturing traffic. Generate some test traffic and check for log entries:

```bash
# Force a reconciliation to generate traffic
flux reconcile source git flux-system

# Check for log entries (Cilium)
hubble observe --namespace flux-system --last 10

# Check for log entries (Calico)
journalctl -k --since "10 minutes ago" | grep "calico-packet"
```

Verify denied traffic is logged by attempting a blocked connection:

```bash
kubectl run test-denied -n flux-system --rm -it --image=busybox -- wget -qO- --timeout=3 https://example.com
```

Check logs for the corresponding deny entry.

## Troubleshooting

**No log entries appear**

For Calico, verify the Log action is in the policy and the order number is correct:

```bash
calicoctl get globalnetworkpolicy flux-audit-log -o yaml
```

For Cilium, verify Hubble is enabled and the relay is running:

```bash
cilium hubble status
kubectl get pods -n kube-system -l k8s-app=hubble-relay
```

**Log volume is too high**

Filter logs to only denied traffic to reduce volume. In Calico, remove the Log action from the allow paths. In Cilium, use `--verdict DROPPED` to filter Hubble output.

**Hubble observe shows no output**

Check that the Hubble relay can reach the Cilium agents:

```bash
hubble observe --namespace flux-system --last 1
```

If this returns nothing, restart the Hubble relay:

```bash
kubectl rollout restart deployment hubble-relay -n kube-system
```

**Audit logs not reaching the aggregation system**

Verify the log forwarder is running and has access to the log files:

```bash
kubectl logs -n logging -l app=fluent-bit --tail=20
```

Check that the log path matches where the CNI writes policy logs.

**Cannot correlate logs to specific Flux operations**

Use Flux event timestamps to cross-reference with network logs:

```bash
kubectl get events -n flux-system --sort-by='.lastTimestamp' | tail -20
```

Match the timestamps with entries in your network policy logs to trace the full flow.
