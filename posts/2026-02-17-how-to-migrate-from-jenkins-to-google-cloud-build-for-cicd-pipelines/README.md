# How to Migrate from Jenkins to Google Cloud Build for CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Jenkins, CI/CD, Migration, DevOps, Pipeline

Description: A practical guide to migrating your CI/CD pipelines from Jenkins to Google Cloud Build, covering concept mapping, configuration translation, and common pitfalls.

---

Jenkins has been the workhorse of CI/CD for years, but maintaining Jenkins servers, managing plugins, and dealing with security patches gets old fast. Google Cloud Build is a fully managed alternative that eliminates the server management overhead while giving you a solid CI/CD platform.

I have migrated several teams from Jenkins to Cloud Build, and the process is not as painful as you might expect. The hardest part is usually the mental model shift rather than the technical work. Let me walk through how to approach the migration.

## Concept Mapping: Jenkins to Cloud Build

Before diving into configuration files, it helps to understand how Jenkins concepts map to Cloud Build:

| Jenkins Concept | Cloud Build Equivalent |
|---|---|
| Jenkinsfile | cloudbuild.yaml |
| Pipeline stages | Build steps |
| Jenkins agents/nodes | Cloud Build workers (managed) |
| Jenkins plugins | Cloud Builder images |
| Freestyle job | Manual build submission |
| Multibranch pipeline | Build triggers with branch patterns |
| Jenkins credentials | Secret Manager |
| Build artifacts | Cloud Storage / Artifact Registry |
| Jenkins workspace | /workspace volume |
| Environment variables | Substitutions |

## Translating a Jenkinsfile to cloudbuild.yaml

Let us start with a typical Jenkins pipeline and convert it step by step.

Here is a common Jenkinsfile:

```groovy
// Jenkinsfile - Original Jenkins pipeline
pipeline {
    agent {
        docker { image 'node:18' }
    }
    environment {
        DEPLOY_ENV = 'production'
    }
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
        stage('Docker Build') {
            steps {
                sh "docker build -t my-app:${env.BUILD_NUMBER} ."
                sh "docker push gcr.io/my-project/my-app:${env.BUILD_NUMBER}"
            }
        }
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh 'kubectl apply -f k8s/'
            }
        }
    }
    post {
        failure {
            slackSend channel: '#builds', message: "Build failed!"
        }
    }
}
```

Here is the equivalent cloudbuild.yaml:

```yaml
# cloudbuild.yaml - Migrated from Jenkins
substitutions:
  _DEPLOY_ENV: 'production'

steps:
  # Install dependencies
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['ci']

  # Run tests
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['test']

  # Build the application
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'build']

  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/my-app:$BUILD_ID'
      - '.'

  # Push Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/my-app:$BUILD_ID'

  # Deploy to Kubernetes
  - name: 'gcr.io/cloud-builders/kubectl'
    args: ['apply', '-f', 'k8s/']
    env:
      - 'CLOUDSDK_COMPUTE_ZONE=us-central1-a'
      - 'CLOUDSDK_CONTAINER_CLUSTER=my-cluster'

images:
  - 'gcr.io/$PROJECT_ID/my-app:$BUILD_ID'
```

The conditional deployment (only on main branch) is handled by the trigger configuration rather than in the build config itself.

## Migrating Jenkins Credentials to Secret Manager

Jenkins stores credentials in its own credential store. In GCP, you use Secret Manager instead.

First, create the secrets:

```bash
# Store credentials in Secret Manager
echo -n "my-api-key-value" | gcloud secrets create api-key --data-file=-
echo -n "my-db-password" | gcloud secrets create db-password --data-file=-
```

Then reference them in your cloudbuild.yaml:

```yaml
# cloudbuild.yaml - Using Secret Manager for credentials
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:latest', '.']
    secretEnv: ['API_KEY', 'DB_PASSWORD']

availableSecrets:
  secretManager:
    - versionName: 'projects/$PROJECT_ID/secrets/api-key/versions/latest'
      env: 'API_KEY'
    - versionName: 'projects/$PROJECT_ID/secrets/db-password/versions/latest'
      env: 'DB_PASSWORD'
```

## Migrating Jenkins Plugins

Jenkins plugin functionality is replaced by Cloud Builder images and GCP services. Here are some common mappings:

**Docker Pipeline Plugin** - Built into Cloud Build. Use the `gcr.io/cloud-builders/docker` builder.

**Slack Notification Plugin** - Use Pub/Sub with a Cloud Function to send Slack messages (see the separate post on Cloud Build notifications).

