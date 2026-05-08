# How to Use Controllers in Cilium Observability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Controller, Observability, Kubernetes, eBPF

Description: Learn how to leverage Cilium's internal controllers for operational observability, including querying controller state, interpreting run statistics, and using controller data to diagnose cluster...

---

## Introduction

Cilium controllers are the reconciliation loops that keep your cluster's networking state in sync. Every time a pod is created, a network policy is applied, or a node joins the cluster, one or more controllers trigger to update the BPF datapath accordingly. Each controller tracks its own run count, success rate, last error, and duration.

Using controller data effectively gives you a window into the real-time behavior of Cilium. Instead of guessing why a policy is not taking effect or why endpoint regeneration is slow, you can query controller status directly and correlate it with metrics and logs.

This guide focuses on practical usage patterns for Cilium controllers, showing you how to interpret their output, correlate them with observability data, and use them in your day-to-day operations workflow.

## Prerequisites

- Kubernetes cluster running Cilium 1.14+
- kubectl installed, with access to the in-pod `cilium-dbg` CLI
- Prometheus with Cilium metrics enabled
- Familiarity with Cilium endpoint and policy concepts

## Querying Controller State

The primary interface for controller data is the in-pod `cilium-dbg status --all-controllers` command:

```bash
# List all controllers with their current status

kubectl -n kube-system exec ds/cilium -- cilium-dbg status --all-controllers

# Get a specific controller by name pattern
kubectl -n kube-system exec ds/cilium -- cilium-dbg status --all-controllers | grep "policy"

# JSON output for programmatic analysis
kubectl -n kube-system exec ds/cilium -- cilium-dbg status --all-controllers -o json
```

Each controller entry contains these key fields:

```bash
# Parse and display controller details
kubectl -n kube-system exec ds/cilium -- cilium-dbg status --all-controllers -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
controllers = data.get('controllers', [])
for c in controllers[:5]:
    s = c.get('status', {})
    print(f\"Controller: {c['name']}\")
    print(f\"  Success count: {s.get('success-count', 0)}\")
    print(f\"  Failure count: {s.get('failure-count', 0)}\")
    print(f\"  Consecutive failures: {s.get('consecutive-failure-count', 0)}\")
    print(f\"  Last success: {s.get('last-success-timestamp', 'never')}\")
    print(f\"  Last failure: {s.get('last-failure-timestamp', 'never')}\")
    print(f\"  Last error: {s.get('last-failure-msg', 'none')}\")
    print()
"
```

## Correlating Controllers with Network Events

Controllers often correlate with observable network behavior. Understanding which controller groups are active during common operations helps you trace issues:

```mermaid
graph LR
    A[Pod Created] --> B[endpoint-related controllers]
    B --> C[endpoint regeneration]
    C --> D[BPF program compiled and attached]

    E[NetworkPolicy Applied] --> F[policy and selector processing]
    F --> G[endpoint regeneration]
    G --> H[BPF maps updated]

    I[Node Joined] --> J[node discovery or ipcache controllers]
    J --> K[Tunnel/routing updated]
```

To trace a specific operation through controllers:

```bash
# Watch controllers in real-time while creating a pod
# Terminal 1: Watch controllers
kubectl -n kube-system exec ds/cilium -- watch -n 1 "cilium-dbg status --all-controllers | grep -E 'endpoint|policy'"

# Terminal 2: Capture the start time and create a test pod
START=$(date -u +%Y-%m-%dT%H:%M:%S)
kubectl run test-pod --image=nginx --restart=Never

# After the pod is running, check which controllers ran
kubectl -n kube-system exec ds/cilium -- cilium-dbg status --all-controllers -o json | START="$START" python3 -c "
import json, os, sys
controllers = json.load(sys.stdin)
controllers = controllers.get('controllers', [])
start = os.environ['START']
recent = [c for c in controllers
          if c.get('status', {}).get('last-success-timestamp', '')[:19] >= start]
for c in recent:
    print(f\"Recently active: {c['name']}\")
"
```

## Using Controller Metrics for Capacity Planning

