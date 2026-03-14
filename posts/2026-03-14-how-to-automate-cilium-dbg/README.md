# Automating Cilium Debug Command Operations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Debugging, Automation, Kubernetes, Monitoring, DevOps

Description: Automate cilium-dbg commands across clusters for scheduled health checks, bulk diagnostics, and CI/CD integration.

---

## Introduction

The `cilium-dbg` command is the primary debugging interface for the Cilium agent. It provides subcommands for inspecting endpoints, policies, BPF maps, identities, and the overall health of the agent. Understanding how to work with cilium-dbg output is essential for effective Cilium operations.

While cilium-dbg is typically used interactively, automating its execution across cluster nodes enables scheduled health monitoring, bulk data collection, and integration with alerting systems. This transforms ad-hoc debugging into systematic observability.

This guide covers automation patterns for cilium-dbg, from simple multi-node scripts to Kubernetes-native monitoring jobs.



## Prerequisites

- Kubernetes cluster with Cilium installed
- `kubectl` access to cilium pods
- `jq` for JSON processing
- Bash or Python for scripting

## Multi-Node Command Execution

### Run Commands Across All Cilium Pods

\`\`\`bash
#!/bin/bash
# cilium-dbg-all-nodes.sh
# Run a cilium-dbg command on all Cilium agent pods

set -euo pipefail

CMD="\${1:-status --brief}"
NAMESPACE="\${CILIUM_NAMESPACE:-kube-system}"

PODS=\$(kubectl -n "\$NAMESPACE" get pods -l k8s-app=cilium   -o jsonpath='{range .items[*]}{.metadata.name},{.spec.nodeName}{"\n"}{end}')

while IFS=',' read -r pod node; do
  [ -z "\$pod" ] && continue
  echo "=== \$node ==="
  kubectl -n "\$NAMESPACE" exec "\$pod" -c cilium-agent --     cilium-dbg \$CMD 2>/dev/null || echo "FAILED"
  echo ""
done <<< "\$PODS"
\`\`\`

\`\`\`bash
# Usage examples
bash cilium-dbg-all-nodes.sh "status --brief"
bash cilium-dbg-all-nodes.sh "endpoint list"
bash cilium-dbg-all-nodes.sh "bpf ct list global"
\`\`\`

### Scheduled Health Monitoring

\`\`\`yaml
# cilium-health-monitor.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cilium-dbg-health
  namespace: kube-system
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cilium
          containers:
          - name: health-check
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              UNHEALTHY=0
              PODS=\$(kubectl -n kube-system get pods -l k8s-app=cilium                 -o jsonpath='{.items[*].metadata.name}')
              for pod in \$PODS; do
                STATUS=\$(kubectl -n kube-system exec "\$pod" -c cilium-agent --                   cilium-dbg status --brief 2>/dev/null || echo "FAIL")
                if ! echo "\$STATUS" | grep -q "OK"; then
                  UNHEALTHY=\$((UNHEALTHY + 1))
                  echo "ALERT: \$pod is unhealthy"
                fi
              done
              echo "Health check: \$UNHEALTHY unhealthy agents"
              [ "\$UNHEALTHY" -gt 0 ] && exit 1 || exit 0
          restartPolicy: OnFailure
\`\`\`

### Exporting Metrics

\`\`\`bash
#!/bin/bash
# cilium-dbg-metrics.sh
# Export cilium-dbg data as Prometheus metrics

NAMESPACE="kube-system"
CILIUM_POD=\$(kubectl -n "\$NAMESPACE" get pods -l k8s-app=cilium   -o jsonpath='{.items[0].metadata.name}')
NODE=\$(kubectl -n "\$NAMESPACE" get pod "\$CILIUM_POD" -o jsonpath='{.spec.nodeName}')

# Endpoint metrics
EP_JSON=\$(kubectl -n "\$NAMESPACE" exec "\$CILIUM_POD" -c cilium-agent --   cilium-dbg endpoint list -o json 2>/dev/null)

TOTAL=\$(echo "\$EP_JSON" | jq length)
READY=\$(echo "\$EP_JSON" | jq '[.[] | select(.status.state=="ready")] | length')

cat << METRICS
# HELP cilium_endpoints_total Total endpoints on node
# TYPE cilium_endpoints_total gauge
cilium_endpoints_total{node="\$NODE"} \$TOTAL
# HELP cilium_endpoints_ready Ready endpoints on node
# TYPE cilium_endpoints_ready gauge
cilium_endpoints_ready{node="\$NODE"} \$READY
METRICS
\`\`\`



## Verification

```bash
# Test multi-node script
bash cilium-dbg-all-nodes.sh "status --brief"

# Test metrics export
bash cilium-dbg-metrics.sh

# Test CronJob
kubectl apply -f cilium-health-monitor.yaml
kubectl -n kube-system get cronjob cilium-dbg-health
```

## Troubleshooting

- **Commands timeout on large clusters**: Increase `--request-timeout` and consider running commands in parallel.
- **JSON output is empty array**: The agent may have no endpoints yet. Check `cilium-dbg status` first.
- **Table output columns shift**: Use JSON output (`-o json`) for reliable parsing. Tables are for human consumption.
- **Agent unreachable errors**: Verify the cilium-agent container is running and the API socket exists.

## Conclusion

Automating cilium-dbg commands transforms debugging into monitoring. Scheduled multi-node execution, metrics export, and CI/CD integration give you continuous visibility into Cilium agent health and state across your entire cluster fleet.


