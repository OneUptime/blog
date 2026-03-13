# How to Run Conformance Tests During Flagger Canary Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Conformance Testing, Kubernetes, Progressive Delivery, Webhook, Testing

Description: Learn how to integrate conformance tests into Flagger canary analysis to validate API contracts, functionality, and behavior before promotion.

---

## Introduction

Metrics like success rate and latency tell you whether a canary is responding correctly under load, but they do not verify that the canary's behavior matches expected specifications. Conformance tests fill this gap by validating API contracts, response schemas, business logic, and functional requirements during canary analysis.

Flagger supports conformance testing through its webhook system. You can run conformance test suites as pre-rollout or rollout webhooks, using the load tester to execute test commands. If the tests fail, Flagger treats it as a failed analysis check and can roll back the canary.

This guide covers how to integrate conformance tests into your Flagger canary workflow, including setup patterns for different testing frameworks and strategies for running tests at the right point in the deployment lifecycle.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- The Flagger load tester deployed in your cluster
- A Canary resource targeting a Deployment
- A conformance test suite that can run against a target URL
- kubectl access to your cluster

## Why Run Conformance Tests During Canary Analysis

Metrics-based analysis catches performance regressions and errors, but it cannot detect:

- API response schema changes that break clients
- Missing fields in API responses
- Changed business logic that produces valid but incorrect results
- New endpoints that return 200 but with wrong data
- Removed endpoints that are no longer served

Conformance tests verify these functional aspects by making specific requests and validating the responses against expected schemas and values.

## Running Conformance Tests as Pre-rollout Webhooks

Pre-rollout is the most common placement for conformance tests because it validates the canary before any production traffic reaches it:

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
      - name: conformance-tests
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 300s
        metadata:
          type: bash
          cmd: |
            set -e
            CANARY="http://my-app-canary.default:80"

            # Test list endpoint
            curl -sf "$CANARY/api/v1/items" | jq -e '.items | type == "array"'

            # Test create endpoint
            RESULT=$(curl -sf -X POST \
              -H "Content-Type: application/json" \
              -d '{"name":"conformance-test"}' \
              "$CANARY/api/v1/items")
            echo "$RESULT" | jq -e '.id'

            # Test get endpoint
            ID=$(echo "$RESULT" | jq -r '.id')
            curl -sf "$CANARY/api/v1/items/$ID" | jq -e '.name == "conformance-test"'

            # Test delete endpoint
            curl -sf -X DELETE "$CANARY/api/v1/items/$ID"

            echo "Conformance tests passed"
```

If any test fails, the pre-rollout webhook returns a non-200 status and Flagger increments its failure counter.

## Using a Dedicated Test Container

For test suites that require specific tools or languages, create a ConfigMap with your test scripts and mount them in the load tester:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: conformance-tests
  namespace: test
data:
  run-tests.sh: |
    #!/bin/bash
    set -euo pipefail

    TARGET_URL="$1"

    echo "Running conformance test suite against $TARGET_URL"

    # Test health endpoints
    curl -sf "$TARGET_URL/healthz" | jq -e '.status == "healthy"'
    curl -sf "$TARGET_URL/readyz" | jq -e '.ready == true'

    # Test API version header
    HEADERS=$(curl -sf -I "$TARGET_URL/api/v1/items")
    echo "$HEADERS" | grep -qi "x-api-version"

    # Test pagination
    RESPONSE=$(curl -sf "$TARGET_URL/api/v1/items?limit=5&offset=0")
    echo "$RESPONSE" | jq -e '.limit == 5'
    echo "$RESPONSE" | jq -e 'has("total")'
    echo "$RESPONSE" | jq -e 'has("items")'

    # Test error responses
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/api/v1/items/nonexistent")
    if [ "$HTTP_CODE" != "404" ]; then
      echo "FAILED: Expected 404 for nonexistent item, got $HTTP_CODE"
      exit 1
    fi

    echo "All conformance tests passed"
```

Reference the script in the webhook:

```yaml
    webhooks:
      - name: conformance-suite
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 300s
        metadata:
          type: bash
          cmd: "/scripts/run-tests.sh http://my-app-canary.default:80"
```

## Running Tests During Each Analysis Step

You can also run conformance tests as `rollout` webhooks, which execute during each analysis step. This catches issues that only appear under load:

```yaml
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
      - name: conformance-during-load
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: |
            set -e
            CANARY="http://my-app-canary.default:80"
            curl -sf "$CANARY/api/v1/items" | jq -e '.items | type == "array"'
            curl -sf "$CANARY/api/v1/health" | jq -e '.database == "connected"'
```

This runs the conformance checks while the canary is under load, catching issues like race conditions or resource exhaustion.

## Combining Conformance Tests with Metrics

A comprehensive canary analysis uses both conformance tests and metrics:

```yaml
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
    webhooks:
      - name: conformance-tests
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 300s
        metadata:
          type: bash
          cmd: |
            set -e
            CANARY="http://my-app-canary.default:80"
            curl -sf "$CANARY/healthz"
            curl -sf "$CANARY/api/v1/items" | jq -e '.items | type == "array"'
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
```

The conformance tests validate functional correctness before traffic starts, while metrics validate performance and reliability under load.

## Testing gRPC Conformance

For gRPC services, use `ghz` or `grpcurl` for conformance testing:

```yaml
    webhooks:
      - name: grpc-conformance
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 120s
        metadata:
          type: bash
          cmd: |
            set -e
            CANARY="my-app-canary.default:9090"

            # Test unary RPC
            grpcurl -plaintext -d '{"id":"test-1"}' \
              "$CANARY" my.package.MyService/GetItem

            # Test that error codes are correct
            RESULT=$(grpcurl -plaintext -d '{"id":"nonexistent"}' \
              "$CANARY" my.package.MyService/GetItem 2>&1 || true)
            echo "$RESULT" | grep -q "NotFound"

            echo "gRPC conformance tests passed"
```

## Handling Flaky Tests

Conformance tests can be flaky due to timing issues or eventual consistency. Add retry logic to your scripts:

```yaml
    webhooks:
      - name: conformance-with-retries
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 180s
        metadata:
          type: bash
          cmd: |
            MAX_RETRIES=3
            RETRY_DELAY=5
            CANARY="http://my-app-canary.default:80"

            for attempt in $(seq 1 $MAX_RETRIES); do
              echo "Attempt $attempt of $MAX_RETRIES"
              if curl -sf "$CANARY/healthz" && \
                 curl -sf "$CANARY/api/v1/items" | jq -e '.items | type == "array"'; then
                echo "Conformance tests passed on attempt $attempt"
                exit 0
              fi
              if [ $attempt -lt $MAX_RETRIES ]; then
                echo "Tests failed, retrying in ${RETRY_DELAY}s..."
                sleep $RETRY_DELAY
              fi
            done

            echo "Conformance tests failed after $MAX_RETRIES attempts"
            exit 1
```

## Conclusion

Conformance tests complement metrics-based canary analysis by validating functional correctness rather than just performance. Run them as pre-rollout webhooks to validate the canary before traffic arrives, or as rollout webhooks to verify behavior under load. Use the Flagger load tester to execute test scripts, whether they are inline bash commands or mounted ConfigMap scripts. Combined with metrics for success rate and latency, conformance tests provide a thorough safety net for progressive delivery.