Controller run duration and frequency provide signals about cluster load:

```bash
# Query: Average controller run duration over the last hour
# High durations indicate the agent is under load
curl -G -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=rate(cilium_controllers_runs_duration_seconds_sum[1h])/rate(cilium_controllers_runs_duration_seconds_count[1h])' | python3 -m json.tool

# Query: Total controller runs per minute (measures reconciliation load)
curl -G -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(cilium_controllers_runs_total[5m]))*60' | python3 -m json.tool

# Query: Failure ratio by controller group
curl -G -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum by (group_name)(rate(cilium_controllers_group_runs_total{status="failure"}[5m]))/sum by (group_name)(rate(cilium_controllers_group_runs_total[5m]))>0' | python3 -m json.tool
```

Key starting points to tune for your cluster:

- Controller run duration above 30 seconds: indicates resource pressure
- Failure ratio above 5%: investigate specific failing controller groups
- Consecutive failure count above 10: likely a persistent configuration issue

## Automating Controller Health Checks

Create a script to run as a CronJob for regular health checks:

```yaml
# cilium-controller-check.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cilium-controller-health-check
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-controller-health-check
  namespace: kube-system
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-controller-health-check
  namespace: kube-system
subjects:
  - kind: ServiceAccount
    name: cilium-controller-health-check
    namespace: kube-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-controller-health-check
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cilium-controller-health-check
  namespace: kube-system
spec:
  schedule: "*/10 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cilium-controller-health-check
          containers:
            - name: checker
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Get all Cilium pods
                  PODS=$(kubectl get pods -n kube-system -l k8s-app=cilium -o name)
                  for pod in $PODS; do
                    FAILING=$(kubectl exec -n kube-system "$pod" -- \
                      cilium-dbg status --all-controllers \
                        -o jsonpath='{range .controllers[*]}{.name}{"\t"}{.status["consecutive-failure-count"]}{"\n"}{end}' 2>/dev/null | \
                      awk '$2 > 5 {print $1}')
                    if [ -n "$FAILING" ]; then
                      echo "WARNING: $pod has failing controllers:"
                      echo "$FAILING"
                    fi
                  done
          restartPolicy: OnFailure
```

```bash
kubectl apply -f cilium-controller-check.yaml
```

## Verification

Confirm your controller observability is working:

```bash
# 1. List all controllers across all nodes
for pod in $(kubectl get pods -n kube-system -l k8s-app=cilium -o name); do
  echo "=== $pod ==="
  kubectl -n kube-system exec $pod -- cilium-dbg status --all-controllers 2>/dev/null | tail -5
done

# 2. Check for any currently failing controllers
kubectl -n kube-system exec ds/cilium -- cilium-dbg status --all-controllers -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
data = data.get('controllers', [])
failing = [c for c in data if c.get('status',{}).get('consecutive-failure-count',0) > 0]
print(f'Total controllers: {len(data)}, Failing: {len(failing)}')
"

# 3. Verify metrics are available in Prometheus
curl -s 'http://localhost:9090/api/v1/query?query=count(cilium_controllers_failing)' | python3 -m json.tool
```

## Troubleshooting

- **Controller status shows stale timestamps**: The controller may have a long interval. Some controllers only run on-demand (event-triggered), not on a timer.

- **Cannot exec into Cilium pods**: Ensure your RBAC allows exec into kube-system pods. Check with `kubectl auth can-i exec pods -n kube-system`.

- **Controller names are not descriptive**: Use `cilium-dbg status --all-controllers -o json` to get the full controller metadata including the UUID and configuration parameters.

- **Too many controllers to monitor**: Focus on controller names and groups matching endpoint regeneration, policy processing, Kubernetes synchronization, and IPAM/operator activity in your own output. Exact names vary by Cilium version and enabled features.

## Conclusion

Cilium controllers provide a detailed operational view of your cluster's networking reconciliation. By querying controller state, correlating it with network events, and building automated health checks, you gain the ability to proactively detect and resolve issues. Integrate controller metrics into your existing monitoring stack to maintain continuous visibility into the health of your Cilium deployment.
