# How to Implement Feature Flags with Istio Traffic Routing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Feature Flags, Traffic Routing, Kubernetes, Deployments

Description: Learn how to use Istio's traffic routing as a feature flag system to control which users see new features without code-level feature flag libraries.

---

Feature flags let you turn features on and off without deploying new code. Traditionally, you implement them with libraries like LaunchDarkly, Unleash, or homegrown if-else blocks in your application. These work fine, but they add complexity to your codebase and require every service to integrate the feature flag SDK.

Istio offers an alternative approach. Instead of toggling features inside your application, you deploy the feature as a separate version of your service and use Istio's traffic routing to control who sees it. The feature flag becomes a routing rule, managed through Kubernetes resources.

## How It Works

The idea is simple. You deploy your service with and without the new feature as separate deployments (different container images). Then you use Istio's VirtualService to route specific users to the version with the feature enabled.

This approach works best for features that affect an entire service or API endpoint. For fine-grained, per-component feature toggles within a single page, you'll still want a traditional feature flag system.

## Setting Up Version Deployments

Suppose you're building a new checkout flow. Deploy the current version and the version with the new feature:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-current
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: checkout
      version: current
  template:
    metadata:
      labels:
        app: checkout
        version: current
    spec:
      containers:
      - name: checkout
        image: myregistry/checkout:3.2.0
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-new-flow
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: checkout
      version: new-flow
  template:
    metadata:
      labels:
        app: checkout
        version: new-flow
    spec:
      containers:
      - name: checkout
        image: myregistry/checkout:3.3.0-new-flow
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: checkout
  namespace: default
spec:
  selector:
    app: checkout
  ports:
  - port: 8080
    targetPort: 8080
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: checkout-dr
  namespace: default
spec:
  host: checkout
  subsets:
  - name: current
    labels:
      version: current
  - name: new-flow
    labels:
      version: new-flow
```

## Enabling the Feature for Internal Users

Start by enabling the feature for your team. Route requests from internal IPs or with a specific header:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-vs
  namespace: default
spec:
  hosts:
  - checkout
  http:
  - match:
    - headers:
        x-feature-new-checkout:
          exact: "enabled"
    route:
    - destination:
        host: checkout
        subset: new-flow
  - route:
    - destination:
        host: checkout
        subset: current
```

Internal users add `x-feature-new-checkout: enabled` to their requests to see the new checkout flow. Everyone else sees the current version.

## Enabling for Beta Users

Once the feature is validated internally, open it up to beta users. Your API gateway or frontend should tag beta users with a header:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-vs
  namespace: default
spec:
  hosts:
  - checkout
  http:
  - match:
    - headers:
        x-user-tier:
          exact: "beta"
    route:
    - destination:
        host: checkout
        subset: new-flow
  - match:
    - headers:
        x-feature-new-checkout:
          exact: "enabled"
    route:
    - destination:
        host: checkout
        subset: new-flow
  - route:
    - destination:
        host: checkout
        subset: current
```

Now both beta users and anyone with the explicit feature flag header see the new checkout.

## Percentage-Based Rollout

Ready to go wider? Add weighted routing for all users:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-vs
  namespace: default
spec:
  hosts:
  - checkout
  http:
  - match:
    - headers:
        x-feature-new-checkout:
          exact: "disabled"
    route:
    - destination:
        host: checkout
        subset: current
  - route:
    - destination:
        host: checkout
        subset: current
      weight: 80
    - destination:
        host: checkout
        subset: new-flow
      weight: 20
```

20% of general traffic gets the new flow. Users who explicitly opt out with `x-feature-new-checkout: disabled` always see the current version.

## Multiple Feature Flags

You can manage multiple features at once using separate VirtualService match rules. Say you're testing both a new checkout flow and a new search algorithm:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-vs
  namespace: default
spec:
  hosts:
  - checkout
  http:
  - match:
    - headers:
        x-feature-new-checkout:
          exact: "enabled"
      uri:
        prefix: /api/checkout
    route:
    - destination:
        host: checkout
        subset: new-flow
  - route:
    - destination:
        host: checkout
        subset: current
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: search-vs
  namespace: default
spec:
  hosts:
  - search-service
  http:
  - match:
    - headers:
        x-feature-new-search:
          exact: "enabled"
    route:
    - destination:
        host: search-service
        subset: new-algorithm
  - route:
    - destination:
        host: search-service
        subset: current
```

Each feature flag is independently controlled through its own header and routing rule.

## Building a Feature Flag Controller

Managing VirtualService YAML files manually works for a few features, but it doesn't scale. You can build a simple controller that updates VirtualService resources based on a feature configuration:

```yaml
# feature-config.yaml (stored in a ConfigMap)
features:
  new-checkout:
    service: checkout
    subset: new-flow
    default-subset: current
    status: percentage
    percentage: 20
    force-header: x-feature-new-checkout
  new-search:
    service: search-service
    subset: new-algorithm
    default-subset: current
    status: header-only
    force-header: x-feature-new-search
  new-recommendations:
    service: recommendations
    subset: ml-v2
    default-subset: current
    status: disabled
    force-header: x-feature-new-recommendations
```

A controller watches this ConfigMap and updates the corresponding VirtualService resources. This gives your product team a simple interface to manage feature flags without editing Kubernetes YAML.

## Propagating Feature Flag Headers

When Service A calls Service B which calls Service C, the feature flag headers need to propagate through the entire call chain. Istio doesn't automatically forward custom headers - your application code needs to do this.

In your services, forward the relevant headers:

```python
# Python example with requests library
def call_downstream(request):
    headers = {}
    # Propagate feature flag headers
    for key in request.headers:
        if key.lower().startswith('x-feature-'):
            headers[key] = request.headers[key]

    response = requests.get(
        'http://downstream-service:8080/api/data',
        headers=headers
    )
    return response.json()
```

Alternatively, if you use Istio's tracing headers (like `x-request-id`, `x-b3-traceid`), you can piggyback on those propagation mechanisms.

## Emergency Kill Switch

If the new feature causes problems, disable it instantly:

```bash
# Route all traffic to current version
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-vs
  namespace: default
spec:
  hosts:
  - checkout
  http:
  - route:
    - destination:
        host: checkout
        subset: current
EOF
```

This takes effect in seconds. No code deploy, no restarting pods.

## Cleaning Up After Full Rollout

Once the feature is fully rolled out and you're confident it's stable:

1. Make the feature the default in your codebase
2. Deploy the feature as the main version
3. Remove the old deployment
4. Remove the VirtualService routing rules
5. Remove the DestinationRule subsets

```bash
kubectl delete deployment checkout-current
kubectl set image deployment/checkout-new-flow checkout=myregistry/checkout:3.4.0

# Simplify routing
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-vs
  namespace: default
spec:
  hosts:
  - checkout
  http:
  - route:
    - destination:
        host: checkout
EOF
```

Feature flags with Istio work best for service-level features where you can deploy separate versions of a service. It keeps your application code clean and gives your operations team control over feature rollouts through familiar Kubernetes tooling. For more granular feature control within a single service, combine this with a lightweight application-level feature flag system.
