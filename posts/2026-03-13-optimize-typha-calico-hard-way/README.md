# How to Optimize Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Performance, Optimization, Hard Way

Description: A guide to optimizing Typha's performance in a manually installed Calico cluster through connection tuning, resource allocation, and coalescing configuration.

---

## Introduction

Optimizing Typha for a large Calico cluster focuses on three areas: ensuring Typha has sufficient CPU and memory to handle the fan-out load, tuning the coalescing behavior to minimize redundant Felix dataplane updates, and placing Typha pods on nodes that minimize network latency to Felix agents. Getting these right ensures that policy changes propagate quickly and that Typha's overhead on the cluster is minimal.

## Step 1: Right-Size Typha Resource Requests and Limits

Typha's resource usage scales with the number of connected Felix agents and the rate of policy changes. A starting point for a 500-node cluster:

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "calico-typha",
          "resources": {
            "requests": {
              "cpu": "250m",
              "memory": "256Mi"
            },
            "limits": {
              "cpu": "1000m",
              "memory": "512Mi"
            }
          }
        }]
      }
    }
  }
}'
```

Monitor actual usage.

```bash
kubectl top pod -n calico-system -l app=calico-typha
```

Increase memory if Typha approaches the limit during policy rollouts.

## Step 2: Tune Update Coalescing

Typha batches updates before sending them to Felix. The batch delay controls how long Typha waits for additional updates before fanning out.

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_MINBATCHINGINTERVAL=100ms
```

Shorter intervals mean faster propagation but more CPU usage. Longer intervals reduce CPU at the cost of slightly slower policy propagation. For most production clusters, 100ms is a good balance.

## Step 3: Place Typha on Control Plane or Dedicated Nodes

Typha should run on stable, low-latency nodes. In hard way installations, use node affinity.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "affinity": {
          "nodeAffinity": {
            "requiredDuringSchedulingIgnoredDuringExecution": {
              "nodeSelectorTerms": [{
                "matchExpressions": [{
                  "key": "node-role.kubernetes.io/control-plane",
                  "operator": "Exists"
                }]
              }]
            }
          }
        },
        "tolerations": [{
          "key": "node-role.kubernetes.io/control-plane",
          "effect": "NoSchedule"
        }]
      }
    }
  }
}'
```

## Step 4: Optimize Felix-to-Typha Connection Settings

Configure Felix to reconnect quickly after a Typha restart.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"typhaReadTimeout": "30s"}}'
```

## Step 5: Enable Typha's Snapshot Optimization

When a new Felix agent connects, Typha sends the full current state (a snapshot). Typha caches this snapshot to avoid recomputing it for each new connection.

Check that snapshot caching is active.

```bash
kubectl logs -n calico-system deployment/calico-typha | grep -i "snapshot\|cache" | tail -10
```

## Step 6: Monitor Propagation Latency

Track the time from a policy change to Felix receiving it.

```bash
kubectl port-forward -n calico-system deployment/calico-typha 9093:9093 &
curl -s http://localhost:9093/metrics | grep typha_update_send_latency
```

Target: median send latency under 100ms for a cluster with <1000 nodes.

## Step 7: Anti-Affinity for Typha Replicas

For multi-replica Typha deployments, spread replicas across availability zones.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "affinity": {
          "podAntiAffinity": {
            "requiredDuringSchedulingIgnoredDuringExecution": [{
              "labelSelector": {
                "matchLabels": {"app": "calico-typha"}
              },
              "topologyKey": "topology.kubernetes.io/zone"
            }]
          }
        }
      }
    }
  }
}'
```

## Conclusion

Optimizing Typha involves right-sizing resources, tuning the coalescing batch interval, placing Typha pods on stable nodes with anti-affinity across zones, and monitoring propagation latency through Prometheus metrics. These optimizations ensure that policy updates reach Felix agents quickly while minimizing Typha's impact on cluster resources — the defining goal of the fan-out architecture.
