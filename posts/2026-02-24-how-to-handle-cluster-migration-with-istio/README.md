# How to Handle Cluster Migration with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Migration, Multi-Cluster, Kubernetes, Traffic Management

Description: How to use Istio traffic management to safely migrate workloads from one Kubernetes cluster to another with zero downtime.

---

There are plenty of reasons you might need to migrate workloads from one Kubernetes cluster to another. Maybe you are moving to a new cloud region, upgrading to a newer Kubernetes version that requires a fresh cluster, consolidating clusters, or switching cloud providers. Whatever the reason, Istio makes this process significantly safer by giving you fine-grained control over traffic routing during the migration.

The basic idea is simple: run the workload in both the old and new clusters, use Istio to gradually shift traffic from old to new, and decommission the old cluster once everything is verified. Here is how to do it step by step.

## Setting Up the Multi-Cluster Mesh

Before you can migrate, both clusters need to be part of the same Istio mesh. If they are not already, set up multi-cluster Istio.

Install Istio on the new cluster:

```bash
istioctl install --context=new-cluster \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=new-cluster \
  --set values.global.network=network-new
```

Set up the east-west gateway on the new cluster:

```bash
kubectl apply -f samples/multicluster/expose-services.yaml --context=new-cluster
```

Exchange remote secrets between clusters:

```bash
istioctl create-remote-secret --context=new-cluster --name=new-cluster | \
  kubectl apply -f - --context=old-cluster

istioctl create-remote-secret --context=old-cluster --name=old-cluster | \
  kubectl apply -f - --context=new-cluster
```

Verify the clusters see each other:

```bash
istioctl remote-clusters --context=old-cluster
istioctl remote-clusters --context=new-cluster
```

## Deploying Workloads to the New Cluster

Deploy your services to the new cluster. Use the same Kubernetes manifests with the same labels, service names, and namespaces. Istio discovers services by their Kubernetes service name and namespace, so keeping these consistent is critical.

```bash
# Create the namespace
kubectl create namespace myapp --context=new-cluster
kubectl label namespace myapp istio-injection=enabled --context=new-cluster

# Deploy the application
kubectl apply -f k8s/deployment.yaml --context=new-cluster
kubectl apply -f k8s/service.yaml --context=new-cluster

# Verify pods are running
kubectl get pods -n myapp --context=new-cluster
```

At this point, Istio sees endpoints in both clusters and will load balance between them. But you probably do not want traffic hitting the new cluster yet until you have verified everything works.

## Controlling Traffic with Weighted Routing

Start by sending all traffic to the old cluster using locality-based routing:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: myapp-migration
  namespace: myapp
spec:
  host: myapp.myapp.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        distribute:
        - from: "us-east-1/*"
          to:
            "us-east-1/*": 100
            "us-west-2/*": 0
      simple: ROUND_ROBIN
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

Apply this to both clusters:

```bash
kubectl apply -f migration-dr.yaml --context=old-cluster
kubectl apply -f migration-dr.yaml --context=new-cluster
```

Now gradually increase the weight to the new cluster. Start with 5%:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: myapp-migration
  namespace: myapp
spec:
  host: myapp.myapp.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        distribute:
        - from: "us-east-1/*"
          to:
            "us-east-1/*": 95
            "us-west-2/*": 5
      simple: ROUND_ROBIN
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

Monitor error rates and latency for the new cluster's endpoints. If everything looks good, increase to 25%, then 50%, then 75%, and finally 100%.

## Using Subsets for More Control

If both clusters run the same version of the service, you can use pod labels to create subsets that correspond to clusters:

```bash
# Label pods in old cluster
kubectl label pods -l app=myapp migration-target=old -n myapp --context=old-cluster

# Label pods in new cluster
kubectl label pods -l app=myapp migration-target=new -n myapp --context=new-cluster
```

Then use VirtualService with weights:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: myapp-subsets
  namespace: myapp
spec:
  host: myapp.myapp.svc.cluster.local
  subsets:
  - name: old-cluster
    labels:
      migration-target: old
  - name: new-cluster
    labels:
      migration-target: new
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: myapp-migration
  namespace: myapp
spec:
  hosts:
  - myapp.myapp.svc.cluster.local
  http:
  - route:
    - destination:
        host: myapp.myapp.svc.cluster.local
        subset: old-cluster
      weight: 90
    - destination:
        host: myapp.myapp.svc.cluster.local
        subset: new-cluster
      weight: 10
```

This gives you explicit percentage-based control over the traffic split.

## Migrating Stateful Services

Stateful services are harder to migrate because you need to handle the data. Istio cannot help with data migration, but it can help with traffic management around it.

The typical approach:

1. Set up data replication from old cluster to new cluster (database replication, storage sync, etc.)
2. Deploy the application in the new cluster in read-only mode
3. Send read traffic to the new cluster, write traffic to the old cluster:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: myapp-stateful-migration
  namespace: myapp
spec:
  hosts:
  - myapp.myapp.svc.cluster.local
  http:
  - match:
    - method:
        exact: GET
    route:
    - destination:
        host: myapp.myapp.svc.cluster.local
        subset: new-cluster
      weight: 50
    - destination:
        host: myapp.myapp.svc.cluster.local
        subset: old-cluster
      weight: 50
  - route:
    - destination:
        host: myapp.myapp.svc.cluster.local
        subset: old-cluster
      weight: 100
```

4. Once you are confident reads work correctly on the new cluster, switch over writes too.

## Validating the Migration

Before decommissioning the old cluster, run thorough validation:

```bash
# Check endpoints in both clusters
istioctl proxy-config endpoints deploy/frontend -n myapp --context=old-cluster | grep myapp

# Monitor error rates
kubectl exec deploy/sleep -c sleep --context=old-cluster -- \
  sh -c 'for i in $(seq 1 100); do curl -s -o /dev/null -w "%{http_code}\n" myapp.myapp:8080/health; done' | sort | uniq -c

# Check cross-cluster latency
istioctl proxy-config log deploy/frontend --level connection:info -n myapp --context=old-cluster
```

Run your integration tests pointing at the new cluster to make sure everything works.

## Decommissioning the Old Cluster

Once all traffic is flowing to the new cluster and everything is verified:

1. Update the traffic policy to send 100% to the new cluster
2. Wait for the drain period (make sure all in-flight requests complete)
3. Scale down the application in the old cluster
4. Remove the remote secret for the old cluster
5. Clean up the old cluster

```bash
# Remove the old cluster from the mesh
kubectl delete secret istio-remote-secret-old-cluster -n istio-system --context=new-cluster

# Scale down in old cluster
kubectl scale deploy/myapp --replicas=0 -n myapp --context=old-cluster

# Clean up migration resources
kubectl delete virtualservice myapp-migration -n myapp --context=new-cluster
kubectl delete destinationrule myapp-subsets -n myapp --context=new-cluster
```

## Rollback Plan

Always have a rollback plan. If something goes wrong with the new cluster, you need to shift traffic back quickly.

Keep the old cluster running (at reduced capacity) for at least a week after the migration is complete. If problems surface, updating the VirtualService weights to send traffic back to the old cluster takes seconds.

```yaml
# Emergency rollback - send everything to old cluster
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: myapp-migration
  namespace: myapp
spec:
  hosts:
  - myapp.myapp.svc.cluster.local
  http:
  - route:
    - destination:
        host: myapp.myapp.svc.cluster.local
        subset: old-cluster
      weight: 100
```

Cluster migration with Istio is about patience and gradual traffic shifting. The traffic management primitives make it safe to move workloads between clusters without downtime, as long as you take the time to validate at each step.
