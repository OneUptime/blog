# How to Use istioctl Dashboard Commands for Quick Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, istioctl, Dashboards, Monitoring, Kubernetes

Description: A practical guide to using istioctl dashboard commands to quickly access Kiali, Grafana, Prometheus, Jaeger, and Envoy admin interfaces.

---

One of the more useful quality-of-life features of istioctl is the `dashboard` command (also available as `istioctl dash`). It handles the tedious work of finding the right service, setting up port forwarding, and opening your browser - all in one step. Instead of memorizing service names and port numbers, you just type one command.

## Available Dashboards

istioctl supports several built-in dashboard targets:

```bash
istioctl dashboard --help
```

The main ones:

- **kiali** - Service mesh observability dashboard
- **grafana** - Metrics dashboards
- **prometheus** - Raw metrics querying
- **jaeger** - Distributed tracing UI
- **zipkin** - Alternative tracing UI
- **envoy** - Per-pod Envoy admin interface
- **controlz** - Istiod introspection interface

## Opening Kiali

```bash
istioctl dashboard kiali
```

This finds the Kiali service in your cluster, creates a port-forward, and opens the Kiali UI in your default browser. By default, it uses port 20001:

```text
http://localhost:20001/kiali
```

If port 20001 is taken, specify a different port:

```bash
istioctl dashboard kiali --port 9999
```

To bind to a specific address (useful when accessing from a remote machine):

```bash
istioctl dashboard kiali --address 0.0.0.0
```

## Opening Grafana

```bash
istioctl dashboard grafana
```

Opens Grafana on port 3000 by default. Istio comes with pre-built dashboards for mesh, workload, and service metrics. You'll see dashboards like:

- Istio Mesh Dashboard - Overall mesh health
- Istio Service Dashboard - Per-service metrics
- Istio Workload Dashboard - Per-workload metrics
- Istio Performance Dashboard - Control plane performance

If Grafana isn't installed, you'll get an error. Install it with the Istio addons:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
```

## Opening Prometheus

```bash
istioctl dashboard prometheus
```

Opens the Prometheus UI on port 9090. From here, you can query raw Istio metrics:

```promql
# Request rate by destination service
rate(istio_requests_total{reporter="destination"}[5m])

# 99th percentile latency
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service))

# Error rate
sum(rate(istio_requests_total{response_code=~"5.*", reporter="destination"}[5m])) by (destination_service)
/ sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service)
```

Install Prometheus if needed:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
```

## Opening Jaeger

```bash
istioctl dashboard jaeger
```

Opens the Jaeger tracing UI on port 16686. From here, you can search for traces by service, operation, tags, and time range.

Make sure Jaeger is installed:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
```

And that tracing is enabled in your mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 100.0
```

Setting sampling to 100.0 means every request gets traced - useful for debugging but too expensive for production. In production, use something like 1.0 (1% of requests).

## Opening Zipkin

If you're using Zipkin instead of Jaeger:

```bash
istioctl dashboard zipkin
```

Opens Zipkin on port 9411. The interface is different from Jaeger but shows the same tracing data.

## Opening the Envoy Admin Interface

This one is different because it targets a specific pod:

```bash
istioctl dashboard envoy productpage-v1-abc123.default
```

Opens the Envoy admin interface for that specific sidecar on port 15000. From here, you can:

- View configuration dumps
- Check statistics
- Change log levels
- View active connections
- Check certificates

You can also target the ingress gateway:

```bash
istioctl dashboard envoy deployment/istio-ingressgateway -n istio-system
```

## Opening ControlZ

```bash
istioctl dashboard controlz deployment/istiod -n istio-system
```

Opens the Istiod ControlZ interface on port 9876. This lets you:

- View and change Istiod log levels
- Inspect environment variables
- Check memory statistics
- View version information

## Running Dashboards in the Background

By default, the dashboard command blocks your terminal. The port-forward stays alive until you press Ctrl+C.

If you want to open multiple dashboards, run each in a separate terminal. Or use background processes:

```bash
istioctl dashboard kiali &
istioctl dashboard grafana &
istioctl dashboard jaeger &
```

Keep in mind that background port-forwards can silently die. If a dashboard stops working, check if the port-forward is still running:

```bash
jobs
```

## Custom Service Names and Namespaces

If your addon services are installed with non-default names or in a different namespace, use the service flags:

```bash
# Grafana in a custom namespace
istioctl dashboard grafana --namespace monitoring

# Custom service name
istioctl dashboard prometheus --service-name my-prometheus-server
```

## Using Dashboard in CI/CD or Scripts

The `--browser=false` flag prevents opening a browser, which is useful for scripts:

```bash
istioctl dashboard grafana --browser=false &
GRAFANA_PID=$!

# Do something with the Grafana API
curl -s localhost:3000/api/dashboards/home | python3 -m json.tool

# Clean up
kill $GRAFANA_PID
```

## When Dashboards Don't Open

Common issues and fixes:

**Service not found.** The addon isn't installed:

```text
Error: no Kiali pods found in namespace istio-system
```

Install the addon. The Istio samples directory has manifests for all standard addons:

```bash
kubectl apply -f samples/addons/
```

Or install them individually:

```bash
kubectl apply -f samples/addons/kiali.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/jaeger.yaml
```

**Port already in use.** Another process is using the default port:

```text
Error: listen tcp 127.0.0.1:20001: bind: address already in use
```

Use a different port:

```bash
istioctl dashboard kiali --port 20002
```

Or find and kill the process using the port:

```bash
lsof -i :20001
```

**Pod not ready.** The addon pod is still starting up:

```text
Error: pod is not running
```

Wait for it to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=kiali -n istio-system --timeout=120s
```

## Installing All Addons at Once

The quickest way to get all dashboards working:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml
```

Wait for everything to come up:

```bash
kubectl rollout status deployment -n istio-system kiali
kubectl rollout status deployment -n istio-system grafana
kubectl rollout status deployment -n istio-system prometheus
kubectl rollout status deployment -n istio-system jaeger
```

Then open everything:

```bash
istioctl dashboard kiali
```

## Production Considerations

The `istioctl dashboard` command is great for development and debugging. For production access, you'll want:

- **Proper Ingress** - Expose dashboards through an Ingress or Istio Gateway with authentication
- **Persistent storage** - Grafana dashboards and Prometheus data should be persisted
- **Production-grade deployments** - Use Helm charts or operators for addons instead of the sample manifests

The sample addons are fine for learning and temporary debugging but aren't hardened for production use.

## Summary

The `istioctl dashboard` command removes the friction of accessing Istio's observability tools. Instead of looking up service names and ports, you just type the dashboard you want. It's a small time saver that adds up when you're debugging frequently. Keep in mind that the addons need to be installed first, and the sample manifests are for development only.
