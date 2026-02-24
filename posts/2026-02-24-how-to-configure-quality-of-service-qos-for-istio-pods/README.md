# How to Configure Quality of Service (QoS) for Istio Pods

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, QoS, Kubernetes, Resource Management, Pod Priority

Description: How to configure Kubernetes Quality of Service classes for Istio pods to control eviction priority and ensure critical services are protected.

---

Kubernetes assigns a Quality of Service (QoS) class to every pod based on its resource configuration. This class determines the order in which pods get evicted when a node runs low on resources. When you add an Istio sidecar to a pod, the sidecar's resource configuration directly affects the pod's QoS class. Getting this wrong means your important services might get evicted before less critical ones.

This guide explains how QoS classes work with Istio sidecars and how to configure them correctly.

## How QoS Classes Work

Kubernetes has three QoS classes, listed from most protected to least protected:

1. **Guaranteed**: Every container in the pod has CPU and memory requests equal to its limits. These pods are evicted last.
2. **Burstable**: At least one container has a resource request or limit set, but requests and limits are not equal for all containers. These pods are evicted after BestEffort but before Guaranteed.
3. **BestEffort**: No container has any resource requests or limits. These pods are evicted first.

The critical thing to understand is that QoS is determined by ALL containers in the pod, including the Istio sidecar. If any container does not have resources set, the pod cannot be Guaranteed.

## Checking Current QoS Classes

```bash
# Check QoS class for all pods in a namespace
kubectl get pods -n my-namespace -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.qosClass}{"\n"}{end}'

# Check QoS class specifically for pods with sidecars
kubectl get pods -A -o json | jq -r '
  .items[] |
  select(.spec.containers[]?.name == "istio-proxy") |
  "\(.metadata.namespace)/\(.metadata.name)\t\(.status.qosClass)"'
```

## The QoS Problem with Istio Sidecars

Here is a common gotcha. You carefully set resource requests and limits on your application container to get Guaranteed QoS:

```yaml
containers:
- name: my-app
  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
```

But the Istio sidecar is injected with different request and limit values (or even without limits), and suddenly your pod is Burstable instead of Guaranteed.

Check what resources the sidecar gets:

```bash
kubectl get pod my-pod -n my-namespace -o json | jq '.spec.containers[] | select(.name == "istio-proxy") | .resources'
```

## Configuring Guaranteed QoS

To get Guaranteed QoS, every container needs requests equal to limits. Set the sidecar resources to match:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
  namespace: production
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyCPULimit: "100m"
        sidecar.istio.io/proxyMemoryLimit: "128Mi"
    spec:
      containers:
      - name: critical-service
        image: myregistry/critical-service:1.0
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

When `proxyCPU` equals `proxyCPULimit` and `proxyMemory` equals `proxyMemoryLimit`, and the same is true for the app container, the pod gets Guaranteed QoS.

Verify after deployment:

```bash
kubectl get pod -n production -l app=critical-service -o jsonpath='{.items[0].status.qosClass}'
```

## Configuring Burstable QoS

For most workloads, Burstable is a reasonable choice. It provides some eviction protection while allowing the sidecar to use more resources during spikes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: standard-service
  namespace: api-services
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "50m"
        sidecar.istio.io/proxyMemory: "64Mi"
        sidecar.istio.io/proxyCPULimit: "200m"
        sidecar.istio.io/proxyMemoryLimit: "256Mi"
    spec:
      containers:
      - name: standard-service
        image: myregistry/standard-service:1.0
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1"
            memory: "512Mi"
```

## Setting Global QoS Strategy

If you want all sidecars in the mesh to contribute to a specific QoS class, set global defaults:

### Global Guaranteed QoS

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 100m
            memory: 128Mi
```

### Global Burstable QoS

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

## QoS for the Istio Control Plane

The control plane pods should have Guaranteed QoS in production:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 1
            memory: 4Gi
          limits:
            cpu: 1
            memory: 4Gi
    ingressGateways:
    - name: istio-ingressgateway
      k8s:
        resources:
          requests:
            cpu: 1
            memory: 1Gi
          limits:
            cpu: 1
            memory: 1Gi
```

Verify:

```bash
kubectl get pods -n istio-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.qosClass}{"\n"}{end}'
```

## Combining QoS with Priority Classes

QoS class and PriorityClass work together during eviction. The kubelet considers both:

1. First, it evicts BestEffort pods in order of lowest priority
2. Then Burstable pods, lowest priority first
3. Finally Guaranteed pods, lowest priority first

For maximum protection, combine Guaranteed QoS with a high priority:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: critical-production
value: 500000
globalDefault: false
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
  namespace: production
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
        sidecar.istio.io/proxyCPULimit: "100m"
        sidecar.istio.io/proxyMemoryLimit: "128Mi"
    spec:
      priorityClassName: critical-production
      containers:
      - name: payment-api
        resources:
          requests:
            cpu: "1"
            memory: "1Gi"
          limits:
            cpu: "1"
            memory: "1Gi"
```

## Per-Namespace QoS Strategy

Different namespaces might need different QoS strategies:

```yaml
# Production namespace - Guaranteed QoS for all sidecars
apiVersion: networking.istio.io/v1beta1
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

Combined with a LimitRange to enforce resource settings:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: production-limits
  namespace: production
spec:
  limits:
  - type: Container
    default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "500m"
      memory: "512Mi"
```

This LimitRange ensures any container without explicit resources gets default values that result in Guaranteed QoS (since default equals defaultRequest).

## Auditing QoS Across the Cluster

Run periodic checks to make sure your QoS configuration is correct:

```bash
#!/bin/bash
echo "=== QoS Audit Report ==="

for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  GUARANTEED=$(kubectl get pods -n $ns -o json 2>/dev/null | jq '[.items[] | select(.status.qosClass == "Guaranteed")] | length')
  BURSTABLE=$(kubectl get pods -n $ns -o json 2>/dev/null | jq '[.items[] | select(.status.qosClass == "Burstable")] | length')
  BESTEFFORT=$(kubectl get pods -n $ns -o json 2>/dev/null | jq '[.items[] | select(.status.qosClass == "BestEffort")] | length')

  if [ "$GUARANTEED" -gt 0 ] || [ "$BURSTABLE" -gt 0 ] || [ "$BESTEFFORT" -gt 0 ]; then
    echo "$ns: Guaranteed=$GUARANTEED Burstable=$BURSTABLE BestEffort=$BESTEFFORT"
  fi
done
```

## Summary

QoS configuration with Istio is about making sure the sidecar's resource settings do not accidentally downgrade your pod's QoS class. For critical services, set sidecar requests equal to limits to achieve Guaranteed QoS. For standard workloads, Burstable QoS with proper resource requests gives a good balance of protection and flexibility. Always combine QoS with priority classes for the best eviction protection, and audit your cluster regularly to catch pods that have slipped to a lower QoS class than intended.
