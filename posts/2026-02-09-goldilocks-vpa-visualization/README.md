# How to Use Goldilocks for VPA Recommendations Visualization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Goldilocks, VPA, Resource Optimization, Visualization, Cost Management

Description: Deploy Goldilocks to visualize Vertical Pod Autoscaler recommendations across your cluster and make data-driven resource sizing decisions.

---

Goldilocks provides a dashboard for viewing VPA recommendations across all namespaces in your cluster. Instead of running kubectl describe for each VPA object, Goldilocks aggregates recommendations into a single interface, making it easy to identify optimization opportunities cluster-wide.

## Understanding Goldilocks Architecture

Goldilocks consists of two components. The controller watches namespaces for specific labels and automatically creates VPA objects in recommendation mode. The dashboard queries these VPA resources and displays recommendations in a web interface.

This automation is key - you do not need to manually create VPA objects for every workload. Label a namespace, and Goldilocks creates VPAs for all deployments, statefulsets, and daemonsets automatically.

The dashboard shows current resource requests alongside VPA recommendations, making it easy to see optimization potential at a glance.

## Installing Goldilocks

Install via Helm:

```bash
helm repo add fairwinds-stable https://charts.fairwinds.com/stable
helm repo update

helm install goldilocks fairwinds-stable/goldilocks \
  --namespace goldilocks \
  --create-namespace \
  --set dashboard.service.type=ClusterIP
```

Verify the installation:

```bash
kubectl get pods -n goldilocks
kubectl get svc -n goldilocks
```

You should see the goldilocks-controller and goldilocks-dashboard pods running.

## Enabling Namespaces for Analysis

Label namespaces you want Goldilocks to analyze:

```bash
kubectl label namespace production goldilocks.fairwinds.com/enabled=true
kubectl label namespace staging goldilocks.fairwinds.com/enabled=true
```

The controller automatically creates VPA objects for workloads in labeled namespaces:

```bash
kubectl get vpa -n production
```

You will see VPA resources named after your workloads with the prefix `goldilocks-`.

## Accessing the Dashboard

Port forward to the dashboard:

```bash
kubectl port-forward -n goldilocks svc/goldilocks-dashboard 8080:80
```

Open your browser to http://localhost:8080. The dashboard lists all enabled namespaces with their workload recommendations.

For production access, create an Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: goldilocks
  namespace: goldilocks
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - goldilocks.example.com
    secretName: goldilocks-tls
  rules:
  - host: goldilocks.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: goldilocks-dashboard
            port:
              number: 80
```

## Interpreting Recommendations

The dashboard shows two QoS-based recommendation types for each container:

**Guaranteed**: VPA recommends setting requests equal to limits at this level. This creates Guaranteed QoS class pods.

**Burstable**: Goldilocks uses the VPA lower bound for requests and upper bound for limits. This allows bursting while providing baseline guarantees.

For most workloads, use the Burstable recommendations. They balance resource efficiency with performance headroom.

Each recommendation shows:
- Current requests and limits
- Recommended requests and limits
- Status indicators comparing current values with recommendations

When cost calculation is enabled, the dashboard can show the hourly cost difference for Guaranteed and Burstable recommendations.

## Filtering and Sorting Recommendations

The dashboard provides namespace filtering and groups recommendations by workload:

- Filter by namespace
- Browse by workload type (Deployment, StatefulSet, DaemonSet, and other controllers with a pod template)
- Compare current settings with Guaranteed and Burstable recommendations

Use the dashboard cost comparison or the `goldilocks summary` output to identify the biggest optimization opportunities:

```text
Workload          Current CPU  Recommended  Savings
analytics-worker  2000m        500m         75%
batch-processor   1000m        300m         70%
api-gateway       500m         400m         20%
```

Start optimizations with high-savings, low-risk workloads like batch jobs and background workers.

## Exporting Recommendations

Goldilocks defaults to recommendation-only VPAs and does not automatically apply recommendations unless you explicitly configure an applying VPA update mode and install the required VPA components. Export recommendations for review:

```bash
# Get VPA recommendations as YAML

kubectl get vpa goldilocks-analytics-worker -n production -o yaml
```

The output includes recommended values:

```yaml
status:
  recommendation:
    containerRecommendations:
    - containerName: analytics
      lowerBound:
        cpu: 400m
        memory: 256Mi
      target:
        cpu: 500m
        memory: 384Mi
      upperBound:
        cpu: 800m
        memory: 768Mi
```

Apply these to your deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-worker
spec:
  template:
    spec:
      containers:
      - name: analytics
        resources:
          requests:
            cpu: "500m"
            memory: "384Mi"
          limits:
            cpu: "800m"
            memory: "768Mi"
```

## Customizing VPA Creation

Control how Goldilocks creates VPAs with labels:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    goldilocks.fairwinds.com/enabled: "true"
    goldilocks.fairwinds.com/vpa-update-mode: "off"
```

Valid update modes:
- `off`: Recommendations only (default)
- `initial`: Apply recommendations to new pods only
- `recreate`: Automatically update existing pods by recreating them (use carefully)

Set resource boundaries with the `vpa-resource-policy` annotation:

```yaml
annotations:
  goldilocks.fairwinds.com/vpa-resource-policy: >
    { "containerPolicies": [ { "containerName": "*", "minAllowed": {
    "cpu": "100m", "memory": "128Mi" }, "maxAllowed": { "cpu": "4000m",
    "memory": "8Gi" } } ] }
