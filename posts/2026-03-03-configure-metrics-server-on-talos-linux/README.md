# How to Configure Metrics Server on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Metrics Server, Kubernetes, Resource Monitoring, HPA, Autoscaling

Description: Install and configure the Kubernetes Metrics Server on Talos Linux for resource monitoring and autoscaling support.

---

The Kubernetes Metrics Server is a lightweight, in-memory aggregator of resource usage data. It collects CPU and memory metrics from the kubelet on each node and makes them available through the Kubernetes Metrics API. This is the component that powers `kubectl top` commands, the Horizontal Pod Autoscaler (HPA), and the Kubernetes Dashboard resource usage graphs. On Talos Linux, Metrics Server requires a few specific configuration tweaks due to the immutable OS and its certificate handling. This guide walks through getting it installed and working reliably.

## What Metrics Server Does

Metrics Server is not a monitoring solution. It does not store historical data, create dashboards, or fire alerts. Instead, it provides a real-time snapshot of resource usage that other Kubernetes components depend on. Think of it as the foundation layer that enables:

- `kubectl top nodes` and `kubectl top pods` commands
- Horizontal Pod Autoscaler (HPA) scaling decisions
- Vertical Pod Autoscaler (VPA) recommendations
- Kubernetes Dashboard resource graphs
- Custom scheduling decisions based on resource availability

Without Metrics Server, none of these features work. It is one of the first things you should install on any new Talos Linux cluster.

## Why Talos Linux Needs Special Configuration

On standard Linux distributions, Metrics Server connects to the kubelet on each node using the node's hostname or IP. It verifies the kubelet's TLS certificate as part of the connection. On Talos Linux, the kubelet uses certificates that may not include all the hostnames or IPs that Metrics Server expects, which causes TLS verification failures.

Additionally, Talos Linux nodes may not have resolvable hostnames in the cluster DNS, depending on your infrastructure setup. Both of these issues are straightforward to work around.

## Step 1: Install Metrics Server with Helm

```bash
# Add the Metrics Server Helm repository
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo update
```

Create a values file with Talos-specific configuration:

```yaml
# metrics-server-values.yaml
args:
  # Skip TLS verification for kubelet certificates
  # This is necessary because Talos uses self-signed kubelet certs
  - --kubelet-insecure-tls
  # Use InternalIP to connect to nodes (avoids hostname resolution issues)
  - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
  # Metric resolution interval
  - --metric-resolution=15s

# Resource allocation
resources:
  requests:
    cpu: 100m
    memory: 200Mi
  limits:
    cpu: 500m
    memory: 500Mi

# Run on control plane nodes for reliability
tolerations:
  - key: node-role.kubernetes.io/control-plane
    operator: Exists
    effect: NoSchedule

# High availability with 2 replicas
replicas: 2

# Pod disruption budget
podDisruptionBudget:
  enabled: true
  minAvailable: 1

# Update strategy
updateStrategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1

# Service monitor for Prometheus integration
serviceMonitor:
  enabled: false  # Enable if you have Prometheus Operator
```

Install Metrics Server:

```bash
helm install metrics-server metrics-server/metrics-server \
  --namespace kube-system \
  --values metrics-server-values.yaml
```

## Step 2: Verify the Installation

Check that Metrics Server is running and healthy:

```bash
# Check pod status
kubectl get pods -n kube-system -l app.kubernetes.io/name=metrics-server

# Check the Metrics Server deployment
kubectl get deployment metrics-server -n kube-system

# Check the API service registration
kubectl get apiservice v1beta1.metrics.k8s.io
```

The API service should show `AVAILABLE: True`. If it does not, check the Metrics Server logs:

```bash
kubectl logs -n kube-system -l app.kubernetes.io/name=metrics-server --tail=50
```

## Step 3: Test Metrics Collection

Once Metrics Server is running, test that it is collecting data:

```bash
# View node-level resource usage
kubectl top nodes

# Expected output:
# NAME         CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
# talos-cp-1   250m         12%    2048Mi          51%
# talos-cp-2   180m         9%     1856Mi          46%
# talos-w-1    450m         22%    3200Mi          40%

# View pod-level resource usage
kubectl top pods --all-namespaces --sort-by=cpu

# View resource usage for a specific namespace
kubectl top pods -n kube-system
```

