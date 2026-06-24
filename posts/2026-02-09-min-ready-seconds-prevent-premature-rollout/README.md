# How to Use minReadySeconds to Prevent Premature Rollout Progression

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployment, Reliability

Description: Discover how minReadySeconds in Kubernetes deployments prevents pods from being marked ready too quickly, ensuring stable rollouts and preventing crashes from reaching production.

---

Your pods pass their readiness probes, get marked as ready, and immediately start receiving traffic. Then they crash 30 seconds later due to a slow-starting background process you forgot about. By the time you notice, half your fleet is down.

The minReadySeconds setting helps prevent this rollout scenario by forcing Kubernetes to wait before considering pods available.

## The Problem with Instant Readiness

By default, Kubernetes considers a pod ready as soon as its readiness probe passes. For many applications, this happens within seconds of the container starting. The pod gets added to service endpoints and starts receiving production traffic.

But passing a basic HTTP health check doesn't mean your application is fully initialized. You might have:

- Background workers that take time to start
- Caches that need warming up
- Database connection pools that need establishing
- Scheduled tasks that initialize on startup

If any of these fail after the pod is marked ready, you've already added unstable pods to your production rotation. minReadySeconds does not delay Service traffic after readiness succeeds; it delays when the Deployment controller counts the pod as available for rollout decisions.

## What minReadySeconds Does

The minReadySeconds field tells Kubernetes to wait a specified number of seconds after a pod's readiness probe passes before considering it available. During this waiting period:

- The pod is considered ready by the kubelet
- The pod is NOT considered available by the deployment controller
- The rollout only progresses as far as the rolling update strategy's availability limits allow
- The pod counts toward replica count but not toward available replicas

This creates a buffer period where your pod runs and handles traffic, but Kubernetes watches carefully before committing to the rollout.

## Basic Configuration

Add minReadySeconds to your deployment spec:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 5
  minReadySeconds: 30  # Wait 30 seconds after ready
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v2.0.0
        ports:
        - containerPort: 8080
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

With this configuration, each new pod must stay ready for 30 seconds before it counts as available. Because this example allows one unavailable replica, Kubernetes may still make limited progress while a new pod is in the minReadySeconds window.

## How It Affects Rollouts

Watch a rollout with minReadySeconds set to see the behavior:

```bash
# Start a rollout

kubectl set image deployment/api-server \
  api=myregistry.io/api-server:v2.1.0

# Watch the rollout
kubectl rollout status deployment/api-server
```

You'll see output like this:

```text
Waiting for deployment "api-server" rollout to finish: 1 out of 5 new replicas have been updated...
Waiting for deployment "api-server" rollout to finish: 1 out of 5 new replicas are available...
Waiting for deployment "api-server" rollout to finish: 2 out of 5 new replicas have been updated...
```

Notice the pauses before replicas become available. Kubernetes creates new pods within the `maxSurge` and `maxUnavailable` limits, waits for them to pass readiness checks, then waits the minReadySeconds duration before counting them as available.

## Choosing the Right Value

Set minReadySeconds based on your application's actual initialization time. Monitor your pods to see how long they need:

```bash
# Watch readiness transitions
kubectl get pod api-server-abc123 --watch

# Or inspect the current Pod conditions
kubectl get pod api-server-abc123 -o yaml
```

If your application typically crashes or misbehaves in the first minute after passing readiness checks, set minReadySeconds to 60 or higher.

## Combining with Readiness Probes

minReadySeconds works in conjunction with readiness probes. Your probes determine when a pod is ready, and minReadySeconds determines how long it stays ready before being considered available.

A well-designed setup uses both:

```yaml
spec:
  minReadySeconds: 45
  template:
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v2.0.0
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 15  # Wait for basic startup
          periodSeconds: 5          # Check every 5 seconds
          failureThreshold: 3       # Allow 3 failures before marking unready
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 60   # Give time for full initialization
          periodSeconds: 10
```

This configuration:
- Waits 15 seconds before the first readiness check
- Checks readiness every 5 seconds
- Once ready, waits 45 seconds before marking available
- Uses separate liveness probe to detect crashes

## Preventing Cascading Failures

minReadySeconds is particularly valuable for preventing cascading failures during rollouts. Consider a deployment with a memory leak in the new version:

Without minReadySeconds, the rollout might look like this:

1. New pod starts, passes readiness, gets traffic
2. Memory leak begins
3. Kubernetes immediately creates next pod
4. First pod crashes after 40 seconds
5. Second pod starts, passes readiness
6. Second pod crashes after 40 seconds
7. By the time you notice, you have mostly crashed pods

