# How to Implement Gradual Rollout with Automatic Rollback in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Canary Deployments, Rollback, Traffic Management, Kubernetes, DevOps

Description: Build an automated canary deployment pipeline with Istio that gradually shifts traffic and automatically rolls back when error rates spike.

---

Canary deployments are great in theory. You shift a small percentage of traffic to a new version, check if things look good, then shift more. The problem is that most teams do this manually. Someone watches a dashboard, decides things look okay, then bumps the traffic percentage. That works until the person doing the watching goes to lunch, or the error spike happens at 3 AM, or the rollout takes so long that everyone loses interest.

What you really want is an automated system that gradually increases traffic to the new version and automatically rolls back if something goes wrong. You can build this with Istio, Prometheus, and a simple controller script.

## Architecture Overview

The components involved:

- Istio VirtualService for traffic weight management
- Istio DestinationRule for version subsets
- Prometheus for collecting success rate and latency metrics
- A controller (CronJob or Deployment) that reads metrics and adjusts weights

## Setting Up the Base Resources

Start with your two versions deployed:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: production
spec:
  host: my-app
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: production
spec:
  hosts:
  - my-app
  http:
  - route:
    - destination:
        host: my-app
        subset: stable
      weight: 100
    - destination:
        host: my-app
        subset: canary
      weight: 0
```

## The Rollout Controller Script

This script is the heart of the automated rollout. It queries Prometheus for the canary error rate, and based on that, either increases traffic or rolls back:

```bash
#!/bin/bash
set -e

NAMESPACE="production"
VS_NAME="my-app"
PROMETHEUS_URL="http://prometheus.istio-system:9090"
MAX_ERROR_RATE=0.05  # 5% error threshold
STEP_SIZE=10         # increase by 10% each step
MAX_CANARY_WEIGHT=100

# Get current canary weight
CURRENT_WEIGHT=$(kubectl get virtualservice $VS_NAME -n $NAMESPACE \
  -o jsonpath='{.spec.http[0].route[1].weight}')

echo "Current canary weight: $CURRENT_WEIGHT%"

if [ "$CURRENT_WEIGHT" -eq 0 ]; then
  echo "Canary not started yet. Setting initial weight to $STEP_SIZE%"
  NEW_CANARY=$STEP_SIZE
  NEW_STABLE=$((100 - NEW_CANARY))
else
  # Query Prometheus for canary error rate over last 5 minutes
  ERROR_RATE=$(curl -s "$PROMETHEUS_URL/api/v1/query" \
    --data-urlencode "query=sum(rate(istio_requests_total{destination_workload=\"my-app-canary\",response_code=~\"5.*\"}[5m])) / sum(rate(istio_requests_total{destination_workload=\"my-app-canary\"}[5m]))" \
    | jq -r '.data.result[0].value[1] // "0"')

  echo "Canary error rate: $ERROR_RATE"

  # Compare error rate against threshold
  EXCEEDS=$(echo "$ERROR_RATE > $MAX_ERROR_RATE" | bc -l)

  if [ "$EXCEEDS" -eq 1 ]; then
    echo "ERROR RATE EXCEEDED THRESHOLD. Rolling back!"
    NEW_CANARY=0
    NEW_STABLE=100
  else
    NEW_CANARY=$((CURRENT_WEIGHT + STEP_SIZE))
    if [ "$NEW_CANARY" -gt "$MAX_CANARY_WEIGHT" ]; then
      NEW_CANARY=$MAX_CANARY_WEIGHT
    fi
    NEW_STABLE=$((100 - NEW_CANARY))
    echo "Error rate within threshold. Increasing canary to $NEW_CANARY%"
  fi
fi

