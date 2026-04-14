# How to Configure Dapr Placement Service for High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Placement Service, High Availability, Actor, Kubernetes

Description: Configure the Dapr placement service for high availability using multiple replicas and Raft consensus to ensure actor placement continues working during node failures.

---

The Dapr placement service manages the distribution of virtual actors across application instances. If the placement service becomes unavailable, actors cannot be activated or re-distributed after a failure. High availability configuration ensures actor functionality survives control plane disruptions.

## How the Placement Service Works

The placement service maintains a consistent hash ring mapping actor types and IDs to specific application instances. When an actor is invoked, the Dapr sidecar queries the placement service to find which instance hosts that actor.

The placement service uses the Raft consensus algorithm internally to maintain a consistent view across replicas.

## Default vs. HA Deployment

By default, Dapr installs the placement service with a single replica. For production, run at least 3 replicas (the minimum for Raft quorum with fault tolerance).

## Configuring HA via Helm

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=true \
  --set dapr_placement.ha=true \
  --wait
```

## Enabling HA on an Existing Control Plane

For an existing single-replica installation, let Helm recreate the placement StatefulSet with the HA settings instead of hand-authoring a separate manifest:

```bash
kubectl delete statefulset.apps/dapr-placement-server -n dapr-system

helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.ha.enabled=true \
  --set dapr_placement.ha=true \
  --wait
```

## Pod Anti-Affinity for Resilience

Distribute placement replicas across different nodes to prevent all replicas from failing together:

```yaml
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - dapr-placement-server
              topologyKey: kubernetes.io/hostname
```

## Verifying HA Status

Check that all placement replicas are running and a leader has been elected:

```bash
kubectl get pods -n dapr-system -l app=dapr-placement-server
kubectl logs dapr-placement-server-0 -n dapr-system | grep -i "leader\|raft\|elected"
```

## Behavior During Failover

When a placement replica fails:
1. The remaining replicas hold a Raft election
2. A new leader is elected (takes 1-2 seconds)
3. Sidecars reconnect to the new leader automatically
4. Actor placement resumes with a brief rebalancing period

During failover, in-flight actor invocations may return errors. Configure retries in your resiliency policy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: actor-resiliency
spec:
  policies:
    retries:
      actorRetry:
        policy: constant
        duration: 500ms
        maxRetries: 5
  targets:
    actors:
      MyActor:
        retry: actorRetry
```

## Summary

Configuring the Dapr placement service for high availability requires at least 3 replicas with Raft consensus, pod anti-affinity to distribute replicas across nodes, and resiliency policies on the application side to handle brief disruptions during leader elections. This ensures actor functionality survives individual node failures without manual intervention.
