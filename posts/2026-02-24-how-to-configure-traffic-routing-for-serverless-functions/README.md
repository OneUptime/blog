# How to Configure Traffic Routing for Serverless Functions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Serverless, Traffic Routing, Knative, Kubernetes

Description: Step-by-step instructions for configuring Istio traffic routing policies for serverless functions including canary deployments, header-based routing, and traffic splitting.

---

When you run serverless functions on Kubernetes with Knative, you already get some basic traffic splitting built in. Knative lets you split traffic between revisions. But once you add Istio to the mix, you unlock a much more powerful set of routing capabilities. You can route based on headers, query parameters, user identity, or any combination of these.

This guide covers practical traffic routing patterns for serverless functions using Istio VirtualService and DestinationRule resources.

## Understanding How Knative and Istio Routing Interact

Knative creates its own set of Istio VirtualService resources when you deploy a Knative Service. These are managed VirtualServices, meaning Knative owns them. If you try to edit them directly, Knative will overwrite your changes.

The trick is to either use Knative's built-in traffic splitting features for simple cases, or create your own VirtualService resources that sit alongside Knative's for more advanced routing.

You can see the VirtualServices Knative creates:

```bash
kubectl get virtualservices -n default
```

You will typically see something like `hello-function-ingress` and `hello-function-mesh`.

## Simple Traffic Splitting with Knative

For basic canary deployments between function revisions, Knative's built-in traffic splitting is the easiest approach:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-function
  namespace: default
spec:
  template:
    metadata:
      name: my-function-v2
    spec:
      containers:
        - image: myregistry/my-function:v2
          ports:
            - containerPort: 8080
  traffic:
    - revisionName: my-function-v1
      percent: 80
    - revisionName: my-function-v2
      percent: 20
```

This sends 80% of traffic to v1 and 20% to v2. Knative handles this by configuring the underlying Istio VirtualService automatically.

## Header-Based Routing with Istio

Where Istio really adds value is when you need routing rules that Knative does not support natively, like header-based routing. Say you want to route requests with a specific header to your new function version for testing:

First, you need to set up the Knative Service with tag-based routing so each revision gets its own addressable URL:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-function
  namespace: default
spec:
  template:
    metadata:
      name: my-function-v2
    spec:
      containers:
        - image: myregistry/my-function:v2
  traffic:
    - revisionName: my-function-v1
      percent: 100
    - revisionName: my-function-v2
      percent: 0
      tag: canary
```

Now create an Istio VirtualService that overrides routing for specific headers:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-function-header-routing
  namespace: default
spec:
  hosts:
    - my-function.default.svc.cluster.local
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: my-function-v2.default.svc.cluster.local
    - route:
        - destination:
            host: my-function.default.svc.cluster.local
```

Now any request with the header `x-canary: true` goes to v2, and everything else goes to v1.

## Path-Based Routing for Multiple Functions

If you have multiple serverless functions and want to route to them based on the URL path, you can use a single VirtualService at the gateway level:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: functions-router
  namespace: default
spec:
  hosts:
    - "functions.example.com"
  gateways:
    - knative-serving/knative-ingress-gateway
  http:
    - match:
        - uri:
            prefix: /api/users
      rewrite:
        uri: /
      route:
        - destination:
            host: users-function.default.svc.cluster.local
    - match:
        - uri:
            prefix: /api/orders
      rewrite:
        uri: /
      route:
        - destination:
            host: orders-function.default.svc.cluster.local
    - match:
        - uri:
            prefix: /api/payments
      rewrite:
        uri: /
      route:
        - destination:
            host: payments-function.default.svc.cluster.local
```

The `rewrite` field strips the prefix before forwarding to the function, so the function itself does not need to know about the routing path.

## Weighted Routing with Gradual Rollout

For a gradual rollout strategy where you slowly increase traffic to a new version, you can update the weights over time. Here is a setup with a DestinationRule and VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-function-dr
  namespace: default
spec:
  host: my-function.default.svc.cluster.local
  subsets:
    - name: v1
      labels:
        serving.knative.dev/revision: my-function-v1
    - name: v2
      labels:
        serving.knative.dev/revision: my-function-v2
```

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-function-weighted
  namespace: default
spec:
  hosts:
    - my-function.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-function.default.svc.cluster.local
            subset: v1
          weight: 90
        - destination:
            host: my-function.default.svc.cluster.local
            subset: v2
          weight: 10
```

You can automate the weight changes using tools like Flagger, which integrates with both Istio and Knative to do progressive delivery automatically.

## Routing Based on Query Parameters

Sometimes you want to route based on query parameters, which is useful for A/B testing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-function-ab-test
  namespace: default
spec:
  hosts:
    - my-function.default.svc.cluster.local
  http:
    - match:
        - queryParams:
            version:
              exact: "beta"
      route:
        - destination:
            host: my-function-v2.default.svc.cluster.local
    - route:
        - destination:
            host: my-function-v1.default.svc.cluster.local
```

A request to `my-function?version=beta` will go to v2, while all other requests go to v1.

## Mirroring Traffic to New Function Versions

Traffic mirroring (also called shadowing) lets you send a copy of production traffic to a new version without affecting real users. This is perfect for testing a new function version with real traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-function-mirror
  namespace: default
spec:
  hosts:
    - my-function.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-function-v1.default.svc.cluster.local
      mirror:
        host: my-function-v2.default.svc.cluster.local
      mirrorPercentage:
        value: 100.0
```

The mirrored requests are fire-and-forget. The response from v2 is discarded, and the user always gets the response from v1. This is a safe way to validate a new version under real load.

## Timeouts and Retries in Routing Rules

You can attach timeout and retry policies directly to your routing rules. This is especially important for serverless because of cold starts:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-function-with-retries
  namespace: default
spec:
  hosts:
    - my-function.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-function.default.svc.cluster.local
      timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 10s
        retryOn: 5xx,reset,connect-failure
```

The `retryOn` field accepts comma-separated Envoy retry policies. For serverless functions, `connect-failure` is important because it handles the case where a pod was scaled down and the connection fails before a new one is ready.

## Debugging Routing Issues

When routing does not work as expected, here are the tools to use:

```bash
# Check what VirtualServices are applied
kubectl get virtualservices -n default -o yaml

# Check the Envoy configuration on a specific pod
istioctl proxy-config routes <pod-name> -n default

# Check if the routes are synced
istioctl analyze -n default
```

The `istioctl analyze` command is particularly helpful because it will tell you about misconfigurations like referencing a host that does not exist or having conflicting VirtualService rules.

## Summary

Traffic routing for serverless functions with Istio gives you fine-grained control over how requests reach your functions. From simple percentage-based splits to header-based routing and traffic mirroring, you can implement sophisticated deployment strategies. The key is understanding how Knative and Istio routing interact so you do not create conflicting rules. Use Knative's built-in traffic splitting for simple cases and Istio VirtualServices for everything more advanced.
