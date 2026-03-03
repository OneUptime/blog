# How to Configure Vertical Pod Autoscaling on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Vertical Pod Autoscaler, VPA, Resource Management

Description: Learn how to install and configure the Vertical Pod Autoscaler on Talos Linux to automatically right-size your pod resources.

---

Picking the right CPU and memory values for your Kubernetes pods is surprisingly difficult. Set them too low and your applications crash or get throttled. Set them too high and you waste cluster resources that could be used by other workloads. The Vertical Pod Autoscaler (VPA) helps solve this problem by automatically adjusting resource requests and limits based on actual usage patterns.

On Talos Linux, VPA works the same way as on any Kubernetes distribution, but there are some installation and configuration details that are worth walking through carefully.

## What VPA Does

Unlike the Horizontal Pod Autoscaler (HPA), which adds or removes pod replicas, VPA adjusts the CPU and memory requests of individual pods. It has three components:

- **Recommender** - Watches resource usage and computes recommended values
- **Updater** - Evicts pods that need to be resized
- **Admission Controller** - Injects the recommended resource values into new pods at creation time

VPA can operate in three modes: Off (recommendations only), Initial (sets resources only at pod creation), and Auto (actively evicts and recreates pods with new values).

## Installing VPA on Talos Linux

The VPA is not built into Kubernetes. You need to install it separately. The official repository provides the manifests:

```bash
# Clone the VPA repository
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler

# Install VPA components
./hack/vpa-up.sh
```

Alternatively, you can install VPA using Helm, which gives you more control over the configuration:

```bash
# Add the Fairwinds Helm repository (popular VPA chart)
helm repo add fairwinds-stable https://charts.fairwinds.com/stable
helm repo update

# Install VPA with custom values
helm install vpa fairwinds-stable/vpa \
  --namespace kube-system \
  --set recommender.resources.requests.cpu=50m \
  --set recommender.resources.requests.memory=128Mi \
  --set updater.resources.requests.cpu=50m \
  --set updater.resources.requests.memory=128Mi \
  --set admissionController.resources.requests.cpu=50m \
  --set admissionController.resources.requests.memory=128Mi
```

Verify the installation:

```bash
# Check that all VPA components are running
kubectl get pods -n kube-system | grep vpa

# You should see three pods:
# vpa-recommender-xxxx
# vpa-updater-xxxx
# vpa-admission-controller-xxxx

# Verify the VPA CRD was installed
kubectl get crd | grep verticalpodautoscaler
```

## Creating a VPA Resource

Let us create a VPA for a sample deployment. First, here is the deployment:

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: myregistry/my-app:v2.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

Now create a VPA in recommendation-only mode to start:

```yaml
# vpa-recommendation.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  updatePolicy:
    # "Off" means only provide recommendations, no automatic updates
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: my-app
      minAllowed:
        cpu: "50m"
        memory: "64Mi"
      maxAllowed:
        cpu: "2"
        memory: "4Gi"
      controlledResources: ["cpu", "memory"]
```

```bash
# Apply both resources
kubectl apply -f app-deployment.yaml
kubectl apply -f vpa-recommendation.yaml

# Wait a few minutes for the recommender to collect data, then check recommendations
kubectl describe vpa my-app-vpa
```

The output will include a recommendation section showing the suggested CPU and memory values based on observed usage.

## Understanding VPA Recommendations

The VPA provides four types of recommendations:

```bash
# Get detailed VPA recommendations
kubectl get vpa my-app-vpa -o jsonpath='{.status.recommendation}' | python3 -m json.tool
```

The output includes:

- **lowerBound** - Minimum resources the container needs
- **target** - The recommended value to use
- **uncappedTarget** - What the VPA would recommend without your min/max constraints
- **upperBound** - Maximum the container might need under peak load

The target value is usually the one you want to focus on. It represents what the VPA thinks is the right resource level for steady-state operation.

## Enabling Automatic Updates

Once you are comfortable with the recommendations, you can switch to Auto mode. Be aware that Auto mode evicts and recreates pods to apply new resource values:

```yaml
# vpa-auto.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  updatePolicy:
    # "Auto" will evict pods and recreate with new resource values
    updateMode: "Auto"
    # Minimum number of replicas that must be available during eviction
    minReplicas: 2
  resourcePolicy:
    containerPolicies:
    - containerName: my-app
      minAllowed:
        cpu: "50m"
        memory: "64Mi"
      maxAllowed:
        cpu: "2"
        memory: "4Gi"
      controlledResources: ["cpu", "memory"]
      # Control whether VPA adjusts requests, limits, or both
      controlledValues: RequestsAndLimits
```

The "Initial" mode is a middle ground. It sets resources when a pod is first created but does not evict running pods:

```yaml
updatePolicy:
  updateMode: "Initial"
```

## Container-Level Policies

When your pod has multiple containers, you can set different VPA policies for each one:

```yaml
# multi-container-vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: multi-container-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-with-sidecar
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: web-app
      minAllowed:
        cpu: "100m"
        memory: "128Mi"
      maxAllowed:
        cpu: "4"
        memory: "8Gi"
    - containerName: log-sidecar
      # Let VPA manage this container with tighter bounds
      minAllowed:
        cpu: "25m"
        memory: "32Mi"
      maxAllowed:
        cpu: "200m"
        memory: "256Mi"
    - containerName: istio-proxy
      # Do not let VPA touch the service mesh sidecar
      mode: "Off"
```

## VPA and HPA Together

Running VPA and HPA on the same deployment can cause conflicts if both try to scale based on the same metric. However, you can use them together safely if they target different metrics:

```yaml
# VPA manages CPU and memory sizing
# HPA scales replicas based on custom metrics (like request rate)

# This combination works because VPA adjusts per-pod resources
# while HPA adjusts the number of pods
```

The general rule is: do not use VPA in Auto or Initial mode for CPU on the same deployment where HPA is scaling on CPU utilization. The two will fight each other. You can, however, use VPA for memory while HPA scales on CPU.

## Talos Linux Considerations

Talos Linux has a minimal footprint, which means your nodes have more allocatable resources compared to traditional Linux distributions. This is great for VPA because there is more headroom for the autoscaler to increase resource values.

Keep in mind that when VPA evicts a pod to resize it, you need enough capacity on the cluster to schedule the new pod. On small Talos clusters, this can be a problem. Consider using Pod Disruption Budgets alongside VPA:

```yaml
# pdb.yaml - Ensure minimum availability during VPA evictions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
```

## Monitoring VPA Activity

Track what VPA is doing across your cluster:

```bash
# List all VPA resources and their modes
kubectl get vpa -A

# Check VPA events for a specific deployment
kubectl describe vpa my-app-vpa | grep -A 20 Events

# Monitor pod evictions caused by VPA
kubectl get events --field-selector reason=EvictedByVPA -A
```

## Summary

Vertical Pod Autoscaling on Talos Linux is a powerful way to right-size your workloads without manual tuning. Start in "Off" mode to gather recommendations, review the suggestions, and then move to "Auto" or "Initial" mode when you trust the values. Combined with Talos Linux's minimal overhead and stable platform, VPA helps you run an efficient cluster where every pod gets exactly the resources it needs.
