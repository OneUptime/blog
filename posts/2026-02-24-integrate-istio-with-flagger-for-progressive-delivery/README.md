# How to Integrate Istio with Flagger for Progressive Delivery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Flagger, Canary, Progressive Delivery, Kubernetes

Description: How to use Flagger with Istio for automated canary deployments, A/B testing, and progressive traffic shifting.

---

Deploying new versions of your services is always a little nerve-wracking. You can write all the tests you want, but production traffic has a way of exposing issues that never show up in staging. Flagger automates the process of gradually shifting traffic to a new version while monitoring metrics, and if anything goes wrong, it rolls back automatically. When paired with Istio, Flagger uses VirtualService traffic shifting to control exactly how much traffic goes to the new version.

## How Flagger Works with Istio

Flagger watches your Deployment resources. When you push a new image or change the pod spec, Flagger detects the change and starts a progressive rollout. It creates a canary Deployment, sets up Istio VirtualService and DestinationRule resources, and gradually increases the traffic percentage going to the canary. At each step, it checks metrics (like request success rate and latency) and only proceeds if the canary is healthy.

## Installing Flagger

Install Flagger with Istio support:

```bash
helm repo add flagger https://flagger.app
helm repo update

helm install flagger flagger/flagger \
  --namespace istio-system \
  --set meshProvider=istio \
  --set metricsServer=http://prometheus.istio-system:9090
```

Flagger needs access to Prometheus for metrics. If you installed Istio with the default profile, Prometheus should already be available. Verify:

```bash
kubectl get svc -n istio-system | grep prometheus
```

Also install the Flagger load tester, which is useful for generating test traffic during canary analysis:

```bash
helm install flagger-loadtester flagger/loadtester \
  --namespace test \
  --create-namespace
```

## Setting Up a Canary Deployment

Say you have a simple web application deployed:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: my-app:1.0.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: default
spec:
  selector:
    app: my-app
  ports:
  - port: 8080
    targetPort: 8080
```

Now create a Canary resource that tells Flagger how to manage the rollout:

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
  progressDeadlineSeconds: 60
  service:
    port: 8080
    targetPort: 8080
    gateways:
    - istio-system/main-gateway
    hosts:
    - myapp.example.com
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
      url: http://flagger-loadtester.test/
      timeout: 5s
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:8080/"
```

When you apply this, Flagger creates:

- A `my-app-primary` Deployment (copy of the original)
- A `my-app-canary` Deployment (scaled to zero initially)
- An Istio VirtualService with traffic routing rules
- An Istio DestinationRule with subsets for primary and canary

## Understanding the Canary Analysis

The analysis configuration controls the rollout behavior:

- `interval: 30s` - Check metrics every 30 seconds
- `threshold: 5` - Allow up to 5 failed checks before rolling back
- `maxWeight: 50` - Send at most 50% of traffic to the canary
- `stepWeight: 10` - Increase canary traffic by 10% at each step

So the rollout goes: 10%, 20%, 30%, 40%, 50%, then promote. At each step, Flagger checks the request success rate (must be above 99%) and request duration (must be under 500ms).

## Triggering a Canary Release

To trigger a rollout, update the Deployment image:

```bash
kubectl set image deployment/my-app my-app=my-app:2.0.0
```

Flagger detects the change and starts the analysis. Watch the progress:

```bash
kubectl describe canary my-app

# Or watch Flagger's logs
kubectl logs -n istio-system -l app.kubernetes.io/name=flagger -f
```

You can also watch the VirtualService to see traffic weights changing:

```bash
kubectl get virtualservice my-app -o yaml
```

## A/B Testing with Istio Headers

Instead of percentage-based canary, you can do A/B testing based on HTTP headers:

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
    port: 8080
  analysis:
    interval: 1m
    threshold: 10
    iterations: 10
    match:
    - headers:
        x-canary:
          exact: "true"
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
```

With this configuration, only requests with the `x-canary: true` header go to the new version. All other traffic stays on the primary.

## Custom Metrics

Beyond the built-in request success rate and duration metrics, you can define custom metrics from Prometheus:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    100 - sum(
      rate(istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}",
        response_code!~"5.*"
      }[{{ interval }}])
    ) / sum(
      rate(istio_requests_total{
        reporter="destination",
        destination_workload_namespace="{{ namespace }}",
        destination_workload="{{ target }}"
      }[{{ interval }}])
    ) * 100
```

Reference it in your Canary:

```yaml
analysis:
  metrics:
  - name: error-rate
    templateRef:
      name: error-rate
    thresholdRange:
      max: 1
    interval: 1m
```

## Alerting on Canary Events

Flagger can send alerts when canary deployments start, succeed, or fail:

```yaml
apiVersion: flagger.app/v1beta1
kind: AlertProvider
metadata:
  name: slack
  namespace: default
spec:
  type: slack
  channel: deployments
  address: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

Then reference the alert provider in your Canary resource:

```yaml
spec:
  analysis:
    alerts:
    - name: slack
      severity: info
      providerRef:
        name: slack
```

## Rollback Behavior

If the canary fails the metric checks, Flagger automatically rolls back by setting the VirtualService weight back to 100% for the primary. The canary Deployment gets scaled to zero. You can see rollback events:

```bash
kubectl describe canary my-app
```

Look for events like "Halt advancement" and "Rolling back" in the output.

Flagger with Istio is one of the smoothest progressive delivery setups available. The fact that it uses native Istio VirtualService objects for traffic shifting means you get all of Istio's traffic management capabilities during rollouts. The automated metric checking and rollback capability takes a lot of the stress out of deploying to production.
