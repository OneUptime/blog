# How to Set Up Active-Passive Multi-Cluster Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Active-Passive, Disaster Recovery, Kubernetes

Description: How to configure an active-passive multi-cluster Istio topology for disaster recovery with automatic failover capabilities.

---

Active-passive means one cluster handles all production traffic while the second cluster sits ready as a standby. When the active cluster fails, traffic switches to the passive cluster. This setup is simpler than active-active for applications that don't handle concurrent writes well or when you want a clear separation between primary and disaster recovery environments.

## When Active-Passive Makes Sense

Active-passive works well when:

- Your application has a single-writer database that can't easily be replicated across clusters
- You want a simpler operational model with one "source of truth" cluster
- Regulatory requirements mandate a specific primary data center
- You need DR capability but don't want to deal with the complexity of active-active state management

## Architecture

The setup involves:

- **Active cluster**: Runs all production workloads and serves all traffic
- **Passive cluster**: Runs the same workloads (possibly at reduced scale) but receives no external traffic
- **DNS failover**: External DNS health checks trigger the switch from active to passive
- **Istio mesh**: Spans both clusters so internal service discovery is ready when failover happens

## Step 1: Set Up Both Clusters with Istio

Install Istio on both clusters with separate control planes. The passive cluster gets the same mesh configuration:

```yaml
# active-cluster.yaml
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
        clusterName: active
      network: network1
```

```yaml
# passive-cluster.yaml
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
        clusterName: passive
      network: network2
```

Install Istio, set up east-west gateways, and exchange remote secrets on both clusters:

```bash
istioctl install --context=active -f active-cluster.yaml -y
istioctl install --context=passive -f passive-cluster.yaml -y

# East-west gateways and remote secrets (same as separate control planes setup)
istioctl create-remote-secret --context=passive --name=passive | \
  kubectl apply --context=active -f -
istioctl create-remote-secret --context=active --name=active | \
  kubectl apply --context=passive -f -
```

## Step 2: Deploy Workloads on Both Clusters

Deploy the same application on both clusters, but scale the passive cluster down:

```bash
# Active cluster - full scale
kubectl --context=active apply -n production -f app-deployment.yaml

# Passive cluster - reduced replicas
kubectl --context=passive apply -n production -f app-deployment.yaml
kubectl --context=passive scale deployment -n production my-app --replicas=1
```

The passive cluster runs at least one replica so that:
- The deployment exists and is ready to scale up
- Health checks confirm the passive cluster is functional
- The sidecar configuration is active and current

## Step 3: Route All Traffic to the Active Cluster

Use a VirtualService to ensure that inter-mesh traffic prefers the active cluster. Apply this to both clusters:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: production
spec:
  host: my-app.production.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 60s
      maxEjectionPercent: 100
```

For external traffic, configure your DNS to only point to the active cluster's ingress gateway. Set up a health check for failover:

```bash
# Example with AWS Route 53 failover routing
# Primary record pointing to active cluster
aws route53 change-resource-record-sets --hosted-zone-id Z123456 --change-batch '{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "api.example.com",
      "Type": "A",
      "SetIdentifier": "primary",
      "Failover": "PRIMARY",
      "TTL": 60,
      "ResourceRecords": [{"Value": "ACTIVE_CLUSTER_IP"}],
      "HealthCheckId": "active-health-check-id"
    }
  }, {
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "api.example.com",
      "Type": "A",
      "SetIdentifier": "secondary",
      "Failover": "SECONDARY",
      "TTL": 60,
      "ResourceRecords": [{"Value": "PASSIVE_CLUSTER_IP"}]
    }
  }]
}'
```

## Step 4: Set Up Health Checks

The DNS failover needs a health check endpoint. Istio's ingress gateway has a built-in health endpoint:

```bash
# The Istio ingress gateway exposes a health endpoint on port 15021
curl http://${ACTIVE_GATEWAY_IP}:15021/healthz/ready
```

Create a more comprehensive health check that validates your application is actually working:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: health-check
  namespace: production
spec:
  hosts:
    - "api.example.com"
  gateways:
    - istio-system/main-gateway
  http:
    - match:
        - uri:
            exact: /health
      route:
        - destination:
            host: my-app.production.svc.cluster.local
            port:
              number: 8080
```

## Step 5: Automate Failover Scaling

When DNS failover triggers, the passive cluster needs to handle full production traffic. You can pre-scale it or use automation:

**Option 1: Keep passive at production scale** (higher cost, faster failover)

```bash
kubectl --context=passive scale deployment -n production my-app --replicas=10
```

**Option 2: Use HPA with a scaling trigger**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 1
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

When traffic hits the passive cluster, the HPA will scale up based on CPU usage. The downside is there's a scaling delay.

**Option 3: Use a webhook to pre-scale**

Write a simple controller that watches the DNS health check status and scales the passive cluster when the active cluster is detected as unhealthy:

```bash
#!/bin/bash
# Simple failover scaling script
while true; do
  if ! curl -sf http://${ACTIVE_GATEWAY_IP}:15021/healthz/ready > /dev/null 2>&1; then
    echo "Active cluster unhealthy, scaling passive cluster"
    kubectl --context=passive scale deployment -n production my-app --replicas=10
  fi
  sleep 10
done
```

## Step 6: Test the Failover

Simulate a failure by scaling down the active cluster:

```bash
# Simulate failure
kubectl --context=active scale deployment -n production my-app --replicas=0
```

Monitor what happens:

```bash
# Check DNS resolution (may take up to TTL seconds to switch)
watch -n 5 dig +short api.example.com

# Check passive cluster is receiving traffic
kubectl --context=passive logs -n production deploy/my-app --tail=10 -f
```

After confirming the failover works, restore the active cluster:

```bash
kubectl --context=active scale deployment -n production my-app --replicas=10
```

## Step 7: Handle Failback

Failback is when you switch traffic back to the active cluster after it recovers. This should be manual, not automatic, to avoid flapping:

1. Confirm the active cluster is fully healthy
2. Verify all pods are running and passing health checks
3. Update DNS to point back to the active cluster (or wait for the health check to pass and DNS to fail back automatically)
4. Scale the passive cluster back down

```bash
# Verify active cluster health
kubectl --context=active get pods -n production
istioctl --context=active proxy-status

# Scale passive back down after failback
kubectl --context=passive scale deployment -n production my-app --replicas=1
```

## Data Considerations

The trickiest part of active-passive isn't the Istio configuration but the data layer. If your application uses a database, you need to handle replication:

- **Managed databases**: Use the cloud provider's cross-region replication (RDS Multi-AZ, Cloud SQL HA, etc.)
- **Self-managed databases**: Set up primary-replica replication and promote the replica during failover
- **Stateless applications**: No data concerns, just make sure configuration is synced

Istio handles the networking layer. Data replication is your responsibility.

## Monitoring

Set up alerts for both clusters:

```bash
# Check that the passive cluster's Istio is healthy
istioctl --context=passive proxy-status

# Monitor east-west gateway connectivity
kubectl --context=passive get svc -n istio-system istio-eastwestgateway

# Check for stale proxy configs
istioctl --context=active proxy-status | grep STALE
istioctl --context=passive proxy-status | grep STALE
```

Active-passive with Istio gives you a straightforward disaster recovery setup. The mesh handles service discovery and routing, while DNS failover handles the external traffic switch. Keep the passive cluster warm with at least minimal replicas, and test your failover process regularly so there are no surprises when you actually need it.
