# How to Set Up Horizontal Pod Autoscaling on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Horizontal Pod Autoscaler, Autoscaling, HPA

Description: Step-by-step guide to configuring Horizontal Pod Autoscaler on Talos Linux for automatic scaling of your workloads.

---

One of the biggest advantages of running Kubernetes is the ability to automatically scale your applications based on demand. The Horizontal Pod Autoscaler (HPA) watches your workloads and adjusts the number of pod replicas up or down depending on metrics like CPU utilization, memory usage, or custom metrics. On Talos Linux, setting this up requires a few specific steps since the OS is immutable and API-driven.

This guide walks through everything from installing the metrics server to configuring advanced HPA policies on a Talos Linux cluster.

## Prerequisites

Before you can use HPA, your cluster needs a metrics source. The most common option is the Kubernetes Metrics Server, which collects resource usage data from kubelets and exposes it through the Kubernetes API.

On Talos Linux, the kubelet serves metrics over a secure endpoint by default. The Metrics Server needs to be configured to handle this properly.

## Installing Metrics Server on Talos Linux

Deploy the Metrics Server using its official manifest:

```bash
# Download and apply the Metrics Server components
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

On some Talos Linux configurations, especially single-node or bare-metal setups, you might need to adjust the Metrics Server deployment to use the node's internal IP and skip TLS verification for kubelet certificates:

```yaml
# metrics-server-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-server
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: metrics-server
        args:
        - --cert-dir=/tmp
        - --secure-port=10250
        - --kubelet-preferred-address-types=InternalIP
        - --kubelet-use-node-status-port
        - --metric-resolution=15s
        # Only add this if using self-signed kubelet certs
        - --kubelet-insecure-tls
```

```bash
# Apply the patch
kubectl apply -f metrics-server-patch.yaml

# Verify Metrics Server is running
kubectl -n kube-system get pods -l k8s-app=metrics-server

# Test that metrics are being collected
kubectl top nodes
kubectl top pods -A
```

Once kubectl top returns data, your metrics pipeline is ready.

## Creating a Basic HPA

Let us start with a simple deployment and an HPA that scales based on CPU usage:

```yaml
# sample-app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sample-app
  template:
    metadata:
      labels:
        app: sample-app
    spec:
      containers:
      - name: app
        image: registry.k8s.io/hpa-example
        ports:
        - containerPort: 80
        resources:
          # Resource requests are REQUIRED for CPU-based HPA
          requests:
            cpu: "200m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: sample-app
spec:
  selector:
    app: sample-app
  ports:
  - port: 80
    targetPort: 80
```

Now create the HPA:

```yaml
# sample-app-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sample-app-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sample-app
  # Scaling bounds
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        # Scale when average CPU exceeds 50% of requested
        type: Utilization
        averageUtilization: 50
```

```bash
# Apply both resources
kubectl apply -f sample-app-deployment.yaml
kubectl apply -f sample-app-hpa.yaml

# Check HPA status
kubectl get hpa sample-app-hpa
```

The output should show the current CPU utilization and the target. If you see "unknown" under TARGETS, wait a minute for the metrics pipeline to collect data.

## Testing the Autoscaler

To verify the HPA works, generate some load:

```bash
# Run a load generator pod
kubectl run load-generator --image=busybox:1.36 --restart=Never -- /bin/sh -c \
  "while true; do wget -q -O- http://sample-app; done"

# Watch the HPA respond to increased load
kubectl get hpa sample-app-hpa --watch

# After testing, delete the load generator
kubectl delete pod load-generator
```

You should see the number of replicas increase as CPU utilization goes above 50%. Once you stop the load generator, the replicas will gradually scale back down.

## Scaling on Memory Usage

You can also scale based on memory utilization:

```yaml
# memory-based-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: memory-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sample-app
  minReplicas: 2
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

When multiple metrics are specified, the HPA calculates the desired replica count for each metric independently and uses the highest value. This means your deployment scales out if either CPU or memory crosses its threshold.

## Configuring Scaling Behavior

Kubernetes allows you to fine-tune how quickly the HPA scales up and scales down. This is useful for preventing flapping (rapid scale-up and scale-down cycles):

```yaml
# hpa-with-behavior.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: controlled-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sample-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
  behavior:
    scaleUp:
      # Scale up aggressively to handle traffic spikes
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 4
        periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      # Scale down slowly to avoid premature scaling
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
      selectPolicy: Min
```

In this configuration, scale-up happens quickly (doubling or adding 4 pods per minute, whichever is greater), while scale-down happens slowly (removing at most 10% of pods per minute, with a 5-minute stabilization window).

## Using Custom Metrics

For more sophisticated scaling, you can use custom metrics from Prometheus or other sources. This requires a custom metrics adapter. Here is an example using the Prometheus adapter:

```yaml
# hpa-custom-metric.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: custom-metric-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-api
  minReplicas: 3
  maxReplicas: 25
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        # Scale when avg requests per pod exceeds 100/sec
        type: AverageValue
        averageValue: "100"
```

## Talos-Specific Tips

On Talos Linux, keep these things in mind when configuring HPA:

The kubelet on Talos collects metrics at a default interval. If your HPA seems slow to respond, check the metrics-resolution setting on the Metrics Server and the HPA controller's sync period (default is 15 seconds).

If you are running a small Talos cluster, be mindful of setting maxReplicas too high. Your nodes have finite capacity, and the HPA will create pods that stay in Pending state if there is no room to schedule them.

For production clusters, consider combining HPA with Cluster Autoscaler so that new nodes are added when existing ones are full. This gives you both pod-level and node-level elasticity.

```bash
# Monitor HPA events for troubleshooting
kubectl describe hpa sample-app-hpa

# Check the conditions section for any issues
kubectl get hpa sample-app-hpa -o yaml | grep -A 20 conditions
```

## Summary

Horizontal Pod Autoscaling on Talos Linux works reliably once you have the metrics pipeline in place. Install the Metrics Server, set resource requests on your deployments, create an HPA resource, and fine-tune the scaling behavior for your workload patterns. The combination of Talos Linux's stable, minimal OS and Kubernetes HPA gives you a production-ready autoscaling setup that responds to real demand without manual intervention.
