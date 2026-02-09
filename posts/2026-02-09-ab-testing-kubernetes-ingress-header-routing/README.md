# How to Implement A/B Testing with Kubernetes Ingress Header-Based Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, A/B Testing, Ingress

Description: Learn how to implement A/B testing in Kubernetes using Ingress header-based routing to direct specific users to experimental versions while keeping the majority on stable releases.

---

You want to test a new feature with a subset of users before rolling it out to everyone. The feature involves backend changes that you can't easily toggle with a feature flag. You need a way to route specific users to the new version while everyone else uses the stable version.

Header-based routing with Kubernetes Ingress solves this problem by directing traffic based on HTTP headers.

## The A/B Testing Challenge

Traditional A/B testing at the application layer works well for frontend changes and simple toggles. But when you need to test significant backend changes, different database schemas, or entirely different algorithms, you need infrastructure-level routing.

Requirements for effective A/B testing:

- Route users consistently to the same version
- Control what percentage of users see each version
- Easily shift traffic between versions
- Monitor each version separately
- Quick rollback if the new version has issues

## Basic Architecture

Deploy two versions of your application as separate deployments, each with its own service:

```yaml
# Stable version
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-stable
  labels:
    version: stable
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
      version: stable
  template:
    metadata:
      labels:
        app: api
        version: stable
    spec:
      containers:
      - name: api
        image: myregistry.io/api:v1.5.0
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api-stable
spec:
  selector:
    app: api
    version: stable
  ports:
  - port: 80
    targetPort: 8080
---
# Experimental version
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-experiment
  labels:
    version: experiment
spec:
  replicas: 2  # Smaller for testing
  selector:
    matchLabels:
      app: api
      version: experiment
  template:
    metadata:
      labels:
        app: api
        version: experiment
    spec:
      containers:
      - name: api
        image: myregistry.io/api:v2.0.0-beta
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api-experiment
spec:
  selector:
    app: api
    version: experiment
  ports:
  - port: 80
    targetPort: 8080
```

## Header-Based Routing with Nginx Ingress

The Nginx Ingress Controller supports header-based routing through annotations. Route requests based on a custom header:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ab-test
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-header: "X-Experiment-Version"
    nginx.ingress.kubernetes.io/canary-by-header-value: "beta"
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-experiment
            port:
              number: 80
---
# Main ingress for stable version
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-stable
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-stable
            port:
              number: 80
```

Now requests with the header `X-Experiment-Version: beta` go to the experimental version, while all other requests go to stable.

Test it:

```bash
# Goes to stable version
curl https://api.example.com/health

