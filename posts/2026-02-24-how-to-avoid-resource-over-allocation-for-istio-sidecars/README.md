# How to Avoid Resource Over-Allocation for Istio Sidecars

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Resource, Sidecar, Kubernetes, Cost Optimization

Description: How to right-size Istio sidecar proxy resources to avoid wasting cluster capacity while maintaining reliable performance for production workloads.

---

Every pod in your mesh gets an Envoy sidecar, and that sidecar gets its own CPU and memory allocation. When you multiply those resources by hundreds or thousands of pods, the waste adds up fast. I have seen clusters where Istio sidecars consumed more resources than the actual application containers, simply because someone set generous defaults and never revisited them.

Here is how to right-size your sidecar resources without sacrificing performance.

## Understand the Current Waste

Start by measuring the gap between what is allocated and what is actually used:

```bash
# Get resource requests for all istio-proxy containers
kubectl get pods -A -o jsonpath='{range .items[*]}{range .spec.containers[?(@.name=="istio-proxy")]}{.resources.requests.cpu},{.resources.requests.memory}{"\n"}{end}{end}' | sort | uniq -c | sort -rn
```

Compare that with actual usage:

```bash
kubectl top pods -A --containers | grep istio-proxy | awk '{print $1, $2, $3, $4, $5}'
```

If the actual usage is consistently 10-20% of the requests, you have significant over-allocation.

For a more precise picture, query Prometheus:

```bash
# CPU: actual vs requested
curl -s "http://localhost:9090/api/v1/query?query=
  avg(rate(container_cpu_usage_seconds_total{container='istio-proxy'}[1h]))
  /
  avg(kube_pod_container_resource_requests{container='istio-proxy',resource='cpu'})
" | jq '.data.result[0].value[1]'

# Memory: actual vs requested
curl -s "http://localhost:9090/api/v1/query?query=
  avg(container_memory_working_set_bytes{container='istio-proxy'})
  /
  avg(kube_pod_container_resource_requests{container='istio-proxy',resource='memory'})
" | jq '.data.result[0].value[1]'
```

If these ratios are below 0.3 (30%), you are over-allocating by at least 70%.

## Why Over-Allocation Happens

The default Istio sidecar resources are set conservatively:

```yaml
# Typical defaults
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: "2"
    memory: 1Gi
```

These defaults are fine for getting started, but they do not account for your actual traffic patterns. A lightly-loaded internal service does not need the same proxy resources as a high-traffic API gateway.

## Right-Size Based on Actual Usage

Gather at least one week of usage data before adjusting. Look at P95 values, not averages, because you need headroom for spikes:

```bash
# P95 CPU usage per workload's sidecar
curl -s "http://localhost:9090/api/v1/query?query=
  quantile_over_time(0.95, rate(container_cpu_usage_seconds_total{container='istio-proxy'}[5m])[7d:5m])
" | jq -r '.data.result[] | "\(.metric.pod): \(.value[1])"' | sort -t: -k2 -rn | head -20

# P95 memory usage per workload's sidecar
curl -s "http://localhost:9090/api/v1/query?query=
  quantile_over_time(0.95, container_memory_working_set_bytes{container='istio-proxy'}[7d:5m])
" | jq -r '.data.result[] | "\(.metric.pod): \((.value[1] | tonumber / 1048576 | round))Mi"' | sort -t: -k2 -rn | head -20
```

Set requests to slightly above the P95 value and limits to 2-3x the P95:

```yaml
# For a typical low-traffic service
resources:
  requests:
    cpu: 20m
    memory: 64Mi
  limits:
    cpu: 200m
    memory: 128Mi

# For a medium-traffic service
resources:
  requests:
    cpu: 50m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi

# For a high-traffic service
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: "1"
    memory: 512Mi
```

## Set Optimized Global Defaults

Lower the global defaults to match your most common workload pattern:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 25m
            memory: 64Mi
          limits:
            cpu: 300m
            memory: 256Mi
```

Then override for workloads that need more using annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-traffic-api
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyCPULimit: "1"
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

## Reduce Configuration Size with Sidecar Resources

A major contributor to sidecar memory usage is the configuration data. Every proxy gets routes for every service in the mesh by default. Use Sidecar resources to limit the scope:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: production
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

This tells proxies to only load configuration for services in their own namespace and istio-system. In a mesh with 500 services, this can reduce memory usage per proxy from 100-200MB to 20-30MB.

Measure the impact:

```bash
# Before applying Sidecar resource
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/memory | python3 -m json.tool

# After applying Sidecar resource (restart pod first)
kubectl rollout restart deployment my-service -n production
# Wait for restart
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/memory | python3 -m json.tool
```

## Tune Concurrency

The `concurrency` setting controls Envoy's worker threads. Each thread consumes memory and CPU:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 2
```

For low-traffic services, a concurrency of 1 is often sufficient:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: low-traffic-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 1
```

Reducing concurrency from 2 to 1 cuts the proxy's CPU usage roughly in half.

## Disable Unnecessary Features

If you do not need access logs, disabling them reduces CPU usage:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: ""
```

If you do not need tracing, reduce the sampling rate:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        sampling: 0.1
```

## Calculate Total Savings

After right-sizing, calculate the cluster resources you freed up:

```bash
#!/bin/bash
echo "=== Sidecar Resource Summary ==="

# Total CPU requested by sidecars
CPU_REQUESTS=$(kubectl get pods -A -o json | jq '[.items[].spec.containers[] | select(.name=="istio-proxy") | .resources.requests.cpu // "0m" | gsub("m$";"") | tonumber] | add')
echo "Total CPU requests: ${CPU_REQUESTS}m"

# Total memory requested by sidecars
MEM_REQUESTS=$(kubectl get pods -A -o json | jq '[.items[].spec.containers[] | select(.name=="istio-proxy") | .resources.requests.memory // "0Mi" | gsub("Mi$";"") | tonumber] | add')
echo "Total memory requests: ${MEM_REQUESTS}Mi"

# Pod count
POD_COUNT=$(kubectl get pods -A -o json | jq '[.items[].spec.containers[] | select(.name=="istio-proxy")] | length')
echo "Total sidecars: $POD_COUNT"
echo "Average CPU per sidecar: $((CPU_REQUESTS / POD_COUNT))m"
echo "Average memory per sidecar: $((MEM_REQUESTS / POD_COUNT))Mi"
```

## Set Up Ongoing Monitoring

Create a dashboard or alert for over-allocated sidecars:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: sidecar-resource-alerts
spec:
  groups:
    - name: sidecar-resources
      rules:
        - alert: SidecarCPUOverAllocated
          expr: |
            avg_over_time(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])[1d:5m])
            /
            kube_pod_container_resource_requests{container="istio-proxy",resource="cpu"}
            < 0.1
          for: 7d
          labels:
            severity: info
          annotations:
            summary: "Sidecar {{ $labels.pod }} using less than 10% of requested CPU"
```

Review this data monthly. Traffic patterns change, new services get added, and what was right-sized three months ago might be over-allocated today. Resource optimization is not a one-time task. It is an ongoing practice that keeps your cluster efficient and your cloud bill reasonable.