```

Goldilocks applies these boundaries to all VPAs it creates in the namespace.

## Excluding Specific Containers

Prevent Goldilocks from showing recommendations for certain containers:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
  namespace: production
  labels:
    goldilocks.fairwinds.com/exclude-containers: "postgres"
spec:
  template:
    spec:
      containers:
      - name: postgres
        resources:
          requests:
            memory: "8Gi"
            cpu: "2000m"
```

Use this for sidecars, stateful containers, or services with manually tuned resources.

## Monitoring Recommendation Accuracy

Track how accurately VPA predicts resource needs:

```bash
# Get VPA recommendations
kubectl get vpa goldilocks-analytics-worker -n production \
  -o jsonpath='{.status.recommendation.containerRecommendations[0].target}'

# Compare to actual usage
kubectl top pod -n production -l app=analytics-worker
```

If actual usage consistently exceeds recommendations, VPA may not have enough historical data. Wait longer or adjust recommender flags such as `--history-length` when using Prometheus history.

## Integration with GitOps Workflows

Incorporate Goldilocks into CI/CD pipelines:

```bash
#!/bin/bash
# generate-optimized-resources.sh

NAMESPACE=$1
DEPLOYMENT=$2

# Get VPA recommendation
RECOMMENDED_CPU=$(kubectl get vpa "goldilocks-${DEPLOYMENT}" -n "$NAMESPACE" \
  -o jsonpath='{.status.recommendation.containerRecommendations[0].target.cpu}')

RECOMMENDED_MEM=$(kubectl get vpa "goldilocks-${DEPLOYMENT}" -n "$NAMESPACE" \
  -o jsonpath='{.status.recommendation.containerRecommendations[0].target.memory}')

# Update deployment manifest
kubectl patch deployment "$DEPLOYMENT" -n "$NAMESPACE" --type=json \
  -p="[{
    \"op\": \"replace\",
    \"path\": \"/spec/template/spec/containers/0/resources/requests/cpu\",
    \"value\": \"$RECOMMENDED_CPU\"
  },{
    \"op\": \"replace\",
    \"path\": \"/spec/template/spec/containers/0/resources/requests/memory\",
    \"value\": \"$RECOMMENDED_MEM\"
  }]"
```

Run this script periodically to keep resources aligned with recommendations.

## Cost Impact Analysis

Calculate potential savings from Goldilocks recommendations:

```promql
# Current resource requests cost
sum(kube_pod_container_resource_requests{resource="cpu",unit="core"}) * $cpu_hourly_cost

# Potential cost with recommendations
sum(kube_customresource_verticalpodautoscaler_status_recommendation_containerrecommendations_target_cpu{resource="cpu"}) * $cpu_hourly_cost
```

Create a dashboard showing:
- Current monthly cost
- Projected cost with recommendations
- Potential monthly savings
- Payback period for implementation effort

Present this data to justify resource optimization initiatives.

## Advanced Configuration

Adjust VPA recommender behavior globally by setting recommender flags in your VPA installation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vpa-recommender
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: recommender
        args:
        - --pod-recommendation-min-cpu-millicores=50
        - --pod-recommendation-min-memory-mb=64
        - --target-cpu-percentile=0.95
        - --target-memory-percentile=0.95
```

These settings affect all VPAs, including those created by Goldilocks. Adjust percentiles to make recommendations more conservative (99th percentile) or aggressive (90th percentile).

## Troubleshooting

VPAs not appearing in Goldilocks dashboard:

```bash
# Check controller logs
kubectl logs -n goldilocks -l app.kubernetes.io/name=goldilocks-controller

# Verify namespace label
kubectl get namespace production -o jsonpath='{.metadata.labels}'

# Check if VPAs were created
kubectl get vpa -n production
```

Recommendations seem incorrect:

```bash
# Check VPA age - needs time to gather data
kubectl get vpa -n production -o custom-columns=NAME:.metadata.name,AGE:.metadata.creationTimestamp

# View VPA conditions
kubectl describe vpa goldilocks-analytics-worker -n production | grep Conditions -A 10
```

VPAs can show recommendations after a few minutes, but the VPA recommender's default historical model uses an 8-day history window for maximum accuracy. Recently created VPAs show less accurate upper and lower bounds.

Dashboard shows no data:

```bash
# Verify the dashboard service account can list VPA objects
kubectl auth can-i list verticalpodautoscalers.autoscaling.k8s.io \
  --as=system:serviceaccount:goldilocks:goldilocks-dashboard
```

Check RBAC permissions if the request fails.

## Security Considerations

Goldilocks dashboard shows resource usage patterns that could reveal sensitive information. Restrict access:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: goldilocks-access
  namespace: goldilocks
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: goldilocks-dashboard
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: ops-team
    ports:
    - protocol: TCP
      port: 80
```

Implement authentication at the Ingress level using oauth2-proxy or similar tools.

Goldilocks transforms VPA from a per-workload optimization tool into a cluster-wide resource management platform. The visual dashboard makes it accessible to teams without deep Kubernetes expertise, democratizing resource optimization across your organization.
