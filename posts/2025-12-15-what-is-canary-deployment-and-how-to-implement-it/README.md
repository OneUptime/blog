# What is Canary Deployment and How to Implement It in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Canary Deployment, Releases, DevOps, Reliability, Cloud Native

Description: Learn what canary deployments are, why they're essential for safe releases, and how to implement them in Kubernetes using native features and Istio for traffic splitting.

---

Releasing new versions of software is inherently risky. No matter how thorough your testing, production traffic has a way of exposing bugs that staging never could. **Canary deployment** is a battle-tested strategy that lets you ship changes incrementally, catching problems before they affect all your users.

## What is a Canary Deployment?

A canary deployment is a release strategy where you roll out a new version of your application to a **small subset of users or traffic** before gradually expanding to the entire user base. The name comes from the "canary in a coal mine" - miners used canaries to detect toxic gases; if the canary died, miners knew to evacuate.

In software terms, your canary release "detects" problems in production by exposing only a fraction of traffic to potential issues. If something goes wrong, the blast radius is limited, and you can quickly roll back.

**Key characteristics of canary deployments:**

- **Gradual rollout:** Start with 1-5% of traffic, then increase incrementally
- **Real production traffic:** Unlike staging, canaries see actual user behavior
- **Quick rollback:** If metrics degrade, revert instantly
- **Risk mitigation:** Limit the impact of bugs to a small user segment

## Canary vs. Blue-Green vs. Rolling Updates

| Strategy | How It Works | Rollback Speed | Resource Usage |
|----------|-------------|----------------|----------------|
| **Canary** | Route small % of traffic to new version | Instant | Moderate |
| **Blue-Green** | Two full environments, switch all traffic at once | Instant | High (2x resources) |
| **Rolling Update** | Replace pods one by one | Slow (must redeploy old version) | Low |

**When to use canary deployments:**

- You want to validate changes with real traffic before full rollout
- You need fine-grained control over traffic percentages
- You want to compare metrics between old and new versions side-by-side
- You're deploying changes that could impact performance or reliability

## How Canary Deployments Work

The typical canary deployment workflow:

1. **Deploy the canary:** Launch the new version alongside the stable version
2. **Route a small percentage of traffic:** Send 1-10% of requests to the canary
3. **Monitor and compare:** Watch error rates, latency, and business metrics
4. **Gradually increase traffic:** If healthy, bump to 25%, 50%, 75%, then 100%
5. **Promote or rollback:** Either complete the rollout or revert to stable

## Implementing Canary Deployments in Kubernetes

There are several ways to implement canary deployments in Kubernetes, ranging from simple native approaches to sophisticated service mesh solutions.

### Method 1: Native Kubernetes with Replica Ratios

The simplest approach uses multiple Deployments with different replica counts. Kubernetes Services load-balance across all matching pods, so the traffic split roughly equals the replica ratio.

**Step 1: Deploy the stable version**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-stable
  labels:
    app: myapp
    version: stable
spec:
  replicas: 9
  selector:
    matchLabels:
      app: myapp
      version: stable
  template:
    metadata:
      labels:
        app: myapp
        version: stable
    spec:
      containers:
        - name: myapp
          image: mycompany/myapp:v1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 3
```

**Step 2: Deploy the canary version**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-canary
  labels:
    app: myapp
    version: canary
spec:
  replicas: 1  # 1 out of 10 total = ~10% traffic
  selector:
    matchLabels:
      app: myapp
      version: canary
  template:
    metadata:
      labels:
        app: myapp
        version: canary
    spec:
      containers:
        - name: myapp
          image: mycompany/myapp:v1.1.0  # New version
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 3
```

**Step 3: Create a Service that routes to both**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp  # Matches BOTH stable and canary pods
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

**Adjusting traffic split:**

To increase canary traffic from 10% to 50%, scale the deployments:

```bash
kubectl scale deployment myapp-stable --replicas=5
kubectl scale deployment myapp-canary --replicas=5
```

**Limitations of the native approach:**

