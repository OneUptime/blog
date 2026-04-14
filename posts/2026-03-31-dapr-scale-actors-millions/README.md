# How to Scale Dapr Actors to Millions of Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Scalability, Kubernetes, Placement

Description: Scale Dapr Actor deployments to millions of instances by tuning the placement service, state store partitioning, and actor idle timeout settings.

---

## Dapr Actor Scalability Model

Each Dapr Actor instance is a lightweight virtual object. Millions of instances can exist because only active actors consume memory - idle actors are deactivated and their state is persisted in the state store. The placement service distributes actor instances across pods using consistent hashing.

## State Store for High Scale

Choose a state store that supports millions of keys efficiently:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: actor-statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-cluster.default.svc.cluster.local:6379"
  - name: actorStateStore
    value: "true"
  - name: keyPrefix
    value: "actors"
  - name: maxRetries
    value: "3"
```

For very large deployments use Redis Cluster or Azure Cosmos DB:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: actor-statestore
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://mycosmosdb.documents.azure.com:443/"
  - name: masterKey
    secretKeyRef:
      name: cosmos-secret
      key: key
  - name: database
    value: "dapr-actors"
  - name: collection
    value: "actor-state"
  - name: actorStateStore
    value: "true"
```

## Tuning Actor Idle Timeout

Aggressive idle timeouts reduce memory usage when scaling to millions:

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddActors(options =>
    {
        options.Actors.RegisterActor<DeviceActor>();

        // Deactivate idle actors after 5 minutes
        options.ActorIdleTimeout = TimeSpan.FromMinutes(5);

        // Scan for idle actors every 30 seconds
        options.ActorScanInterval = TimeSpan.FromSeconds(30);

        // Drain actors before pod shutdown
        options.DrainOngoingCallTimeout = TimeSpan.FromSeconds(60);
        options.DrainRebalancedActors = true;

        // Reentrancy for recursive actor calls
        options.ReentrancyConfig = new ActorReentrancyConfig { Enabled = true };
    });
}
```

## Scaling the Placement Service

```bash
# Helm install with HA placement
helm upgrade --install dapr dapr/dapr \
  -n dapr-system \
  --create-namespace \
  --set global.ha.enabled=true \
  --set dapr_placement.ha=true \
  --set dapr_placement.keepAliveTime=2s
```

The placement service is rendered as a StatefulSet by the Dapr Helm chart. Prefer changing the chart values over hand-authoring a separate Deployment for placement.

## Actor Activation Is Demand-Driven

There is no generic actor pre-activation endpoint in Dapr. Actors activate on demand when you invoke an actor method, timer, or reminder. If you need to warm a subset of actors, call a lightweight actor method instead of trying to read actor state directly.

```bash
curl -X POST \
  http://localhost:3500/v1.0/actors/DeviceActor/device-42/method/ping \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Monitoring Actor Scale

```bash
# Check placement service connected hosts
kubectl logs -n dapr-system dapr-placement-server-0 | grep -i "host added"

# Check actor count via Dapr metrics
kubectl port-forward -n dapr-system svc/dapr-placement-server 9090:9090
curl http://localhost:9090/metrics | grep dapr_placement_actor_runtimes_total
```

## Summary

Scaling Dapr Actors to millions of instances requires three things: a state store that handles millions of keys (Redis Cluster or Cosmos DB), aggressive idle-timeout tuning to deactivate unused actors, and a highly available placement service configured through the supported Helm values. Actor lifecycle remains demand-driven, so warm actors by invoking actor methods when needed rather than trying to pre-activate them through a state endpoint.
