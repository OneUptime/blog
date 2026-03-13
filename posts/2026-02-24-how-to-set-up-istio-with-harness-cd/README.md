# How to Set Up Istio with Harness CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Harness CD, Continuous Delivery, Kubernetes, Canary Deployments

Description: How to configure Harness CD with Istio for traffic management during canary and blue-green deployments in Kubernetes clusters.

---

Harness CD has built-in support for Istio traffic management, which makes it one of the easier CD platforms to integrate with a service mesh. Harness can automatically create and manage Istio VirtualServices and DestinationRules during deployments, handle canary traffic shifting, and use Istio metrics for deployment verification.

The nice thing about the Harness approach is that you don't need to manually create and manage VirtualService patches like you would with some other CD tools. Harness understands Istio natively and can manipulate the traffic routing as part of its deployment workflow.

## Prerequisites

Before starting, you need:
- A Kubernetes cluster with Istio installed
- A Harness account with a Harness Delegate deployed to your cluster
- Your application already running with Istio sidecar injection or ambient mode

## Connecting Harness to Your Cluster

In Harness, set up a Kubernetes Cloud Provider that points to your cluster. The Harness Delegate running in the cluster handles communication.

Go to **Setup > Cloud Providers > Add Cloud Provider** and configure:

```text
Type: Kubernetes Cluster
Name: production-cluster
Authentication: Inherit from selected Delegate
Delegate Name: my-cluster-delegate
```

Make sure the delegate's service account has permissions to manage Istio CRDs:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: harness-istio-role
rules:
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices", "destinationrules", "gateways"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["services", "pods", "configmaps"]
  verbs: ["get", "list", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: harness-istio-binding
subjects:
- kind: ServiceAccount
  name: harness-delegate
  namespace: harness-delegate
roleRef:
  kind: ClusterRole
  name: harness-istio-role
  apiGroup: rbac.authorization.k8s.io
```

## Setting Up Istio Traffic Management in Harness

In your Harness Service definition, enable Istio traffic management. Harness supports two modes:

### Option 1: Harness Manages Istio Resources

Harness can automatically create and manage VirtualServices and DestinationRules. In your Harness service manifest, include:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vsvc
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
      weight: 100
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-dr
spec:
  host: my-app
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
```

During a canary deployment, Harness will automatically modify these resources to split traffic between the stable and canary versions.

### Option 2: Reference Existing Istio Resources

If you already have VirtualServices and DestinationRules in your cluster, tell Harness to use them by specifying the Istio routing config in the workflow:

In the Harness workflow, add the Istio VirtualService name and routes that Harness should manage during the deployment.

## Configuring a Canary Deployment with Istio

Create a Harness Canary Workflow. Here's how the phases work:

**Phase 1: Deploy Canary (10% traffic)**

Harness deploys the new version and updates the VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vsvc
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app-stable
      weight: 90
    - destination:
        host: my-app-canary
      weight: 10
```

**Phase 2: Verify**

Add a verification step that checks Istio metrics. Harness supports Prometheus as a verification provider:

In Harness Continuous Verification settings, configure Prometheus:

```text
Provider: Prometheus
URL: http://prometheus.monitoring.svc.cluster.local:9090
```

Define verification queries:

```text
Metric: Error Rate
Query: sum(rate(istio_requests_total{destination_service_name="my-app-canary",response_code=~"5.*"}[5m])) / sum(rate(istio_requests_total{destination_service_name="my-app-canary"}[5m]))
Threshold: < 0.01

Metric: P95 Latency
Query: histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name="my-app-canary"}[5m])) by (le))
Threshold: < 500
```

Harness uses machine learning to compare canary metrics against the baseline. If the canary performs significantly worse, it triggers a rollback.

**Phase 3: Increase Traffic (50%)**

If verification passes, Harness patches the VirtualService to send 50% to canary:

```yaml
spec:
  http:
  - route:
    - destination:
        host: my-app-stable
      weight: 50
    - destination:
        host: my-app-canary
      weight: 50
```

**Phase 4: Full Rollout (100%)**

After another round of verification:

```yaml
spec:
  http:
  - route:
    - destination:
        host: my-app
      weight: 100
```

Harness updates the stable deployment and cleans up the canary.

## Blue-Green Deployment with Istio in Harness

For blue-green deployments, the workflow is simpler. Harness deploys the new version (green) alongside the old version (blue) and uses Istio to do an instant traffic switch.

Configure the workflow:

1. **Deploy Green**: Deploy the new version with a different label
2. **Swap Traffic**: Update the VirtualService to point entirely to green
3. **Verify**: Run verification against the new version
4. **Cleanup**: Remove the blue version after a configurable wait period

The VirtualService during the swap:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vsvc
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: green
      weight: 100
```

If verification fails, Harness switches back instantly:

```yaml
spec:
  http:
  - route:
    - destination:
        host: my-app
        subset: blue
      weight: 100
```

## Using Harness Pipeline with Traffic Management

In Harness Next Gen (NG), you can define this as a pipeline YAML:

```yaml
pipeline:
  name: Istio Canary Deploy
  identifier: istio_canary
  stages:
  - stage:
      name: Deploy to Production
      type: Deployment
      spec:
        deploymentType: Kubernetes
        service:
          serviceRef: my_app_service
        environment:
          environmentRef: production
          infrastructureDefinitions:
          - identifier: prod_k8s
        execution:
          steps:
          - step:
              name: Canary Deploy
              identifier: canaryDeploy
              type: K8sCanaryDeploy
              spec:
                skipDryRun: false
                instanceSelection:
                  type: Count
                  spec:
                    count: 1
          - step:
              name: Istio Traffic Shift 10
              identifier: istioTraffic10
              type: K8sTrafficRouting
              spec:
                provider:
                  type: Istio
                  spec:
                    virtualService:
                      name: my-app-vsvc
                    destinations:
                    - host: my-app
                      weight: 10
                      routeType: canary
                    - host: my-app
                      weight: 90
                      routeType: stable
          - step:
              name: Verify Canary
              identifier: verify
              type: Verify
              spec:
                type: Canary
                monitoredService:
                  type: Default
                spec:
                  sensitivity: MEDIUM
                  duration: 10m
          - step:
              name: Canary Delete
              identifier: canaryDelete
              type: K8sCanaryDelete
          - step:
              name: Rolling Deploy
              identifier: rollingDeploy
              type: K8sRollingDeploy
          rollbackSteps:
          - step:
              name: Rollback
              identifier: rollback
              type: K8sRollingRollback
```

## Monitoring the Deployment

During deployment, Harness provides a dashboard showing:
- Current traffic split between stable and canary
- Metrics comparison between versions
- Deployment progress and any rollback events

You can also monitor from the Istio side:

```bash
# Check current VirtualService weights
kubectl get virtualservice my-app-vsvc -n production -o yaml

# Watch canary pods
kubectl get pods -n production -l version=canary

# Check Istio metrics
istioctl dashboard prometheus
```

The Harness and Istio integration reduces the manual work involved in traffic-managed deployments. Harness handles the orchestration, verification, and rollback logic while Istio provides the underlying traffic routing. Once you have the pipeline set up, deploying new versions becomes a matter of triggering the pipeline and letting the automation handle the rest.
