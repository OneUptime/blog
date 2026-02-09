# How to Monitor Pod Resource Usage vs Requests with Metrics Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Metrics Server, Monitoring

Description: Deploy and use Kubernetes Metrics Server to monitor real-time pod and node resource consumption, compare actual usage against requests, and identify over-provisioned or under-provisioned workloads.

---

Setting resource requests is guesswork without data. Metrics Server exposes real-time CPU and memory usage for nodes and pods, letting you compare actual usage against requests. This guide shows you how to deploy Metrics Server and use it to right-size your workloads.

## What Is Metrics Server?

Metrics Server is a cluster-wide aggregator of resource usage data. It collects metrics from the kubelet on each node and exposes them via the Metrics API. This powers:

- `kubectl top` commands
- Horizontal Pod Autoscaler (HPA)
- Vertical Pod Autoscaler (VPA)
- Resource usage monitoring

Metrics Server provides recent data (last few minutes), not historical metrics. For long-term monitoring, use Prometheus.

## Installing Metrics Server

Install via kubectl:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Verify deployment:

```bash
kubectl get deployment metrics-server -n kube-system
```

Wait for the pod to be ready:

```bash
kubectl wait --for=condition=ready pod -l k8s-app=metrics-server -n kube-system --timeout=60s
```

## Configuring Metrics Server

For clusters with self-signed certificates or kubelet authentication issues, modify the deployment:

```bash
kubectl edit deployment metrics-server -n kube-system
```

Add these args to the container:

```yaml
spec:
  containers:
  - name: metrics-server
    args:
    - --kubelet-insecure-tls
    - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
```

The `--kubelet-insecure-tls` flag skips TLS verification (use only for development).

## Using kubectl top

Check node resource usage:

```bash
kubectl top nodes
```

Output:

```
NAME       CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
worker-1   1200m        30%    8Gi             40%
worker-2   800m         20%    6Gi             30%
```

Check pod resource usage:

```bash
kubectl top pods -n production
```

Output:

```
NAME           CPU(cores)   MEMORY(bytes)
web-app-abc    150m         512Mi
database-xyz   800m         4Gi
```

## Comparing Usage vs Requests

List pod requests alongside usage:

```bash
kubectl top pods -n production
kubectl get pods -n production -o custom-columns=NAME:.metadata.name,CPU_REQ:.spec.containers[*].resources.requests.cpu,MEM_REQ:.spec.containers[*].resources.requests.memory
```

Compare manually to identify over/under-provisioned pods.

## Finding Over-Provisioned Pods

Pods using much less than requested waste resources:

```bash
# Get top usage
kubectl top pods -n production --no-headers | awk '{print $1, $2, $3}' > /tmp/usage.txt

# Get requests
kubectl get pods -n production -o json | jq -r '.items[] | "\(.metadata.name) \(.spec.containers[].resources.requests.cpu // "0") \(.spec.containers[].resources.requests.memory // "0")"' > /tmp/requests.txt

# Compare (manual analysis)
```

Look for pods using < 50% of requested resources.

## Finding Under-Provisioned Pods

Pods using more than requested may get throttled (CPU) or OOMKilled (memory):

```bash
kubectl top pods -n production | awk 'NR>1 {print $1, $2, $3}'
```

Compare against requests. Pods consistently near or exceeding requests need higher limits.

## Checking Container-Level Usage

View individual container usage in multi-container pods:

```bash
kubectl top pods -n production --containers
```

Output:

```
POD            NAME       CPU(cores)   MEMORY(bytes)
web-app-abc    app        120m         400Mi
web-app-abc    sidecar    30m          112Mi
```

This shows the sidecar uses 30m CPU - useful for sizing sidecar requests.

## Monitoring with the Metrics API

Query the Metrics API directly:

```bash
# Node metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes | jq

# Pod metrics for a namespace
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/production/pods | jq
```

Output includes timestamp, CPU usage in nanocores, and memory in bytes.

## Sample Metrics API Response

```json
{
  "kind": "PodMetricsList",
  "apiVersion": "metrics.k8s.io/v1beta1",
  "metadata": {},
  "items": [
    {
      "metadata": {
        "name": "web-app-abc",
        "namespace": "production"
      },
      "timestamp": "2026-02-09T10:30:00Z",
      "window": "30s",
      "containers": [
        {
          "name": "app",
          "usage": {
            "cpu": "120m",
            "memory": "400Mi"
          }
        }
      ]
    }
  ]
}
```