- Traffic split is approximate (depends on pod count)
- No fine-grained control (can't do 1% easily)
- Scaling is manual and coarse

### Method 2: Istio Service Mesh (Recommended for Production)

Istio provides precise traffic splitting with VirtualServices and DestinationRules. This is the production-grade approach.

**Step 1: Deploy both versions with version labels**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: v1
  template:
    metadata:
      labels:
        app: myapp
        version: v1
    spec:
      containers:
        - name: myapp
          image: mycompany/myapp:v1.0.0
          ports:
            - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-v2
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: v2
  template:
    metadata:
      labels:
        app: myapp
        version: v2
    spec:
      containers:
        - name: myapp
          image: mycompany/myapp:v2.0.0
          ports:
            - containerPort: 8080
```

**Step 2: Create a Service**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
```

**Step 3: Define subsets with DestinationRule**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp
spec:
  host: myapp
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

**Step 4: Configure traffic splitting with VirtualService**

Start with 5% to canary:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - myapp
  http:
    - route:
        - destination:
            host: myapp
            subset: v1
          weight: 95
        - destination:
            host: myapp
            subset: v2
          weight: 5
```

**Step 5: Gradually increase canary traffic**

As confidence grows, update the weights:

```yaml
# 25% canary
- destination:
    host: myapp
    subset: v1
  weight: 75
- destination:
    host: myapp
    subset: v2
  weight: 25
```

```yaml
# 50% canary
- destination:
    host: myapp
    subset: v1
  weight: 50
- destination:
    host: myapp
    subset: v2
  weight: 50
```

```yaml
# 100% canary (rollout complete)
- destination:
    host: myapp
    subset: v2
  weight: 100
```

### Method 3: Header-Based Canary Routing

Istio also supports routing specific users or requests to the canary based on headers. This is useful for internal testing before any public exposure.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - myapp
  http:
    # Route internal testers to canary
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: myapp
            subset: v2
    # Everyone else goes to stable
    - route:
        - destination:
            host: myapp
            subset: v1
```

Internal testers can access the canary by adding the header:

```bash
curl -H "x-canary: true" http://myapp/api/endpoint
```

## Monitoring Canary Deployments

A canary is only useful if you're watching it. Key metrics to monitor:

**Error rates:**
```promql
# Compare error rates between versions
sum(rate(http_requests_total{app="myapp",status=~"5..",version="v2"}[5m]))
/
sum(rate(http_requests_total{app="myapp",version="v2"}[5m]))
```

**Latency (P99):**
```promql
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{app="myapp",version="v2"}[5m]))
  by (le)
)
```

**Business metrics:**
- Conversion rates
- Cart abandonment
- API success rates

## Automated Canary Analysis with Flagger

For production environments, consider [Flagger](https://flagger.app/) - a progressive delivery tool that automates canary analysis.

Flagger watches your canary metrics and automatically:
- Promotes the canary if metrics are healthy
- Rolls back if error rates spike
- Alerts your team via Slack/PagerDuty

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  service:
    port: 80
  analysis:
    interval: 1m
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
```

## Best Practices for Canary Deployments

1. **Start small:** Begin with 1-5% of traffic, not 10-20%
2. **Monitor aggressively:** Set up dashboards comparing stable vs. canary before you start
3. **Define success criteria:** Know what "healthy" looks like before deploying
4. **Automate rollbacks:** Don't rely on humans to notice problems at 3 AM
5. **Use feature flags:** Combine canaries with feature flags for even finer control
6. **Test the rollback:** Verify you can actually roll back before you need to
7. **Communicate:** Let your team know a canary is in progress

## When NOT to Use Canary Deployments

Canary deployments aren't always the right choice:

- **Database migrations:** Schema changes affect all versions simultaneously
- **Breaking API changes:** If v2 can't coexist with v1, canary won't help
- **Tiny user bases:** With 100 users, 5% means 5 people - not statistically significant
- **Stateful workflows:** If users mid-transaction could hit different versions, use sticky sessions

## TL;DR Quick Start

1. **Deploy both versions** with distinct labels (`version: v1`, `version: v2`)
2. **Create a Service** selecting both by the common `app` label
3. **Use Istio VirtualService** to split traffic (start at 5% canary)
4. **Monitor error rates and latency** comparing both versions
5. **Gradually increase canary weight** (5% → 25% → 50% → 100%)
6. **Rollback immediately** if metrics degrade

---

**Related Reading:**

- [What Are Blue-Green Deployments?](https://oneuptime.com/blog/post/2025-11-28-what-are-blue-green-deployments/view)
- [What is Istio in Kubernetes and Why Do We Need It?](https://oneuptime.com/blog/post/2025-12-15-what-is-istio-in-kubernetes-and-why-do-we-need-it/view)
- [How to Roll Out a Change, Watch Health Checks, and Undo a Bad Deploy](https://oneuptime.com/blog/post/2025-11-27-rollouts-health-undo/view)