# Goes to experimental version
curl -H "X-Experiment-Version: beta" https://api.example.com/health
```

## User-Based Routing

For real A/B testing, you want to route users consistently based on their identity. Add logic in your application or API gateway to set the header:

```javascript
// Frontend code that sets experiment header
async function makeApiRequest(endpoint) {
  const userId = getCurrentUserId();
  const headers = {};

  // Hash user ID to determine experiment group
  const hash = simpleHash(userId);
  const experimentPercent = 10; // 10% in experiment

  if (hash % 100 < experimentPercent) {
    headers['X-Experiment-Version'] = 'beta';
  }

  const response = await fetch(`https://api.example.com${endpoint}`, {
    headers: headers
  });

  return response.json();
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
```

This ensures the same user always gets the same version, providing consistent experience.

## Percentage-Based Routing

Route a percentage of all traffic to the experimental version using the canary-weight annotation:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ab-test
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"  # 10% to experiment
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-experiment
            port:
              number: 80
```

This randomly routes 10% of requests to the experimental version. Unlike header-based routing, this doesn't guarantee the same user gets the same version consistently.

## Combining Header and Weight Routing

Combine both approaches for more control:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ab-test
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    # First priority: explicit header
    nginx.ingress.kubernetes.io/canary-by-header: "X-Experiment-Version"
    nginx.ingress.kubernetes.io/canary-by-header-value: "beta"
    # Second priority: weight-based routing
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-experiment
            port:
              number: 80
```

This configuration:
- Routes requests with `X-Experiment-Version: beta` to experiment
- Routes 10% of remaining requests to experiment
- Routes everything else to stable

## Using Istio for More Advanced Routing

Istio provides more sophisticated routing capabilities through VirtualServices:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-ab-test
spec:
  hosts:
  - api.example.com
  http:
  # Route 1: Users in experiment group
  - match:
    - headers:
        x-experiment-version:
          exact: beta
    route:
    - destination:
        host: api-experiment
        port:
          number: 80
  # Route 2: 10% of remaining traffic
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: api-stable
        port:
          number: 80
      weight: 90
    - destination:
        host: api-experiment
        port:
          number: 80
      weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-versions
spec:
  host: api
  subsets:
  - name: stable
    labels:
      version: stable
  - name: experiment
    labels:
      version: experiment
```

Istio also provides automatic retry logic, circuit breaking, and detailed metrics for each version.

## Monitoring A/B Test Results

Tag metrics with version labels to compare performance:

```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-ab-test
spec:
  selector:
    matchLabels:
      app: api
  endpoints:
  - port: metrics
    interval: 30s
    relabelings:
    - sourceLabels: [__meta_kubernetes_pod_label_version]
      targetLabel: version
```

Query metrics in Prometheus:

```promql
# Compare error rates between versions
rate(http_requests_total{status=~"5.."}[5m])
  /
rate(http_requests_total[5m])

# Compare response times
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m])
)
```

Create a Grafana dashboard that compares versions side by side.

## Gradual Rollout Strategy

Start with header-based routing for internal testing, then gradually increase the percentage:

```bash
# Week 1: Internal testing only (header-based)
kubectl apply -f ingress-header-only.yaml

# Week 2: Add 5% of users
kubectl patch ingress api-ab-test -p '
{
  "metadata": {
    "annotations": {
      "nginx.ingress.kubernetes.io/canary-weight": "5"
    }
  }
}'

# Week 3: Increase to 10%
kubectl patch ingress api-ab-test -p '
{
  "metadata": {
    "annotations": {
      "nginx.ingress.kubernetes.io/canary-weight": "10"
    }
  }
}'

# Week 4: Increase to 25%
kubectl patch ingress api-ab-test -p '
{
  "metadata": {
    "annotations": {
      "nginx.ingress.kubernetes.io/canary-weight": "25"
    }
  }
}'

# Week 5: Full rollout
kubectl apply -f ingress-stable-new-version.yaml
kubectl delete ingress api-ab-test
```

## Handling Stateful Sessions

For stateful applications, ensure users stick to the same version throughout their session. Use cookie-based routing:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ab-test
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-cookie: "experiment_group"
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-experiment
            port:
              number: 80
```

Your application sets a cookie when assigning users to experiment groups:

```javascript
// API endpoint that assigns experiment group
app.post('/api/login', async (req, res) => {
  const user = await authenticateUser(req.body);

  // Determine experiment group
  const hash = simpleHash(user.id);
  if (hash % 100 < 10) {
    res.cookie('experiment_group', 'beta', {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: true
    });
  }

  res.json({ user });
});
```

## Automating Rollback Based on Metrics

Monitor key metrics and automatically roll back if the experiment performs poorly:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: experiment-monitor
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: monitor
            image: myregistry.io/experiment-monitor:latest
            env:
            - name: PROMETHEUS_URL
              value: "http://prometheus:9090"
            - name: ERROR_RATE_THRESHOLD
              value: "0.05"  # 5% error rate
            command:
            - /bin/sh
            - -c
            - |
              # Query error rates
              STABLE_ERRORS=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(http_requests_total{status=~\"5..\",version=\"stable\"}[5m])/rate(http_requests_total{version=\"stable\"}[5m])" | jq -r '.data.result[0].value[1]')
              EXPERIMENT_ERRORS=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=rate(http_requests_total{status=~\"5..\",version=\"experiment\"}[5m])/rate(http_requests_total{version=\"experiment\"}[5m])" | jq -r '.data.result[0].value[1]')

              # Compare error rates
              if (( $(echo "$EXPERIMENT_ERRORS > $STABLE_ERRORS + $ERROR_RATE_THRESHOLD" | bc -l) )); then
                echo "Experiment error rate too high, rolling back"
                kubectl delete ingress api-ab-test
              fi
          restartPolicy: OnFailure
```

## Best Practices

**Start small**. Begin with internal testing using header-based routing before exposing to users.

**Monitor everything**. Track error rates, response times, and business metrics for each version.

**Set clear success criteria**. Define what metrics need to improve for the experiment to be considered successful.

**Have a rollback plan**. Be ready to quickly remove the experimental version if it causes problems.

**Communicate with your team**. Make sure everyone knows an A/B test is running and how to identify which version they're seeing.

**Use consistent hashing**. Ensure users get the same version consistently to avoid confusing experiences.

**Respect data privacy**. Don't use personally identifiable information in routing logic without proper consent.

## Conclusion

Header-based routing with Kubernetes Ingress provides a powerful way to implement A/B testing at the infrastructure level. You can test significant backend changes with a subset of users, monitor the results, and gradually roll out or quickly roll back based on real-world performance.

Start with header-based routing for controlled testing, add percentage-based routing to expand to more users, and monitor metrics closely to make data-driven decisions about your rollout strategy.
