# How to Add Verification Steps to Cloud Deploy Releases to Validate Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, Verification, Testing, DevOps

Description: Learn how to add post-deployment verification steps to Cloud Deploy releases to automatically validate that deployments are healthy before proceeding.

---

Deploying code is one thing. Knowing that it actually works in the target environment is another. Google Cloud Deploy supports post-deployment verification, which lets you run automated checks after every deployment to confirm things are working correctly. If verification fails, you know immediately and can take action before the release progresses further.

In this guide, I will walk through setting up verification from scratch, including writing effective verification tests and integrating them into your delivery pipeline.

## What Verification Does

When you enable verification on a pipeline stage, Cloud Deploy runs a verification job after each successful deployment. This job is a container you define that performs whatever checks you need - health checks, integration tests, smoke tests, or even load tests. The verification result (pass or fail) determines whether the release can continue.

This sits between your deployment completing and the release being available for promotion to the next stage. It is an automated quality gate.

## Enabling Verification on a Pipeline Stage

Verification is a boolean flag on the strategy configuration of a pipeline stage.

```yaml
# pipeline.yaml - Pipeline with verification enabled on staging and prod
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-app-pipeline
serialPipeline:
  stages:
  - targetId: dev
    profiles:
    - dev
    strategy:
      standard:
        verify: false
  - targetId: staging
    profiles:
    - staging
    strategy:
      standard:
        verify: true
  - targetId: prod
    profiles:
    - prod
    strategy:
      standard:
        verify: true
```

I typically skip verification on dev since developers need fast feedback loops. Staging and production are where verification really pays off.

## Defining the Verification Container in Skaffold

The verification logic lives in your Skaffold configuration under the `verify` section. Each verify entry specifies a container to run.

```yaml
# skaffold.yaml - Skaffold configuration with verification
apiVersion: skaffold/v4beta7
kind: Config
metadata:
  name: my-app
manifests:
  rawYaml:
  - k8s/*.yaml
deploy:
  kubectl: {}
verify:
- name: integration-tests
  container:
    name: integration-tests
    image: us-central1-docker.pkg.dev/my-project/my-repo/integration-tests:latest
    command: ["sh"]
    args: ["-c", "/run-tests.sh"]
    env:
    - name: TEST_TIMEOUT
      value: "120"
  timeout: 600s
```

The `timeout` field sets how long Cloud Deploy waits for the verification container to complete. If the container does not finish in time, verification fails.

## Writing Effective Verification Tests

Good verification tests are fast, reliable, and test things that matter. Here is a practical test script that checks the essentials.

```bash
#!/bin/sh
# run-tests.sh - Post-deployment verification tests
set -e

# The service endpoint inside the cluster
SERVICE_URL="http://my-app-service.default.svc.cluster.local:80"

echo "Starting post-deployment verification"
echo "Target service: $SERVICE_URL"

# Test 1: Wait for the service to become available
echo "--- Test 1: Service availability ---"
RETRIES=0
MAX_RETRIES=30
until curl -sf "$SERVICE_URL/health" > /dev/null 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [ $RETRIES -ge $MAX_RETRIES ]; then
    echo "FAIL: Service did not become available after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "Waiting for service... attempt $RETRIES/$MAX_RETRIES"
  sleep 5
done
echo "PASS: Service is available"

# Test 2: Verify the API returns expected data structure
echo "--- Test 2: API contract validation ---"
RESPONSE=$(curl -sf "$SERVICE_URL/api/v1/info")
VERSION=$(echo "$RESPONSE" | jq -r '.version // empty')
if [ -z "$VERSION" ]; then
  echo "FAIL: API response missing version field"
  exit 1
fi
echo "PASS: API returns version $VERSION"

# Test 3: Check database connectivity through the application
echo "--- Test 3: Database connectivity ---"
DB_STATUS=$(curl -sf "$SERVICE_URL/api/v1/health/db" | jq -r '.status')
if [ "$DB_STATUS" != "connected" ]; then
  echo "FAIL: Database status is $DB_STATUS"
  exit 1
fi
echo "PASS: Database connection is healthy"

# Test 4: Verify critical endpoints respond within acceptable latency
echo "--- Test 4: Latency check ---"
LATENCY=$(curl -sf -o /dev/null -w "%{time_total}" "$SERVICE_URL/api/v1/users?limit=1")
if [ "$(echo "$LATENCY > 3.0" | bc)" -eq 1 ]; then
  echo "FAIL: Latency ${LATENCY}s exceeds 3s threshold"
  exit 1
fi
echo "PASS: Latency ${LATENCY}s is within threshold"

echo ""
echo "All verification tests passed"
```