**Git Plugin** - Cloud Build handles git checkout automatically when triggered by a repository event.

**JUnit Plugin** - No direct equivalent, but you can upload test results to Cloud Storage and view them there.

**SonarQube Plugin** - Run the SonarQube scanner as a build step:

```yaml
# cloudbuild.yaml - SonarQube analysis step
steps:
  - name: 'sonarsource/sonar-scanner-cli'
    args:
      - '-Dsonar.projectKey=my-app'
      - '-Dsonar.host.url=https://sonar.example.com'
    secretEnv: ['SONAR_TOKEN']
```

## Handling Parallel Stages

Jenkins parallel stages translate to Cloud Build's `waitFor` mechanism:

```groovy
// Jenkinsfile - Parallel stages
stage('Tests') {
    parallel {
        stage('Unit Tests') {
            steps { sh 'npm run test:unit' }
        }
        stage('Integration Tests') {
            steps { sh 'npm run test:integration' }
        }
        stage('Lint') {
            steps { sh 'npm run lint' }
        }
    }
}
```

Cloud Build equivalent:

```yaml
# cloudbuild.yaml - Parallel steps using waitFor
steps:
  # Install dependencies first
  - id: 'install'
    name: 'node:18'
    entrypoint: 'npm'
    args: ['ci']

  # These three steps run in parallel after install completes
  - id: 'unit-tests'
    name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'test:unit']
    waitFor: ['install']

  - id: 'integration-tests'
    name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'test:integration']
    waitFor: ['install']

  - id: 'lint'
    name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'lint']
    waitFor: ['install']

  # This step waits for all parallel steps to complete
  - id: 'build'
    name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'build']
    waitFor: ['unit-tests', 'integration-tests', 'lint']
```

## Migrating Build Parameters

Jenkins parameterized builds map to Cloud Build substitutions:

```yaml
# cloudbuild.yaml - Substitutions (equivalent to Jenkins parameters)
substitutions:
  _DEPLOY_ENV: 'staging'   # Default value
  _IMAGE_TAG: 'latest'     # Default value
  _REPLICAS: '3'           # Default value

steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:${_IMAGE_TAG}', '.']

  - name: 'gcr.io/cloud-builders/kubectl'
    args: ['scale', 'deployment/my-app', '--replicas=${_REPLICAS}']
    env:
      - 'CLOUDSDK_COMPUTE_ZONE=us-central1-a'
      - 'CLOUDSDK_CONTAINER_CLUSTER=${_DEPLOY_ENV}-cluster'
```

Override substitutions when triggering manually:

```bash
# Trigger a build with custom substitution values
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_DEPLOY_ENV=production,_IMAGE_TAG=v1.2.3,_REPLICAS=5
```

## Migration Strategy

Do not try to migrate everything at once. Here is a phased approach that works:

**Phase 1 - Run in parallel.** Set up Cloud Build alongside Jenkins. Start with a non-critical pipeline and get it working in Cloud Build while Jenkins continues to handle production deployments.

**Phase 2 - Migrate one pipeline at a time.** Move pipelines over one by one, starting with the simplest ones. Validate that each pipeline works correctly in Cloud Build before decommissioning the Jenkins job.

**Phase 3 - Handle the edge cases.** Some Jenkins jobs might use plugins or features that do not have a direct Cloud Build equivalent. Figure out alternatives for these - usually a Cloud Function, a custom builder image, or a different GCP service.

**Phase 4 - Decommission Jenkins.** Once all pipelines are running on Cloud Build and have been stable for a few weeks, shut down the Jenkins server.

## Things You Will Miss (and Workarounds)

A few things Jenkins does that Cloud Build handles differently:

1. **Build dashboard**: Cloud Build has a console UI, but it is not as feature-rich as Jenkins Blue Ocean. Cloud Monitoring dashboards can fill some of this gap.

2. **Manual approval gates**: Cloud Build does not have built-in approval steps. Use Cloud Deploy for this, or trigger production builds manually.

3. **Cron-based builds**: Use Cloud Scheduler to trigger builds on a schedule.

4. **Build queue visualization**: Cloud Build does not show a queue. Builds just run when workers are available.

## Wrapping Up

Migrating from Jenkins to Cloud Build eliminates server management and simplifies your CI/CD infrastructure. The key is mapping Jenkins concepts to their Cloud Build equivalents and migrating incrementally. Start with simple pipelines, validate they work, and gradually move everything over. The end result is a CI/CD system that scales automatically, requires no maintenance, and integrates natively with the rest of GCP.
