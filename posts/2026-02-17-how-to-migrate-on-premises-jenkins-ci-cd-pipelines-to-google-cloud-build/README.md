# How to Migrate On-Premises Jenkins CI/CD Pipelines to Google Cloud Build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Jenkins, CI/CD, DevOps

Description: A practical guide to migrating Jenkins CI/CD pipelines to Google Cloud Build including pipeline translation and build trigger setup.

---

Jenkins is the workhorse of many CI/CD setups, but managing Jenkins servers - the plugins, the security patches, the build executor scaling, the disk space issues - is a job in itself. Google Cloud Build is a serverless CI/CD platform that runs builds on Google's infrastructure with no servers to manage. Migrating from Jenkins to Cloud Build means rethinking how your pipelines are defined, but the end result is a CI/CD system that scales automatically and costs nothing when idle.

## Understanding the Mapping

Jenkins and Cloud Build have different concepts but accomplish the same things:

| Jenkins Concept | Cloud Build Equivalent |
|----------------|----------------------|
| Jenkinsfile | cloudbuild.yaml |
| Pipeline stages | Build steps |
| Build agents/executors | Managed build workers |
| Jenkins plugins | Container images in build steps |
| Parameterized builds | Substitution variables |
| Webhooks | Build triggers |
| Artifacts | Cloud Storage / Artifact Registry |
| Credentials | Secret Manager |

## Translating a Jenkinsfile to cloudbuild.yaml

Let me walk through converting a typical Jenkins pipeline to Cloud Build.

Here is a Jenkins pipeline for a Node.js application:

```groovy
// Jenkinsfile - before migration
pipeline {
    agent any
    environment {
        REGISTRY = 'gcr.io/my-project'
        IMAGE_NAME = 'my-app'
    }
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }
        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER} ."
            }
        }
        stage('Push Image') {
            steps {
                sh "docker push ${REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER}"
            }
        }
        stage('Deploy to GKE') {
            steps {
                sh """
                    kubectl set image deployment/my-app \
                        my-app=${REGISTRY}/${IMAGE_NAME}:${BUILD_NUMBER}
                """
            }
        }
    }
    post {
        failure {
            mail to: 'team@company.com',
                subject: "Build Failed: ${env.JOB_NAME}",
                body: "Check ${env.BUILD_URL}"
        }
    }
}
```

Here is the equivalent Cloud Build configuration:

```yaml
# cloudbuild.yaml - after migration
steps:
  # Install dependencies
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['ci']

  # Run linting
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'lint']

  # Run tests
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['test']

  # Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/my-app:$BUILD_ID'
      - '.'

  # Push the image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/my-app:$BUILD_ID'

  # Deploy to GKE
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - 'run'
      - '--image=gcr.io/$PROJECT_ID/my-app:$BUILD_ID'
      - '--location=us-central1'
      - '--cluster=my-cluster'

# Store build artifacts
artifacts:
  objects:
    location: 'gs://my-build-artifacts/$BUILD_ID/'
    paths: ['test-results/*.xml']

# Build options
options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'

# Push the built image to the registry
images:
  - 'gcr.io/$PROJECT_ID/my-app:$BUILD_ID'
```

## Setting Up Build Triggers

Jenkins uses webhooks or polling to trigger builds. Cloud Build uses Build Triggers that connect to your source repositories:

```bash
# Connect your GitHub repository to Cloud Build
# First, install the Cloud Build GitHub App through the GCP Console

# Create a trigger for pull requests
gcloud builds triggers create github \
  --name "my-app-pr-check" \
  --repo-name my-app \
  --repo-owner my-org \
  --pull-request-pattern "^main$" \
  --build-config cloudbuild.yaml \
  --comment-control COMMENTS_ENABLED_FOR_EXTERNAL_CONTRIBUTORS_ONLY

# Create a trigger for pushes to main branch
gcloud builds triggers create github \
  --name "my-app-deploy" \
  --repo-name my-app \
  --repo-owner my-org \
  --branch-pattern "^main$" \
  --build-config cloudbuild-deploy.yaml

# Create a trigger with substitution variables (like Jenkins parameters)
gcloud builds triggers create github \
  --name "my-app-release" \
  --repo-name my-app \
  --repo-owner my-org \
  --tag-pattern "^v.*" \
  --build-config cloudbuild-release.yaml \
  --substitutions _DEPLOY_ENV=production,_NOTIFY_CHANNEL=releases
```

## Handling Jenkins Plugins

Jenkins plugins do not have direct equivalents in Cloud Build. Instead, you use container images as build steps:

