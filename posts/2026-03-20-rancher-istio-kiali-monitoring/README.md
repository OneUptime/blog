# How to Monitor Istio Traffic with Kiali in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Istio, Kiali, Observability, Service Mesh

Description: A guide to installing and using Kiali to visualize, monitor, and manage Istio service mesh traffic in Rancher-managed Kubernetes clusters.

Kiali is the official observability console for the Istio service mesh. It provides a visual representation of your service mesh topology, displays real-time traffic metrics, highlights configuration issues, and enables you to validate Istio configurations. This guide covers how to install and effectively use Kiali in a Rancher environment.

## Prerequisites

- Istio installed in your Rancher-managed cluster
- Prometheus available for metrics collection, such as Rancher Monitoring or the Istio Prometheus add-on
- `kubectl` access to the cluster

## Step 1: Install Kiali via Rancher Apps

If you installed Istio using Rancher's Istio integration, Kiali is installed by default and available from the Rancher UI:

1. Navigate to your cluster in the Rancher UI
2. Go to **Apps & Marketplace** → **Charts**
3. Install or upgrade **Istio**
4. Ensure Kiali is enabled in the Istio chart values

Alternatively, install via Helm directly:

```bash
# Add the Kiali Helm repository

helm repo add kiali https://kiali.org/helm-charts
helm repo update

# Install Kiali operator
helm install \
  --set cr.create=true \
  --set cr.namespace=istio-system \
  --set cr.spec.auth.strategy="anonymous" \
  --namespace kiali-operator \
  --create-namespace \
  kiali-operator \
  kiali/kiali-operator
```

## Step 2: Access the Kiali Dashboard

In Rancher, you can open **Cluster Management** → **Explore** → **Istio** → **Kiali**. For direct access outside the Rancher UI:

```bash
# Port-forward to access Kiali locally
kubectl port-forward svc/kiali -n istio-system 20001:20001

# Open in your browser
echo "Access Kiali at: https://localhost:20001/"

# Alternatively, expose via Istio Gateway
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: kiali-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http-kiali
      protocol: HTTP
    hosts:
    - kiali.example.com
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: kiali-vs
  namespace: istio-system
spec:
  hosts:
  - kiali.example.com
  gateways:
  - kiali-gateway
  http:
  - route:
    - destination:
        host: kiali
        port:
          number: 20001
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: kiali
  namespace: istio-system
spec:
  host: kiali
  trafficPolicy:
    tls:
      mode: DISABLE
EOF
```

## Step 3: Understanding the Kiali Service Graph

The **Service Graph** (also called the **Traffic Graph**) is Kiali's most powerful feature. It shows:

- **Nodes**: Services, workloads, and applications
- **Edges**: Traffic flowing between services with error rates and latency
- **Lock icons**: mTLS status for each connection
- **Colored nodes and edges**: Health indicators that highlight degraded or failing traffic

To view the service graph:
1. Open Kiali and navigate to **Graph** in the left menu
2. Select your namespace(s) from the dropdown
3. Choose the display options (edges labels, node labels, etc.)
4. Use the time range selector to view historical data

## Step 4: Configure Prometheus for Metrics

Kiali relies on Prometheus for metrics. If you installed Rancher's Istio integration alongside Rancher Monitoring, this is configured automatically. If you installed Kiali separately, point it at the Rancher Monitoring services:

```bash
kubectl patch kiali kiali -n istio-system --type=merge -p '{
  "spec": {
    "external_services": {
      "prometheus": {
        "url": "http://rancher-monitoring-prometheus.cattle-monitoring-system.svc:9090"
      },
      "grafana": {
        "enabled": true,
        "internal_url": "http://rancher-monitoring-grafana.cattle-monitoring-system.svc:80"
      }
    }
  }
}'
```

## Step 5: Validate Istio Configuration with Kiali

Kiali can detect and highlight configuration issues:

```bash
# Kiali surfaces validation messages in the UI.
# From the CLI, use istioctl for complementary analysis:
istioctl analyze -n my-app

# Check for common issues:
# - DestinationRule subsets that don't match any pods
# - VirtualServices that reference non-existent Gateways
# - Services without matching workloads
```

In the Kiali UI:
1. Go to **Istio Config**
2. Look for yellow warning icons or red error icons on resources such as `VirtualService` and `DestinationRule`
3. Click the resource to see the specific validation messages

## Step 6: View Distributed Traces with Jaeger Integration

Kiali integrates with Jaeger for distributed tracing:

```bash
# Install Jaeger (sample add-on for demos)
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.29/samples/addons/jaeger.yaml

# Update Kiali configuration to point to Jaeger
kubectl patch kiali kiali -n istio-system --type=merge -p '{
  "spec": {
    "external_services": {
      "tracing": {
        "enabled": true,
        "internal_url": "http://tracing.istio-system:16685/jaeger",
        "use_grpc": true
      }
    }
  }
}'
```

## Step 7: Generate Traffic for Visualization

```bash
# Generate test traffic to see in Kiali
# If using the Bookinfo sample app:
export INGRESS_NAME=istio-ingressgateway
export INGRESS_NS=istio-system
export INGRESS_HOST=$(kubectl -n "$INGRESS_NS" get service "$INGRESS_NAME" \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$INGRESS_HOST" ]; then
  export INGRESS_HOST=$(kubectl -n "$INGRESS_NS" get service "$INGRESS_NAME" \
    -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
fi
export INGRESS_PORT=$(kubectl -n "$INGRESS_NS" get service "$INGRESS_NAME" \
  -o jsonpath='{.spec.ports[?(@.name=="http2")].port}')
export GATEWAY_URL=http://$INGRESS_HOST:$INGRESS_PORT

# Send traffic to generate graph data and traces
for i in $(seq 1 100); do
  curl -s -o /dev/null "$GATEWAY_URL/productpage"
done
```

## Conclusion

Kiali transforms Istio's raw telemetry data into actionable insights through its visual service graph, configuration validation, and distributed tracing integration. By combining Kiali with Prometheus and Jaeger in your Rancher environment, you get a comprehensive observability platform that makes it easy to understand service dependencies, identify bottlenecks, and troubleshoot issues in your microservice architecture.
