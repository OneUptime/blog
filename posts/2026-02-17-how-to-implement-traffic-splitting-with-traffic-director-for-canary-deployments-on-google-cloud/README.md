# How to Use Traffic Splitting with Traffic Director for Canary Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Traffic Director, Canary Deployment, Service Mesh, GKE, Google Cloud

Description: Use Google Cloud Traffic Director to implement traffic splitting for canary deployments, gradually shifting traffic from stable to new versions of your services.

---

Canary deployments are one of the safest ways to roll out changes. Instead of updating all instances at once and hoping nothing breaks, you send a small percentage of traffic to the new version and monitor for problems. If something goes wrong, you roll back instantly. If everything looks good, you gradually increase the canary's traffic share.

Google Cloud Traffic Director is now part of Cloud Service Mesh. It is a managed traffic control plane that configures Envoy proxies deployed alongside your services. It supports traffic splitting natively, making it an excellent foundation for canary deployments on GKE.

## How Traffic Director Enables Canary Deployments

Traffic Director works by configuring Envoy sidecar proxies through Google's xDS API. You define URL maps and backend services that specify how traffic should be distributed. For canary deployments, you create two backend services - one for the stable version and one for the canary - and use a URL map with weighted traffic splitting to control the distribution.

The advantage over Kubernetes-native canary approaches (like adjusting replica counts) is precision. Traffic Director gives you exact percentage control and supports splitting based on headers, cookies, or other request attributes.

## Setting Up Traffic Director

### Enable Required APIs

```bash
# Enable Traffic Director and related APIs

gcloud services enable \
  trafficdirector.googleapis.com \
  networkservices.googleapis.com \
  compute.googleapis.com \
  container.googleapis.com \
  --project=my-project
```

### Configure GKE with Traffic Director

Deploy a GKE cluster and then provision Cloud Service Mesh for the cluster.

```bash
# Create a GKE cluster
gcloud container clusters create canary-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --enable-dataplane-v2 \
  --project=my-project

# Install the Gateway API CRDs if using the Gateway API approach
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml
```

## Deploying the Stable and Canary Versions

Deploy both versions of your application as separate Kubernetes deployments with distinct labels.

```yaml
# stable-deployment.yaml
# The current stable version of the service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-stable
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: my-service
      version: stable
  template:
    metadata:
      labels:
        app: my-service
        version: stable
    spec:
      containers:
        - name: my-service
          image: gcr.io/my-project/my-service:v1.0.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
---
# canary-deployment.yaml
# The new canary version being tested
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-canary
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-service
      version: canary
  template:
    metadata:
      labels:
        app: my-service
        version: canary
    spec:
      containers:
        - name: my-service
          image: gcr.io/my-project/my-service:v2.0.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
```

Create separate Kubernetes services for each version.

```yaml
# services.yaml
# Separate services for stable and canary backends
apiVersion: v1
kind: Service
metadata:
  name: my-service-stable
  namespace: production
  annotations:
    cloud.google.com/neg: '{"exposed_ports":{"8080":{"name":"my-service-stable-neg"}}}'
spec:
  selector:
    app: my-service
    version: stable
  ports:
    - name: http
      port: 8080
      targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-service-canary
  namespace: production
  annotations:
    cloud.google.com/neg: '{"exposed_ports":{"8080":{"name":"my-service-canary-neg"}}}'
spec:
  selector:
    app: my-service
    version: canary
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

## Configuring Traffic Splitting with Traffic Director

### Using GCP Backend Services and URL Maps

Create backend services and a URL map that splits traffic between stable and canary.

```bash
# Create health check
gcloud compute health-checks create http my-service-hc \
  --port=8080 \
  --request-path=/health \
  --project=my-project

# Create backend service for stable version
gcloud compute backend-services create my-service-stable-backend \
  --load-balancing-scheme=INTERNAL_SELF_MANAGED \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=my-service-hc \
  --project=my-project \
  --global

# Create backend service for canary version
gcloud compute backend-services create my-service-canary-backend \
  --load-balancing-scheme=INTERNAL_SELF_MANAGED \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=my-service-hc \
  --project=my-project \
  --global

# Attach the GKE NEGs created from the Kubernetes Services
gcloud compute backend-services add-backend my-service-stable-backend \
  --global \
  --network-endpoint-group=my-service-stable-neg \
  --network-endpoint-group-zone=us-central1-a \
  --project=my-project

gcloud compute backend-services add-backend my-service-canary-backend \
  --global \
  --network-endpoint-group=my-service-canary-neg \
  --network-endpoint-group-zone=us-central1-a \
  --project=my-project
```

Now create a URL map with weighted traffic splitting.

```bash
# Create a URL map with traffic splitting
# Start with 95% stable, 5% canary
gcloud compute url-maps create my-service-url-map \
  --default-service=my-service-stable-backend \
  --project=my-project \
  --global

