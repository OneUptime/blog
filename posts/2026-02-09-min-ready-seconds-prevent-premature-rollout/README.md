# How to Use minReadySeconds to Prevent Premature Rollout Progression

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployments, Reliability

Description: Discover how minReadySeconds in Kubernetes deployments prevents pods from being marked ready too quickly, ensuring stable rollouts and preventing crashes from reaching production.

---

Your pods pass their readiness probes, get marked as ready, and immediately start receiving traffic. Then they crash 30 seconds later due to a slow-starting background process you forgot about. By the time you notice, half your fleet is down.

The minReadySeconds setting prevents this exact scenario by forcing Kubernetes to wait before considering pods truly ready.

## The Problem with Instant Readiness

By default, Kubernetes considers a pod ready as soon as its readiness probe passes. For many applications, this happens within seconds of the container starting. The pod gets added to service endpoints and starts receiving production traffic.

But passing a basic HTTP health check doesn't mean your application is fully initialized. You might have:

- Background workers that take time to start
- Caches that need warming up
- Database connection pools that need establishing
- Scheduled tasks that initialize on startup

If any of these fail after the pod is marked ready, you've already added unstable pods to your production rotation.

## What minReadySeconds Does

The minReadySeconds field tells Kubernetes to wait a specified number of seconds after a pod's readiness probe passes before considering it available. During this waiting period:

- The pod is considered ready by the kubelet
- The pod is NOT considered available by the deployment controller
- The rollout doesn't progress to the next pod
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

With this configuration, each pod must stay ready for 30 seconds before the rollout continues to the next pod.

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

```
Waiting for deployment "api-server" rollout to finish: 1 out of 5 new replicas have been updated...
Waiting for deployment "api-server" rollout to finish: 1 out of 5 new replicas are available...
Waiting for deployment "api-server" rollout to finish: 2 out of 5 new replicas have been updated...
```

Notice the pauses between updates. Kubernetes creates a new pod, waits for it to pass readiness checks, then waits the minReadySeconds duration before creating the next pod.

## Choosing the Right Value

Set minReadySeconds based on your application's actual initialization time. Monitor your pods to see how long they need:

```bash
# Watch a pod's events
kubectl describe pod api-server-abc123

# Look for the timing between Ready and actually stable
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  2m    default-scheduler  Successfully assigned...
  Normal  Pulled     2m    kubelet            Container image pulled
  Normal  Created    2m    kubelet            Created container api
  Normal  Started    2m    kubelet            Started container api
  Normal  Ready      90s   kubelet            Container passed readiness probe
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

With minReadySeconds set to 60:

1. New pod starts, passes readiness, gets traffic
2. Memory leak begins
3. Kubernetes waits 60 seconds before creating next pod
4. First pod crashes after 40 seconds
5. Readiness probe fails, pod marked unready
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

The 90-second minReadySeconds ensures that the background worker has fully started and processed at least a few jobs before the deployment considers the pod stable.

## Monitoring minReadySeconds Behavior

Track how minReadySeconds affects your deployments with metrics:

```yaml
# Prometheus query to see time pods spend in ready-but-not-available state
kube_pod_status_ready{condition="true"} == 1
unless
kube_pod_status_condition{condition="Ready", status="true"}
  and on(pod)
  kube_pod_status_phase{phase="Running"}
  and on(pod)
  (time() - kube_pod_created) > 120
```

This helps you tune minReadySeconds based on actual behavior.

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

Each canary step waits for pods to be ready for 60 seconds before considering them healthy, adding an extra layer of safety to your progressive rollout.

## Impact on Rollout Speed

minReadySeconds slows down rollouts deliberately. Calculate the total rollout time:

For a deployment with:
- 10 replicas
- maxSurge: 1, maxUnavailable: 1
- minReadySeconds: 60
- Pod startup time: 30 seconds

The rollout takes approximately:
- (10 replicas) × (60 seconds minReady + 30 seconds startup) / (2 pods at once) = 450 seconds = 7.5 minutes

Compare to without minReadySeconds:
- (10 replicas) × (30 seconds startup) / (2 pods at once) = 150 seconds = 2.5 minutes

The extra 5 minutes provides confidence that your rollout is stable. For critical services, this tradeoff is worth it.

## Common Mistakes

**Setting minReadySeconds too low**. If your app needs 60 seconds to stabilize, setting minReadySeconds to 10 defeats the purpose.

**Forgetting to test the value**. Deploy to a staging environment and watch how long it actually takes for pods to stabilize.

**Using minReadySeconds instead of fixing initialization**. If your app crashes during startup, fix the initialization code. Don't just mask the problem with minReadySeconds.

**Not adjusting liveness probe delays**. Your livenessProbe initialDelaySeconds should be longer than minReadySeconds to avoid killing pods that are legitimately initializing.

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
