# How to Route Traffic by Percentage Weight in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Management, Canary Deployment, Kubernetes, Service Mesh

Description: Learn how to split and route traffic by percentage weight in Istio using VirtualService and DestinationRule for canary deployments and gradual rollouts.

---

Weighted traffic routing is one of the most practical features Istio offers. If you have ever needed to gradually roll out a new version of a service, test a feature with a small subset of users, or do a blue-green deployment, percentage-based routing is exactly what you need.

The idea is straightforward: you tell Istio to send a certain percentage of traffic to one version of your service and the rest to another. This is sometimes called canary deployment, and Istio makes it pretty painless once you understand the two resources involved: VirtualService and DestinationRule.

## Prerequisites

Before you get started, make sure you have:

- A Kubernetes cluster with Istio installed
- At least two versions of a service deployed (e.g., v1 and v2)
- `istioctl` and `kubectl` available on your machine
- Sidecar injection enabled for your namespace

## Setting Up the Destination Rule

First, you need a DestinationRule that defines the subsets for your service. Subsets map to different versions of your application, typically distinguished by labels.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-dr
  namespace: default
spec:
  host: my-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

This tells Istio that `my-service` has two subsets. Pods with the label `version: v1` belong to subset v1, and pods with `version: v2` belong to subset v2. Apply it with:

```bash
kubectl apply -f destination-rule.yaml
```

## Creating the Weighted VirtualService

Now comes the actual traffic splitting. The VirtualService is where you define the percentage weights.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: default
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            subset: v1
          weight: 90
        - destination:
            host: my-service
            subset: v2
          weight: 10
```

With this configuration, 90% of traffic goes to v1 and 10% goes to v2. The weights must add up to 100. Apply it:

```bash
kubectl apply -f virtual-service.yaml
```

## Verifying the Traffic Split

You can verify that traffic is being split correctly by sending a bunch of requests and checking the responses. If your service returns a version identifier, this becomes easy:

```bash
for i in $(seq 1 100); do
  curl -s http://my-service.default.svc.cluster.local | grep -o 'v[0-9]'
done | sort | uniq -c
```

You should see roughly 90 hits to v1 and 10 to v2. The distribution is not going to be exact for small sample sizes, but it will converge as you increase the number of requests.

You can also use Kiali (if you have it installed) to visualize the traffic flow. Kiali gives you a nice graph view that shows the percentage of traffic hitting each version.

## Gradual Rollout Strategy

In a real-world canary deployment, you would not jump straight to a 90/10 split. A typical progression looks like this:

**Step 1: Start small**

```yaml
- destination:
    host: my-service
    subset: v1
  weight: 99
- destination:
    host: my-service
    subset: v2
  weight: 1
```

**Step 2: Increase if metrics look good**

```yaml
- destination:
    host: my-service
    subset: v1
  weight: 90
- destination:
    host: my-service
    subset: v2
  weight: 10
```

**Step 3: Push more traffic**

```yaml
- destination:
    host: my-service
    subset: v1
  weight: 50
- destination:
    host: my-service
    subset: v2
  weight: 50
```

**Step 4: Complete the rollout**

```yaml
- destination:
    host: my-service
    subset: v2
  weight: 100
```

At each step, you monitor error rates, latency, and other metrics. If something goes wrong, you roll back by shifting weight back to v1.

## Splitting Across More Than Two Versions

You are not limited to two subsets. If you need to split traffic across three versions, just add another destination:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: default
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            subset: v1
          weight: 70
        - destination:
            host: my-service
            subset: v2
          weight: 20
        - destination:
            host: my-service
            subset: v3
          weight: 10
```

Again, the weights need to add up to 100.

## Combining Weight with Match Conditions

You can combine weighted routing with match conditions. For instance, send all requests from a specific header to v2, and split everything else:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-vs
  namespace: default
spec:
  hosts:
    - my-service
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: my-service
            subset: v2
          weight: 100
    - route:
        - destination:
            host: my-service
            subset: v1
          weight: 95
        - destination:
            host: my-service
            subset: v2
          weight: 5
```

This gives your internal team a way to always hit v2 (by setting the `x-canary` header) while regular users get the weighted split.

## Automating with Flagger

If you want to automate the entire canary process, look into Flagger. Flagger works with Istio and automatically adjusts the weights based on metrics thresholds. It watches things like error rate and request duration, and promotes or rolls back the canary without manual intervention.

Here is a quick example of a Flagger Canary resource:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-service
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  service:
    port: 80
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
```

This tells Flagger to increase the weight by 10% every 30 seconds, up to a maximum of 50%, as long as the success rate stays above 99%.

## Common Pitfalls

**Weights not adding up to 100.** If your weights do not sum to 100, Istio will normalize them, but the behavior might not be what you expect. Always make them add up to 100 explicitly.

**Missing DestinationRule.** If you define subsets in a VirtualService but do not have a corresponding DestinationRule, traffic will fail with 503 errors. The DestinationRule must exist before the VirtualService references its subsets.

**Sidecar not injected.** Weighted routing only works when both the client and server pods have the Istio sidecar proxy. If a pod is not part of the mesh, the VirtualService rules will not apply to traffic from or to that pod.

**Session affinity issues.** Weighted routing is per-request, not per-user. If you need a user to consistently hit the same version, you will need to combine this with consistent hashing or header-based routing.

## Checking Your Configuration

Use istioctl to analyze your configuration for issues:

```bash
istioctl analyze -n default
```

This will flag common problems like missing DestinationRules or misconfigured VirtualServices. It is a good habit to run this after any config change.

## Wrapping Up

Weighted traffic routing in Istio is a powerful building block for safe deployments. By gradually shifting traffic from one version to another, you reduce the blast radius of bugs and performance regressions. The combination of VirtualService and DestinationRule gives you fine-grained control, and tools like Flagger can automate the entire process. Start with a small percentage, watch your metrics, and increase confidence as you go.
