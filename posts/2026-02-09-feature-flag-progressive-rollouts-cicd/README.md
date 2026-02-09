# How to Implement Feature Flag-Based Progressive Rollouts from CI/CD to Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feature Flags, Kubernetes, CI/CD, Progressive Delivery, DevOps

Description: Implement progressive rollout strategies using feature flags in Kubernetes deployments, enabling gradual feature releases with automated canary analysis and rollback capabilities integrated into CI/CD pipelines.

---

Feature flags decouple deployment from feature release, enabling progressive rollouts where new features are gradually exposed to users. By integrating feature flag systems with CI/CD and Kubernetes, you can deploy code to production but control feature visibility, automate canary analysis, and roll back instantly without redeploying. This guide demonstrates building a complete feature flag-based progressive delivery system.

## Understanding Feature Flag Progressive Delivery

Traditional deployments make features immediately available to all users. Feature flag progressive delivery deploys code but keeps features disabled, then gradually enables them for increasing user percentages while monitoring metrics. This approach reduces risk by limiting blast radius and enabling instant rollback without code changes.

## Setting Up a Feature Flag Service

Deploy Flagd for feature flag management:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flagd
  namespace: feature-flags
spec:
  replicas: 2
  selector:
    matchLabels:
      app: flagd
  template:
    metadata:
      labels:
        app: flagd
    spec:
      containers:
        - name: flagd
          image: ghcr.io/open-feature/flagd:latest
          ports:
            - containerPort: 8013
          args:
            - start
            - --uri
            - file:/config/flags.json
          volumeMounts:
            - name: flags-config
              mountPath: /config
      volumes:
        - name: flags-config
          configMap:
            name: feature-flags

---
apiVersion: v1
kind: Service
metadata:
  name: flagd
  namespace: feature-flags
spec:
  selector:
    app: flagd
  ports:
    - port: 8013
      targetPort: 8013
```

Define feature flags:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: feature-flags
  namespace: feature-flags
data:
  flags.json: |
    {
      "flags": {
        "new-checkout-flow": {
          "state": "ENABLED",
          "variants": {
            "on": true,
            "off": false
          },
          "defaultVariant": "off",
          "targeting": {
            "if": [
              {
                "in": ["@openfeature.dev/flagd-web:context:targetingKey", "$flagd.flagKey"]
              },
              "on",
              {
                "<": [
                  {"var": ["$flagd.random"]},
                  {"var": ["rolloutPercentage"]}
                ]
              }
            ]
          }
        }
      }
    }
```

## Instrumenting Applications

Add OpenFeature SDK to your application:

```javascript
// Node.js example
const { OpenFeature } = require('@openfeature/server-sdk');
const { FlagdProvider } = require('@openfeature/flagd-provider');

// Configure provider
OpenFeature.setProvider(new FlagdProvider({
  host: 'flagd.feature-flags.svc.cluster.local',
  port: 8013
}));

const client = OpenFeature.getClient();

// Use feature flags
app.get('/checkout', async (req, res) => {
  const newCheckoutEnabled = await client.getBooleanValue(
    'new-checkout-flow',
    false,
    { targetingKey: req.user.id }
  );

  if (newCheckoutEnabled) {
    // New checkout flow
    res.render('checkout-v2');
  } else {
    // Old checkout flow
    res.render('checkout-v1');
  }
});
```

Python example:

```python
from openfeature import api
from openfeature.provider.flagd import FlagdProvider

# Configure provider
api.set_provider(FlagdProvider(
    host="flagd.feature-flags.svc.cluster.local",
    port=8013
))

client = api.get_client()

def checkout_handler(request):
    new_checkout_enabled = client.get_boolean_value(
        "new-checkout-flow",
        False,
        {"targetingKey": request.user.id}
    )

    if new_checkout_enabled:
        return render_template("checkout_v2.html")
    else:
        return render_template("checkout_v1.html")
```

## CI/CD Pipeline with Feature Flag Deployment

Deploy with feature flags disabled by default:

```yaml
name: Deploy with Feature Flags
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build and push image
        run: |
          docker build -t registry.example.com/myapp:${{ github.sha }} .
          docker push registry.example.com/myapp:${{ github.sha }}

      - name: Deploy to production
        run: |
          kubectl set image deployment/myapp \
            myapp=registry.example.com/myapp:${{ github.sha }} \
            -n production

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/myapp -n production

      - name: Update feature flag config
        run: |
          # Feature starts at 0% rollout
          cat > flags-patch.yaml <<EOF
          data:
            flags.json: |
              {
                "flags": {
                  "new-checkout-flow": {
                    "state": "ENABLED",
                    "variants": {"on": true, "off": false},
                    "defaultVariant": "off",
                    "targeting": {
                      "rolloutPercentage": 0
                    }
                  }
                }
              }
          EOF

          kubectl patch configmap feature-flags \
            -n feature-flags \
            --patch-file flags-patch.yaml

      - name: Trigger progressive rollout
        run: |
          # Initiate automated rollout
          kubectl create job progressive-rollout-${{ github.sha }} \
            --from=cronjob/feature-rollout-automation \
            -n feature-flags
```

## Automated Progressive Rollout

Create a job that gradually increases rollout percentage:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: feature-rollout-automation
  namespace: feature-flags
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: feature-rollout-sa
          containers:
            - name: rollout-controller
              image: python:3.11
              env:
                - name: PROMETHEUS_URL
                  value: "http://prometheus.monitoring.svc:9090"
                - name: FLAGD_URL
                  value: "http://flagd.feature-flags.svc:8013"
              command:
                - python
                - /scripts/progressive-rollout.py
              volumeMounts:
                - name: scripts
                  mountPath: /scripts
          volumes:
            - name: scripts
              configMap:
                name: rollout-scripts
          restartPolicy: OnFailure