## Building the Verification Container

Package your tests into a container image. Keep it lean - you want verification to run fast.

```dockerfile
# Dockerfile.verify - Verification container
FROM alpine:3.18

# Install only what we need for testing
RUN apk add --no-cache curl jq bc

COPY run-tests.sh /run-tests.sh
RUN chmod +x /run-tests.sh

ENTRYPOINT ["/run-tests.sh"]
```

Build and push the image.

```bash
# Build and push the verification container
docker build -f Dockerfile.verify -t us-central1-docker.pkg.dev/my-project/my-repo/integration-tests:latest .
docker push us-central1-docker.pkg.dev/my-project/my-repo/integration-tests:latest
```

## Running Multiple Verification Containers

You can define multiple verification steps. Cloud Deploy runs them sequentially. If any step fails, the entire verification fails.

```yaml
# skaffold.yaml - Multiple verification steps
verify:
- name: smoke-tests
  container:
    name: smoke-tests
    image: us-central1-docker.pkg.dev/my-project/my-repo/smoke-tests:latest
    command: ["sh", "-c", "/smoke-tests.sh"]
  timeout: 120s
- name: integration-tests
  container:
    name: integration-tests
    image: us-central1-docker.pkg.dev/my-project/my-repo/integration-tests:latest
    command: ["sh", "-c", "/integration-tests.sh"]
  timeout: 300s
- name: security-scan
  container:
    name: security-scan
    image: us-central1-docker.pkg.dev/my-project/my-repo/security-scanner:latest
    command: ["sh", "-c", "/scan.sh"]
  timeout: 180s
```

## Using Environment Variables in Verification

Cloud Deploy injects several environment variables into the verification container that you can use to make your tests dynamic.

```bash
#!/bin/sh
# Verification script using Cloud Deploy environment variables

echo "Release: $CLOUD_DEPLOY_RELEASE"
echo "Target: $CLOUD_DEPLOY_TARGET"
echo "Project: $CLOUD_DEPLOY_PROJECT"
echo "Location: $CLOUD_DEPLOY_LOCATION"
echo "Pipeline: $CLOUD_DEPLOY_DELIVERY_PIPELINE"

# Adjust test behavior based on the target
if [ "$CLOUD_DEPLOY_TARGET" = "prod" ]; then
  echo "Running full production test suite"
  TEST_LEVEL="full"
else
  echo "Running basic test suite"
  TEST_LEVEL="basic"
fi
```

## Monitoring Verification Status

You can check the verification status through the CLI or console.

```bash
# Check rollout status, including verification phase
gcloud deploy rollouts describe my-release-to-staging-0001 \
  --delivery-pipeline=my-app-pipeline \
  --release=my-release \
  --region=us-central1
```

The rollout will show phases like DEPLOYING, DEPLOYED, VERIFYING, and then either SUCCEEDED or FAILED depending on the verification result.

## Viewing Verification Logs

When verification fails, you need to see what went wrong. The verification container logs are accessible through Cloud Build, since Cloud Deploy uses Cloud Build to run verification jobs.

```bash
# List recent Cloud Build operations for verification jobs
gcloud builds list \
  --filter="tags='clouddeploy' AND tags='verify'" \
  --limit=5

# View logs for a specific build
gcloud builds log BUILD_ID
```

## Verification with Canary Deployments

When combined with canary deployments, verification runs at each canary phase. This means you validate the deployment before increasing the traffic percentage.

```yaml
# Canary with per-phase verification
strategy:
  canary:
    runtimeConfig:
      kubernetes:
        serviceNetworking:
          service: my-app-service
          deployment: my-app
    canaryDeployment:
      percentages:
      - 10
      - 50
      verify: true
```

At the 10% phase, verification runs against the canary pods. If it passes, you can advance to 50%. If it fails, you roll back while only 10% of traffic was affected.

## Tips for Writing Good Verification Tests

Keep these principles in mind when designing your verification suite:

- Test from the user's perspective. Hit actual API endpoints rather than checking internal state.
- Include retry logic. The service might take a few seconds to stabilize after deployment.
- Set reasonable timeouts. Too short causes false failures. Too long delays your pipeline.
- Avoid tests that depend on external services you do not control. Flaky dependencies cause flaky verification.
- Log clearly. When verification fails at 3 AM, someone needs to understand what happened from the logs alone.

## Summary

Verification in Cloud Deploy is a powerful quality gate that catches bad deployments automatically. By defining verification containers in your Skaffold configuration and enabling verification on your pipeline stages, you ensure every deployment is validated before it is considered successful. Combined with automated rollbacks, verification gives you a deployment pipeline that heals itself when things go wrong.
