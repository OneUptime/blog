# Automating Cluster Monitoring with calicoctl node status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Monitoring, Automation, BGP, Kubernetes

Description: Automate BGP health monitoring using calicoctl node status in scripts, cron jobs, and CI/CD pipelines to detect networking issues before they affect applications.

---

## Introduction

Manual BGP health checks do not scale. In a cluster with dozens or hundreds of nodes, you need automated monitoring that continuously checks `calicoctl node status` and alerts when sessions drop. Automating these checks provides early warning of network problems and enables rapid incident response.

This guide covers practical approaches to automating `calicoctl node status` monitoring, from simple cron-based scripts to integration with monitoring stacks like Prometheus.

## Prerequisites

- Kubernetes cluster with Calico in BGP mode
- `calicoctl` installed on each node being checked
- SSH access to nodes for cluster-wide checks
- A monitoring or alerting system
- Basic shell scripting knowledge

## Automated Health Check Script

```bash
#!/bin/bash
# calico-bgp-healthcheck.sh

# Returns exit code 0 if all BGP peers are established, non-zero otherwise

NODE_NAME="${1:-$(hostname)}"

if [ "$NODE_NAME" = "$(hostname)" ]; then
  OUTPUT=$(sudo calicoctl node status 2>&1)
else
  OUTPUT=$(ssh "$NODE_NAME" sudo calicoctl node status 2>&1)
fi

# Check process is running
if ! echo "$OUTPUT" | grep -q "Calico process is running"; then
  echo "CRITICAL: Calico process not running on $NODE_NAME"
  exit 2
fi

# Count peers
TOTAL=$(echo "$OUTPUT" | grep -cE "node-to-node|global|node specific" || true)
ESTABLISHED=$(echo "$OUTPUT" | grep -c "Established" || true)
DOWN=$((TOTAL - ESTABLISHED))

if [ "$DOWN" -gt 0 ]; then
  echo "WARNING: $DOWN of $TOTAL BGP peers are down on $NODE_NAME"
  echo "$OUTPUT" | grep -v "Established" | grep -E "^\|" | grep -v "PEER"
  exit 1
fi

echo "OK: All $TOTAL BGP peers established on $NODE_NAME"
exit 0
```

## Cluster-Wide BGP Monitor

```bash
#!/bin/bash
# cluster-bgp-monitor.sh
# Checks BGP status across all nodes

ALERT_FILE="/tmp/calico-bgp-alerts.log"
> "$ALERT_FILE"

NODES=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')
TOTAL_NODES=0
HEALTHY_NODES=0

for NODE in $NODES; do
  TOTAL_NODES=$((TOTAL_NODES + 1))
  
  STATUS=$(ssh "$NODE" sudo calicoctl node status 2>&1)
  
  if echo "$STATUS" | grep -q "Calico process is running"; then
    ESTABLISHED=$(echo "$STATUS" | grep -c "Established" || true)
    TOTAL_PEERS=$(echo "$STATUS" | grep -cE "node-to-node|global|node specific" || true)
    
    if [ "$ESTABLISHED" -eq "$TOTAL_PEERS" ] && [ "$TOTAL_PEERS" -gt 0 ]; then
      echo "$NODE: OK ($ESTABLISHED/$TOTAL_PEERS peers)"
      HEALTHY_NODES=$((HEALTHY_NODES + 1))
    else
      echo "$NODE: DEGRADED ($ESTABLISHED/$TOTAL_PEERS peers)" | tee -a "$ALERT_FILE"
    fi
  else
    echo "$NODE: CALICO NOT RUNNING" | tee -a "$ALERT_FILE"
  fi
done

echo ""
echo "=== Summary ==="
echo "Total nodes: $TOTAL_NODES"
echo "Healthy: $HEALTHY_NODES"
echo "Issues: $((TOTAL_NODES - HEALTHY_NODES))"

if [ -s "$ALERT_FILE" ]; then
  echo ""
  echo "Alerts written to $ALERT_FILE"
  exit 1
fi
```

## Kubernetes CronJob for Monitoring

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-bgp-monitor
  namespace: calico-system
spec:
  schedule: "*/5 * * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calicoctl
          hostNetwork: true
          volumes:
          - name: calico-run
            hostPath:
              path: /var/run/calico
              type: Directory
          containers:
          - name: monitor
            image: calico/ctl:v3.32.0
            securityContext:
              privileged: true
            volumeMounts:
            - name: calico-run
              mountPath: /var/run/calico
            args:
            - node
            - status
          restartPolicy: Never
```

When running `calicoctl node status` from a container, it still needs access to the local Calico node state. The hostPath mount above lets the command communicate with the Calico agent on the node where the CronJob pod is scheduled. Use a `calico/ctl` image tag that matches the Calico version running in your cluster, and inspect the Job logs for the status output.

## Prometheus Integration

Export BGP metrics for Prometheus scraping:

```bash
#!/bin/bash
# calico-bgp-exporter.sh
# Runs as a simple HTTP metrics endpoint

PORT=${1:-9099}

while true; do
  METRICS=""
  
  STATUS=$(sudo calicoctl node status 2>&1)
  
  TOTAL=$(echo "$STATUS" | grep -cE "node-to-node|global|node specific" || true)
  ESTABLISHED=$(echo "$STATUS" | grep -c "Established" || true)
  RUNNING=$(echo "$STATUS" | grep -c "Calico process is running" || true)
  
  METRICS="# HELP calico_node_running Whether Calico process is running\n"
  METRICS+="# TYPE calico_node_running gauge\n"
  METRICS+="calico_node_running $RUNNING\n"
  METRICS+="# HELP calico_bgp_peers_total Total number of BGP peers\n"
  METRICS+="# TYPE calico_bgp_peers_total gauge\n"
  METRICS+="calico_bgp_peers_total $TOTAL\n"
  METRICS+="# HELP calico_bgp_peers_established Number of established BGP peers\n"
  METRICS+="# TYPE calico_bgp_peers_established gauge\n"
  METRICS+="calico_bgp_peers_established $ESTABLISHED\n"
  
  {
    printf 'HTTP/1.1 200 OK\r\n'
    printf 'Content-Type: text/plain; version=0.0.4\r\n'
    printf '\r\n'
    printf '%b' "$METRICS"
  } | nc -l -p "$PORT" -q 1 > /dev/null 2>&1
done
```

## Verification

Test the monitoring automation:

```bash
# Run the health check
./calico-bgp-healthcheck.sh

# Run the cluster-wide monitor
./cluster-bgp-monitor.sh

# Check the CronJob
kubectl get cronjobs -n calico-system
kubectl get jobs -n calico-system
```

## Troubleshooting

- **CronJob pods fail with permission errors**: Ensure the pod can mount `/var/run/calico` from the host and has the permissions needed to read the local Calico node state.
- **Metrics endpoint not scraped**: Verify the port is accessible and the Prometheus scrape config targets the correct endpoint.
- **False alerts during node scaling**: Add tolerance for newly added nodes that may not have established BGP sessions yet.
- **Script hangs on large clusters**: Add timeouts to SSH calls, such as `timeout 10s ssh "$NODE" sudo calicoctl node status`.

## Conclusion

Automating `calicoctl node status` monitoring transforms BGP health checking from a reactive troubleshooting tool into a proactive alerting system. Whether through simple scripts, Kubernetes CronJobs, or Prometheus integration, continuous BGP monitoring is essential for maintaining reliable Calico networking at scale.
