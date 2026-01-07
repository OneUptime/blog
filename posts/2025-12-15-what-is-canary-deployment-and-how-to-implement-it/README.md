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

This deployment configuration creates 9 replicas of the stable application version. When combined with a single canary replica, this gives approximately 90% of traffic to the stable version through Kubernetes' round-robin load balancing.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-stable
  labels:
    app: myapp        # Common label used by Service selector
    version: stable   # Version label distinguishes stable from canary
spec:
  replicas: 9         # 9 out of 10 total pods = ~90% traffic share
  selector:
    matchLabels:
      app: myapp
      version: stable
  template:
    metadata:
      labels:
        app: myapp        # Must match Service selector for traffic routing
        version: stable   # Identifies this pod as stable version
    spec:
      containers:
        - name: myapp
          image: mycompany/myapp:v1.0.0   # Current production version
          ports:
            - containerPort: 8080          # Port the application listens on
          resources:
            requests:
              cpu: 100m         # Minimum CPU guaranteed to the container
              memory: 128Mi     # Minimum memory guaranteed
            limits:
              cpu: 200m         # Maximum CPU the container can use
              memory: 256Mi     # Maximum memory before OOM kill
          livenessProbe:
            httpGet:
              path: /health     # Endpoint that returns 200 if app is alive
              port: 8080
            initialDelaySeconds: 10   # Wait before first probe
            periodSeconds: 5          # Check every 5 seconds
          readinessProbe:
            httpGet:
              path: /ready      # Endpoint that returns 200 when ready for traffic
              port: 8080
            initialDelaySeconds: 5    # Wait before first readiness check
            periodSeconds: 3          # Check frequently for fast traffic routing
```

**Step 2: Deploy the canary version**

The canary deployment uses a single replica running the new version. With 9 stable replicas, this creates a 10% traffic split to the canary, allowing you to test the new version with real production traffic while limiting blast radius if issues occur.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-canary
  labels:
    app: myapp        # Same app label ensures Service routes traffic here
    version: canary   # Different version label for identification
spec:
  replicas: 1         # 1 out of 10 total pods = ~10% traffic to canary
  selector:
    matchLabels:
      app: myapp
      version: canary
  template:
    metadata:
      labels:
        app: myapp        # Matches Service selector to receive traffic
        version: canary   # Identifies this pod as canary version
    spec:
      containers:
        - name: myapp
          image: mycompany/myapp:v1.1.0   # New version being tested
          ports:
            - containerPort: 8080          # Same port as stable version
          resources:
            requests:
              cpu: 100m         # Same resources as stable for fair comparison
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /health     # Same health endpoints as stable
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          readinessProbe:
            httpGet:
              path: /ready      # Ensures canary only gets traffic when ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 3
```

**Step 3: Create a Service that routes to both**

The Service uses only the common `app` label in its selector, which matches both stable and canary pods. Kubernetes automatically load-balances traffic across all matching pods, creating the traffic split based on replica counts.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp        # Matches BOTH stable and canary pods (no version filter)
  ports:
    - port: 80        # Port exposed within the cluster
      targetPort: 8080  # Port on the pods to forward traffic to
  type: ClusterIP     # Internal cluster IP, not exposed externally
```

**Adjusting traffic split:**

To increase canary traffic from 10% to 50%, scale the deployments. The traffic split always equals the ratio of replicas, so equal replica counts mean equal traffic distribution.

```bash
# Scale down stable to 5 replicas (from 9)
kubectl scale deployment myapp-stable --replicas=5
# Scale up canary to 5 replicas (from 1)
# Now traffic is split 50/50 between stable and canary
kubectl scale deployment myapp-canary --replicas=5
```

**Limitations of the native approach:**

- Traffic split is approximate (depends on pod count)
- No fine-grained control (can't do 1% easily)
- Scaling is manual and coarse

### Method 2: Istio Service Mesh (Recommended for Production)

Istio provides precise traffic splitting with VirtualServices and DestinationRules. This is the production-grade approach.

**Step 1: Deploy both versions with version labels**

With Istio, replica counts do not determine traffic split - the VirtualService does. Both versions can have equal replicas since Istio's Envoy proxies control traffic routing at the network level.

```yaml
# Stable version deployment - labeled as v1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-v1
spec:
  replicas: 3         # Replica count doesn't affect traffic split with Istio
  selector:
    matchLabels:
      app: myapp
      version: v1     # Version label used by DestinationRule subsets
  template:
    metadata:
      labels:
        app: myapp
        version: v1   # Must match DestinationRule subset selector
    spec:
      containers:
        - name: myapp
          image: mycompany/myapp:v1.0.0   # Stable version image
          ports:
            - containerPort: 8080
---
# Canary version deployment - labeled as v2
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-v2
spec:
  replicas: 3         # Same replica count as v1 - traffic controlled by Istio
  selector:
    matchLabels:
      app: myapp
      version: v2     # Different version label for canary
  template:
    metadata:
      labels:
        app: myapp
        version: v2   # DestinationRule uses this to identify canary pods
    spec:
      containers:
        - name: myapp
          image: mycompany/myapp:v2.0.0   # New version being tested
          ports:
            - containerPort: 8080
