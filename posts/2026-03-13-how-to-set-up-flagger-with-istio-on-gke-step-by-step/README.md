# How to Set Up Flagger with Istio on GKE Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Istio, GKE, GCP, Canary, Kubernetes, Service-Mesh

Description: A step-by-step guide to setting up Flagger with Istio on Google Kubernetes Engine for automated canary deployments.

---

## Introduction

Google Kubernetes Engine (GKE) offers tight integration with Google Cloud services and provides an excellent platform for running Istio and Flagger. This guide walks you through the entire setup process, from creating a GKE cluster to executing your first canary deployment with automated analysis.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and configured
- A GCP project with billing enabled
- `kubectl` installed
- `helm` v3 installed
- `istioctl` installed

## Step 1: Create a GKE Cluster

Create a GKE cluster with sufficient resources for Istio and Flagger:

```bash
# Set your project and zone
export PROJECT_ID=your-gcp-project-id
export ZONE=us-central1-a

gcloud config set project $PROJECT_ID

# Create the GKE cluster
gcloud container clusters create flagger-demo \
  --zone $ZONE \
  --num-nodes 3 \
  --machine-type e2-standard-4 \
  --enable-network-policy \
  --release-channel regular

# Get credentials for kubectl
gcloud container clusters get-credentials flagger-demo --zone $ZONE

# Verify cluster access
kubectl get nodes
```

## Step 2: Install Istio

Install Istio with the default profile:

```bash
# Install Istio
istioctl install --set profile=default -y

# Verify Istio pods are running
kubectl get pods -n istio-system

# Enable sidecar injection for the default namespace
kubectl label namespace default istio-injection=enabled

# Verify the installation
istioctl verify-install
```

## Step 3: Install Prometheus

Install Prometheus to collect Istio metrics that Flagger uses for canary analysis:

```bash
# Install Prometheus from Istio addons
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/prometheus.yaml

# Wait for Prometheus to be ready
kubectl rollout status deployment/prometheus -n istio-system
```

## Step 4: Install Flagger

Install Flagger configured for Istio:

```bash
# Add the Flagger Helm repository
helm repo add flagger https://flagger.app
helm repo update

# Install Flagger
helm upgrade -i flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus:9090

# Verify Flagger is running
kubectl get pods -n istio-system -l app.kubernetes.io/name=flagger
kubectl logs -n istio-system deployment/flagger --tail=20
```

## Step 5: Create an Istio Gateway

Set up an Istio Gateway for external traffic:

```yaml
# gateway.yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: public-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*"
```

```bash
kubectl apply -f gateway.yaml
```

## Step 6: Deploy the Application

Deploy a sample application:

```yaml
# app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: default
  labels:
    app: podinfo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: podinfo
  template:
    metadata:
      labels:
        app: podinfo
    spec:
      containers:
        - name: podinfo
          image: ghcr.io/stefanprodan/podinfo:6.5.0
          ports:
            - name: http
              containerPort: 9898
          resources:
            requests:
              cpu: 100m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
```

```bash
kubectl apply -f app.yaml
```

## Step 7: Create the Canary Resource

```yaml
# canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  service:
    port: 9898
    targetPort: 9898
    gateways:
      - public-gateway.istio-system.svc.cluster.local
    hosts:
      - "*"
    trafficPolicy:
      tls:
        mode: ISTIO_MUTUAL
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
```

```bash
kubectl apply -f canary.yaml

# Wait for initialization
kubectl get canary podinfo -n default -w
```

## Step 8: Test the Canary Deployment

Get the Istio ingress gateway IP:

```bash
# Get the external IP of the Istio ingress gateway
export GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Gateway IP: $GATEWAY_IP"

# Test the application
curl http://$GATEWAY_IP/
```

Trigger a canary deployment:

```bash
# Update the image to trigger canary analysis
kubectl set image deployment/podinfo podinfo=ghcr.io/stefanprodan/podinfo:6.5.1 -n default

# Monitor the rollout
kubectl get canary podinfo -n default -w
```

Generate some test traffic to ensure metrics are available:

```bash
# Generate traffic in a loop
while true; do
  curl -s http://$GATEWAY_IP/ > /dev/null
  sleep 0.5
done
```

## Step 9: Monitor the Rollout

```bash
# Check the VirtualService for traffic weights
kubectl get virtualservice podinfo -n default -o yaml | grep -A 5 "weight"

# View Flagger logs
kubectl logs -n istio-system deployment/flagger -f | grep podinfo

# Check the canary status
kubectl describe canary podinfo -n default
```

## GKE-Specific Considerations

### Using GKE Workload Identity

If your application needs access to GCP services, configure Workload Identity:

```bash
# Enable Workload Identity on the cluster
gcloud container clusters update flagger-demo \
  --zone $ZONE \
  --workload-pool=$PROJECT_ID.svc.id.goog
```

### Using Cloud Monitoring

GKE integrates with Cloud Monitoring. You can use Flagger's custom metrics to query Cloud Monitoring instead of Prometheus by defining a MetricTemplate that queries the Cloud Monitoring API.

## Cleanup

```bash
kubectl delete canary podinfo -n default
kubectl delete deployment podinfo -n default
helm uninstall flagger -n istio-system
istioctl uninstall --purge -y
gcloud container clusters delete flagger-demo --zone $ZONE --quiet
```

## Conclusion

You now have Flagger running with Istio on GKE, providing automated canary deployments with traffic shifting and metric analysis. GKE's managed Kubernetes control plane simplifies cluster operations while Istio and Flagger handle the progressive delivery workflow. This setup gives you a production-ready foundation for safe, automated deployments on Google Cloud.
