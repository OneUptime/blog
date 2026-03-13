# How to Implement Automated Rollback with Istio in CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CI/CD, Rollback, Canary Deployments, Kubernetes, DevOps

Description: Learn how to implement automated rollback mechanisms using Istio traffic management in your CI/CD pipelines to safely recover from bad deployments.

---

Deploying a broken version of your service to production is never fun. But what makes it worse is not having a quick way to undo the damage. If you are running Istio in your Kubernetes cluster, you already have all the building blocks to set up automated rollbacks in your CI/CD pipelines.

The core idea is simple: use Istio's traffic shifting capabilities to gradually move traffic to a new version, monitor key metrics, and automatically roll back if something goes wrong. No manual intervention needed.

## The Rollback Strategy

Before jumping into implementation, here is the high-level flow:

1. Deploy the new version alongside the old one
2. Use an Istio VirtualService to shift a small percentage of traffic to the new version
3. Monitor error rates and latency using Prometheus metrics from Envoy
4. If metrics exceed thresholds, shift all traffic back to the old version
5. If metrics look good, gradually increase traffic to the new version

## Setting Up the Baseline

You need two Deployment objects for the same service, differentiated by version labels:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-v1
  labels:
    app: my-app
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
      version: v1
  template:
    metadata:
      labels:
        app: my-app
        version: v1
    spec:
      containers:
      - name: my-app
        image: my-registry/my-app:1.0.0
        ports:
        - containerPort: 8080
```

And the corresponding DestinationRule that defines the subsets:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
spec:
  host: my-app
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## The VirtualService for Traffic Splitting

The VirtualService is where the magic happens. You start by sending all traffic to v1:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: v1
      weight: 100
    - destination:
        host: my-app
        subset: v2
      weight: 0
```

During a canary rollout, you update the weights incrementally - maybe 10%, then 25%, then 50%, then 100%.

## The Rollback Script

Here is a bash script that your CI/CD pipeline can run after deploying the new version. It checks Prometheus metrics and decides whether to proceed or roll back:

```bash
#!/bin/bash

SERVICE="my-app"
NAMESPACE="default"
PROMETHEUS_URL="http://prometheus.istio-system:9090"
ERROR_THRESHOLD=5  # 5% error rate
LATENCY_THRESHOLD=500  # 500ms p99

check_metrics() {
  # Query 5xx error rate from Envoy metrics
  ERROR_RATE=$(curl -s "${PROMETHEUS_URL}/api/v1/query" \
    --data-urlencode "query=sum(rate(istio_requests_total{destination_service=\"${SERVICE}.${NAMESPACE}.svc.cluster.local\",response_code=~\"5.*\",destination_version=\"v2\"}[2m])) / sum(rate(istio_requests_total{destination_service=\"${SERVICE}.${NAMESPACE}.svc.cluster.local\",destination_version=\"v2\"}[2m])) * 100" \
    | jq -r '.data.result[0].value[1] // "0"')

  # Query p99 latency
  LATENCY=$(curl -s "${PROMETHEUS_URL}/api/v1/query" \
    --data-urlencode "query=histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service=\"${SERVICE}.${NAMESPACE}.svc.cluster.local\",destination_version=\"v2\"}[2m])) by (le))" \
    | jq -r '.data.result[0].value[1] // "0"')

  echo "Error rate: ${ERROR_RATE}%, P99 latency: ${LATENCY}ms"

  if (( $(echo "$ERROR_RATE > $ERROR_THRESHOLD" | bc -l) )); then
    return 1
  fi

  if (( $(echo "$LATENCY > $LATENCY_THRESHOLD" | bc -l) )); then
    return 1
  fi

  return 0
}

rollback() {
  echo "Rolling back to v1..."
  kubectl patch virtualservice ${SERVICE} -n ${NAMESPACE} --type merge -p '{
    "spec": {
      "http": [{
        "route": [
          {"destination": {"host": "'${SERVICE}'", "subset": "v1"}, "weight": 100},
          {"destination": {"host": "'${SERVICE}'", "subset": "v2"}, "weight": 0}
        ]
      }]
    }
  }'
  echo "Rollback complete. Scaling down v2..."
  kubectl scale deployment ${SERVICE}-v2 -n ${NAMESPACE} --replicas=0
}

promote() {
  local weight=$1
  echo "Promoting v2 to ${weight}% traffic..."
  local v1_weight=$((100 - weight))
  kubectl patch virtualservice ${SERVICE} -n ${NAMESPACE} --type merge -p '{
    "spec": {
      "http": [{
        "route": [
          {"destination": {"host": "'${SERVICE}'", "subset": "v1"}, "weight": '${v1_weight}'},
          {"destination": {"host": "'${SERVICE}'", "subset": "v2"}, "weight": '${weight}'}
        ]
      }]
    }
  }'
}

# Progressive rollout: 10% -> 25% -> 50% -> 100%
for WEIGHT in 10 25 50 100; do
  promote $WEIGHT
  echo "Waiting 60 seconds for metrics to stabilize..."
  sleep 60

  if ! check_metrics; then
    echo "Metrics exceeded thresholds at ${WEIGHT}% traffic"
    rollback
    exit 1
  fi

  echo "Metrics look good at ${WEIGHT}% traffic"
done

echo "Rollout complete. v2 is now serving 100% of traffic."
```

