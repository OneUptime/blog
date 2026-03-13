# How to Balance Load Across Shard Controllers in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Sharding, Load Balancing, Scalability

Description: Learn strategies and techniques for balancing reconciliation load across Flux shard controllers to prevent hotspots and maximize throughput.

---

## Introduction

Deploying multiple Flux controller shards is only half the battle. Without proper load balancing, one shard can become a hotspot while others sit idle. This guide covers strategies for distributing resources evenly, detecting imbalances, and rebalancing shards when workloads change.

## Prerequisites

- A running Kubernetes cluster with Flux bootstrapped
- Multiple controller shard instances deployed
- Prometheus metrics collection configured
- Basic understanding of Flux sharding concepts

## Detecting Imbalances

Before rebalancing, identify which shards are overloaded.

```bash
# Count resources per shard
echo "=== Shard Distribution ==="
for shard in shard-1 shard-2 shard-3; do
  ks_count=$(kubectl get kustomizations -A \
    -l "sharding.fluxcd.io/key=$shard" --no-headers 2>/dev/null | wc -l)
  hr_count=$(kubectl get helmreleases -A \
    -l "sharding.fluxcd.io/key=$shard" --no-headers 2>/dev/null | wc -l)
  echo "$shard: $ks_count Kustomizations, $hr_count HelmReleases"
done

unsharded_ks=$(kubectl get kustomizations -A \
  -l '!sharding.fluxcd.io/key' --no-headers 2>/dev/null | wc -l)
unsharded_hr=$(kubectl get helmreleases -A \
  -l '!sharding.fluxcd.io/key' --no-headers 2>/dev/null | wc -l)
echo "main: $unsharded_ks Kustomizations, $unsharded_hr HelmReleases"
```

Check reconciliation duration per shard to find processing-heavy shards.

```bash
# Check average reconciliation time from metrics
for shard in shard-1 shard-2 shard-3; do
  pod=$(kubectl get pods -n flux-system \
    -l "app=kustomize-controller-$shard" \
    -o jsonpath='{.items[0].metadata.name}')
  echo "=== $shard ($pod) ==="
  kubectl logs "$pod" -n flux-system --tail=50 | \
    grep "reconciliation finished" | \
    tail -5
done
```

## Strategy 1: Round-Robin Distribution

Distribute resources evenly across shards by count.

```bash
#!/bin/bash
# rebalance-round-robin.sh
NAMESPACE="${1:-flux-system}"
NUM_SHARDS="${2:-3}"

counter=0
for ks in $(kubectl get kustomizations -n "$NAMESPACE" \
  -o jsonpath='{.items[*].metadata.name}'); do
  shard=$((counter % NUM_SHARDS + 1))
  kubectl label kustomization "$ks" -n "$NAMESPACE" \
    sharding.fluxcd.io/key="shard-$shard" --overwrite
  echo "Assigned $ks -> shard-$shard"
  counter=$((counter + 1))
done
echo "Distributed $counter resources across $NUM_SHARDS shards"
```

## Strategy 2: Weight-Based Distribution

Account for resource complexity when distributing. Heavier resources get dedicated shard capacity.

```bash
#!/bin/bash
# rebalance-weighted.sh
# Assigns resources based on estimated weight

NAMESPACE="flux-system"

get_weight() {
  local name=$1
  local ns=$2
  # Use interval and path depth as proxy for weight
  interval=$(kubectl get kustomization "$name" -n "$ns" \
    -o jsonpath='{.spec.interval}' | sed 's/[^0-9]//g')
  # Shorter intervals mean more reconciliations, higher weight
  if [ "$interval" -le 5 ]; then
    echo 3
  elif [ "$interval" -le 15 ]; then
    echo 2
  else
    echo 1
  fi
}

# Collect resources with weights
declare -A shard_weights
for i in 1 2 3; do
  shard_weights[$i]=0
done

for ks in $(kubectl get kustomizations -n "$NAMESPACE" \
  -o jsonpath='{.items[*].metadata.name}'); do
  weight=$(get_weight "$ks" "$NAMESPACE")

  # Find the shard with the lowest total weight
  min_shard=1
  min_weight=${shard_weights[1]}
  for i in 2 3; do
    if [ "${shard_weights[$i]}" -lt "$min_weight" ]; then
      min_shard=$i
      min_weight=${shard_weights[$i]}
    fi
  done

  kubectl label kustomization "$ks" -n "$NAMESPACE" \
    sharding.fluxcd.io/key="shard-$min_shard" --overwrite
  shard_weights[$min_shard]=$((${shard_weights[$min_shard]} + weight))
  echo "Assigned $ks (weight: $weight) -> shard-$min_shard (total: ${shard_weights[$min_shard]})"
done
```

## Strategy 3: Team-Based Distribution

Assign all resources for a team to the same shard to keep related reconciliations together.

