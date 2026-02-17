# How to Configure Automated Rollbacks in Cloud Deploy When Verification Fails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, Rollback, Verification, DevOps

Description: Configure automated rollbacks in Google Cloud Deploy that trigger automatically when post-deployment verification fails, keeping your production safe.

---

Deploying new versions is only half the story. What happens when the new version does not work as expected? You need a way to automatically roll back to the previous good version. Google Cloud Deploy supports automated rollbacks that trigger when post-deployment verification fails. This means you can deploy with confidence knowing that bad releases get caught and reverted without manual intervention.

In this post, I will show you how to set up verification and configure automated rollbacks so your delivery pipeline is self-healing.

## How Automated Rollbacks Work in Cloud Deploy

The automated rollback mechanism in Cloud Deploy is tied to the verification feature. Here is the flow:

1. A release is deployed to a target (a rollout is created)
2. After deployment succeeds, Cloud Deploy runs a verification job
3. If verification fails, Cloud Deploy automatically initiates a rollback
4. The rollback creates a new rollout using the last successfully deployed release

This process is fully automated once configured. No one needs to watch a dashboard and click a button.

## Enabling Verification on Your Pipeline

Verification is configured at the pipeline stage level. You need to set `verify: true` for the stages where you want automated rollbacks.

```yaml
# pipeline.yaml - Enable verification on staging and production stages
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: my-app-pipeline
description: Pipeline with verification and automated rollbacks
serialPipeline:
  stages:
  - targetId: dev
    profiles:
    - dev
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

## Writing the Verification Job

The verification job is defined in your Skaffold configuration. It runs after each deployment and determines whether the deployment is healthy.

```yaml
# skaffold.yaml - Configuration with a verification container
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
- name: smoke-test
  container:
    name: smoke-test
    image: us-central1-docker.pkg.dev/my-project/my-repo/smoke-tests:latest
    command: ["sh"]
    args: ["-c", "/run-smoke-tests.sh"]
  timeout: 300s
```

The verification container runs your test suite. If the container exits with a non-zero code, verification fails. If it exits with zero, verification passes.

## Building a Verification Container

Your verification container should run lightweight checks that validate the deployment is healthy. Here is an example Dockerfile for a smoke test container.

```dockerfile
# Dockerfile.verify - Smoke test container for deployment verification
FROM curlimages/curl:latest

COPY smoke-tests.sh /run-smoke-tests.sh

USER root
RUN chmod +x /run-smoke-tests.sh

ENTRYPOINT ["/run-smoke-tests.sh"]
```

And the smoke test script itself.

```bash
#!/bin/sh
# smoke-tests.sh - Quick health checks against the deployed service

# Define the service endpoint
# Cloud Deploy sets CLOUD_DEPLOY_TARGET with the target name
SERVICE_URL="http://my-web-app-service.default.svc.cluster.local"

echo "Running smoke tests against $SERVICE_URL"

# Test 1: Check health endpoint returns 200
echo "Test 1: Health check"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health")
if [ "$HTTP_CODE" != "200" ]; then
  echo "FAIL: Health check returned $HTTP_CODE"
  exit 1
fi
echo "PASS: Health check returned 200"

# Test 2: Check that the API responds with valid JSON
echo "Test 2: API response validation"
RESPONSE=$(curl -s "$SERVICE_URL/api/v1/status")
if ! echo "$RESPONSE" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  echo "FAIL: API did not return valid JSON"
  exit 1
fi
echo "PASS: API returns valid JSON"

# Test 3: Check response time is under 2 seconds
echo "Test 3: Response time check"
TIME=$(curl -s -o /dev/null -w "%{time_total}" "$SERVICE_URL/api/v1/status")
if [ "$(echo "$TIME > 2.0" | bc)" -eq 1 ]; then
  echo "FAIL: Response time ${TIME}s exceeds 2s threshold"
  exit 1
fi
echo "PASS: Response time ${TIME}s is acceptable"

echo "All smoke tests passed"
exit 0
```

## Configuring the Rollback Behavior

Automated rollbacks are enabled through automation rules on the delivery pipeline. You create an automation that watches for failed rollouts and triggers a rollback.

```yaml
# automation.yaml - Automation rule for rollback on verification failure
apiVersion: deploy.cloud.google.com/v1
kind: Automation
metadata:
  name: rollback-on-failure
description: Automatically roll back when verification fails
selector:
- targets:
  - id: prod
deliveryPipeline: my-app-pipeline
serviceAccount: deploy-automation-sa@my-project.iam.gserviceaccount.com
suspended: false
rules:
- rollbackRule:
    name: rollback-on-verify-fail
    phases:
    - VERIFY
```

Register the automation.

```bash
# Register the automation rule
gcloud deploy apply --file=automation.yaml --region=us-central1
```

When verification fails on the prod target, this automation kicks in and creates a rollback rollout using the last successful release.

## Setting Up the Automation Service Account

The automation service account needs specific permissions to create rollouts and manage releases.

```bash
# Create the service account
gcloud iam service-accounts create deploy-automation-sa \
  --display-name="Cloud Deploy Automation SA"

# Grant the necessary roles
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:deploy-automation-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/clouddeploy.operator"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:deploy-automation-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/clouddeploy.releaser"
```

## Testing the Automated Rollback

The best way to test this is to deliberately deploy a bad version. Create a version of your smoke tests that will fail, or deploy an image that returns errors on the health endpoint.

```bash
# Deploy a known-bad version to trigger the rollback
gcloud deploy releases create rel-bad-001 \
  --delivery-pipeline=my-app-pipeline \
  --region=us-central1 \
  --source=. \
  --images=my-web-app=us-central1-docker.pkg.dev/my-project/my-repo/my-web-app:broken
```

After promoting to the target with verification, watch the rollout. You should see it go through these states: deploying, deployed, verifying, failed, and then a new rollback rollout should be automatically created.

```bash
# Monitor the rollout status
gcloud deploy rollouts list \
  --delivery-pipeline=my-app-pipeline \
  --release=rel-bad-001 \
  --region=us-central1
```

## Combining with Canary Deployments

Automated rollbacks are especially powerful when combined with canary deployments. You can verify at each canary phase and automatically roll back if any phase fails.

```yaml
# Canary with verification at each phase
strategy:
  canary:
    runtimeConfig:
      kubernetes:
        serviceNetworking:
          service: my-web-app-service
          deployment: my-web-app
    canaryDeployment:
      percentages:
      - 10
      - 50
      verify: true
```

With this setup, if the 10% canary fails verification, Cloud Deploy rolls back before any more traffic sees the bad version. This is about as safe as deployments get.

## Notifications for Rollback Events

You probably want to know when an automated rollback happens. Set up Pub/Sub notifications from Cloud Deploy to get alerted.

```bash
# Cloud Deploy publishes events to the clouddeploy-operations topic
# Create a subscription to receive rollback notifications
gcloud pubsub subscriptions create deploy-notifications \
  --topic=clouddeploy-operations
```

You can then process these events with a Cloud Function or Cloud Run service to send Slack messages, create tickets, or trigger other incident response workflows.

## Summary

Automated rollbacks in Cloud Deploy provide a safety net for your deployments. By combining verification jobs with rollback automation rules, you create a self-healing pipeline that catches bad deployments and reverts them without human intervention. The key ingredients are a solid verification container that tests what matters, an automation rule that triggers on verification failure, and proper service account permissions. With these in place, you can deploy faster because you know the system will catch problems for you.