## Integrating with Your CI/CD Pipeline

The rollback script above fits into any CI/CD system. The typical pipeline stages look like this:

1. **Build** - Build and push the container image
2. **Deploy v2** - Apply the new Deployment manifest with the v2 label
3. **Canary rollout** - Run the rollback script that progressively shifts traffic
4. **Cleanup** - If the rollout succeeded, delete the v1 Deployment

In a Kubernetes-native CI/CD tool, you would run the rollback script as a Job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: canary-rollout
spec:
  template:
    spec:
      serviceAccountName: ci-deployer
      containers:
      - name: rollout
        image: bitnami/kubectl:latest
        command: ["/bin/bash", "/scripts/rollback.sh"]
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: scripts
        configMap:
          name: rollback-script
      restartPolicy: Never
```

Make sure the service account has permissions to patch VirtualService resources:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: canary-deployer
rules:
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices"]
  verbs: ["get", "patch", "update"]
- apiGroups: ["apps"]
  resources: ["deployments", "deployments/scale"]
  verbs: ["get", "patch", "update"]
```

## Using Flagger for a More Robust Solution

If you want something more production-ready than a custom script, Flagger is an open-source progressive delivery tool that works natively with Istio. It automates the entire canary analysis and rollback process.

Install Flagger and define a Canary resource:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 8080
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
```

Flagger watches your Deployment for changes. When you update the container image, it automatically creates the canary Deployment, manages the VirtualService weights, checks metrics, and rolls back if the success rate drops below 99% or latency exceeds 500ms.

## Handling Rollback Notifications

You probably want to know when a rollback happens. Add a webhook to your rollback script:

```bash
notify_slack() {
  local status=$1
  local message=$2
  curl -X POST "$SLACK_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"[${status}] ${SERVICE}: ${message}\"}"
}
```

Call it from your rollback function and after a successful promotion.

## Things to Watch Out For

Database migrations can make rollbacks tricky. If v2 ran a migration that v1 does not understand, rolling back the traffic will not fix the problem. Keep your migrations backward-compatible, at least for one version.

Stateful connections like WebSockets or gRPC streams will be disrupted during traffic shifts. Istio does not drain existing connections by default when you change weights. You can configure connection draining in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
spec:
  host: my-app
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 30ms
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

Automated rollbacks with Istio give you confidence to deploy frequently without worrying about breaking things for your users. The key is to combine Istio's traffic management with solid metrics collection and clear thresholds. Whether you build a custom script or use a tool like Flagger, the pattern is the same: shift traffic gradually, watch the numbers, and pull back fast if anything looks off.
