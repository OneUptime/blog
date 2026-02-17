# How to Set Up Trunk-Based Development with Cloud Build Triggers and Automated Testing on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Trunk-Based Development, CI/CD, Automated Testing

Description: Learn how to implement trunk-based development on GCP using Cloud Build triggers with automated testing pipelines for fast and reliable continuous integration.

---

Trunk-based development is a source control practice where developers merge small, frequent changes directly to the main branch instead of maintaining long-lived feature branches. It works best when you have a strong CI pipeline that runs tests automatically on every push, catching issues before they reach production.

Cloud Build on GCP is a natural fit for this workflow. In this post, I will show you how to set up Cloud Build triggers, configure automated testing gates, and build a pipeline that gives developers confidence to push to main multiple times a day.

## Why Trunk-Based Development?

Long-lived feature branches create merge hell. The longer a branch lives, the more it diverges from main, and the more painful the merge becomes. Trunk-based development avoids this by keeping branches short-lived (hours, not days) and merging frequently.

The trade-off is that you need a strong CI pipeline. Every push to main must be tested thoroughly because there is no separate integration step - main is always the integration branch.

```mermaid
graph LR
    DEV[Developer Push] --> TRIGGER[Cloud Build Trigger]
    TRIGGER --> UNIT[Unit Tests]
    UNIT --> INT[Integration Tests]
    INT --> LINT[Lint & Security Scan]
    LINT --> BUILD[Build Container]
    BUILD --> DEPLOY[Deploy to Staging]
    DEPLOY --> SMOKE[Smoke Tests]
    SMOKE --> APPROVE[Auto-Deploy to Prod]
```

## Step 1: Create the Cloud Build Configuration

Start with a comprehensive cloudbuild.yaml that runs all your testing stages:

```yaml
# cloudbuild.yaml
steps:
  # Step 1: Install dependencies
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['ci']
    id: 'install'

  # Step 2: Run linting
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'lint']
    id: 'lint'
    waitFor: ['install']

  # Step 3: Run unit tests with coverage
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'test:unit', '--', '--coverage', '--ci']
    id: 'unit-tests'
    waitFor: ['install']

  # Step 4: Run integration tests (parallel with unit tests)
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'test:integration']
    id: 'integration-tests'
    waitFor: ['install']
    env:
      - 'DATABASE_URL=postgresql://test:test@localhost:5432/testdb'

  # Step 5: Security scanning
  - name: 'gcr.io/cloud-builders/npm'
    args: ['audit', '--audit-level=high']
    id: 'security-audit'
    waitFor: ['install']

  # Step 6: Build the container image (only if all tests pass)
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '$_REGION-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
      - '-t'
      - '$_REGION-docker.pkg.dev/$PROJECT_ID/app-images/my-app:latest'
      - '.'
    id: 'build'
    waitFor: ['lint', 'unit-tests', 'integration-tests', 'security-audit']

  # Step 7: Push the image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', '$_REGION-docker.pkg.dev/$PROJECT_ID/app-images/my-app']
    id: 'push'
    waitFor: ['build']

  # Step 8: Deploy to staging
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'my-app-staging'
      - '--image=$_REGION-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
      - '--region=$_REGION'
      - '--platform=managed'
      - '--no-traffic'
      - '--tag=test-$SHORT_SHA'
    id: 'deploy-staging'
    waitFor: ['push']

  # Step 9: Run smoke tests against staging
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        STAGING_URL=$(gcloud run services describe my-app-staging \
          --region=$_REGION --format='value(status.url)')
        npm run test:smoke -- --base-url="$STAGING_URL"
    id: 'smoke-tests'
    waitFor: ['deploy-staging']

substitutions:
  _REGION: us-central1

options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'
```

## Step 2: Create Cloud Build Triggers

Set up triggers for different events - pushes to main and pull requests:

```bash
# Trigger for pushes to main branch
# This runs the full pipeline including deployment
gcloud builds triggers create github \
  --name="main-branch-pipeline" \
  --repo-name=my-repo \
  --repo-owner=my-org \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --description="Full CI/CD pipeline for main branch pushes"

# Trigger for pull requests
# This runs tests only, no deployment
gcloud builds triggers create github \
  --name="pr-validation" \
  --repo-name=my-repo \
  --repo-owner=my-org \
  --pull-request-pattern="^main$" \
  --build-config=cloudbuild-pr.yaml \
  --description="PR validation - tests and lint only" \
  --comment-control=COMMENTS_ENABLED_FOR_EXTERNAL_CONTRIBUTORS_ONLY
```

Create a separate PR-only build config that skips deployment:

```yaml
# cloudbuild-pr.yaml - Runs on PRs, no deployment
steps:
  - name: 'node:20'
    entrypoint: 'npm'
    args: ['ci']
    id: 'install'

  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'lint']
    id: 'lint'
    waitFor: ['install']

  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'test:unit', '--', '--coverage', '--ci']
    id: 'unit-tests'
    waitFor: ['install']

  - name: 'node:20'
    entrypoint: 'npm'
    args: ['run', 'test:integration']
    id: 'integration-tests'
    waitFor: ['install']

  - name: 'gcr.io/cloud-builders/npm'
    args: ['audit', '--audit-level=high']
    id: 'security-audit'
    waitFor: ['install']

  # Build the image to verify it compiles, but do not push
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'my-app:pr-test', '.']
    id: 'build-check'
    waitFor: ['lint', 'unit-tests', 'integration-tests', 'security-audit']

options:
  machineType: 'E2_HIGHCPU_8'
```

