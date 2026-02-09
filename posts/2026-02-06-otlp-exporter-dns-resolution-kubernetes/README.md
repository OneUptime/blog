# How to Troubleshoot OTLP Exporter DNS Resolution Failures in Kubernetes Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, DNS, Service Discovery

Description: A practical guide to diagnosing and fixing DNS resolution failures in OTLP exporters within Kubernetes clusters.

DNS resolution failures are a sneaky problem in Kubernetes-based OpenTelemetry deployments. Your application starts up, tries to send telemetry to the Collector, and gets a cryptic error about failing to resolve the hostname. This post walks through the common causes and how to fix them.

## Symptoms

You will typically see errors like these in your application or SDK logs:

```
failed to export spans: rpc error: code = Unavailable desc = name resolver error
```

Or in the Collector logs when it tries to export to a backend:

```
error sending batch: dial tcp: lookup otel-backend.example.com: no such host
```

## Common Cause 1: Service Not in the Same Namespace

Kubernetes DNS follows a specific naming convention. If your Collector runs in the `observability` namespace but your application references it without the namespace suffix, DNS resolution will fail.

```bash
# This will fail if the app is NOT in the 'observability' namespace
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4317"

# This is the correct fully qualified service name
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector.observability.svc.cluster.local:4317"
```

Verify the service exists and is resolvable:

```bash
# Check that the service exists
kubectl get svc -n observability otel-collector

# Test DNS resolution from inside a pod
kubectl exec -it my-app-pod -- nslookup otel-collector.observability.svc.cluster.local
```

## Common Cause 2: CoreDNS Pod Issues

Sometimes the DNS infrastructure itself is broken. CoreDNS pods might be crashlooping or overwhelmed.

```bash
# Check CoreDNS pod status
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50

# Verify the DNS service is running
kubectl get svc -n kube-system kube-dns
```

If CoreDNS pods are not healthy, your entire cluster's DNS will be broken, not just OTel traffic.

## Common Cause 3: gRPC DNS Resolver Caching

The gRPC library used by many OTLP exporters has its own DNS resolver that behaves differently from standard HTTP clients. It resolves the hostname once at connection time and caches the result. If the Collector pod gets rescheduled and gets a new IP, the exporter might still try to reach the old IP.

```go
// In Go, you can force the gRPC client to use the DNS resolver
// with a re-resolution interval
import "google.golang.org/grpc"

conn, err := grpc.Dial(
    "dns:///otel-collector.observability.svc.cluster.local:4317",
    grpc.WithDefaultServiceConfig(`{"loadBalancingConfig": [{"round_robin":{}}]}`),
)
```

Note the `dns:///` prefix - this tells gRPC to use its built-in DNS resolver, which periodically re-resolves the hostname.

## Common Cause 4: ndots Configuration

Kubernetes sets `ndots: 5` by default in `/etc/resolv.conf` inside pods. This means any hostname with fewer than 5 dots will have the search domains appended before trying the original name. This can cause slow or failed resolution for external hostnames.

```bash
# Check resolv.conf inside a pod
kubectl exec -it my-app-pod -- cat /etc/resolv.conf

# You might see:
# nameserver 10.96.0.10
# search default.svc.cluster.local svc.cluster.local cluster.local
# options ndots:5
```

If your Collector or backend endpoint is an external hostname like `collector.example.com` (which has only 2 dots), the resolver will first try `collector.example.com.default.svc.cluster.local`, then `collector.example.com.svc.cluster.local`, and so on before finally trying the actual hostname.

Fix this by using the FQDN with a trailing dot:

```yaml
# In your Collector config, use a trailing dot for external hostnames
exporters:
  otlp:
    endpoint: "collector.example.com.:4317"  # Trailing dot skips search domains
```

Or reduce ndots in your pod spec:

```yaml
apiVersion: v1
kind: Pod
spec:
  dnsConfig:
    options:
      - name: ndots
        value: "2"
```

## Common Cause 5: Headless Service Misconfiguration

If you are using a headless Service for the Collector (for direct pod-to-pod communication), make sure the Service is actually headless:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  clusterIP: None  # This makes it headless
  selector:
    app: otel-collector
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
```

With a headless service, DNS returns the pod IPs directly. If no pods match the selector, DNS returns no results and your exporter will fail.

## Debugging Checklist

Here is a quick checklist to run through when you hit DNS issues:

```bash
# 1. Verify the target service exists
kubectl get svc -A | grep otel-collector

# 2. Test DNS from the failing pod's namespace
kubectl run dns-test --image=busybox --rm -it --restart=Never -- nslookup otel-collector.observability.svc.cluster.local

# 3. Check if CoreDNS is healthy
kubectl get pods -n kube-system -l k8s-app=kube-dns

# 4. Look at the exporter configuration
kubectl describe pod my-app-pod | grep OTEL_EXPORTER

# 5. Check network policies that might block DNS (port 53)
kubectl get networkpolicies -A
```

DNS problems are frustrating because the error messages are often vague. But with a systematic approach, you can narrow down whether the issue is in the service configuration, the DNS infrastructure, or the client-side resolver behavior.