# Apply the new weights
kubectl patch virtualservice $VS_NAME -n $NAMESPACE --type='json' \
  -p="[
    {\"op\": \"replace\", \"path\": \"/spec/http/0/route/0/weight\", \"value\": $NEW_STABLE},
    {\"op\": \"replace\", \"path\": \"/spec/http/0/route/1/weight\", \"value\": $NEW_CANARY}
  ]"

echo "Updated weights: stable=$NEW_STABLE%, canary=$NEW_CANARY%"
```

## Deploying the Controller as a CronJob

Run the rollout controller every 5 minutes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rollout-controller
  namespace: production
data:
  rollout.sh: |
    # (paste the script from above)
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: canary-rollout
  namespace: production
spec:
  schedule: "*/5 * * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: rollout-controller
          containers:
          - name: controller
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "/scripts/rollout.sh"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          restartPolicy: OnFailure
          volumes:
          - name: scripts
            configMap:
              name: rollout-controller
              defaultMode: 0755
```

## RBAC for the Controller

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: rollout-controller
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: rollout-controller
  namespace: production
rules:
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices"]
  verbs: ["get", "patch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: rollout-controller
  namespace: production
subjects:
- kind: ServiceAccount
  name: rollout-controller
  namespace: production
roleRef:
  kind: Role
  name: rollout-controller
  apiGroup: rbac.authorization.k8s.io
```

## Adding Latency Checks

Error rate alone is not always enough. You should also check latency. If the canary is responding correctly but taking three times as long, that is still a problem. Extend the controller to check P99 latency:

```bash
# Query P99 latency for canary
CANARY_P99=$(curl -s "$PROMETHEUS_URL/api/v1/query" \
  --data-urlencode "query=histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_workload=\"my-app-canary\"}[5m])) by (le))" \
  | jq -r '.data.result[0].value[1] // "0"')

# Query P99 latency for stable
STABLE_P99=$(curl -s "$PROMETHEUS_URL/api/v1/query" \
  --data-urlencode "query=histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_workload=\"my-app-stable\"}[5m])) by (le))" \
  | jq -r '.data.result[0].value[1] // "0"')

# Roll back if canary is 2x slower
LATENCY_RATIO=$(echo "$CANARY_P99 / $STABLE_P99" | bc -l)
if (( $(echo "$LATENCY_RATIO > 2.0" | bc -l) )); then
  echo "Canary latency too high ($CANARY_P99 ms vs $STABLE_P99 ms). Rolling back!"
  NEW_CANARY=0
  NEW_STABLE=100
fi
```

## The Full Rollout Timeline

With a 5-minute interval and 10% steps, a full rollout looks like:

| Time | Canary Weight | Action |
|------|--------------|--------|
| T+0 | 0% -> 10% | Initial step |
| T+5 | 10% -> 20% | Metrics OK, step up |
| T+10 | 20% -> 30% | Metrics OK, step up |
| T+15 | 30% -> 40% | Metrics OK, step up |
| ... | ... | ... |
| T+45 | 90% -> 100% | Full rollout complete |

Total time: about 50 minutes for a full rollout. Adjust the interval and step size based on your needs. For critical services, use smaller steps (5%) and longer intervals (10 minutes).

## Handling the Rollback Case

When a rollback happens, you want to know about it. Add a notification to the script:

```bash
if [ "$EXCEEDS" -eq 1 ]; then
  echo "ERROR RATE EXCEEDED THRESHOLD. Rolling back!"
  NEW_CANARY=0
  NEW_STABLE=100

  # Send alert via webhook
  curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\": \"Canary rollback triggered for $VS_NAME. Error rate: $ERROR_RATE (threshold: $MAX_ERROR_RATE)\"}"
fi
```

## Post-Rollout Cleanup

Once the canary reaches 100%, you should:

1. Update the stable deployment to use the new image
2. Scale down the canary deployment
3. Reset the VirtualService weights

This can be another script triggered when canary weight hits 100%:

```bash
if [ "$CURRENT_WEIGHT" -ge 100 ]; then
  echo "Canary rollout complete. Promoting canary to stable."
  # Update stable deployment image
  CANARY_IMAGE=$(kubectl get deployment my-app-canary -n $NAMESPACE \
    -o jsonpath='{.spec.template.spec.containers[0].image}')
  kubectl set image deployment/my-app-stable my-app=$CANARY_IMAGE -n $NAMESPACE
  # Reset weights
  kubectl patch virtualservice $VS_NAME -n $NAMESPACE --type='json' \
    -p='[
      {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
      {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
    ]'
  # Scale down canary
  kubectl scale deployment my-app-canary --replicas=0 -n $NAMESPACE
fi
```

## Considerations

There is a warm-up period to account for. When the canary first receives traffic, JVM-based services might have higher latency due to JIT compilation. You might want to skip the first metrics check or add a grace period.

If your canary weight is very low (like 5%), the Prometheus metrics might not be statistically significant. You need enough requests hitting the canary to make meaningful conclusions. A rule of thumb: wait for at least 100 requests to the canary before making rollback decisions.

This approach works well for simple cases. For production-grade automated canary deployments, take a look at tools like Flagger, which integrates natively with Istio and handles all of this logic with more sophistication. But if you want to understand the mechanics and keep control, the script-based approach shown here is solid.
