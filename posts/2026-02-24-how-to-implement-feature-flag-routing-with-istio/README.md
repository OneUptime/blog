# How to Implement Feature Flag Routing with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Feature Flags, Traffic Routing, A/B Testing

Description: Implement infrastructure-level feature flag routing using Istio VirtualService rules to control feature exposure without modifying application code.

---

Feature flags are typically implemented in application code: if the flag is enabled, execute the new code path; otherwise, execute the old one. But there's another approach that's often cleaner for larger features: deploy the feature as a separate service version and use Istio to route traffic to it based on user attributes. This gives you infrastructure-level feature flags that work without modifying your application's branching logic.

This approach shines when a "feature" is really a whole new version of a service, not just a conditional code path. Think major API redesigns, new pricing engines, or migration to a new database backend.

## The Concept

Instead of:
```python
if feature_flag("new_checkout"):
    return new_checkout_flow()
else:
    return old_checkout_flow()
```

You deploy both versions and let Istio decide which one each request goes to:

```text
User Request -> Istio Sidecar -> [Route based on headers/cookies] -> v1 or v2
```

The routing decision happens at the network level. Your application code only contains the logic for its version.

## Setting Up Version-Based Deployments

Deploy the baseline and the feature version:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-baseline
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: checkout
      version: baseline
  template:
    metadata:
      labels:
        app: checkout
        version: baseline
    spec:
      containers:
      - name: checkout
        image: checkout:2.0.0
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-feature
  namespace: production
spec:
  replicas: 1
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
        image: checkout:3.0.0-new-flow
        ports:
        - containerPort: 8080
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: checkout
  namespace: production
spec:
  ports:
  - port: 80
    name: http
    targetPort: 8080
  selector:
    app: checkout
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: checkout
  namespace: production
spec:
  host: checkout.production.svc.cluster.local
  subsets:
  - name: baseline
    labels:
      version: baseline
  - name: new-flow
    labels:
      version: new-flow
```

## Cookie-Based Feature Routing

Route users based on a feature cookie that your frontend or authentication system sets:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: checkout
  namespace: production
spec:
  hosts:
  - checkout.production.svc.cluster.local
  http:
  - match:
    - headers:
        cookie:
          regex: ".*feature_new_checkout=enabled.*"
    route:
    - destination:
        host: checkout.production.svc.cluster.local
        subset: new-flow
  - route:
    - destination:
        host: checkout.production.svc.cluster.local
        subset: baseline
```

Your frontend or API gateway sets the cookie based on user eligibility:

```javascript
// In your API gateway or frontend
if (user.isBetaTester || user.region === 'us-west') {
  res.cookie('feature_new_checkout', 'enabled', { maxAge: 86400000 });
}
```

## Header-Based Feature Routing

If you use a feature flag service (LaunchDarkly, Flagsmith, etc.), have it set a header on requests:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: checkout
  namespace: production
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
        subset: baseline
```

The advantage of using an external feature flag service for the decision but Istio for the routing is that you get the flexibility of feature flag targeting rules with the reliability of infrastructure-level routing.

## User Segment Routing

Route based on user attributes like organization, plan tier, or region:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: checkout
  namespace: production
spec:
  hosts:
  - checkout
  http:
  # Enterprise users get the new flow
  - match:
    - headers:
        x-plan-tier:
          exact: "enterprise"
    route:
    - destination:
        host: checkout
        subset: new-flow
  # Beta program users get the new flow
  - match:
    - headers:
        x-beta-program:
          exact: "true"
    route:
    - destination:
        host: checkout
        subset: new-flow
  # Everyone else gets baseline
  - route:
    - destination:
        host: checkout
        subset: baseline
```

## Percentage-Based Feature Rollout

Combine feature routing with percentage-based traffic splitting for a gradual rollout:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: checkout
  namespace: production
spec:
  hosts:
  - checkout
  http:
  # Explicitly opted-in users always get the feature
  - match:
    - headers:
        x-feature-new-checkout:
          exact: "enabled"
    route:
    - destination:
        host: checkout
        subset: new-flow
  # Everyone else gets a percentage-based split
  - route:
    - destination:
        host: checkout
        subset: baseline
      weight: 80
    - destination:
        host: checkout
        subset: new-flow
      weight: 20
```

Start at 0% random exposure, increase to 5%, 10%, 20%, 50%, and finally 100% as confidence builds.

## Multiple Feature Flags

You can have multiple feature flags active simultaneously by using different headers and different deployments:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: checkout
  namespace: production
spec:
  hosts:
  - checkout
  http:
  # Feature A
  - match:
    - headers:
        x-feature-a:
          exact: "enabled"
    route:
    - destination:
        host: checkout
        subset: feature-a
  # Feature B
  - match:
    - headers:
        x-feature-b:
          exact: "enabled"
    route:
    - destination:
        host: checkout
        subset: feature-b
  # Default
  - route:
    - destination:
        host: checkout
        subset: baseline
```

Note that this doesn't handle the case where a user has both feature-a and feature-b enabled. Istio routes based on the first matching rule, so if a request matches feature-a, it goes there regardless of the feature-b header. To handle multiple simultaneous features, you'd need a deployment that combines both features.

## Feature Flag Monitoring

Track usage and performance per feature version:

```promql
# Request count per version (shows feature adoption)
sum(rate(istio_requests_total{
  destination_service="checkout.production.svc.cluster.local",
  reporter="destination"
}[5m])) by (destination_version)

# Error rate per version
sum(rate(istio_requests_total{
  destination_service="checkout.production.svc.cluster.local",
  response_code=~"5.*",
  reporter="destination"
}[5m])) by (destination_version)
/
sum(rate(istio_requests_total{
  destination_service="checkout.production.svc.cluster.local",
  reporter="destination"
}[5m])) by (destination_version)
```

## Feature Graduation

When a feature is fully rolled out and proven stable, graduate it:

1. Make the feature version the new baseline
2. Remove the old baseline deployment
3. Clean up the VirtualService routing rules

```bash
# Update the baseline deployment to the feature version
kubectl set image deployment/checkout-baseline checkout=checkout:3.0.0-new-flow -n production

# Remove the feature deployment
kubectl delete deployment checkout-feature -n production

# Simplify the VirtualService
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: checkout
  namespace: production
spec:
  hosts:
  - checkout
  http:
  - route:
    - destination:
        host: checkout
        subset: baseline
EOF
```

## Feature Kill Switch

If a feature causes issues, disable it instantly by removing the routing rules:

```bash
# Emergency: route all traffic to baseline
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: checkout
  namespace: production
spec:
  hosts:
  - checkout
  http:
  - route:
    - destination:
        host: checkout
        subset: baseline
      weight: 100
EOF
```

This takes effect in seconds. No application restart needed, no code deploy, no feature flag service dependency.

Infrastructure-level feature flags through Istio are a powerful complement to application-level feature flags. They're best suited for routing entire user segments to different service versions, while application-level flags are better for fine-grained conditional logic within a single codebase. Used together, they give you maximum control over what features your users see and when.