With minReadySeconds set to 60 and a strategy that requires the new pod to become available before more old pods are removed:

1. New pod starts, passes readiness, gets traffic
2. Memory leak begins
3. Kubernetes waits for the pod to be available before removing more old pods
4. First pod crashes after 40 seconds
5. The pod exits or its readiness probe fails, so it stops being Ready
6. Deployment rollout is blocked due to insufficient available replicas
7. Old pods keep running, serving traffic
8. You have time to investigate and roll back

## Real-World Example: Background Workers

Here's a deployment for a service that processes background jobs. The HTTP server starts quickly, but the job processor takes time to initialize:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: job-processor
spec:
  replicas: 3
  minReadySeconds: 90  # Job system needs time to initialize
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Never take down working pods
  selector:
    matchLabels:
      app: job-processor
  template:
    metadata:
      labels:
        app: job-processor
    spec:
      containers:
      - name: processor
        image: myregistry.io/job-processor:v3.0.0
        env:
        - name: WORKER_STARTUP_DELAY
          value: "60"  # Background worker starts after 60 seconds
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 20
          periodSeconds: 10
          failureThreshold: 2
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 120  # Give full time for initialization
          periodSeconds: 30
```

The 90-second minReadySeconds gives the background worker time to start and fail fast if initialization is broken before the deployment considers the pod available.

## Monitoring minReadySeconds Behavior

Track how minReadySeconds affects your deployments with metrics:

```promql
# Deployment-level gap between updated replicas and available replicas
kube_deployment_status_replicas_updated{deployment="api-server"}
-
kube_deployment_status_replicas_available{deployment="api-server"}
```

This shows when updated replicas exist but are not yet available, which can include pods still waiting out minReadySeconds, failing readiness, or restarting.

## Using with Progressive Delivery

Progressive delivery tools like Argo Rollouts work well with minReadySeconds. You get both gradual traffic shifting and stability verification:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-server
spec:
  replicas: 10
  minReadySeconds: 60
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 5m}
      - setWeight: 30
      - pause: {duration: 5m}
      - setWeight: 50
      - pause: {duration: 5m}
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:v2.0.0
```

The Rollout controller waits for newly created pods to stay ready for 60 seconds before counting them as available, adding an extra layer of safety to your progressive rollout.

## Impact on Rollout Speed

minReadySeconds slows down rollouts deliberately. Calculate the total rollout time:

For a deployment with:
- 10 replicas
- maxSurge: 1, maxUnavailable: 1
- minReadySeconds: 60
- Pod startup time: 30 seconds

The rollout takes approximately:
- roughly (10 replicas) x (60 seconds minReady + 30 seconds startup) / (1 to 2 pods at once) = 7.5 to 15 minutes

Compare to without minReadySeconds:
- roughly (10 replicas) x (30 seconds startup) / (1 to 2 pods at once) = 2.5 to 5 minutes

The extra rollout time provides confidence that your rollout is stable. For critical services, this tradeoff is worth it.

## Common Mistakes

**Setting minReadySeconds too low**. If your app needs 60 seconds to stabilize, setting minReadySeconds to 10 defeats the purpose.

**Forgetting to test the value**. Deploy to a staging environment and watch how long it actually takes for pods to stabilize.

**Using minReadySeconds instead of fixing initialization**. If your app crashes during startup, fix the initialization code. Don't just mask the problem with minReadySeconds.

**Not adjusting liveness probe delays**. Your livenessProbe initialDelaySeconds should be long enough for startup, or you should use a startupProbe, to avoid killing pods that are legitimately initializing.

## Best Practices

Set minReadySeconds to at least 30 seconds for production deployments. Even if your app stabilizes faster, the extra safety margin is valuable.

Monitor your rollouts and adjust based on observed behavior. If pods consistently fail after being marked ready, increase minReadySeconds.

Combine with maxUnavailable: 0 for zero-downtime deployments:

```yaml
spec:
  minReadySeconds: 60
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

This ensures you never have fewer than your desired number of stable pods.

Document why you chose your minReadySeconds value. Future maintainers will want to know:

```yaml
metadata:
  annotations:
    deployment.kubernetes.io/minReadySeconds-reason: |
      Background job processor takes 60-75 seconds to fully initialize.
      Set to 90 seconds to ensure stability before rollout progresses.
```

## Conclusion

minReadySeconds is a simple setting with powerful effects. It prevents Kubernetes from rushing through rollouts, giving your applications time to prove they're truly stable before the deployment commits to the next step.

Set it based on your application's real initialization time, not an arbitrary number. Monitor your rollouts to find the right balance between speed and safety. The few extra minutes spent on a careful rollout are worth it when they prevent production incidents.
