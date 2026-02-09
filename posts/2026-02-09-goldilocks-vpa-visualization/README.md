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

You will see VPA resources named after your deployments with the suffix -goldilocks-vpa.

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

The dashboard shows three recommendation types for each container:

**Guaranteed**: VPA recommends setting requests equal to limits at this level. This creates Guaranteed QoS class pods.

**Burstable**: VPA recommends these request values with higher limits. This allows bursting while providing baseline guarantees.

**Unconstrained**: VPA recommendations without considering limits. Use this when you want maximum flexibility.

For most workloads, use the Burstable recommendations. They balance resource efficiency with performance headroom.

Each recommendation shows:
- Current requests and limits
- Recommended requests and limits
- Percentage difference from current values

Green percentages indicate potential cost savings. Red indicates current requests are too low and should be increased.

## Filtering and Sorting Recommendations

The dashboard provides filtering options:

- Filter by namespace
- Filter by workload type (Deployment, StatefulSet, DaemonSet)
- Sort by potential savings percentage
- Sort by workload name

Sort by savings percentage to identify the biggest optimization opportunities:

```
Workload          Current CPU  Recommended  Savings
analytics-worker  2000m        500m         75%
batch-processor   1000m        300m         70%
api-gateway       500m         400m         20%
```

Start optimizations with high-savings, low-risk workloads like batch jobs and background workers.

## Exporting Recommendations

Goldilocks does not automatically apply recommendations. Export them for review:

```bash
# Get VPA recommendations as YAML
kubectl get vpa analytics-worker-goldilocks-vpa -n production -o yaml
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

Control how Goldilocks creates VPAs with annotations:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    goldilocks.fairwinds.com/enabled: "true"
  annotations:
    goldilocks.fairwinds.com/vpa-update-mode: "off"
```

Valid update modes:
- `off`: Recommendations only (default)
- `initial`: Apply recommendations to new pods only
- `auto`: Automatically update existing pods (use carefully)

Set resource boundaries with additional annotations:

```yaml
annotations:
  goldilocks.fairwinds.com/vpa-update-mode: "off"
  goldilocks.fairwinds.com/cpu-min: "100m"
  goldilocks.fairwinds.com/cpu-max: "4000m"
  goldilocks.fairwinds.com/memory-min: "128Mi"
  goldilocks.fairwinds.com/memory-max: "8Gi"
```

Goldilocks applies these boundaries to all VPAs it creates in the namespace.

## Excluding Specific Workloads

Prevent Goldilocks from creating VPAs for certain workloads:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
  namespace: production
  labels:
    goldilocks.fairwinds.com/enabled: "false"
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

Use this for stateful workloads or services with manually tuned resources.

## Monitoring Recommendation Accuracy

Track how accurately VPA predicts resource needs:

```bash
# Get VPA recommendations
kubectl get vpa analytics-worker-goldilocks-vpa -n production \
  -o jsonpath='{.status.recommendation.containerRecommendations[0].target}'

# Compare to actual usage
kubectl top pod -n production -l app=analytics-worker
```

If actual usage consistently exceeds recommendations, VPA may not have enough historical data. Wait longer or adjust VPA's recommendation window.

## Integration with GitOps Workflows

Incorporate Goldilocks into CI/CD pipelines:

```bash
#!/bin/bash
# generate-optimized-resources.sh

NAMESPACE=$1
DEPLOYMENT=$2

# Get VPA recommendation
RECOMMENDED_CPU=$(kubectl get vpa ${DEPLOYMENT}-goldilocks-vpa -n $NAMESPACE \
  -o jsonpath='{.status.recommendation.containerRecommendations[0].target.cpu}')

RECOMMENDED_MEM=$(kubectl get vpa ${DEPLOYMENT}-goldilocks-vpa -n $NAMESPACE \
  -o jsonpath='{.status.recommendation.containerRecommendations[0].target.memory}')

# Update deployment manifest
kubectl patch deployment $DEPLOYMENT -n $NAMESPACE --type=json \
  -p="[{
    'op': 'replace',
    'path': '/spec/template/spec/containers/0/resources/requests/cpu',
    'value': '$RECOMMENDED_CPU'
  },{
    'op': 'replace',
    'path': '/spec/template/spec/containers/0/resources/requests/memory',
    'value': '$RECOMMENDED_MEM'
  }]"
```

Run this script periodically to keep resources aligned with recommendations.

## Cost Impact Analysis

Calculate potential savings from Goldilocks recommendations:

```promql
# Current resource requests cost
sum(kube_pod_container_resource_requests_cpu_cores) * $cpu_hourly_cost

# Potential cost with recommendations
sum(vpa_containerrecommendations_target{resource="cpu"}) * $cpu_hourly_cost
```

Create a dashboard showing:
- Current monthly cost
- Projected cost with recommendations
- Potential monthly savings
- Payback period for implementation effort

Present this data to justify resource optimization initiatives.

## Advanced Configuration

Adjust VPA recommender behavior globally:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vpa-recommender-config
  namespace: kube-system
data:
  recommender-config: |
    pod_recommendation_min_cpu_millicores: 50
    pod_recommendation_min_memory_mb: 64
    target_cpu_percentile: 0.95
    target_memory_percentile: 0.95
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
kubectl describe vpa analytics-worker-goldilocks-vpa -n production | grep Conditions -A 10
```

VPAs need at least 24 hours of metrics before recommendations stabilize. Recently created VPAs show less accurate recommendations.

Dashboard shows no data:

```bash
# Verify dashboard can reach VPA API
kubectl exec -n goldilocks deployment/goldilocks-dashboard -- \
  curl -s http://kubernetes.default.svc/apis/autoscaling.k8s.io/v1/verticalpodautoscalers
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
          name: ops-team
    ports:
    - protocol: TCP
      port: 80
```

Implement authentication at the Ingress level using oauth2-proxy or similar tools.

Goldilocks transforms VPA from a per-workload optimization tool into a cluster-wide resource management platform. The visual dashboard makes it accessible to teams without deep Kubernetes expertise, democratizing resource optimization across your organization.
