# How to Implement Istio Observability with Kiali

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Kiali, Observability, Service Mesh, Kubernetes, Monitoring

Description: Set up comprehensive service mesh observability using Kiali to visualize traffic flow, detect issues, and optimize Istio configurations.

---

Kiali provides visualization and management capabilities for Istio service meshes. It transforms raw telemetry data into interactive graphs showing service dependencies, traffic flow, and health status. This visibility helps you understand mesh behavior and troubleshoot issues faster than command-line tools alone.

## Installing Kiali in Your Mesh

The easiest way to install Kiali is through the Istio operator or Helm chart. For a standard installation alongside Istio:

```bash
# Add the Kiali Helm repository
helm repo add kiali https://kiali.org/helm-charts
helm repo update

# Install Kiali with default settings
helm install \
  --namespace istio-system \
  --set auth.strategy="anonymous" \
  --set deployment.accessible_namespaces=\["**"\] \
  kiali-server \
  kiali/kiali-server
```

This creates a Kiali instance accessible from all namespaces. The anonymous auth strategy works for development but production deployments should use token or OpenID authentication.

Verify the installation:

```bash
kubectl get pods -n istio-system -l app=kiali
kubectl get svc -n istio-system -l app=kiali
```

Access the Kiali dashboard by port forwarding:

```bash
kubectl port-forward svc/kiali -n istio-system 20001:20001
```

Open your browser to `http://localhost:20001` to see the Kiali interface.

## Configuring Data Sources

Kiali aggregates data from multiple sources: Prometheus for metrics, Jaeger for traces, and Grafana for detailed dashboards. Configure these integrations in the Kiali ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kiali
  namespace: istio-system
data:
  config.yaml: |
    external_services:
      prometheus:
        url: http://prometheus.istio-system:9090
      tracing:
        enabled: true
        in_cluster_url: http://jaeger-query.istio-system:16686
        url: http://jaeger-query.istio-system:16686
        namespace_selector: true
      grafana:
        enabled: true
        in_cluster_url: http://grafana.istio-system:3000
        url: http://grafana.istio-system:3000
        dashboards:
        - name: "Istio Service Dashboard"
          variables:
            namespace: "var-namespace"
            service: "var-service"
        - name: "Istio Workload Dashboard"
          variables:
            namespace: "var-namespace"
            workload: "var-workload"
```

Restart Kiali after updating the ConfigMap:

```bash
kubectl rollout restart deployment/kiali -n istio-system
```

Kiali now pulls metrics from Prometheus, trace data from Jaeger, and links to Grafana dashboards for detailed analysis.

## Understanding the Service Graph

The service graph is Kiali's most valuable feature. It shows real-time traffic flow between services with color-coded health indicators. Access it from the Graph menu in the Kiali UI.

Filter the graph to specific namespaces:

```bash
# The UI provides namespace selection, but you can also
# configure default namespaces in the Kiali config
```

The graph displays several key elements:

- Circles represent services
- Arrows show request direction and volume
- Colors indicate health: green for healthy, yellow for degraded, red for failing
- Edge labels show request rates and error percentages

Use the display options to toggle additional information like response times, TCP traffic, and security badges showing mTLS status.

## Analyzing Traffic Patterns

Click any service in the graph to see detailed metrics. Kiali shows request volume, error rates, and latency percentiles. These metrics come from Envoy telemetry, providing accurate service-level observability.

For deeper analysis, examine traffic distribution:

```yaml
# In the Kiali UI, select a service and view the Traffic tab
# This shows:
# - Inbound traffic sources
# - Outbound traffic destinations
# - Request protocols (HTTP, gRPC, TCP)
# - HTTP status code distribution
```

Use this information to identify bottlenecks. If one service receives disproportionate traffic, consider scaling it or implementing rate limiting.

## Validating Istio Configuration

Kiali performs automatic validation of Istio resources. It detects common mistakes and misconfigurations. Access validation through the Istio Config menu.

Example validation checks:

- DestinationRule references non-existent service subsets
- VirtualService routes to undefined destinations
- PeerAuthentication conflicts with workload settings
- Gateway selectors that match no pods
- Missing sidecar injections in workload pods

When Kiali finds issues, it displays warning or error icons. Click them for detailed explanations and remediation suggestions.

Create a test misconfiguration to see validation in action:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: broken-route
  namespace: default
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
        subset: nonexistent-subset  # This subset doesn't exist
```

Apply this VirtualService and view it in Kiali. The UI shows an error indicating the subset reference is invalid.

## Implementing Custom Health Checks

Kiali uses Kubernetes and Envoy health signals by default, but you can configure custom health indicators:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kiali
  namespace: istio-system
data:
  config.yaml: |
    health_config:
      rate:
        - namespace: ".*"
          kind: ".*"
          name: ".*"
          tolerance:
            - code: "^5\\d\\d$"
              degraded: 1
              failure: 10
            - code: "^4\\d\\d$"
              degraded: 10
              failure: 20
