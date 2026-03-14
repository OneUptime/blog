# How to Configure Typha High Availability in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Configuration, Hard Way

Description: A guide to configuring Typha HA parameters including topology spread, connection rebalancing, and Felix reconnect behavior for a manually installed Calico cluster.

---

## Introduction

After deploying multiple Typha replicas, configuring HA parameters ensures that Felix connections are evenly distributed, that Typha replicas rebalance connections after a failure event, and that Felix reconnects quickly after a replica failure. These configurations are the difference between a Typha HA deployment that merely survives failures and one that recovers cleanly without leaving some replicas overloaded.

## Step 1: Configure Topology Spread Constraints

Topology spread constraints offer more fine-grained control than pod anti-affinity. Use them to ensure Typha replicas are spread across zones and hosts.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "topologySpreadConstraints": [
          {
            "maxSkew": 1,
            "topologyKey": "topology.kubernetes.io/zone",
            "whenUnsatisfiable": "ScheduleAnyway",
            "labelSelector": {
              "matchLabels": {"app": "calico-typha"}
            }
          },
          {
            "maxSkew": 1,
            "topologyKey": "kubernetes.io/hostname",
            "whenUnsatisfiable": "DoNotSchedule",
            "labelSelector": {
              "matchLabels": {"app": "calico-typha"}
            }
          }
        ]
      }
    }
  }
}'
```

`DoNotSchedule` for hostname prevents two replicas on the same host. `ScheduleAnyway` for zone allows multi-zone distribution to be best-effort.

## Step 2: Configure Connection Rebalancing

When a Typha replica restarts after a failure, Felix agents that were connecting to it reconnect to the surviving replicas, creating an imbalance. Connection rebalancing gradually moves connections to the restarted replica.

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_CONNECTIONREBALANCINGMODE=auto
```

`auto` mode enables Typha to shed connections gradually to allow other replicas to take them, achieving an even distribution over time.

## Step 3: Configure Felix Reconnect Parameters

Felix should reconnect quickly after a Typha replica failure.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "typhaReadTimeout": "30s"
  }}'
```

A 30-second timeout means Felix will detect a failed Typha connection within 30 seconds and begin reconnecting.

## Step 4: Configure Graceful Connection Shutdown

When scaling down Typha or during rolling updates, Typha should gracefully shed connections rather than dropping them abruptly.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "terminationGracePeriodSeconds": 60
      }
    }
  }
}'
```

The 60-second grace period allows Typha to shed connections gracefully, giving Felix time to reconnect to other replicas before the pod terminates.

## Step 5: Configure Replica Update Strategy

During rolling updates (e.g., Typha version upgrades), ensure at least one replica is always running.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "strategy": {
      "type": "RollingUpdate",
      "rollingUpdate": {
        "maxUnavailable": 1,
        "maxSurge": 1
      }
    }
  }
}'
```

With 3 replicas: 1 old replica can go down, 1 new replica comes up, and 2 replicas are always available during the update.

## Step 6: Configure Resource Requests for Consistent Scheduling

Inconsistent resource requests can cause the Kubernetes scheduler to place Typha pods suboptimally. Set consistent requests and limits.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "calico-typha",
          "resources": {
            "requests": {"cpu": "200m", "memory": "256Mi"},
            "limits": {"cpu": "1000m", "memory": "512Mi"}
          }
        }]
      }
    }
  }
}'
```

## Step 7: Verify HA Configuration

```bash
# Check topology spread
kubectl get pods -n calico-system -l k8s-app=calico-typha -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName,ZONE:.metadata.labels.'topology\.kubernetes\.io/zone'

# Check PDB
kubectl get pdb calico-typha-pdb -n calico-system

# Check connection balance across replicas
for pod in $(kubectl get pods -n calico-system -l k8s-app=calico-typha -o name); do
  COUNT=$(kubectl exec -n calico-system $pod -- wget -qO- http://localhost:9093/metrics | grep typha_connections_active | awk '{print $2}')
  echo "$pod: $COUNT connections"
done
```

## Conclusion

Configuring Typha HA goes beyond adding replicas - it requires topology spread constraints for even placement, connection rebalancing for post-failure recovery, appropriate Felix reconnect timeouts, graceful termination periods for rolling updates, and a rolling update strategy that maintains minimum replica availability. Together these configurations ensure that Typha HA provides actual resilience rather than just theoretical redundancy.
