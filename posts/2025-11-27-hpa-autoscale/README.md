# How to Autoscale Deployments with the Horizontal Pod Autoscaler

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scaling, Performance, DevOps

Description: Enable the metrics server, define resource requests, create an HPA, and load-test it so Pods scale up (and back down) automatically.

---

Manual scaling gets old fast. The Horizontal Pod Autoscaler (HPA) watches metrics and adjusts `replicas` for your Deployments. Here’s the minimal setup.

## 1. Confirm Metrics Server Is Running

```bash
kubectl get deployment metrics-server -n kube-system
kubectl top nodes
kubectl top pods -n dev
```

If `kubectl top` fails, install the metrics server (`kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml`).

## 2. Set CPU/Memory Requests

HPAs need baseline resource requests to calculate utilization.

`deployments/web.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: dev
spec:
  replicas: 2
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
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

Apply the Deployment first.

## 3. Create the HPA

`hpa/web.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
  namespace: dev
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
```

Apply it:

```bash
kubectl apply -f hpa/web.yaml
kubectl get hpa -n dev
```

You should see current metrics and desired replicas once metrics flow.

## 4. Add Multiple Metrics (Optional)

Mix CPU and memory targets:

```yaml
metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: 200Mi
```

You can also reference custom/external metrics when Prometheus Adapter or CloudWatch adapters are installed.

## 5. Generate Load to Watch Scaling

```bash
kubectl run -it load-generator --rm --image=busybox -- /bin/sh
# inside the pod
while true; do wget -q -O- http://web.dev.svc.cluster.local/; done
```

In another terminal, monitor the HPA:

```bash
watch kubectl get hpa -n dev
watch kubectl get pods -n dev -l app=web
```

Once CPU usage exceeds 60%, the HPA increases `DESIRED` replicas. Remove the load and watch it scale back down after the stabilization window (default 5 minutes for scale-down).

## 6. Tune Behavior

Add behavior policies for faster scale-up/controlled scale-down (1.18+):

```yaml
spec:
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
```

## 7. Troubleshoot HPAs

- `kubectl describe hpa web -n dev` to see events.
- If metrics read `unknown`, run `kubectl get apiservice v1beta1.metrics.k8s.io`.
- Verify Pods actually request CPU—no requests means utilization is always 0%.
- Ensure PodDisruptionBudgets and minimum replica constraints align (HPAs cannot scale below PDB `minAvailable`).

## 8. GitOps & Observability

- Commit HPA manifests alongside Deployments.
- Alert if `currentReplicas == maxReplicas` for too long (needs more capacity).
- Track replica counts and CPU usage in dashboards to prove autoscaling is working.

---

With HPAs driving replica counts from real metrics, teams stop guessing at “the right number” and let Kubernetes follow demand automatically.