```yaml
# Map teams to shards in a ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: shard-team-mapping
  namespace: flux-system
data:
  team-frontend: shard-1
  team-backend: shard-2
  team-platform: shard-3
```

```bash
#!/bin/bash
# rebalance-by-team.sh
NAMESPACE="flux-system"

# Read team-to-shard mapping
declare -A team_shard
team_shard[team-frontend]="shard-1"
team_shard[team-backend]="shard-2"
team_shard[team-platform]="shard-3"

for ks in $(kubectl get kustomizations -n "$NAMESPACE" \
  -o jsonpath='{range .items[*]}{.metadata.name}={.metadata.labels.team}{"\n"}{end}'); do
  name=$(echo "$ks" | cut -d'=' -f1)
  team=$(echo "$ks" | cut -d'=' -f2)

  if [ -n "${team_shard[$team]}" ]; then
    shard="${team_shard[$team]}"
  else
    shard="shard-1"  # default shard
  fi

  kubectl label kustomization "$name" -n "$NAMESPACE" \
    sharding.fluxcd.io/key="$shard" --overwrite
  echo "Assigned $name (team: $team) -> $shard"
done
```

## Strategy 4: Dynamic Rebalancing with Metrics

Use Prometheus metrics to detect and fix imbalances automatically.

```bash
#!/bin/bash
# dynamic-rebalance.sh
# Moves resources from overloaded shards to underloaded ones

NAMESPACE="flux-system"
THRESHOLD=2.0  # Rebalance if max/avg ratio exceeds this

# Get queue depths from Prometheus
get_queue_depth() {
  local shard=$1
  local pod=$(kubectl get pods -n flux-system \
    -l "app=kustomize-controller-$shard" \
    -o jsonpath='{.items[0].metadata.name}')
  kubectl exec "$pod" -n flux-system -- \
    wget -qO- http://localhost:8080/metrics 2>/dev/null | \
    grep "workqueue_depth " | \
    awk '{print $2}' | head -1
}

depths=()
for shard in shard-1 shard-2 shard-3; do
  depth=$(get_queue_depth "$shard")
  depths+=("$shard:${depth:-0}")
  echo "$shard queue depth: ${depth:-0}"
done

# Find max and min shards
max_shard=""
max_depth=0
min_shard=""
min_depth=999999

for entry in "${depths[@]}"; do
  shard=$(echo "$entry" | cut -d: -f1)
  depth=$(echo "$entry" | cut -d: -f2)
  if [ "$depth" -gt "$max_depth" ]; then
    max_depth=$depth
    max_shard=$shard
  fi
  if [ "$depth" -lt "$min_depth" ]; then
    min_depth=$depth
    min_shard=$shard
  fi
done

echo "Heaviest shard: $max_shard ($max_depth), Lightest: $min_shard ($min_depth)"

# Move one resource if imbalance is detected
if [ "$max_depth" -gt 0 ] && [ "$(echo "$max_depth / ($min_depth + 1) > $THRESHOLD" | bc)" -eq 1 ]; then
  resource=$(kubectl get kustomizations -n "$NAMESPACE" \
    -l "sharding.fluxcd.io/key=$max_shard" \
    -o jsonpath='{.items[0].metadata.name}')
  echo "Moving $resource from $max_shard to $min_shard"
  kubectl label kustomization "$resource" -n "$NAMESPACE" \
    sharding.fluxcd.io/key="$min_shard" --overwrite
fi
```

## Tuning Concurrency Per Shard

Beyond rebalancing resource counts, adjust the concurrency setting for each shard based on its workload.

```yaml
# High-throughput shard (many small resources)
args:
  - --concurrent=20

# Low-throughput shard (fewer but heavier resources)
args:
  - --concurrent=5
```

## Monitoring Balance Over Time

Create a PromQL query to track shard balance.

```promql
# Standard deviation of queue depth across shards (lower is better)
stddev(workqueue_depth{namespace="flux-system", job=~".*shard.*"})

# Max-to-average ratio (should be close to 1.0)
max(workqueue_depth{namespace="flux-system", job=~".*shard.*"})
/
avg(workqueue_depth{namespace="flux-system", job=~".*shard.*"})

# Per-shard reconciliation rate
sum by (pod) (rate(controller_runtime_reconcile_total{namespace="flux-system"}[5m]))
```

## Best Practices

- Rebalance during low-traffic periods to minimize disruption
- Monitor for at least 24 hours after rebalancing to verify improvement
- Account for reconciliation weight, not just resource count
- Keep team-owned resources on the same shard when possible for operational simplicity
- Automate periodic balance checks as part of your observability pipeline
- Start with simple round-robin and move to weighted strategies as you learn your workload patterns

## Conclusion

Balancing load across Flux shard controllers requires ongoing attention. Start with a simple distribution strategy, monitor queue depth and reconciliation times, and adjust as workloads evolve. The combination of proper initial distribution, metrics-based monitoring, and periodic rebalancing ensures that your sharded Flux deployment operates at peak efficiency.
