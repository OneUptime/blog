# How to Integrate Istio with Kiali for Mesh Visualization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kiali, Visualization, Observability, Kubernetes, Service Mesh

Description: A practical guide to deploying and using Kiali to visualize your Istio service mesh topology, traffic flows, and configuration health.

---

Kiali is the observability console for Istio. It shows you a visual graph of your service mesh, with real-time traffic flowing between services. You can see which services talk to each other, how much traffic each connection carries, where errors are happening, and whether your Istio configuration is valid. It's the single best tool for getting a high-level understanding of what's going on in your mesh.

## Installing Kiali

The quickest approach for testing:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml
```

Kiali depends on Prometheus for metrics data, so make sure Prometheus is running:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
```

Verify both are running:

```bash
kubectl get pods -n istio-system -l app=kiali
kubectl get pods -n istio-system -l app=prometheus
```

Open Kiali:

```bash
istioctl dashboard kiali
```

## Using the Kiali Operator for Production

For production deployments, use the Kiali Operator:

```bash
kubectl apply -f https://raw.githubusercontent.com/kiali/kiali-operator/master/deploy/deploy-kiali-operator.yaml
```

Then create a Kiali custom resource:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: anonymous
  deployment:
    accessible_namespaces:
    - "**"
    image_name: quay.io/kiali/kiali
    image_version: v1.79
    replicas: 1
  external_services:
    prometheus:
      url: http://prometheus.istio-system.svc:9090
    grafana:
      enabled: true
      in_cluster_url: http://grafana.istio-system.svc:3000
      url: http://grafana.istio-system.svc:3000
    tracing:
      enabled: true
      in_cluster_url: http://jaeger-query.istio-system.svc:16686
      url: http://jaeger-query.istio-system.svc:16686
  server:
    web_root: /kiali
```

## The Service Graph

The centerpiece of Kiali is the service graph. Navigate to "Graph" in the left sidebar, select a namespace, and you'll see a visual topology of your services.

Each node in the graph represents a workload, service, or app (depending on your graph type selection). Edges represent traffic between them. The graph updates in real time as traffic flows.

### Graph Types

Kiali offers several graph types from the dropdown:

- **App Graph** - Groups workloads by app label. Good for seeing high-level service communication.
- **Versioned App Graph** - Shows different versions of each app as separate nodes. Essential for canary deployments.
- **Workload Graph** - Shows individual workloads (deployments). Most detailed view.
- **Service Graph** - Shows Kubernetes Services. Simplest view.

### Traffic Indicators

The edges between nodes show traffic characteristics:

- **Green edges** - Healthy traffic (all 2xx responses)
- **Red edges** - Error traffic (5xx responses)
- **Yellow/orange edges** - Mixed traffic with some errors
- **Edge thickness** - Request rate (thicker = more traffic)
- **Animated dots** - Request flow direction

### Display Options

Click the "Display" dropdown for additional overlays:

- **Traffic Animation** - Shows dots flowing along edges
- **Security** - Shows mTLS lock icons on edges
- **Response Time** - Shows latency on edges
- **Traffic Rate** - Shows requests per second
- **Missing Sidecars** - Highlights pods without Envoy sidecars

## Configuration Validation

Navigate to any namespace and Kiali shows the health of your Istio configuration. Click on a VirtualService, DestinationRule, or Gateway to see:

- Whether the resource is valid
- What warnings or errors exist
- Which workloads it affects

Kiali runs similar checks to `istioctl analyze` but presents them visually. Resources with errors show a red icon, warnings show yellow.

Common validations Kiali performs:

- VirtualService hosts matching actual services
- DestinationRule subsets matching pod labels
- Gateway port conflicts
- Missing sidecar injection
- mTLS configuration consistency

## Workload Details

Click on any workload in the graph or navigate through the sidebar to see detailed information:

### Overview Tab
- Health status (based on error rates)
- Pod count and status
- Labels and annotations
- Istio configuration affecting this workload

### Traffic Tab
- Inbound and outbound request rates
- Success and error rates
- Response time percentiles
- HTTP and gRPC request breakdowns

### Logs Tab
- Real-time logs from both the application container and the istio-proxy container
- Filterable by container, severity, and text search
- Correlates logs with spans if tracing is configured

### Traces Tab
- Distributed traces passing through this workload
- Links to Jaeger for detailed trace exploration
- Filterable by status code, duration, and tags

## Istio Configuration View

Navigate to "Istio Config" in the sidebar to see all Istio resources across namespaces:

- VirtualServices
- DestinationRules
- Gateways
- ServiceEntries
- Sidecars
- AuthorizationPolicies
- PeerAuthentications
- RequestAuthentications
- EnvoyFilters

Each resource shows its validation status. Click through to see the YAML and any validation messages.

You can also create and edit Istio configuration directly from Kiali. This is handy for quick changes during debugging, though you should use version-controlled YAML for production changes.

## Namespace Health

The overview page shows health status for each namespace:

- **Healthy** - All workloads are responding correctly
- **Degraded** - Some workloads have elevated error rates
- **Failure** - Significant error rates detected

This gives you a quick scan across your entire mesh to spot which namespaces need attention.

## Configuring Kiali for Your Environment

### Authentication

For production, you'll want proper authentication. Options include:

**OpenID Connect (recommended for production):**

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: openid
    openid:
      client_id: kiali
      issuer_uri: https://keycloak.example.com/realms/istio
      scopes:
      - openid
      - email
```