If you see "metrics not available yet", wait a minute. Metrics Server needs at least one scrape interval (15 seconds by default) to collect data.

## Step 4: Configure for High Availability

For production Talos Linux clusters, run Metrics Server with high availability:

```yaml
# metrics-server-ha-values.yaml
replicas: 2

# Anti-affinity to spread across nodes
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app.kubernetes.io/name
              operator: In
              values:
                - metrics-server
        topologyKey: kubernetes.io/hostname

# Topology spread constraints for even distribution
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: kubernetes.io/hostname
    whenUnsatisfiable: ScheduleAnyway
    labelSelector:
      matchLabels:
        app.kubernetes.io/name: metrics-server
```

## Step 5: Enable Horizontal Pod Autoscaling

With Metrics Server running, you can now use the Horizontal Pod Autoscaler. Here is an example:

```yaml
# hpa-example.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    # Scale based on CPU usage
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    # Scale based on memory usage
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
```

```bash
kubectl apply -f hpa-example.yaml

# Check HPA status
kubectl get hpa web-app-hpa

# Watch autoscaling in action
kubectl get hpa web-app-hpa --watch
```

## Step 6: Alternative Installation via Talos Machine Config

You can also deploy Metrics Server as part of your Talos machine configuration using inline manifests:

```yaml
# talos-machine-config patch
cluster:
  inlineManifests:
    - name: metrics-server
      contents: |
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: metrics-server
          namespace: kube-system
        ---
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: metrics-server
          namespace: kube-system
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: metrics-server
          template:
            metadata:
              labels:
                app: metrics-server
            spec:
              serviceAccountName: metrics-server
              containers:
                - name: metrics-server
                  image: registry.k8s.io/metrics-server/metrics-server:v0.7.0
                  args:
                    - --kubelet-insecure-tls
                    - --kubelet-preferred-address-types=InternalIP
                  ports:
                    - containerPort: 10250
                      name: https
```

This approach ensures Metrics Server is deployed automatically when the cluster bootstraps.

## Troubleshooting Common Issues

### TLS Certificate Errors

If you see errors like `x509: cannot validate certificate`:

```bash
# Verify the kubelet-insecure-tls flag is set
kubectl get deployment metrics-server -n kube-system -o yaml | grep kubelet-insecure-tls
```

### Hostname Resolution Failures

If Metrics Server cannot reach nodes by hostname:

```bash
# Verify the preferred address types flag
kubectl get deployment metrics-server -n kube-system -o yaml | grep kubelet-preferred-address-types

# Check what addresses nodes have
kubectl get nodes -o wide
```

### Metrics Not Available

If `kubectl top nodes` returns "metrics not yet available":

```bash
# Check Metrics Server logs
kubectl logs -n kube-system -l app.kubernetes.io/name=metrics-server

# Verify the API service is healthy
kubectl get apiservice v1beta1.metrics.k8s.io -o yaml

# Check if Metrics Server can reach the kubelet
kubectl exec -n kube-system deploy/metrics-server -- wget -qO- --no-check-certificate https://10.0.0.10:10250/metrics/resource
```

## Monitoring Metrics Server Itself

If you have Prometheus, enable the ServiceMonitor to track Metrics Server health:

```yaml
serviceMonitor:
  enabled: true
  additionalLabels:
    release: prometheus-stack
```

Key metrics to watch:

```promql
# Scrape duration per node
metrics_server_kubelet_request_duration_seconds

# Number of metrics collected
metrics_server_kubelet_request_total
```

## Conclusion

Metrics Server is a fundamental component for any Talos Linux Kubernetes cluster. The installation is straightforward once you know about the TLS and hostname configuration needed for Talos. With Metrics Server running, you unlock kubectl top commands, horizontal pod autoscaling, and resource usage visibility in the Kubernetes Dashboard. Install it early in your cluster setup process and run it in high availability mode for production workloads. It is small, lightweight, and enables capabilities that every Kubernetes cluster needs.