```

**Step 2: Create a Service**

The Kubernetes Service provides a stable endpoint for the application. Istio's VirtualService will intercept traffic to this Service and apply intelligent routing rules.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp        # Selects all pods with app=myapp label
  ports:
    - port: 80        # Service port for internal cluster access
      targetPort: 8080  # Container port to forward traffic to
```

**Step 3: Define subsets with DestinationRule**

The DestinationRule defines named subsets that map to specific pod labels. VirtualService routes then reference these subsets to direct traffic to the correct version.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp
spec:
  host: myapp         # Service name this rule applies to
  subsets:
    - name: v1        # Subset name referenced by VirtualService
      labels:
        version: v1   # Routes to pods with version=v1 label
    - name: v2        # Subset name for canary version
      labels:
        version: v2   # Routes to pods with version=v2 label
```

**Step 4: Configure traffic splitting with VirtualService**

The VirtualService is where you define the actual traffic split percentages. Unlike native Kubernetes, Istio allows precise control - you can route exactly 5% to the canary regardless of replica counts.

Start with 5% to canary:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - myapp           # Service name to apply routing rules to
  http:
    - route:
        - destination:
            host: myapp
            subset: v1    # Reference to DestinationRule subset
          weight: 95      # 95% of traffic goes to stable v1
        - destination:
            host: myapp
            subset: v2    # Reference to canary subset
          weight: 5       # Only 5% of traffic goes to canary v2
```

**Step 5: Gradually increase canary traffic**

As monitoring confirms the canary is healthy, progressively shift more traffic. Each update to the VirtualService takes effect immediately - no pod restarts required.

```yaml
# 25% canary - increase after initial metrics look good
- destination:
    host: myapp
    subset: v1
  weight: 75        # Reduce stable traffic to 75%
- destination:
    host: myapp
    subset: v2
  weight: 25        # Increase canary to 25%
```

```yaml
# 50% canary - half of users now on new version
- destination:
    host: myapp
    subset: v1
  weight: 50        # Equal split between versions
- destination:
    host: myapp
    subset: v2
  weight: 50        # Canary handling half the load
```

```yaml
# 100% canary - rollout complete, v2 is now production
- destination:
    host: myapp
    subset: v2
  weight: 100       # All traffic to new version, v1 can be decommissioned
```

### Method 3: Header-Based Canary Routing

Istio also supports routing specific users or requests to the canary based on headers. This is useful for internal testing before any public exposure, allowing your team to test the canary in production without affecting real users.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - myapp
  http:
    # First rule: Route internal testers to canary based on header
    - match:
        - headers:
            x-canary:           # Custom header to identify test requests
              exact: "true"     # Must exactly match "true"
      route:
        - destination:
            host: myapp
            subset: v2          # Send matching requests to canary
    # Second rule: Default route for everyone else
    - route:
        - destination:
            host: myapp
            subset: v1          # All other traffic goes to stable
```

Internal testers can access the canary by adding the header. This allows thorough testing with real production data before any percentage-based rollout.

```bash
# Add the x-canary header to route to the new version
# Only requests with this header will hit the canary
curl -H "x-canary: true" http://myapp/api/endpoint
```

## Monitoring Canary Deployments

A canary is only useful if you're watching it. Key metrics to monitor:

**Error rates:**

This PromQL query calculates the error rate specifically for the canary version by dividing 5xx errors by total requests. Compare this value against the stable version to detect regressions.

```promql
# Calculate error rate for canary (v2) over 5-minute window
# Numerator: count of 5xx status codes for v2
sum(rate(http_requests_total{app="myapp",status=~"5..",version="v2"}[5m]))
/
# Denominator: total requests to v2
sum(rate(http_requests_total{app="myapp",version="v2"}[5m]))
```

**Latency (P99):**

The 99th percentile latency shows the worst-case experience for most users. A significant increase in P99 for the canary compared to stable indicates a performance regression.

```promql
# Calculate 99th percentile latency for canary version
histogram_quantile(0.99,
  # Sum request duration buckets for v2 over 5-minute window
  sum(rate(http_request_duration_seconds_bucket{app="myapp",version="v2"}[5m]))
  by (le)  # Group by latency bucket (le = less than or equal)
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

This Flagger configuration automates the entire canary process. It progressively increases traffic to the canary while monitoring key metrics, automatically rolling back if thresholds are breached.

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp          # Deployment Flagger will manage
  service:
    port: 80             # Service port to route traffic through
  analysis:
    interval: 1m         # How often to check metrics and adjust traffic
    threshold: 5         # Number of failed checks before rollback
    maxWeight: 50        # Maximum percentage of traffic to canary
    stepWeight: 10       # Increase traffic by 10% each interval
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99        # Require 99%+ success rate to continue
        interval: 1m     # Evaluate over 1-minute windows
      - name: request-duration
        thresholdRange:
          max: 500       # Latency must stay under 500ms
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
