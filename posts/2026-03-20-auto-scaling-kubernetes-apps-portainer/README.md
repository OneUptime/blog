# How to Configure Auto-Scaling for Kubernetes Apps in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, HPA, Auto-Scaling, Performance

Description: Learn how to enable Horizontal Pod Autoscaler (HPA) for Kubernetes applications deployed through Portainer.

## What Is Horizontal Pod Autoscaling?

The Horizontal Pod Autoscaler (HPA) automatically adjusts the number of pod replicas based on observed metrics such as CPU utilization or memory usage. When load increases, HPA scales up; when load decreases, it scales down.

## Prerequisites

- Metrics Server must be installed in the cluster, and server metrics must be enabled for the environment in Portainer.

```bash
# Install Metrics Server (if not already installed)

kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify Metrics Server is working
kubectl top node
```

## Enabling Auto-Scaling in Portainer

When deploying an application:

1. Scroll to the **Deployment** section.
2. Toggle **Enable auto scaling for this application** on.
3. Configure:
   - **Minimum instances**: The floor for scaling down.
   - **Maximum instances**: The ceiling for scaling up.
   - **Target CPU usage**: The target average CPU usage across replicas (for example, 70%).
4. Click **Deploy application**.

## What Portainer Creates

Portainer's application form creates a CPU-based HPA resource targeting your Deployment:

```yaml
# HPA created by Portainer
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: my-app
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app          # Target deployment
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70  # Target average CPU utilization
```

## Adding Memory-Based Scaling

Portainer's form exposes CPU-based autoscaling. To add memory-based scaling, edit the generated HPA after deployment and switch it to `autoscaling/v2`, for example:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80  # Target average memory utilization
```

## Managing HPA via CLI

```bash
# Create an HPA targeting a deployment
kubectl autoscale deployment my-app \
  --min=2 --max=10 --cpu=70% \
  --namespace=production

# View HPA status and current replica count
kubectl get hpa --namespace production

# Describe HPA for detailed scaling events
kubectl describe hpa my-app --namespace production

# Delete an HPA
kubectl delete hpa my-app --namespace production
```

## Scaling Behavior Tuning

To customize stabilization windows or scaling policies, edit the HPA to `autoscaling/v2` and add `behavior`:

```yaml
spec:
  behavior:
    scaleDown:
      # Wait 5 minutes before scaling down
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1           # Remove at most 1 pod per step
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 100         # Can double the replica count per step
          periodSeconds: 30
```

## Conclusion

Auto-scaling in Portainer enables your applications to handle variable load without manual intervention. Always set CPU requests for CPU-based scaling, and set memory requests as well if you extend the HPA to scale on memory. Also choose reasonable min/max replica bounds to prevent over-scaling.