```yaml
# Jenkins plugin: SonarQube Scanner
# Cloud Build: Use the SonarQube Docker image
steps:
  - name: 'sonarsource/sonar-scanner-cli:latest'
    args:
      - '-Dsonar.projectKey=my-app'
      - '-Dsonar.host.url=https://sonarqube.mycompany.com'
      - '-Dsonar.login=$$SONAR_TOKEN'
    secretEnv: ['SONAR_TOKEN']

# Jenkins plugin: Slack Notification
# Cloud Build: Use a custom step with curl or a Cloud Function
  - name: 'gcr.io/cloud-builders/curl'
    args:
      - '-X'
      - 'POST'
      - '-H'
      - 'Content-type: application/json'
      - '--data'
      - '{"text":"Build $BUILD_ID completed successfully"}'
      - '$$SLACK_WEBHOOK_URL'
    secretEnv: ['SLACK_WEBHOOK_URL']

# Secret references from Secret Manager
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/sonar-token/versions/latest
      env: SONAR_TOKEN
    - versionName: projects/$PROJECT_ID/secrets/slack-webhook/versions/latest
      env: SLACK_WEBHOOK_URL
```

## Managing Secrets

Jenkins stores credentials in its credential store. Cloud Build uses Secret Manager:

```bash
# Store secrets in Secret Manager
echo -n "my-sonar-token" | gcloud secrets create sonar-token --data-file=-
echo -n "https://hooks.slack.com/..." | gcloud secrets create slack-webhook --data-file=-

# Grant Cloud Build access to the secrets
gcloud secrets add-iam-policy-binding sonar-token \
  --member "serviceAccount:<project-number>@cloudbuild.gserviceaccount.com" \
  --role "roles/secretmanager.secretAccessor"
```

## Parallel Build Steps

Jenkins uses parallel stages. Cloud Build runs steps sequentially by default but supports parallel execution with the `waitFor` field:

```yaml
# Run lint and test in parallel, then build
steps:
  # Install dependencies first
  - id: 'install'
    name: 'node:18'
    entrypoint: 'npm'
    args: ['ci']

  # Lint and test run in parallel after install
  - id: 'lint'
    name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'lint']
    waitFor: ['install']  # Only depends on install step

  - id: 'test'
    name: 'node:18'
    entrypoint: 'npm'
    args: ['test']
    waitFor: ['install']  # Also only depends on install step

  # Build runs after both lint and test pass
  - id: 'build'
    name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:$BUILD_ID', '.']
    waitFor: ['lint', 'test']  # Depends on both lint and test
```

## Caching Build Dependencies

Jenkins caches dependencies on the build agent's disk. Cloud Build needs explicit caching through Cloud Storage:

```yaml
steps:
  # Pull cached node_modules from Cloud Storage
  - name: 'gcr.io/cloud-builders/gsutil'
    args: ['-m', 'rsync', '-r', 'gs://my-build-cache/node_modules/', 'node_modules/']
    allowFailure: true  # First build will not have a cache

  # Install dependencies (fast with cache)
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['ci']

  # Push updated node_modules to cache
  - name: 'gcr.io/cloud-builders/gsutil'
    args: ['-m', 'rsync', '-r', 'node_modules/', 'gs://my-build-cache/node_modules/']
```

## Migration Strategy

Do not try to migrate all Jenkins jobs at once. Take an incremental approach:

1. **Start with the simplest pipeline.** Pick a build-only job with no deployment. Convert it to Cloud Build and run both in parallel for a week.

2. **Migrate test pipelines next.** Jobs that run tests on pull requests are low risk - they do not deploy anything.

3. **Move deployment pipelines last.** These have the highest risk, so migrate them only after you are confident with Cloud Build.

4. **Keep Jenkins running during migration.** Run both systems side by side until all pipelines are migrated and validated.

```bash
# Run a manual Cloud Build to test your translated pipeline
gcloud builds submit --config cloudbuild.yaml .

# Check build logs
gcloud builds list --limit 5
gcloud builds log <build-id>
```

## Handling Things Cloud Build Does Not Support

Some Jenkins features need workarounds:

- **Build parameters with UI.** Cloud Build triggers support substitution variables but there is no interactive parameter UI. Use the gcloud CLI or API for parameterized builds.
- **Build promotion between environments.** Use separate triggers for each environment or Cloud Deploy for managed delivery pipelines.
- **Complex approval workflows.** Use Cloud Deploy with approval gates or integrate with an external workflow tool.
- **Shared libraries.** Jenkins shared libraries become shared Cloud Build configurations or custom builder images.

## Cost Comparison

Jenkins costs:
- Server infrastructure (VM or physical)
- Jenkins administrator time
- Build agent scaling overhead

Cloud Build costs:
- $0.003 per build-minute for the default machine type
- First 120 build-minutes per day are free
- No cost when idle

For most teams, Cloud Build is cheaper because you are not paying for idle build servers. The breakeven point depends on your build volume, but the operational savings from not managing Jenkins often outweigh any compute cost differences.

The migration from Jenkins to Cloud Build is as much about changing habits as changing tools. The serverless, container-based model is different from Jenkins, but once your team adjusts, the reduced operational burden makes it worth the effort.
