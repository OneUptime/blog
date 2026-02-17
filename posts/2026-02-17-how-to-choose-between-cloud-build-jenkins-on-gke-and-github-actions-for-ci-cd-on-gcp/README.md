# How to Choose Between Cloud Build Jenkins on GKE and GitHub Actions for CI/CD on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Jenkins, GitHub Actions, CI/CD, DevOps

Description: A practical comparison of Cloud Build, Jenkins on GKE, and GitHub Actions for building CI/CD pipelines that deploy to Google Cloud.

---

Setting up CI/CD for GCP workloads is a decision that sticks with you for a while. Switching CI/CD platforms mid-project is doable but disruptive. Google Cloud Build, Jenkins on GKE, and GitHub Actions are the three most common options for teams deploying to GCP. Each has a different philosophy and operational model. Let me walk through what makes each one a better or worse fit.

## The Three Options

**Cloud Build** is Google's native CI/CD service. It is serverless - you define build steps, submit them, and Cloud Build runs them in isolated containers. No servers to manage.

**Jenkins on GKE** is self-hosted Jenkins running on Google Kubernetes Engine. You manage the Jenkins controller, configure agents, and maintain the infrastructure. In return you get unlimited customization.

**GitHub Actions** is GitHub's CI/CD platform. If your code is on GitHub, it provides tight integration with your repository. It runs workflows on GitHub-hosted or self-hosted runners.

## Feature Comparison

| Feature | Cloud Build | Jenkins on GKE | GitHub Actions |
|---------|------------|----------------|----------------|
| Infrastructure | Serverless | Self-managed (GKE) | GitHub-hosted or self-hosted |
| Configuration | YAML (cloudbuild.yaml) | Groovy (Jenkinsfile) | YAML (.github/workflows/) |
| Trigger sources | Cloud Source Repos, GitHub, Bitbucket | Any (plugins) | GitHub events |
| Build environment | Docker containers | Docker, VMs, pods | Docker containers |
| Parallel builds | Yes | Yes (with agents) | Yes (matrix builds) |
| Artifact storage | Artifact Registry, GCS | Any (plugins) | GitHub Artifacts, GCS |
| Secrets | Secret Manager integration | Credentials plugin | GitHub Secrets, GCP auth |
| Cost | Pay per build-minute | GKE cluster cost | Free tier + per-minute |
| Max build time | 24 hours | Unlimited | 6 hours (GitHub-hosted) |
| Private networking | Yes (private pools) | Yes (GKE VPC) | Self-hosted runners |

## Cloud Build - The Google-Native Choice

Cloud Build is serverless and integrates natively with everything on GCP. You write a `cloudbuild.yaml` file that describes build steps, and each step runs in a Docker container.

### When to Use Cloud Build

- Your deployments target GCP services (Cloud Run, GKE, App Engine, Cloud Functions)
- You want zero infrastructure management for CI/CD
- You need private network access to GCP resources during builds
- Your team is already invested in the GCP ecosystem

Here is a typical Cloud Build configuration for building and deploying a Cloud Run service:

```yaml
# cloudbuild.yaml - Build, test, and deploy to Cloud Run
steps:
  # Step 1: Run unit tests
  - name: 'python:3.11'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install -r requirements.txt
        pip install pytest
        pytest tests/ -v

  # Step 2: Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA', '.']

  # Step 3: Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA']

  # Step 4: Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'my-app'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'

# Store the image in Artifact Registry
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'

# Build options
options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'  # Faster builds with more CPU
```

Set up a trigger to run this on every push:

```bash
# Create a trigger that builds on push to main
gcloud builds triggers create github \
    --repo-name=my-repo \
    --repo-owner=my-org \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml
```

### Cloud Build Strengths

- Native Secret Manager integration for accessing secrets during builds
- Private pools for builds that need VPC access
- Built-in support for deploying to all GCP compute services
- No infrastructure to manage or pay for when idle
- Integrated with Binary Authorization for supply chain security

### Cloud Build Limitations

- The YAML configuration is less flexible than Jenkinsfile scripting
- Limited community of shared build steps compared to GitHub Actions marketplace
- Debugging failed builds can be harder (no SSH into build environment)
- Tight coupling to GCP ecosystem

## Jenkins on GKE - Maximum Flexibility

Jenkins is the old guard of CI/CD. Running it on GKE gives you the full power of Jenkins with Kubernetes-based scaling for build agents.

### When to Use Jenkins on GKE

- You have existing Jenkins pipelines and expertise
- You need complex build logic that benefits from Groovy scripting
- You require specific build environments or tools not available elsewhere
- You need long-running builds (more than 24 hours)
- Multi-cloud or hybrid deployments