```

Progressive rollout script:

```python
# progressive-rollout.py
import requests
import os
import time
import json

PROMETHEUS_URL = os.getenv('PROMETHEUS_URL')
FLAG_NAME = "new-checkout-flow"

def get_current_rollout():
    # Get current rollout percentage from ConfigMap
    # Implementation depends on your setup
    return current_percentage

def get_error_rate(variant):
    query = f'''
        sum(rate(http_requests_total{{
            feature_flag="{FLAG_NAME}",
            variant="{variant}",
            status=~"5.."
        }}[5m]))
        /
        sum(rate(http_requests_total{{
            feature_flag="{FLAG_NAME}",
            variant="{variant}"
        }}[5m]))
    '''

    response = requests.get(
        f"{PROMETHEUS_URL}/api/v1/query",
        params={"query": query}
    )

    if response.json()['data']['result']:
        return float(response.json()['data']['result'][0]['value'][1])
    return 0

def update_rollout_percentage(percentage):
    # Update ConfigMap with new percentage
    # Trigger flagd reload
    pass

def main():
    current_rollout = get_current_rollout()

    # Get metrics for new variant
    error_rate = get_error_rate("on")
    baseline_error_rate = get_error_rate("off")

    print(f"Current rollout: {current_rollout}%")
    print(f"New variant error rate: {error_rate:.4f}")
    print(f"Baseline error rate: {baseline_error_rate:.4f}")

    # Check if metrics are healthy
    if error_rate > baseline_error_rate * 1.5:
        print("ERROR: New variant has significantly higher error rate")
        print("Rolling back to 0%")
        update_rollout_percentage(0)
        return

    # Progressive increase
    if current_rollout < 100:
        stages = [0, 5, 10, 25, 50, 75, 100]
        next_stage = min([s for s in stages if s > current_rollout])

        print(f"Advancing rollout to {next_stage}%")
        update_rollout_percentage(next_stage)
    else:
        print("Rollout complete at 100%")

if __name__ == "__main__":
    main()
```

## Monitoring Feature Flag Metrics

Instrument your application to emit feature flag metrics:

```javascript
const prometheus = require('prom-client');

const featureFlagCounter = new prometheus.Counter({
  name: 'feature_flag_evaluations_total',
  help: 'Total feature flag evaluations',
  labelNames: ['flag_name', 'variant', 'status']
});

app.get('/checkout', async (req, res) => {
  const newCheckoutEnabled = await client.getBooleanValue(
    'new-checkout-flow',
    false,
    { targetingKey: req.user.id }
  );

  const variant = newCheckoutEnabled ? 'on' : 'off';

  try {
    if (newCheckoutEnabled) {
      await processCheckoutV2(req);
      featureFlagCounter.labels('new-checkout-flow', variant, 'success').inc();
    } else {
      await processCheckoutV1(req);
      featureFlagCounter.labels('new-checkout-flow', variant, 'success').inc();
    }
    res.json({ success: true });
  } catch (error) {
    featureFlagCounter.labels('new-checkout-flow', variant, 'error').inc();
    res.status(500).json({ error: error.message });
  }
});
```

## Creating Rollout Dashboards

Build Grafana dashboards for rollout monitoring:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-rollout
  namespace: monitoring
data:
  rollout-dashboard.json: |
    {
      "dashboard": {
        "title": "Feature Flag Progressive Rollout",
        "panels": [
          {
            "title": "Rollout Percentage",
            "targets": [{
              "expr": "feature_flag_rollout_percentage{flag='new-checkout-flow'}"
            }]
          },
          {
            "title": "Error Rate by Variant",
            "targets": [{
              "expr": "sum(rate(feature_flag_evaluations_total{status='error'}[5m])) by (variant) / sum(rate(feature_flag_evaluations_total[5m])) by (variant)"
            }]
          },
          {
            "title": "Latency by Variant",
            "targets": [{
              "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (variant, le))"
            }]
          }
        ]
      }
    }
```

## Implementing Kill Switch

Create emergency rollback capability:

```bash
# Instant rollback to 0%
kubectl patch configmap feature-flags -n feature-flags --type=json -p='[
  {
    "op": "replace",
    "path": "/data/flags.json",
    "value": "{\"flags\": {\"new-checkout-flow\": {\"state\": \"DISABLED\"}}}"
  }
]'

# Trigger config reload
kubectl rollout restart deployment/flagd -n feature-flags
```

Automated kill switch based on metrics:

```python
def check_kill_switch_conditions():
    error_rate = get_error_rate("on")
    latency_p95 = get_latency("on", 95)

    # Automatic rollback conditions
    if error_rate > 0.05:  # 5% error rate
        print("CRITICAL: Error rate exceeded threshold")
        emergency_rollback()
        return True

    if latency_p95 > 2000:  # 2 second P95
        print("CRITICAL: Latency exceeded threshold")
        emergency_rollback()
        return True

    return False

def emergency_rollback():
    # Disable feature flag immediately
    update_rollout_percentage(0)

    # Send alert
    send_alert("Feature flag emergency rollback triggered")
```

## Conclusion

Feature flag-based progressive rollouts provide safe, controlled feature releases in Kubernetes environments. By decoupling deployment from release, monitoring variant-specific metrics, and automating gradual rollout with rollback capabilities, you minimize risk while maintaining deployment velocity. This approach enables true continuous delivery where code ships to production continuously, but features are released deliberately based on real observed behavior and business requirements.
