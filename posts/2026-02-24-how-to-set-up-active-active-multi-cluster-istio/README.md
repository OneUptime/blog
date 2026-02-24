# How to Set Up Active-Active Multi-Cluster Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Active-Active, High Availability, Kubernetes

Description: Complete walkthrough for configuring an active-active multi-cluster Istio mesh where both clusters serve traffic simultaneously.

---

Active-active means both clusters are handling production traffic at the same time. This is different from active-passive where one cluster sits idle until it's needed for failover. With Istio, active-active is the natural multi-cluster mode since the mesh automatically load balances across endpoints in all clusters.

## Why Active-Active

Active-active gives you several benefits:

- Better resource utilization since both clusters are doing work
- Lower latency for geographically distributed users (route to the nearest cluster)
- Instant failover since the other cluster is already warmed up and serving traffic
- Easier capacity planning since you split the load

The main challenge is keeping both clusters in sync in terms of application deployments and configuration.

## Architecture

In an active-active Istio setup:

- Both clusters run their own istiod (separate control planes)
- Both clusters have the same services deployed
- Istio load balances requests across endpoints in both clusters
- If one cluster's endpoints become unhealthy, traffic shifts to the other

## Step 1: Set Up Two Clusters with Separate Control Planes

Follow the separate control planes approach. Both clusters get a full Istio installation:

```bash
export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2
```

Create shared CA and install Istio on both clusters. Here's the config for cluster1:

```yaml
# cluster1.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
```

And cluster2:

```yaml
# cluster2.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster2
      network: network2
```

Install on both, set up east-west gateways, and exchange remote secrets as described in the separate control planes guide.

## Step 2: Deploy the Same Services on Both Clusters

For active-active to work, both clusters need to run the same services. Use the same Kubernetes manifests on both:

```bash
# Deploy the application on both clusters
for ctx in ${CTX_CLUSTER1} ${CTX_CLUSTER2}; do
  kubectl --context=${ctx} create namespace production
  kubectl --context=${ctx} label namespace production istio-injection=enabled
  kubectl --context=${ctx} apply -n production -f my-app-deployment.yaml
  kubectl --context=${ctx} apply -n production -f my-app-service.yaml
done
```

The Service definitions must be identical (same name, namespace, and ports) so that Istio can merge the endpoints from both clusters.

## Step 3: Configure Locality-Aware Load Balancing

By default, Istio distributes traffic evenly across all endpoints regardless of which cluster they're in. For active-active with geographic distribution, you want locality-aware routing so users hit the nearest cluster first:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: production
spec:
  host: my-app.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

Locality-aware routing kicks in automatically when you have outlier detection configured. Istio uses the node's `topology.kubernetes.io/zone` and `topology.kubernetes.io/region` labels to determine locality.

For it to work, your nodes need to be labeled with their region and zone:

```bash
# Check node labels
kubectl --context=${CTX_CLUSTER1} get nodes --show-labels | grep topology
```

On most cloud providers, these labels are set automatically. On bare metal, you need to set them manually:

```bash
kubectl label node worker-1 topology.kubernetes.io/region=us-east-1
kubectl label node worker-1 topology.kubernetes.io/zone=us-east-1a
```

## Step 4: Configure Failover Between Clusters

Locality-aware routing prefers local endpoints, but you need failover to the other cluster when local endpoints are unhealthy. This happens automatically with outlier detection, but you can fine-tune it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app-failover
  namespace: production
spec:
  host: my-app.production.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 2
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
    connectionPool:
      tcp:
        connectTimeout: 5s
      http:
        maxRequestsPerConnection: 100
```

Setting `maxEjectionPercent` to 100 is important. Without it, Istio won't eject all endpoints in a locality, which means some traffic would still go to unhealthy pods instead of failing over to the other cluster.

## Step 5: Set Up Global DNS

For external traffic to reach both clusters, set up DNS-based global load balancing. This is outside of Istio's scope but essential for active-active:

```bash
# Example with AWS Route 53 weighted routing
aws route53 change-resource-record-sets --hosted-zone-id Z123456 --change-batch '{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "api.example.com",
      "Type": "A",
      "SetIdentifier": "cluster1",
      "Weight": 50,
      "TTL": 60,
      "ResourceRecords": [{"Value": "1.2.3.4"}]
    }
  }, {
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "api.example.com",
      "Type": "A",
      "SetIdentifier": "cluster2",
      "Weight": 50,
      "TTL": 60,
      "ResourceRecords": [{"Value": "5.6.7.8"}]
    }
  }]
}'
```

The IPs should be the external IPs of each cluster's Istio ingress gateway:

```bash
kubectl --context=${CTX_CLUSTER1} get svc -n istio-system istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
kubectl --context=${CTX_CLUSTER2} get svc -n istio-system istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## Step 6: Verify Active-Active Behavior

Test that requests from within the mesh reach both clusters:

```bash
# From cluster1, make 20 requests
for i in $(seq 1 20); do
  kubectl --context=${CTX_CLUSTER1} exec -n production deploy/sleep -c sleep -- \
    curl -s my-app.production:8080/hostname
done
```

You should see responses from pods in both clusters. If locality-aware routing is active, you'll see more responses from cluster1's pods (since that's where the client is), but some should come from cluster2.

## Step 7: Test Failover

Scale down the service in cluster1 and watch traffic shift:

```bash
kubectl --context=${CTX_CLUSTER1} scale deployment -n production my-app --replicas=0
```

Now all traffic from cluster1 should go to cluster2:

```bash
kubectl --context=${CTX_CLUSTER1} exec -n production deploy/sleep -c sleep -- \
  curl -s my-app.production:8080/hostname
```

Scale it back up:

```bash
kubectl --context=${CTX_CLUSTER1} scale deployment -n production my-app --replicas=3
```

## Keeping Deployments in Sync

The operational challenge with active-active is keeping both clusters in sync. Some approaches:

**GitOps with Argo CD or Flux**: Point both clusters at the same Git repository. Changes to the repo get applied to both clusters automatically.

```yaml
# Argo CD ApplicationSet that targets both clusters
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
spec:
  generators:
    - list:
        elements:
          - cluster: cluster1
            url: https://cluster1-api:6443
          - cluster: cluster2
            url: https://cluster2-api:6443
  template:
    metadata:
      name: 'my-app-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/my-app
        targetRevision: main
        path: k8s/
      destination:
        server: '{{url}}'
        namespace: production
```

**CI/CD pipeline**: Deploy to both clusters as part of your deployment pipeline. You can do rolling updates across clusters one at a time for extra safety.

## Monitoring Active-Active Health

Watch these metrics to make sure your active-active setup is healthy:

```bash
# Check endpoint distribution
istioctl --context=${CTX_CLUSTER1} proxy-config endpoints deploy/sleep -n production | grep my-app

# Check for outlier ejections
istioctl --context=${CTX_CLUSTER1} proxy-config clusters deploy/sleep -n production -o json | \
  python3 -c "import sys,json; data=json.load(sys.stdin); [print(c['name'], c.get('outlierDetection', 'none')) for c in data.get('dynamicActiveClusters', [])]"
```

Active-active multi-cluster with Istio is production-ready and works well once the networking foundation is solid. The mesh handles cross-cluster load balancing and failover transparently, so your applications don't need to know they're running in multiple clusters.