## Step 3: Set Up Short-Lived Feature Flags

Trunk-based development often uses feature flags to hide incomplete features that have been merged to main. Use a simple configuration approach:

```javascript
// feature-flags.js - Simple feature flag configuration
// These flags control what is visible in production

const featureFlags = {
  // Flags for features currently in development
  'new-dashboard': {
    enabled: process.env.FEATURE_NEW_DASHBOARD === 'true',
    description: 'New analytics dashboard redesign'
  },
  'batch-export': {
    enabled: process.env.FEATURE_BATCH_EXPORT === 'true',
    description: 'Bulk data export functionality'
  },
  'v2-api': {
    enabled: process.env.FEATURE_V2_API === 'true',
    description: 'Version 2 API endpoints'
  }
};

function isFeatureEnabled(flagName) {
  const flag = featureFlags[flagName];
  if (!flag) {
    console.warn(`Unknown feature flag: ${flagName}`);
    return false;
  }
  return flag.enabled;
}

module.exports = { isFeatureEnabled };
```

Set flags differently per environment:

```bash
# Staging - all features enabled for testing
gcloud run services update my-app-staging \
  --region=us-central1 \
  --set-env-vars="FEATURE_NEW_DASHBOARD=true,FEATURE_BATCH_EXPORT=true,FEATURE_V2_API=true"

# Production - only released features enabled
gcloud run services update my-app \
  --region=us-central1 \
  --set-env-vars="FEATURE_NEW_DASHBOARD=false,FEATURE_BATCH_EXPORT=true,FEATURE_V2_API=false"
```

## Step 4: Enforce Branch Protection

Make sure the CI pipeline is a hard requirement before merging to main. Configure branch protection rules:

```bash
# Using gh CLI to set branch protection
gh api repos/my-org/my-repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["pr-validation"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null
```

## Step 5: Set Up Build Notifications

Developers need fast feedback. Configure notifications for build results:

```bash
# Create a Pub/Sub topic for build notifications
gcloud pubsub topics create cloud-build-notifications

# Create a subscription that forwards to Slack
gcloud pubsub subscriptions create slack-build-notifications \
  --topic=cloud-build-notifications \
  --push-endpoint=https://your-slack-webhook-handler.run.app
```

Here is a Cloud Function that formats build notifications for Slack:

```javascript
// cloud-function: buildNotifier
// Sends Cloud Build results to Slack

const { WebClient } = require('@slack/web-api');

const slack = new WebClient(process.env.SLACK_TOKEN);
const CHANNEL = '#ci-builds';

exports.notifyBuild = async (message) => {
  const build = JSON.parse(
    Buffer.from(message.data, 'base64').toString()
  );

  // Only notify on completion
  if (build.status !== 'SUCCESS' && build.status !== 'FAILURE' && build.status !== 'TIMEOUT') {
    return;
  }

  const color = build.status === 'SUCCESS' ? '#36a64f' : '#ff0000';
  const shortSha = build.substitutions.SHORT_SHA || 'unknown';
  const trigger = build.substitutions.TRIGGER_NAME || 'manual';
  const duration = calculateDuration(build.startTime, build.finishTime);

  await slack.chat.postMessage({
    channel: CHANNEL,
    attachments: [{
      color: color,
      title: `Build ${build.status}: ${trigger}`,
      fields: [
        { title: 'Commit', value: shortSha, short: true },
        { title: 'Duration', value: duration, short: true },
        { title: 'Branch', value: build.substitutions.BRANCH_NAME || 'unknown', short: true }
      ],
      footer: `Build ID: ${build.id}`
    }]
  });
};

function calculateDuration(start, end) {
  const ms = new Date(end) - new Date(start);
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
```

## Step 6: Optimize Build Speed

Fast builds are essential for trunk-based development. Developers will not push frequently if builds take 20 minutes:

```yaml
# cloudbuild.yaml optimizations

# Use kaniko for cached Docker builds
steps:
  - name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - '--destination=$_REGION-docker.pkg.dev/$PROJECT_ID/app-images/my-app:$SHORT_SHA'
      - '--cache=true'
      - '--cache-ttl=168h'
    id: 'build-cached'

options:
  # Use a faster machine type
  machineType: 'E2_HIGHCPU_32'
  # Keep build artifacts in a specific region for faster access
  env:
    - 'DOCKER_BUILDKIT=1'
```

## Wrapping Up

Trunk-based development with Cloud Build gives you a workflow where developers push small changes frequently, automated tests catch issues immediately, and deployments happen continuously. The keys to making it work are fast builds (under 10 minutes), comprehensive automated tests, and feature flags to manage incomplete work.

Start by setting up the trigger and a basic test suite. Then gradually add more test stages, security scanning, and deployment automation. Once the pipeline is reliable, enforce it with branch protection rules so nothing gets merged to main without passing the full test suite.
