# How to Autoscale Deployments with the Horizontal Pod Autoscaler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scaling, Performance, DevOps

Description: Enable the metrics server, define resource requests, create an HPA, and load-test it so Pods scale up (and back down) automatically.

---

Manual scaling gets old fast. The Horizontal Pod Autoscaler (HPA) watches metrics and adjusts `replicas` for your Deployments. Here’s the minimal setup.

## 1. Confirm Metrics Server Is Running

The HPA depends on real-time CPU and memory metrics. These commands verify that the metrics-server Deployment is healthy and that `kubectl top` can fetch resource usage data from your nodes and Pods.

```bash
# Check if metrics-server is deployed in the kube-system namespace
kubectl get deployment metrics-server -n kube-system
# Display CPU and memory usage for all nodes
kubectl top nodes
# Display CPU and memory usage for Pods in the dev namespace
kubectl top pods -n dev
```

If `kubectl top` fails, install the metrics server (`kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml`).

## 2. Set CPU/Memory Requests

HPAs need baseline resource requests to calculate utilization.

`deployments/web.yaml`

This Deployment defines resource requests and limits for each container. The HPA uses `requests` as the baseline to calculate CPU utilization percentage. Without requests, the HPA cannot determine how busy your Pods are.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: dev
spec:
  replicas: 2                       # Starting replica count
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: ghcr.io/example/web:1.5.0
          resources:
            requests:
              cpu: 100m             # HPA uses this as the 100% baseline
              memory: 128Mi         # Memory request for scheduling
            limits:
              cpu: 500m             # Max CPU the container can use
              memory: 256Mi         # Max memory before OOM kill
```

Apply the Deployment first.

## 3. Create the HPA

`hpa/web.yaml`

This HorizontalPodAutoscaler watches the `web` Deployment and adjusts replicas based on average CPU utilization. When CPU exceeds 60%, it scales up; when usage drops, it scales back down (after a stabilization window).

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
  namespace: dev
spec:
  scaleTargetRef:                   # Reference to the workload to scale
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2                    # Never go below 2 for availability
  maxReplicas: 10                   # Cap at 10 to control costs
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60    # Scale up when avg CPU > 60%
```

Apply it and verify the HPA is picking up metrics:

```bash
# Create the HPA resource
kubectl apply -f hpa/web.yaml
# Check HPA status - TARGETS column shows current vs target utilization
kubectl get hpa -n dev
```

You should see current metrics and desired replicas once metrics flow.

## 4. Add Multiple Metrics (Optional)

You can define multiple metrics so the HPA scales on whichever threshold is breached first. This example triggers scale-up if either CPU utilization exceeds 60% or average memory per Pod exceeds 200Mi.

```yaml
metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60      # Scale if avg CPU > 60%
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: 200Mi         # Scale if avg memory > 200Mi
```

You can also reference custom/external metrics when Prometheus Adapter or CloudWatch adapters are installed.

## 5. Generate Load to Watch Scaling

Simulate traffic to push CPU usage above the 60% threshold. This temporary Pod runs an infinite loop hitting the web Service.

```bash
# Start a temporary Pod with an interactive shell
kubectl run -it load-generator --rm --image=busybox -- /bin/sh
# Inside the pod, flood the service with requests
while true; do wget -q -O- http://web.dev.svc.cluster.local/; done
```

In another terminal, monitor the HPA and watch new Pods spin up:

```bash
# Refresh HPA status every 2 seconds
watch kubectl get hpa -n dev
# Watch Pod count grow as replicas increase
watch kubectl get pods -n dev -l app=web
```

Once CPU usage exceeds 60%, the HPA increases `DESIRED` replicas. Remove the load and watch it scale back down after the stabilization window (default 5 minutes for scale-down).

## 6. Tune Behavior

The `behavior` block (Kubernetes 1.18+) lets you fine-tune how aggressively the HPA scales. This example scales up immediately during traffic spikes but scales down gradually to avoid flapping.

```yaml
spec:
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0   # No delay for scale-up
      policies:
        - type: Percent
          value: 100                  # Double replicas if needed
          periodSeconds: 60           # Evaluate every 60 seconds
    scaleDown:
      stabilizationWindowSeconds: 300 # Wait 5 min before scaling down
      policies:
        - type: Pods
          value: 1                    # Remove at most 1 Pod at a time
          periodSeconds: 60           # Evaluate every 60 seconds
```

## 7. Troubleshoot HPAs

- `kubectl describe hpa web -n dev` to see events.
- If metrics read `unknown`, run `kubectl get apiservice v1beta1.metrics.k8s.io`.
- Verify Pods actually request CPU-no requests means utilization is always 0%.
- Ensure PodDisruptionBudgets and minimum replica constraints align (HPAs cannot scale below PDB `minAvailable`).

## 8. GitOps & Observability

- Commit HPA manifests alongside Deployments.
- Alert if `currentReplicas == maxReplicas` for too long (needs more capacity).
- Track replica counts and CPU usage in dashboards to prove autoscaling is working.

---

With HPAs driving replica counts from real metrics, teams stop guessing at “the right number” and let Kubernetes follow demand automatically.