```

This configuration defines health thresholds based on HTTP status codes. Services with 1% 5xx errors show as degraded, while 10% triggers failure status. Adjust these thresholds based on your SLOs.

## Tracing Request Flows

Kiali integrates with distributed tracing to show request paths through your mesh. When you click a service, the Traces tab displays recent traces collected by Jaeger.

Select a trace to see the complete request flow:

```bash
# Example trace view shows:
# 1. Frontend receives request: 2ms
# 2. Frontend calls product catalog: 45ms
# 3. Product catalog queries database: 120ms
# 4. Product catalog returns: 5ms
# 5. Frontend renders response: 8ms
# Total: 180ms
```

Use traces to identify slow dependencies. In this example, the database query dominates response time, suggesting optimization opportunities.

For detailed tracing setup, ensure your applications propagate trace headers:

```go
// Example Go code for header propagation
func proxyRequest(w http.ResponseWriter, r *http.Request) {
    client := &http.Client{}
    req, _ := http.NewRequest("GET", "http://downstream-service", nil)

    // Propagate Istio tracing headers
    tracingHeaders := []string{
        "x-request-id",
        "x-b3-traceid",
        "x-b3-spanid",
        "x-b3-parentspanid",
        "x-b3-sampled",
        "x-b3-flags",
    }

    for _, header := range tracingHeaders {
        if val := r.Header.Get(header); val != "" {
            req.Header.Set(header, val)
        }
    }

    resp, _ := client.Do(req)
    // Handle response
}
```

Without header propagation, traces break into disconnected segments.

## Security Insights

Kiali visualizes mTLS adoption across your mesh. The security display shows which connections use mutual TLS and which remain in plaintext.

Enable security badges in the graph display options. Locked padlock icons indicate encrypted connections. Missing icons reveal services without mTLS.

For detailed security status:

```bash
# View the Security section in Kiali
# It shows:
# - Percentage of mTLS-enabled traffic
# - Services without sidecar proxies
# - Authorization policies applied to each service
```

Use this information to gradually roll out strict mTLS:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE  # Allow both mTLS and plaintext
```

Monitor adoption in Kiali, then switch to STRICT mode:

```yaml
spec:
  mtls:
    mode: STRICT  # Require mTLS for all traffic
```

## Workload Details and Logs

Click any workload in Kiali to see detailed information:

- Pod list and status
- Recent logs from application and sidecar containers
- Envoy configuration summary
- Applied Istio resources

The logs viewer is particularly useful for troubleshooting. It shows both application and Envoy proxy logs in one interface, making it easier to correlate application behavior with mesh activity.

Filter logs by container:

```bash
# In the Kiali UI:
# 1. Navigate to Workloads
# 2. Select a workload
# 3. Go to the Logs tab
# 4. Choose container: application or istio-proxy
# 5. Set log level and time range
```

Search logs for specific patterns like error codes or request IDs to debug issues.

## Creating Custom Graph Views

Kiali allows graph customization through display options and filters. Useful views include:

**Versioned App Graph**: Shows traffic split between deployment versions, useful during canary rollouts.

**Workload Graph**: Displays individual workloads instead of aggregating by service.

**Service Graph**: The default view showing service-level topology.

Apply filters to focus on specific traffic:

```yaml
# Example filters in the Kiali UI:
# - Namespace: production
# - Show: Request Distribution
# - Display: Response Time
# - Edge Labels: Traffic Rate
# - Hide: Unused nodes
```

Save useful views as favorites for quick access during incidents.

## Monitoring Mesh Performance

Kiali aggregates Istio performance metrics from Prometheus. View control plane health:

```bash
# In Kiali, navigate to Istio > Control Plane
# Displays:
# - Istiod pod status and resource usage
# - Ingress/egress gateway metrics
# - Configuration sync status
# - Control plane request rates
```

Watch for control plane bottlenecks. High CPU usage or slow configuration propagation indicates scaling issues.

For data plane metrics:

```bash
# Navigate to Istio > Mesh
# Shows:
# - Total request rate across the mesh
# - Global error rate
# - Protocol distribution (HTTP/gRPC/TCP)
# - mTLS adoption percentage
```

Set up alerts for mesh-wide problems like sudden error rate increases or mTLS degradation.

## Integrating with CI/CD Pipelines

Use Kiali's API to validate Istio configurations in CI/CD:

```bash
# Validate Istio resources before applying
curl -X POST http://kiali:20001/api/namespaces/default/istio/validate \
  -H "Content-Type: application/yaml" \
  -d @virtualservice.yaml

# Check for errors in the response
```

This prevents deploying broken configurations that Kiali would flag as invalid. Integrate this check into your deployment pipeline:

```yaml
# Example GitLab CI job
validate-istio:
  stage: validate
  script:
    - kubectl port-forward svc/kiali -n istio-system 20001:20001 &
    - sleep 5
    - |
      for file in istio/*.yaml; do
        response=$(curl -s -X POST http://localhost:20001/api/namespaces/default/istio/validate \
          -H "Content-Type: application/yaml" \
          --data-binary @$file)
        if echo $response | grep -q "error"; then
          echo "Validation failed for $file"
          exit 1
        fi
      done
```

This catches configuration errors before they reach production.

Kiali transforms Istio from an abstract configuration layer into a visible, manageable system. The combination of real-time traffic visualization, configuration validation, and integrated tracing makes it an essential tool for operating service meshes at scale.