The window field shows the measurement period (typically 30s).

## Calculating Utilization Percentage

Write a script to calculate usage vs request percentage:

```bash
#!/bin/bash
NAMESPACE=$1

kubectl get pods -n $NAMESPACE -o json | jq -r '.items[] |
  .metadata.name as $name |
  (.spec.containers[0].resources.requests.cpu // "0") as $cpu_req |
  (.spec.containers[0].resources.requests.memory // "0") as $mem_req |
  "\($name) \($cpu_req) \($mem_req)"
' | while read name cpu_req mem_req; do
  usage=$(kubectl top pod $name -n $NAMESPACE --no-headers | awk '{print $2, $3}')
  echo "$name - Request: $cpu_req/$mem_req Usage: $usage"
done
```

Run with:

```bash
./check-utilization.sh production
```

## Identifying Right-Sizing Opportunities

Look for these patterns:

**Over-provisioned**: Usage consistently < 30% of requests
```
web-app-abc - Request: 2/4Gi Usage: 200m/800Mi
```
Action: Lower requests to 500m/1Gi

**Under-provisioned**: Usage near or exceeds requests
```
database-xyz - Request: 1/2Gi Usage: 950m/1.9Gi
```
Action: Increase requests to 2/4Gi

**Well-sized**: Usage 40-70% of requests
```
cache-def - Request: 500m/1Gi Usage: 300m/600Mi
```
Action: No change needed

## Exporting Metrics to Prometheus

While Metrics Server provides recent data, use Prometheus for historical analysis:

```yaml
# ServiceMonitor for Metrics Server
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: metrics-server
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: metrics-server
  endpoints:
  - port: https
    scheme: https
    tlsConfig:
      insecureSkipVerify: true
```

Then query with PromQL:

```promql
# Pod CPU usage
container_cpu_usage_seconds_total{namespace="production"}

# Pod memory usage
container_memory_working_set_bytes{namespace="production"}
```

## Using Metrics for HPA

Horizontal Pod Autoscaler uses Metrics Server:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

HPA queries Metrics Server to get current CPU usage and scales accordingly.

## Troubleshooting Metrics Server

**No metrics available**: Check Metrics Server logs:

```bash
kubectl logs -n kube-system deployment/metrics-server
```

Common issues:

- Kubelet certificate errors: Add `--kubelet-insecure-tls`
- Network policies blocking access
- Metrics Server can't reach kubelet

**Metrics outdated**: Metrics Server scrapes every 60s by default. Adjust with:

```yaml
args:
- --metric-resolution=30s
```

**High resource usage**: Metrics Server stores only recent metrics. If it uses excessive resources, check for metric cardinality issues.

## Best Practices

- Deploy Metrics Server in all clusters
- Check top pods weekly to identify right-sizing opportunities
- Use Prometheus for long-term analysis
- Automate utilization reports with scripts
- Combine Metrics Server data with application metrics
- Set resource requests based on P95 usage, not max
- Leave headroom for traffic spikes
- Monitor both CPU and memory independently

## Real-World Example: Right-Sizing a Deployment

A web app deployment with 10 replicas:

```bash
# Check usage
kubectl top pods -n production -l app=web | awk '{sum+=$2; count++} END {print "Avg CPU:", sum/count}'
# Output: Avg CPU: 180m

# Check requests
kubectl get deployment web -n production -o jsonpath='{.spec.template.spec.containers[0].resources.requests.cpu}'
# Output: 1 (1000m)
```

Pods average 180m but request 1000m. They're over-provisioned by 5x. Lower requests to 300m:

```bash
kubectl set resources deployment web -n production --requests=cpu=300m,memory=512Mi
```

This frees up 7000m CPU (700m per pod x 10 pods) for other workloads.

## Monitoring Metrics Server Itself

Track Metrics Server performance:

```bash
kubectl top pod -n kube-system -l k8s-app=metrics-server
```

Ensure it uses minimal resources (typically < 50m CPU, < 200Mi memory).

## Conclusion

Metrics Server is essential for understanding actual resource consumption in Kubernetes. Use `kubectl top` to check current usage, compare against requests to find right-sizing opportunities, and export data to Prometheus for historical analysis. Right-sized workloads reduce waste, lower costs, and improve cluster efficiency. Make checking resource utilization a regular practice, and adjust requests based on real data rather than guesses.
