# How to Configure Istio for Spinnaker Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Spinnaker, Continuous Delivery, Kubernetes, Traffic Management

Description: How to integrate Istio traffic management with Spinnaker deployment pipelines for canary analysis and automated traffic shifting.

---

Spinnaker is one of the most battle-tested continuous delivery platforms out there, and it has built-in support for Kubernetes and Istio. When you combine them, you can build deployment pipelines that gradually shift traffic using Istio VirtualServices, run automated canary analysis using Kayenta (Spinnaker's canary analysis engine), and automatically promote or roll back based on real metrics.

The integration works by having Spinnaker manage both the Kubernetes deployments and the Istio traffic routing resources. Spinnaker treats Istio VirtualServices and DestinationRules as Kubernetes manifests that it can deploy and modify as part of a pipeline stage.

## Setting Up Spinnaker with Kubernetes

Assuming you have Spinnaker installed (via Halyard or the Operator), configure the Kubernetes provider to access your cluster:

```bash
# Using Halyard
hal config provider kubernetes account add my-k8s-account \
  --context $(kubectl config current-context) \
  --provider-version v2 \
  --namespaces default,staging,production

hal config provider kubernetes enable
```

Make sure Spinnaker can manage Istio CRDs by adding them to the list of custom resources:

```bash
hal config provider kubernetes account edit my-k8s-account \
  --add-custom-resource "networking.istio.io/VirtualService" \
  --add-custom-resource "networking.istio.io/DestinationRule" \
  --add-custom-resource "security.istio.io/AuthorizationPolicy"
```

## Preparing the Istio Resources

Set up the VirtualService and DestinationRule that Spinnaker will manage:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vsvc
  namespace: production
spec:
  hosts:
  - my-app.production.svc.cluster.local
  http:
  - route:
    - destination:
        host: my-app.production.svc.cluster.local
        subset: stable
      weight: 100
    - destination:
        host: my-app.production.svc.cluster.local
        subset: canary
      weight: 0
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-dr
  namespace: production
spec:
  host: my-app.production.svc.cluster.local
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
```

## Building the Spinnaker Pipeline

A typical Istio-aware Spinnaker pipeline has these stages:

1. Deploy the canary version
2. Shift a small percentage of traffic to canary
3. Run canary analysis
4. Gradually increase traffic or roll back
5. Promote canary to stable

### Stage 1: Deploy Canary

Add a "Deploy (Manifest)" stage that deploys the canary version:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-canary
  namespace: production
  labels:
    app: my-app
    version: canary
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
      version: canary
  template:
    metadata:
      labels:
        app: my-app
        version: canary
    spec:
      containers:
      - name: my-app
        image: my-registry/my-app  # Spinnaker will inject the artifact version
        ports:
        - containerPort: 8080
```

In Spinnaker, configure this stage to use the Docker image artifact from your trigger.

### Stage 2: Shift Traffic

Add a "Patch (Manifest)" stage to update the VirtualService:

```json
{
  "account": "my-k8s-account",
  "cloudProvider": "kubernetes",
  "manifests": [
    {
      "apiVersion": "networking.istio.io/v1",
      "kind": "VirtualService",
      "metadata": {
        "name": "my-app-vsvc",
        "namespace": "production"
      },
      "spec": {
        "hosts": ["my-app.production.svc.cluster.local"],
        "http": [
          {
            "route": [
              {
                "destination": {
                  "host": "my-app.production.svc.cluster.local",
                  "subset": "stable"
                },
                "weight": 90
              },
              {
                "destination": {
                  "host": "my-app.production.svc.cluster.local",
                  "subset": "canary"
                },
                "weight": 10
              }
            ]
          }
        ]
      }
    }
  ],
  "options": {
    "mergeStrategy": "strategic"
  }
}
```

### Stage 3: Canary Analysis with Kayenta

Spinnaker's built-in canary analysis (Kayenta) works great with Istio metrics. Configure a canary analysis stage:

In the Spinnaker UI or pipeline JSON:

```json
{
  "type": "kayentaCanary",
  "canaryConfig": {
    "canaryConfigId": "your-canary-config-id",
    "scopes": [
      {
        "controlScope": "my-app-stable",
        "experimentScope": "my-app-canary",
        "scopeName": "default"
      }
    ],
    "scoreThresholds": {
      "marginal": 50,
      "pass": 75
    },
    "lifetimeDuration": "PT30M",
    "beginCanaryAnalysisAfter": "PT5M"
  }
}
```

Configure Kayenta to read from Prometheus (where Istio metrics are stored):

```yaml
# In Halyard
hal config canary prometheus account add my-prometheus \
  --base-url http://prometheus.monitoring.svc.cluster.local:9090

hal config canary prometheus enable
hal config canary enable
```

Create a canary config in Spinnaker that uses Istio metrics:

```json
{
  "name": "istio-canary-config",
  "judge": {
    "judgeConfigurations": {},
    "name": "NetflixACAJudge-v1.0"
  },
  "metrics": [
    {
      "name": "error_rate",
      "query": {
        "type": "prometheus",
        "customInlineTemplate": "sum(rate(istio_requests_total{destination_workload=\"${scope}\",response_code=~\"5.*\"}[5m])) / sum(rate(istio_requests_total{destination_workload=\"${scope}\"}[5m]))"
      },
      "analysisConfigurations": {
        "canary": {
          "direction": "decrease"
        }
      },
      "groups": ["error_rate"]
    },
    {
      "name": "latency_p99",
      "query": {
        "type": "prometheus",
        "customInlineTemplate": "histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_workload=\"${scope}\"}[5m])) by (le))"
      },
      "analysisConfigurations": {
        "canary": {
          "direction": "decrease"
        }
      },
      "groups": ["latency"]
    }
  ]
}
```

### Stage 4: Progressive Traffic Shift

If the canary analysis passes, add more "Patch (Manifest)" stages to increase traffic:

- 10% -> pass analysis -> 50% -> pass analysis -> 100%

Each stage patches the VirtualService with new weights.

### Stage 5: Promote and Cleanup

After the canary receives 100% traffic and passes analysis, promote it to stable:

1. Update the stable deployment with the new image
2. Reset VirtualService weights to 100% stable, 0% canary
3. Scale down or delete the canary deployment

```yaml
# Patch stable deployment with new image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-stable
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: my-app
        image: my-registry/my-app:v2
```

### Rollback Stage

Add a rollback stage that triggers when canary analysis fails:

```json
{
  "type": "patchManifest",
  "account": "my-k8s-account",
  "manifests": [
    {
      "apiVersion": "networking.istio.io/v1",
      "kind": "VirtualService",
      "metadata": {
        "name": "my-app-vsvc",
        "namespace": "production"
      },
      "spec": {
        "http": [
          {
            "route": [
              {
                "destination": {
                  "host": "my-app.production.svc.cluster.local",
                  "subset": "stable"
                },
                "weight": 100
              },
              {
                "destination": {
                  "host": "my-app.production.svc.cluster.local",
                  "subset": "canary"
                },
                "weight": 0
              }
            ]
          }
        ]
      }
    }
  ],
  "stageEnabled": {
    "expression": "#stage('Canary Analysis').status.toString() != 'SUCCEEDED'",
    "type": "expression"
  }
}
```

## Tips for Production

Keep your Istio VirtualServices in Git alongside your Spinnaker pipeline configurations. Use Spinnaker's pipeline-as-code (Dinghy) or spin CLI to version control your pipelines.

Make sure the canary analysis window is long enough to capture meaningful traffic patterns. Five minutes might not be enough for services with low request rates. Adjust the `lifetimeDuration` accordingly.

Consider adding a manual judgment stage between canary analysis and full promotion for critical services. Even with automated analysis, having a human in the loop for production releases adds an extra safety net.

The Spinnaker and Istio integration gives you enterprise-grade deployment automation with fine-grained traffic control. It takes more setup than simpler tools, but the depth of analysis and the flexibility of the pipeline model make it worth the effort for large-scale production environments.