# Import a more detailed URL map config from a YAML file
gcloud compute url-maps import my-service-url-map \
  --source=url-map-config.yaml \
  --project=my-project \
  --global
```

The URL map configuration file for traffic splitting:

```yaml
# url-map-config.yaml
# URL map with weighted traffic splitting for canary deployment
name: my-service-url-map
defaultRouteAction:
  weightedBackendServices:
    - backendService: projects/my-project/global/backendServices/my-service-stable-backend
      weight: 95
    - backendService: projects/my-project/global/backendServices/my-service-canary-backend
      weight: 5
hostRules:
  - hosts:
      - my-service.production.svc.cluster.local
    pathMatcher: my-service-matcher
pathMatchers:
  - name: my-service-matcher
    defaultRouteAction:
      weightedBackendServices:
        - backendService: projects/my-project/global/backendServices/my-service-stable-backend
          weight: 95
        - backendService: projects/my-project/global/backendServices/my-service-canary-backend
          weight: 5
```

### Using Gateway API (Recommended for GKE)

The Gateway API provides a Kubernetes-native way to configure Google Cloud traffic splitting on GKE. For Cloud Service Mesh service-to-service routing, use the Cloud Service Mesh Gateway API setup; for GKE load-balanced ingress, use a GKE GatewayClass that supports traffic splitting.

```yaml
# httproute-canary.yaml
# HTTPRoute with traffic splitting using Gateway API
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-service-canary-route
  namespace: production
spec:
  parentRefs:
    - name: internal-gateway
      namespace: production
  hostnames:
    - "my-service.production.svc.cluster.local"
  rules:
    - backendRefs:
        # 95% of traffic goes to stable
        - name: my-service-stable
          port: 8080
          weight: 95
        # 5% of traffic goes to canary
        - name: my-service-canary
          port: 8080
          weight: 5
```

## Progressive Traffic Shifting

The canary deployment process involves gradually increasing the canary weight. Here is a script that automates the progression.

```bash
#!/bin/bash
# canary-promote.sh
# Gradually shifts traffic from stable to canary in predefined steps

CANARY_STEPS=(5 10 25 50 75 100)
WAIT_BETWEEN_STEPS=600  # 10 minutes between steps

for weight in "${CANARY_STEPS[@]}"; do
    stable_weight=$((100 - weight))
    echo "Setting canary weight to ${weight}%, stable to ${stable_weight}%"

    # Update the HTTPRoute with new weights
    kubectl patch httproute my-service-canary-route -n production --type=merge -p \
      "{\"spec\":{\"rules\":[{\"backendRefs\":[{\"name\":\"my-service-stable\",\"port\":8080,\"weight\":${stable_weight}},{\"name\":\"my-service-canary\",\"port\":8080,\"weight\":${weight}}]}]}}"

    echo "Waiting ${WAIT_BETWEEN_STEPS} seconds before next step..."
    echo "Monitor: https://console.cloud.google.com/monitoring"

    # Check request errors before proceeding
    sleep ${WAIT_BETWEEN_STEPS}

    # Optional: add automated rollback check here
    # If request errors exceed your threshold, roll back to 0% canary
done

echo "Canary promotion complete. All traffic now going to canary version."
```

## Monitoring the Canary

Monitor both versions during the rollout to catch problems early.

```bash
# Query Traffic Director metrics in Cloud Monitoring
# Compare request status for Traffic Director backend services
gcloud monitoring time-series list \
  --project=my-project \
  --filter='metric.type="trafficdirector.googleapis.com/xds/server/request_count" AND metric.labels.status="ERROR"' \
  --interval-start-time=$(date -u -d "1 hour ago" +%Y-%m-%dT%H:%M:%SZ) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```

Set up a Cloud Monitoring alert that automatically detects request errors.

```bash
# Alert if Traffic Director reports backend request errors
gcloud alpha monitoring policies create \
  --display-name="Traffic Director Backend Errors" \
  --condition-display-name="Backend request errors" \
  --condition-filter='metric.type="trafficdirector.googleapis.com/xds/server/request_count" AND metric.labels.status="ERROR"' \
  --condition-threshold-value=0 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --documentation-content="Canary deployment showing elevated errors. Consider rolling back."
```

## Automated Rollback

If the canary shows problems, roll back instantly by setting its weight to zero.

```bash
# Emergency rollback - send all traffic to stable
kubectl patch httproute my-service-canary-route -n production --type=merge -p '
{"spec":{"rules":[{"backendRefs":[{"name":"my-service-stable","port":8080,"weight":100},{"name":"my-service-canary","port":8080,"weight":0}]}]}}
'
```

Traffic Director with canary deployments gives you precise control over your rollout process. The combination of weighted traffic splitting, real-time monitoring, and instant rollback capability makes it a safe and effective approach for getting new code into production on Google Cloud.
