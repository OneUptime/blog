# How to Configure SMI Traffic Split with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SMI, Traffic Split, Canary Deployment, Kubernetes

Description: Step-by-step guide to configuring SMI Traffic Split with Istio for canary deployments, blue-green releases, and gradual traffic shifting between service versions.

---

Traffic splitting is one of the most practical features in any service mesh. It lets you gradually shift traffic between different versions of a service, making canary deployments and blue-green releases much safer. SMI Traffic Split provides a clean, portable API for this. When paired with Istio through the SMI adapter, your TrafficSplit resources get translated into Istio VirtualService and DestinationRule objects.

## How SMI Traffic Split Works

The TrafficSplit resource has a simple model. You specify a root service (the one clients actually call) and a list of backend services with weights. The mesh ensures that incoming traffic to the root service gets distributed across the backends according to those weights.

This is different from Kubernetes' built-in load balancing, which distributes evenly across all pods behind a Service. With TrafficSplit, you control the percentage of traffic each version gets.

## Setting Up the Environment

Start with Istio and the SMI adapter:

```bash
istioctl install --set profile=demo
kubectl label namespace default istio-injection=enabled

kubectl apply -f https://raw.githubusercontent.com/servicemeshinterface/smi-adapter-istio/master/deploy/crds.yaml
kubectl apply -f https://raw.githubusercontent.com/servicemeshinterface/smi-adapter-istio/master/deploy/adapter.yaml
```

## Deploying Service Versions

You need separate Kubernetes Services for each version. This is a key requirement for SMI Traffic Split. The root service matches all versions, and each backend service matches a specific version:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
      version: v1
  template:
    metadata:
      labels:
        app: web-app
        version: v1
    spec:
      containers:
      - name: web-app
        image: hashicorp/http-echo:0.2.3
        args: ["-text=version-1"]
        ports:
        - containerPort: 5678
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-v2
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
      version: v2
  template:
    metadata:
      labels:
        app: web-app
        version: v2
    spec:
      containers:
      - name: web-app
        image: hashicorp/http-echo:0.2.3
        args: ["-text=version-2"]
        ports:
        - containerPort: 5678
```

Now create the Services. You need three: one root service and one for each version:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: web-app-v1
spec:
  selector:
    app: web-app
    version: v1
  ports:
  - port: 80
    targetPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: web-app-v2
spec:
  selector:
    app: web-app
    version: v2
  ports:
  - port: 80
    targetPort: 5678
```

Apply everything:

```bash
kubectl apply -f deployments.yaml
kubectl apply -f services.yaml
```

## Creating a Traffic Split

Start with sending all traffic to v1:

```yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: web-app-split
spec:
  service: web-app
  backends:
  - service: web-app-v1
    weight: 100
  - service: web-app-v2
    weight: 0
```

```bash
kubectl apply -f traffic-split.yaml
```

Test it to confirm all traffic goes to v1:

```bash
kubectl run test-client --image=curlimages/curl:7.85.0 --command -- sleep infinity

for i in $(seq 1 10); do
  kubectl exec test-client -- curl -s http://web-app
done
```

You should see "version-1" for every request.

## Canary Deployment: Gradual Rollout

Now shift 10% of traffic to v2:

```yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: web-app-split
spec:
  service: web-app
  backends:
  - service: web-app-v1
    weight: 90
  - service: web-app-v2
    weight: 10
```

```bash
kubectl apply -f traffic-split.yaml
```

Test again with more requests to see the distribution:

```bash
for i in $(seq 1 100); do
  kubectl exec test-client -- curl -s http://web-app
done | sort | uniq -c
```

You should see roughly 90 requests to v1 and 10 to v2. The exact numbers will vary since traffic distribution is probabilistic, not deterministic.

If v2 looks healthy, increase the split:

```yaml
spec:
  service: web-app
  backends:
  - service: web-app-v1
    weight: 50
  - service: web-app-v2
    weight: 50
```

And eventually complete the rollout:

```yaml
spec:
  service: web-app
  backends:
  - service: web-app-v1
    weight: 0
  - service: web-app-v2
    weight: 100
```

## What Istio Creates

The SMI adapter translates your TrafficSplit into Istio-native resources. Check what was generated:

```bash
kubectl get virtualservice -o yaml
kubectl get destinationrule -o yaml
```

You'll see a VirtualService that routes traffic for the `web-app` host with weighted destinations, and a DestinationRule that defines subsets for each version. The generated VirtualService looks approximately like:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: web-app-split
spec:
  hosts:
  - web-app
  http:
  - route:
    - destination:
        host: web-app-v1
      weight: 90
    - destination:
        host: web-app-v2
      weight: 10
```

## Blue-Green Deployment Pattern

For a blue-green deployment, you keep two full environments and switch traffic all at once:

```yaml
# All traffic to blue (v1)
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: web-app-split
spec:
  service: web-app
  backends:
  - service: web-app-v1
    weight: 100
  - service: web-app-v2
    weight: 0
```

After testing v2 thoroughly (maybe through a direct service call to `web-app-v2`), switch everything:

```yaml
# Switch to green (v2)
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: web-app-split
spec:
  service: web-app
  backends:
  - service: web-app-v1
    weight: 0
  - service: web-app-v2
    weight: 100
```

If something goes wrong, flip it back instantly.

## Three-Way Split for A/B/C Testing

You can split traffic across more than two versions:

```yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: web-app-split
spec:
  service: web-app
  backends:
  - service: web-app-v1
    weight: 60
  - service: web-app-v2
    weight: 20
  - service: web-app-v3
    weight: 20
```

Just make sure you have the corresponding Kubernetes Service and Deployment for each version.

## Automating the Rollout

You can script a gradual rollout that increases the canary weight over time:

```bash
#!/bin/bash

for weight in 10 25 50 75 100; do
  v1_weight=$((100 - weight))

  cat <<EOF | kubectl apply -f -
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: web-app-split
spec:
  service: web-app
  backends:
  - service: web-app-v1
    weight: $v1_weight
  - service: web-app-v2
    weight: $weight
EOF

  echo "Traffic split: v1=$v1_weight%, v2=$weight%"
  echo "Waiting 5 minutes to observe metrics..."
  sleep 300
done
```

In production, you would check error rates and latency between each step before proceeding.

## Monitoring the Split

Check the current traffic split status:

```bash
kubectl get trafficsplit web-app-split -o yaml
```

Watch the actual traffic distribution using Istio's built-in metrics. If you have Prometheus and Grafana set up:

```bash
istioctl dashboard grafana
```

Look at the Istio Service Dashboard and filter by the `web-app` service. You should see request rates split between v1 and v2 matching your configured weights.

## Weight Rules and Edge Cases

A few things to know about weights:

- Weights don't need to add up to 100. If you use 1 and 9, that's the same as 10 and 90.
- A weight of 0 means no traffic goes to that backend.
- All weights at 0 is invalid and behavior is undefined.
- Weights are relative, not absolute percentages.

## Cleanup

```bash
kubectl delete trafficsplit web-app-split
kubectl delete service web-app web-app-v1 web-app-v2
kubectl delete deployment web-app-v1 web-app-v2
kubectl delete pod test-client
```

SMI Traffic Split gives you a straightforward way to do traffic shifting that works across different mesh implementations. For Istio users, it is a simpler abstraction over VirtualService weights. If you need path-based or header-based routing along with weight-based splitting, you will need to use Istio-native resources, since SMI Traffic Split only handles weight-based distribution.