```yaml
# Jenkins Helm values for GKE deployment
# Install with: helm install jenkins jenkins/jenkins -f values.yaml
controller:
  image: jenkins/jenkins
  tag: lts
  resources:
    requests:
      cpu: "1"
      memory: "2Gi"
  serviceType: LoadBalancer

  # Install essential plugins
  installPlugins:
    - kubernetes:latest
    - google-oauth-plugin:latest
    - google-storage-plugin:latest
    - workflow-aggregator:latest
    - git:latest

agent:
  # Use Kubernetes pods as build agents
  enabled: true
  image: jenkins/inbound-agent
  tag: latest
  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "2"
      memory: "2Gi"
```

A typical Jenkinsfile for deploying to GKE:

```groovy
// Jenkinsfile - Build and deploy to GKE
pipeline {
    agent {
        kubernetes {
            // Build agent runs as a pod in GKE
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: docker
    image: docker:latest
    command: ['cat']
    tty: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
  - name: gcloud
    image: google/cloud-sdk:latest
    command: ['cat']
    tty: true
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
"""
        }
    }

    stages {
        stage('Test') {
            steps {
                sh 'pip install -r requirements.txt && pytest tests/'
            }
        }

        stage('Build') {
            steps {
                container('docker') {
                    sh "docker build -t gcr.io/${PROJECT_ID}/my-app:${BUILD_NUMBER} ."
                    sh "docker push gcr.io/${PROJECT_ID}/my-app:${BUILD_NUMBER}"
                }
            }
        }

        stage('Deploy') {
            steps {
                container('gcloud') {
                    sh """
                        gcloud container clusters get-credentials my-cluster \
                            --zone us-central1-a
                        kubectl set image deployment/my-app \
                            my-app=gcr.io/${PROJECT_ID}/my-app:${BUILD_NUMBER}
                    """
                }
            }
        }
    }
}
```

### Jenkins Strengths

- Over 1,800 plugins for virtually any integration
- Groovy scripting gives unlimited pipeline flexibility
- Can build anything - no constraints on tools or runtimes
- Mature ecosystem with extensive documentation
- Full control over build environment

### Jenkins Limitations

- You manage the infrastructure (Jenkins controller, agents, GKE cluster)
- Security patches and updates are your responsibility
- Plugin conflicts and upgrade issues are common
- Initial setup is more complex
- Costs money even when no builds are running (GKE cluster)

## GitHub Actions - Tight GitHub Integration

If your code lives on GitHub, GitHub Actions provides the smoothest CI/CD experience. Workflows are defined in YAML files in your repository, and they trigger on GitHub events.

### When to Use GitHub Actions

- Your code is on GitHub
- You want CI/CD configuration to live alongside your code
- You need the GitHub Actions marketplace for pre-built actions
- You want matrix builds for testing across multiple environments
- Your team is already familiar with GitHub workflows

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy to Cloud Run

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies and run tests
        run: |
          pip install -r requirements.txt
          pytest tests/ -v

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for Workload Identity Federation

    steps:
      - uses: actions/checkout@v4

      # Authenticate to GCP using Workload Identity Federation
      # No service account keys needed
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/123456/locations/global/workloadIdentityPools/github/providers/my-repo'
          service_account: 'deploy-sa@my-project.iam.gserviceaccount.com'

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      # Build and deploy to Cloud Run in one step
      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: my-app
          region: us-central1
          source: .
```

### GitHub Actions Strengths

- Huge marketplace of pre-built actions
- Excellent for open-source projects (free for public repos)
- Matrix builds make multi-environment testing easy
- Workflow files live in the repo - easy to review and version
- Workload Identity Federation means no service account key management

### GitHub Actions Limitations

- 6-hour maximum job duration on GitHub-hosted runners
- GitHub-hosted runners cannot access private GCP networks directly
- Self-hosted runners require your own infrastructure
- Costs can add up for private repos with heavy CI usage
- Vendor lock-in to GitHub

## Cost Comparison

For a team running 100 builds per day, each taking 10 minutes:

| Platform | Estimated Monthly Cost |
|----------|----------------------|
| Cloud Build | ~$50-100 (pay per build-minute) |
| Jenkins on GKE | ~$200-400 (cluster always running) |
| GitHub Actions | ~$0-80 (2,000 free minutes, then $0.008/min) |

GitHub Actions has a generous free tier. Cloud Build is pay-as-you-go with no idle costs. Jenkins costs the most due to the always-on GKE cluster, though you can use autoscaling to reduce costs during quiet periods.

## My Recommendation

For most teams deploying to GCP with code on GitHub: **use GitHub Actions**. The Workload Identity Federation integration is secure, the marketplace has pre-built actions for every GCP service, and the developer experience is hard to beat.

If you are deeply invested in GCP and need features like private network access during builds or Binary Authorization: **use Cloud Build**.

If you have complex legacy pipelines, need unlimited flexibility, or are running multi-cloud deployments: **use Jenkins on GKE**, but be prepared for the operational overhead.
