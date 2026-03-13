# How to Configure Flagger Load Tester with Bash Scripts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flagger, canary, load testing, bash, scripts, kubernetes, progressive delivery, testing

Description: Learn how to use bash scripts with the Flagger load tester to run complex validation logic during canary analysis.

---

## Introduction

While single-line commands work for simple checks, complex validation logic often requires multi-step bash scripts. The Flagger load tester supports executing bash scripts through its webhook interface, allowing you to run sophisticated testing scenarios during canary analysis.

Bash scripts are useful when you need conditional logic, loops, variable manipulation, output parsing, or multi-step workflows that go beyond what a single command can accomplish. You can either embed scripts directly in the webhook metadata or mount them as ConfigMaps and execute them from the load tester pod.

This guide covers both approaches and provides practical script examples for common canary validation tasks.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- The Flagger load tester deployed in your cluster
- A Canary resource targeting a Deployment
- kubectl access to your cluster

## Inline Bash Scripts

You can embed multi-line bash scripts directly in the webhook metadata using the `type: bash` metadata field:

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
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    webhooks:
      - name: validation-script
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 120s
        metadata:
          type: bash
          cmd: |
            set -e
            echo "Starting canary validation..."

            CANARY_URL="http://my-app-canary.default:80"

            echo "Checking health endpoint..."
            curl -sf "$CANARY_URL/healthz"

            echo "Checking API version..."
            VERSION=$(curl -sf "$CANARY_URL/api/version" | jq -r '.version')
            if [ -z "$VERSION" ]; then
              echo "ERROR: Version endpoint returned empty"
              exit 1
            fi
            echo "Canary version: $VERSION"

            echo "Validation passed"
```

The `set -e` flag ensures the script exits immediately on any command failure. Variables, conditionals, and command substitution all work as expected.

## Mounting Scripts as ConfigMaps

For larger scripts, embedding them in YAML becomes unwieldy. Instead, create a ConfigMap containing your script and mount it in the load tester:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: canary-test-scripts
  namespace: test
data:
  validate.sh: |
    #!/bin/bash
    set -euo pipefail

    CANARY_URL="$1"
    MAX_RETRIES=3
    RETRY_DELAY=5

    check_endpoint() {
      local url="$1"
      local retries=0

      while [ $retries -lt $MAX_RETRIES ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
          return 0
        fi
        retries=$((retries + 1))
        echo "Retry $retries/$MAX_RETRIES for $url"
        sleep $RETRY_DELAY
      done

      echo "FAILED: $url did not respond after $MAX_RETRIES retries"
      return 1
    }

    echo "=== Canary Validation ==="
    check_endpoint "$CANARY_URL/healthz"
    check_endpoint "$CANARY_URL/readyz"
    check_endpoint "$CANARY_URL/api/v1/status"

    echo "All checks passed"
```

Mount the ConfigMap in the load tester by updating its Helm values or patching the deployment:

```yaml
# Helm values for flagger-loadtester
extraVolumes:
  - name: test-scripts
    configMap:
      name: canary-test-scripts
      defaultMode: 0755

extraVolumeMounts:
  - name: test-scripts
    mountPath: /scripts
```

Then reference the script in your webhook:

```yaml
    webhooks:
      - name: validation-script
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 120s
        metadata:
          type: bash
          cmd: "/scripts/validate.sh http://my-app-canary.default:80"
```

## Script for API Compatibility Testing

Test that the canary version maintains backward compatibility with existing API contracts:

```yaml
    webhooks:
      - name: api-compat-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 180s
        metadata:
          type: bash
          cmd: |
            set -e
            CANARY="http://my-app-canary.default:80"

            echo "Testing API v1 endpoints..."

            # Test GET endpoint returns expected structure
            RESPONSE=$(curl -sf "$CANARY/api/v1/items")
            echo "$RESPONSE" | jq -e '.items | type == "array"'
            echo "$RESPONSE" | jq -e '.total | type == "number"'

            # Test POST endpoint accepts existing format
            RESULT=$(curl -sf -X POST \
              -H "Content-Type: application/json" \
              -d '{"name":"test","value":42}' \
              "$CANARY/api/v1/items")
            echo "$RESULT" | jq -e '.id'

            # Clean up test data
            ID=$(echo "$RESULT" | jq -r '.id')
            curl -sf -X DELETE "$CANARY/api/v1/items/$ID"

            echo "API compatibility tests passed"
```

## Script for Performance Baseline Comparison

Compare canary performance against a known baseline:

```yaml
    webhooks:
      - name: perf-baseline-check
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 120s
        metadata:
          type: bash
          cmd: |
            set -e
            CANARY="http://my-app-canary.default:80"
            MAX_LATENCY_MS=200

            echo "Measuring canary response time..."

            TOTAL_MS=0
            SAMPLES=10

            for i in $(seq 1 $SAMPLES); do
              LATENCY=$(curl -sf -o /dev/null -w "%{time_total}" "$CANARY/api/v1/ping")
              LATENCY_MS=$(echo "$LATENCY * 1000" | bc | cut -d. -f1)
              TOTAL_MS=$((TOTAL_MS + LATENCY_MS))
            done

            AVG_MS=$((TOTAL_MS / SAMPLES))
            echo "Average latency: ${AVG_MS}ms (threshold: ${MAX_LATENCY_MS}ms)"

            if [ "$AVG_MS" -gt "$MAX_LATENCY_MS" ]; then
              echo "FAILED: Average latency exceeds threshold"
              exit 1
            fi

            echo "Performance check passed"
```

## Script for Database Migration Verification

Check that database migrations are applied before the canary receives traffic:

```yaml
    webhooks:
      - name: migration-check
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 120s
        metadata:
          type: bash
          cmd: |
            set -e
            CANARY="http://my-app-canary.default:80"

            echo "Checking database migration status..."

            MIGRATION_STATUS=$(curl -sf "$CANARY/api/internal/migrations")

            PENDING=$(echo "$MIGRATION_STATUS" | jq -r '.pending')
            if [ "$PENDING" != "0" ]; then
              echo "FAILED: $PENDING pending migrations"
              echo "$MIGRATION_STATUS" | jq '.pending_migrations'
              exit 1
            fi

            echo "All migrations applied"
```

## Using Scripts with rollout Webhooks

Scripts can also run during each analysis step using the `rollout` webhook type. This is useful for continuous validation alongside metric checks:

```yaml
    webhooks:
      - name: continuous-validation
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: |
            set -e
            CANARY="http://my-app-canary.default:80"

            # Verify critical functionality each analysis step
            curl -sf "$CANARY/api/v1/items" | jq -e '.items | length >= 0'
            curl -sf "$CANARY/api/v1/health" | jq -e '.database == "connected"'
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
```

## Conclusion

Bash scripts in the Flagger load tester enable complex validation logic that goes beyond simple health checks. Whether you embed scripts inline in webhook metadata or mount them as ConfigMaps, the load tester executes them and translates exit codes into webhook responses. Use scripts for API compatibility testing, performance baseline comparisons, migration verification, and any custom validation your canary deployments require. The combination of bash scripting with Flagger's webhook system provides a flexible framework for thorough canary analysis.