**Token-based (Kubernetes service account tokens):**

```yaml
spec:
  auth:
    strategy: token
```

Users authenticate with a Kubernetes service account token.

### Connecting to External Services

If Grafana, Jaeger, or Prometheus are running outside the istio-system namespace:

```yaml
spec:
  external_services:
    prometheus:
      url: http://prometheus-server.monitoring.svc:9090
    grafana:
      enabled: true
      in_cluster_url: http://grafana.monitoring.svc:3000
    tracing:
      enabled: true
      in_cluster_url: http://jaeger-query.observability.svc:16686
      use_grpc: false
```

### Namespace Access

Control which namespaces Kiali can see:

```yaml
spec:
  deployment:
    accessible_namespaces:
    - default
    - production
    - staging
    - istio-system
```

Or allow all namespaces:

```yaml
spec:
  deployment:
    accessible_namespaces:
    - "**"
```

## Using Kiali for Traffic Management

Kiali includes wizards for common traffic management tasks:

### Weighted Routing

Right-click a service in the graph and select "Traffic Routing":

1. Set traffic weights between versions (e.g., 90% to v1, 10% to v2)
2. Kiali generates the VirtualService and DestinationRule for you
3. Review the YAML and apply

### Traffic Shifting

From the workload detail page, use the "Actions" menu to create traffic shifting rules. This is useful for canary deployments.

### Fault Injection

From the service detail page, you can inject faults:

- HTTP abort (return error codes)
- HTTP delay (add latency)

Kiali creates the appropriate VirtualService configuration.

### Circuit Breaking

Set circuit breaker thresholds from the DestinationRule editor in Kiali:

- Connection pool limits
- Outlier detection settings

## Troubleshooting Kiali

**Empty graph.** No traffic is flowing. Send some requests through the mesh and wait a few seconds for metrics to propagate. Also check that Prometheus is scraping the sidecars:

```bash
kubectl exec -n istio-system deploy/prometheus -- curl -s localhost:9090/api/v1/targets | python3 -m json.tool | grep envoy
```

**Kiali can't connect to Prometheus.** Check the external services configuration and verify network connectivity:

```bash
kubectl exec -n istio-system deploy/kiali -- curl -s http://prometheus.istio-system.svc:9090/api/v1/status/config
```

**Stale data.** Kiali caches data from Prometheus. If you made changes and don't see them reflected, wait for the refresh interval (default 15 seconds) or manually refresh.

**Missing sidecars warning.** Kiali detects pods without Istio sidecars. If a workload intentionally doesn't have a sidecar, you can silence the warning by adding an annotation:

```yaml
metadata:
  annotations:
    kiali.io/dashboards: ""
```

## Summary

Kiali is the observability frontend for Istio that brings together metrics, traces, logs, and configuration validation into one interface. The service graph alone is worth the installation, giving you instant visibility into how your services communicate and where problems exist. Combined with its Istio config validation and traffic management wizards, it's the single most useful tool for day-to-day mesh operations.
