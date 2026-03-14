# How to Set Up Typha High Availability in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Hard Way

Description: A step-by-step guide to deploying a highly available Typha configuration with multiple replicas and anti-affinity rules in a manually installed Calico cluster.

---

## Introduction

Setting up Typha HA in a hard way installation involves scaling the Typha Deployment to multiple replicas, configuring pod anti-affinity to spread replicas across nodes and availability zones, and verifying that Felix agents distribute their connections across all Typha replicas. The Typha Service handles connection distribution automatically, but the anti-affinity rules require explicit configuration.

## Prerequisites

- Typha deployed with at least one replica (see setup guide)
- Kubernetes cluster with at least 2 nodes available for Typha pods
- `kubectl` access with edit permissions on `calico-system`

## Step 1: Scale Typha to Multiple Replicas

For a cluster with 200-500 nodes, use 2 replicas.

```bash
kubectl scale deployment calico-typha -n calico-system --replicas=2
kubectl rollout status deployment/calico-typha -n calico-system
```

For clusters with 500-2000 nodes, use 3 replicas.

```bash
kubectl scale deployment calico-typha -n calico-system --replicas=3
```

## Step 2: Configure Pod Anti-Affinity

Anti-affinity prevents all Typha replicas from being scheduled on the same node.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "affinity": {
          "podAntiAffinity": {
            "requiredDuringSchedulingIgnoredDuringExecution": [
              {
                "labelSelector": {
                  "matchExpressions": [
                    {
                      "key": "app",
                      "operator": "In",
                      "values": ["calico-typha"]
                    }
                  ]
                },
                "topologyKey": "kubernetes.io/hostname"
              }
            ]
          }
        }
      }
    }
  }
}'
```

This ensures each Typha replica is on a different host. If a node fails, only one Typha replica is lost.

## Step 3: Configure Zone-Level Anti-Affinity

For multi-zone clusters, spread Typha across availability zones.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "affinity": {
          "podAntiAffinity": {
            "preferredDuringSchedulingIgnoredDuringExecution": [
              {
                "weight": 100,
                "podAffinityTerm": {
                  "labelSelector": {
                    "matchLabels": {"app": "calico-typha"}
                  },
                  "topologyKey": "topology.kubernetes.io/zone"
                }
              }
            ]
          }
        }
      }
    }
  }
}'
```

Use `preferred` (not `required`) for zone-level to avoid blocking scheduling in single-zone clusters.

## Step 4: Configure Pod Disruption Budget

Ensure at least one Typha replica is always available during cluster maintenance.

```bash
kubectl apply -f - <<EOF
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: calico-typha-pdb
  namespace: calico-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      k8s-app: calico-typha
EOF
```

With this PDB, `kubectl drain` will not evict the last Typha replica, preventing Typha from having zero replicas during node maintenance.

## Step 5: Verify Replicas Are on Different Nodes

```bash
kubectl get pods -n calico-system -l k8s-app=calico-typha -o wide
```

Each Typha pod should show a different node name in the `NODE` column.

## Step 6: Verify Felix Connections Distribute Across Replicas

```bash
# Check connection counts on each Typha pod
for pod in $(kubectl get pods -n calico-system -l k8s-app=calico-typha -o name); do
  echo "=== $pod ==="
  kubectl exec -n calico-system $pod -- \
    wget -qO- http://localhost:9093/metrics | grep typha_connections_active
done
```

Connections should be approximately evenly distributed across all Typha replicas.

## Step 7: Test HA Failover

Simulate a Typha replica failure.

```bash
# Delete one Typha pod
TYPHA_POD=$(kubectl get pods -n calico-system -l k8s-app=calico-typha -o name | head -1)
kubectl delete $TYPHA_POD -n calico-system

# Observe policy propagation continues (test with a policy change)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ha-failover-test
  namespace: default
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

sleep 10

# Verify policy was programmed on a node
kubectl debug node/<node-name> -it --image=busybox -- chroot /host iptables -L | grep cali | wc -l

kubectl delete networkpolicy ha-failover-test
```

Policy should propagate even with one Typha replica down.

## Conclusion

Setting up Typha HA in a hard way installation requires scaling the Deployment to multiple replicas, applying pod anti-affinity rules to distribute replicas across nodes and zones, and configuring a PodDisruptionBudget to prevent zero-replica situations during maintenance. Verifying connection distribution across replicas and testing failover confirms that the HA configuration functions as designed.
