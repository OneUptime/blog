# How to Configure Vertical Pod Autoscaling in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, VPA, Workload

Description: Learn how to configure Vertical Pod Autoscaling (VPA) in Rancher to automatically adjust CPU and memory requests for your workloads.

Vertical Pod Autoscaling (VPA) automatically adjusts the CPU and memory requests of containers based on actual usage. Unlike HPA which scales the number of pods, VPA right-sizes individual pods by increasing or decreasing their resource allocations. This is particularly useful for workloads where scaling horizontally is not practical or when you want to optimize resource utilization. This guide covers setting up VPA in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster registered in Rancher
- The Metrics Server installed in the cluster
- Cluster admin access to install the VPA components

## Step 1: Install the VPA Components

VPA is not included by default in most Kubernetes distributions. You need to install the VPA components in your cluster.

Clone the VPA repository and install:

```bash
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh
```

Alternatively, the upstream project also publishes a Helm chart, although its README notes that the chart is still under development and not marked production-ready:

```bash
helm repo add autoscalers https://kubernetes.github.io/autoscaler
helm upgrade -i vertical-pod-autoscaler autoscalers/vertical-pod-autoscaler
```

Verify the installation in the namespace you used. For `vpa-up.sh`, that is `kube-system`:

```bash
kubectl get pods -n kube-system
```

You should see three components running:

- **VPA Recommender**: Monitors resource usage and provides recommendations
- **VPA Updater**: Applies the recommendations by evicting pods
- **VPA Admission Controller**: Sets resource requests on new pods

## Step 2: Create a VPA Resource

### Recommendation-Only Mode (Off)

Start with the `Off` mode to observe recommendations without automatic changes:

```yaml
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
    updateMode: "Off"
```

Apply this using Rancher or kubectl:

```bash
kubectl apply -f vpa.yaml
```

### Recreate Mode

Once you are comfortable with the recommendations, switch to `Recreate` mode:

```yaml
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
    updateMode: "Recreate"
  resourcePolicy:
    containerPolicies:
      - containerName: my-app
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: 2000m
          memory: 4Gi
        controlledResources:
          - cpu
          - memory
```

### Initial Mode

The `Initial` mode only sets resources on pod creation and does not evict running pods:

```yaml
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
    updateMode: "Initial"
```

## Step 3: Configure Resource Policies

Resource policies let you set boundaries for VPA recommendations:

```yaml
spec:
  resourcePolicy:
    containerPolicies:
      - containerName: my-app
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 4000m
          memory: 8Gi
        controlledResources:
          - cpu
          - memory
      - containerName: sidecar
        mode: "Off"
```

Key settings:

- **minAllowed**: The minimum resources VPA will recommend
- **maxAllowed**: The maximum resources VPA will recommend
- **controlledResources**: Which resources VPA should manage (cpu, memory, or both)
- **mode**: Set to `Off` for containers VPA should not touch (useful for sidecars)

## Step 4: View VPA Recommendations

After the VPA has been running for a few minutes, check its recommendations:

```bash
kubectl describe vpa my-app-vpa -n default
```

Look for the `Recommendation` section:

```plaintext
Recommendation:
  Container Recommendations:
    Container Name:  my-app
    Lower Bound:
      Cpu:     50m
      Memory:  131072k
    Target:
      Cpu:     200m
      Memory:  262144k
    Uncapped Target:
      Cpu:     200m
      Memory:  262144k
    Upper Bound:
      Cpu:     1000m
      Memory:  524288k
```

- **Target**: The recommended request values
- **Lower Bound**: The minimum recommended value
- **Upper Bound**: The maximum recommended value
- **Uncapped Target**: What VPA would recommend without min/max constraints

## Step 5: Monitor VPA Actions

When VPA is in Recreate mode, it will evict and recreate pods to apply new resource values. Monitor these events:

```bash
kubectl get events -n default --field-selector reason=EvictedByVPA
```

Check the current resource requests on running pods:

```bash
kubectl get pod -n default -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].resources.requests}{"\n"}{end}'
```

## Important Considerations

### VPA and HPA Together

Using VPA and HPA on the same metric (e.g., both on CPU) can cause conflicts. If you need both:

- Use HPA for scaling replicas based on CPU or custom metrics
- Use VPA for memory right-sizing only

```yaml
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
    updateMode: "Recreate"
  resourcePolicy:
    containerPolicies:
      - containerName: my-app
        controlledResources:
          - memory
        minAllowed:
          memory: 128Mi
        maxAllowed:
          memory: 4Gi
```

### Pod Disruption

In Recreate mode, VPA evicts pods to apply new resource values. This causes brief downtime for single-replica workloads. Ensure you have:

- Multiple replicas for high availability
- Pod Disruption Budgets (PDBs) configured
- Proper readiness probes

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
  namespace: default
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: my-app
```

### Warm-Up Time

VPA needs time to collect usage data and generate accurate recommendations. Let it observe representative workload traffic before switching from Off to Recreate mode, especially for workloads with variable traffic patterns.

## Summary

Vertical Pod Autoscaling helps you right-size your workloads by automatically adjusting CPU and memory requests based on actual usage. Start with the Off mode to observe recommendations, then progress to Recreate mode once you are confident in the boundaries. Use resource policies to set safe minimums and maximums, and be mindful of the interaction between VPA and HPA. VPA is especially valuable for optimizing resource utilization and reducing costs in large clusters.
