# How to Configure Flagger Linkerd TrafficSplit for Canary

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flagger, linkerd, trafficsplit, canary, kubernetes, progressive delivery, service mesh, SMI

Description: Learn how Flagger manages Linkerd TrafficSplit resources for progressive canary traffic shifting and how to configure the routing behavior.

---

## Introduction

Linkerd uses the Service Mesh Interface (SMI) TrafficSplit resource to control traffic distribution between services. When Flagger operates with Linkerd as its mesh provider, it automatically creates and manages TrafficSplit resources to shift traffic between primary and canary workloads during progressive delivery.

The TrafficSplit resource is a Kubernetes custom resource defined by the SMI specification. It works by intercepting traffic to a root service and distributing it to backend services based on configured weights. Flagger updates these weights at each analysis step, gradually increasing canary traffic while monitoring health metrics.

This guide explains how Flagger creates and manages TrafficSplit resources with Linkerd, how the traffic routing works, and how to inspect and troubleshoot the configuration.

## Prerequisites

- A running Kubernetes cluster with Linkerd installed (including the Viz extension)
- Flagger installed with `meshProvider=linkerd`
- kubectl access to your cluster
- A Deployment with Linkerd sidecar injection enabled

## How Flagger Uses TrafficSplit

When you create a Canary resource with Linkerd, Flagger creates the following resources:

- `my-app-primary` Deployment (copy of the target)
- `my-app` Service (the root service, used by clients)
- `my-app-primary` Service (targets primary pods)
- `my-app-canary` Service (targets canary pods)
- A TrafficSplit resource that splits traffic from the root service

The TrafficSplit looks like this during initialization (100% to primary):

```yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: my-app
  namespace: default
spec:
  service: my-app
  backends:
    - service: my-app-primary
      weight: 100
    - service: my-app-canary
      weight: 0
```

During canary analysis, Flagger updates the weights:

```yaml
spec:
  service: my-app
  backends:
    - service: my-app-primary
      weight: 90
    - service: my-app-canary
      weight: 10
```

## Configuring a Canary with Linkerd TrafficSplit

Here is a complete Canary resource for Linkerd:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
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
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
```

With Linkerd, the `service` section is simpler than with Istio because there are no gateways, hosts, or VirtualService-specific fields. The TrafficSplit is managed entirely by Flagger based on the analysis configuration.

## Understanding Traffic Flow

When a client sends a request to `my-app.default.svc.cluster.local`, the Linkerd proxy intercepts the request and checks the TrafficSplit resource. Based on the configured weights, it routes the request to either `my-app-primary` or `my-app-canary`.

The traffic flow is:

1. Client sends request to `my-app` service
2. Linkerd proxy evaluates TrafficSplit for `my-app`
3. Request is routed to either `my-app-primary` or `my-app-canary` based on weight
4. The destination service forwards the request to the appropriate pods

This is transparent to the client. It always sends requests to the `my-app` service and the mesh handles the distribution.

## Step Weight Configuration

The `stepWeight` and `maxWeight` fields control how Flagger updates the TrafficSplit weights:

```yaml
  analysis:
    maxWeight: 50
    stepWeight: 10
```

This produces the following progression:

- Step 1: primary 90%, canary 10%
- Step 2: primary 80%, canary 20%
- Step 3: primary 70%, canary 30%
- Step 4: primary 60%, canary 40%
- Step 5: primary 50%, canary 50%
- Promotion: primary 0%, canary 100% (then Flagger updates primary to new version)

## Custom Step Weights

For non-linear traffic shifting, use `stepWeights` instead of `stepWeight`:

```yaml
  analysis:
    stepWeights: [1, 5, 10, 25, 50]
```

This produces:

- Step 1: primary 99%, canary 1%
- Step 2: primary 95%, canary 5%
- Step 3: primary 90%, canary 10%
- Step 4: primary 75%, canary 25%
- Step 5: primary 50%, canary 50%

Custom step weights let you start with a very small traffic percentage for initial validation, then increase more aggressively as confidence grows.

## Inspecting the TrafficSplit During Analysis

Monitor the TrafficSplit resource during a canary deployment:

```bash
kubectl get trafficsplit my-app -n default -o yaml
```

Watch the weights change:

```bash
kubectl get trafficsplit my-app -n default -w
```

You can also check the Flagger events for weight changes:

```bash
kubectl -n default describe canary my-app
```

The events section shows each weight update and metric check result.

## TrafficSplit with Multiple Ports

If your service exposes multiple ports, the TrafficSplit applies to all traffic reaching the root service. Configure additional ports in the Canary service spec:

```yaml
  service:
    port: 80
    targetPort: 8080
    portDiscovery: true
```

The `portDiscovery: true` flag tells Flagger to copy all ports from the target Deployment's containers to the generated services.

## Linkerd Metrics for Analysis

When using Linkerd, Flagger queries the Linkerd Viz Prometheus instance for built-in metrics. The built-in metric names `request-success-rate` and `request-duration` automatically use Linkerd-specific Prometheus queries:

- `request-success-rate` queries `response_total` metrics with `classification="success"`
- `request-duration` queries `response_latency_ms_bucket` histogram

These work without any MetricTemplate configuration when the mesh provider is set to `linkerd`.

## Troubleshooting TrafficSplit Issues

If the canary is not receiving traffic, check:

1. The TrafficSplit exists and has correct weights:

```bash
kubectl get trafficsplit my-app -n default -o yaml
```

2. The backend services exist and have endpoints:

```bash
kubectl get svc my-app-primary my-app-canary -n default
kubectl get endpoints my-app-primary my-app-canary -n default
```

3. The pods have Linkerd sidecar injection:

```bash
kubectl get pods -n default -l app=my-app -o jsonpath='{.items[*].spec.containers[*].name}'
```

You should see `linkerd-proxy` alongside your application container.

## Conclusion

Flagger leverages Linkerd's SMI TrafficSplit resource to implement progressive traffic shifting during canary deployments. The TrafficSplit divides traffic between primary and canary services based on weights that Flagger updates at each analysis step. Configuration is straightforward since Linkerd's TrafficSplit model is simpler than Istio's VirtualService approach. The key configuration points are `stepWeight` (or `stepWeights`) for controlling the traffic progression and the analysis metrics that determine whether each step succeeds or triggers a rollback.
