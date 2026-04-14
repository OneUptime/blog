# How to Configure Dapr Scheduler for High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Scheduler, High Availability, Kubernetes, etcd

Description: Configure Dapr Scheduler for high availability with 3 replicas, cross-zone distribution, etcd quorum settings, and pod disruption budgets.

---

## HA Architecture for Dapr Scheduler

The Dapr Scheduler uses embedded etcd for job storage. The Helm chart deploys the Scheduler as a 3-replica StatefulSet to form a 3-node etcd cluster. etcd requires quorum - a majority of nodes must be available. With 3 replicas, 1 can fail while maintaining quorum.

## Deploying in HA Mode

The Dapr Scheduler always runs as a 3-replica StatefulSet (hardcoded in the Helm chart to form a 3-node etcd cluster). Enable HA mode for the other control plane services:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.ha.enabled=true \
  --reuse-values
```

## Full HA Configuration via Helm Values

```yaml
global:
  ha:
    enabled: true

dapr_scheduler:
  cluster:
    storageClassName: "premium-ssd"
    storageSize: "32Gi"
```

The Scheduler's pod anti-affinity and zone distribution are built into the Helm chart template. Use `global.ha.topologyKey` (default: `topology.kubernetes.io/zone`) to control which topology key the anti-affinity uses.

## Pod Disruption Budget

Protect the Scheduler during voluntary disruptions like node drains:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: dapr-scheduler-pdb
  namespace: dapr-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: dapr-scheduler-server
```

Apply:

```bash
kubectl apply -f dapr-scheduler-pdb.yaml
```

## Cross-Zone Distribution

The Dapr Scheduler Helm chart includes built-in pod anti-affinity that spreads replicas across topology zones. Configure the topology key used for distribution:

```yaml
global:
  ha:
    topologyKey: topology.kubernetes.io/zone
```

This is the default value. The chart applies a preferred pod anti-affinity rule using this key to spread `dapr-scheduler-server` pods across zones.

## Verifying HA Health

After configuring HA, verify all 3 Scheduler pods are running and ready:

```bash
kubectl get pods -n dapr-system -l app=dapr-scheduler-server
```

Check the Scheduler logs for etcd cluster membership messages:

```bash
kubectl logs -n dapr-system dapr-scheduler-server-0 | grep "etcd"
```

Simulate a failure by deleting one pod and confirming jobs still trigger:

```bash
kubectl delete pod dapr-scheduler-server-1 -n dapr-system
# Verify jobs still work
curl http://localhost:3500/v1.0-alpha1/jobs/test-job
```

## Summary

Configure Dapr Scheduler for high availability by deploying 3 replicas with pod anti-affinity, cross-zone topology spread, persistent storage, and a Pod Disruption Budget. Always run an odd number of replicas to maintain etcd quorum. Test HA by deleting individual pods and verifying job execution continues uninterrupted.
