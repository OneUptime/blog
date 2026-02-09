# How to Implement CDK8s Pipelines That Generate and Apply Kubernetes Manifests in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CDK8s, CI/CD, Kubernetes

Description: Learn how to build CI/CD pipelines that use CDK8s to programmatically generate Kubernetes manifests and automatically apply them to clusters, enabling type-safe infrastructure deployment workflows.

---

CDK8s generates Kubernetes manifests from code. Integrating this into CI/CD pipelines creates automated deployment workflows that validate configurations at build time and apply them to clusters automatically. This combines the safety of compiled code with the speed of continuous deployment.

This guide shows you how to build complete CDK8s pipelines in GitHub Actions, GitLab CI, and Jenkins.

## Understanding the CDK8s Pipeline Pattern

A CDK8s pipeline has three stages: synthesis, validation, and application. Synthesis runs your code to generate YAML. Validation checks the YAML against schemas and policies. Application deploys to Kubernetes.

Unlike traditional approaches that store YAML in Git, you store code. The pipeline generates fresh manifests on every run, ensuring consistency.

## Setting Up a GitHub Actions Pipeline

Create a workflow that synthesizes and deploys:

```yaml
# .github/workflows/deploy.yml
name: Deploy Kubernetes Resources

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'
      - '.github/workflows/deploy.yml'
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  CLUSTER_NAME: production-cluster

jobs:
  synthesize:
    name: Generate Manifests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: infrastructure/package-lock.json

      - name: Install dependencies
        working-directory: infrastructure
        run: npm ci

      - name: Run tests
        working-directory: infrastructure
        run: npm test

      - name: Synthesize manifests
        working-directory: infrastructure
        run: npm run synth

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: manifests
          path: infrastructure/dist/
          retention-days: 30

  validate:
    name: Validate Manifests
    needs: synthesize
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: manifests
          path: manifests/

      - name: Setup kubeconform
        run: |
          curl -L https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | tar xz
          sudo mv kubeconform /usr/local/bin/

      - name: Validate Kubernetes schemas
        run: |
          kubeconform -summary -output json manifests/*.yaml

      - name: Setup kubeval
        run: |
          wget https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz
          tar xf kubeval-linux-amd64.tar.gz
          sudo mv kubeval /usr/local/bin

      - name: Validate with kubeval
        run: |
          kubeval --strict manifests/*.yaml

  deploy-staging:
    name: Deploy to Staging
    needs: validate
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: manifests
          path: manifests/

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name staging-cluster

      - name: Deploy to staging
        run: |
          kubectl apply -f manifests/ --dry-run=client
          kubectl apply -f manifests/
          kubectl rollout status deployment --namespace=staging --timeout=5m

  deploy-production:
    name: Deploy to Production
    needs: validate
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: manifests
          path: manifests/

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name ${{ env.CLUSTER_NAME }}

      - name: Dry run deployment
        run: |
          kubectl apply -f manifests/ --dry-run=server

      - name: Deploy to production
        run: |
          kubectl apply -f manifests/
          kubectl rollout status deployment --namespace=production --timeout=10m

      - name: Verify deployment
        run: |
          kubectl get pods --namespace=production
          kubectl get services --namespace=production
```

This pipeline runs tests, generates manifests, validates them, and deploys to staging on PRs and production on merges.

## Building a GitLab CI Pipeline

Create a GitLab CI configuration:

```yaml
# .gitlab-ci.yml
variables:
  NODE_VERSION: "18"
  DOCKER_IMAGE: node:18-alpine
  CLUSTER_NAME: production-cluster

stages:
  - build
  - validate
  - deploy-staging
  - deploy-production

.node-base:
  image: $DOCKER_IMAGE
  before_script:
    - cd infrastructure
    - npm ci
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - infrastructure/node_modules/

build:
  extends: .node-base
  stage: build
  script:
    - npm test
    - npm run synth
    - ls -la dist/
  artifacts:
    paths:
      - infrastructure/dist/
    expire_in: 1 week

validate-schema:
  stage: validate
  image: alpine:latest
  dependencies:
    - build
  before_script:
    - apk add --no-cache curl
    - curl -L https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | tar xz
    - mv kubeconform /usr/local/bin/
  script:
    - kubeconform -summary infrastructure/dist/*.yaml

validate-policies:
  stage: validate
  image: openpolicyagent/opa:latest
  dependencies:
    - build
  script:
    - opa test policies/
    - for file in infrastructure/dist/*.yaml; do
        opa eval -d policies/ -i $file "data.kubernetes.admission.deny" | grep -q "\[\]" || exit 1;
      done

deploy-staging:
  stage: deploy-staging
  image: bitnami/kubectl:latest
  dependencies:
    - build
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - merge_requests
  before_script:
    - mkdir -p ~/.kube
    - echo "$KUBE_CONFIG_STAGING" | base64 -d > ~/.kube/config
  script:
    - kubectl apply -f infrastructure/dist/ --dry-run=client
    - kubectl apply -f infrastructure/dist/
    - kubectl rollout status deployment --namespace=staging --timeout=5m
    - kubectl get pods --namespace=staging

deploy-production:
  stage: deploy-production
  image: bitnami/kubectl:latest
  dependencies:
    - build
  environment:
    name: production
    url: https://production.example.com
  only:
    - main
  when: manual
  before_script:
    - mkdir -p ~/.kube
    - echo "$KUBE_CONFIG_PRODUCTION" | base64 -d > ~/.kube/config
  script:
    - echo "Deploying to production cluster $CLUSTER_NAME"
    - kubectl apply -f infrastructure/dist/ --dry-run=server
    - kubectl apply -f infrastructure/dist/
    - kubectl rollout status deployment --namespace=production --timeout=10m
    - kubectl get all --namespace=production
  after_script:
    - echo "Production deployment complete"
    - kubectl describe deployment --namespace=production
```

## Implementing a Jenkins Pipeline

Create a Jenkinsfile:

```groovy
// Jenkinsfile
pipeline {
    agent {
        docker {
            image 'node:18-alpine'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        CLUSTER_NAME = 'production-cluster'
        AWS_REGION = 'us-west-2'
        KUBECONFIG = credentials('kubeconfig-production')
    }

    stages {
        stage('Install Dependencies') {
            steps {
                dir('infrastructure') {
                    sh 'npm ci'
                }
            }
        }

        stage('Run Tests') {
            steps {
                dir('infrastructure') {
                    sh 'npm test'
                    junit 'test-results/**/*.xml'
                }
            }
        }

        stage('Synthesize Manifests') {
            steps {
                dir('infrastructure') {
                    sh 'npm run synth'
                    archiveArtifacts artifacts: 'dist/*.yaml', fingerprint: true
                }
            }
        }

        stage('Validate Manifests') {
            parallel {
                stage('Schema Validation') {
                    agent {
                        docker {
                            image 'alpine:latest'
                        }
                    }
                    steps {
                        sh '''
                            apk add --no-cache curl
                            curl -L https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | tar xz
                            mv kubeconform /usr/local/bin/
                            kubeconform -summary infrastructure/dist/*.yaml
                        '''
                    }
                }

                stage('Policy Validation') {
                    agent {
                        docker {
                            image 'openpolicyagent/opa:latest'
                        }
                    }
                    steps {
                        sh '''
                            opa test policies/
                            for file in infrastructure/dist/*.yaml; do
                                opa eval -d policies/ -i $file "data.kubernetes.admission.deny"
                            done
                        '''
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'PR-*'
            }
            agent {
                docker {
                    image 'bitnami/kubectl:latest'
                }
            }
            steps {
                withCredentials([file(credentialsId: 'kubeconfig-staging', variable: 'KUBECONFIG')]) {
                    sh '''
                        kubectl apply -f infrastructure/dist/ --dry-run=client
                        kubectl apply -f infrastructure/dist/
                        kubectl rollout status deployment --namespace=staging --timeout=5m
                    '''
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            agent {
                docker {
                    image 'bitnami/kubectl:latest'
                }
            }
            steps {
                timeout(time: 30, unit: 'MINUTES') {
                    input message: 'Deploy to production?', ok: 'Deploy'
                }

                withCredentials([file(credentialsId: 'kubeconfig-production', variable: 'KUBECONFIG')]) {
                    sh '''
                        kubectl apply -f infrastructure/dist/ --dry-run=server
                        kubectl apply -f infrastructure/dist/
                        kubectl rollout status deployment --namespace=production --timeout=10m
                        kubectl get all --namespace=production
                    '''
                }
            }
            post {
                success {
                    slackSend(
                        color: 'good',
                        message: "Production deployment successful: ${env.JOB_NAME} ${env.BUILD_NUMBER}"
                    )
                }
                failure {
                    slackSend(
                        color: 'danger',
                        message: "Production deployment failed: ${env.JOB_NAME} ${env.BUILD_NUMBER}"
                    )
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
```

## Adding Policy Validation with OPA

Create Open Policy Agent policies:

```rego
# policies/required-labels.rego
package kubernetes.admission

deny[msg] {
    input.kind == "Deployment"
    not input.metadata.labels["app"]
    msg := "Deployments must have an 'app' label"
}

deny[msg] {
    input.kind == "Deployment"
    not input.metadata.labels["environment"]
    msg := "Deployments must have an 'environment' label"
}

deny[msg] {
    input.kind == "Deployment"
    not input.metadata.labels["owner"]
    msg := "Deployments must have an 'owner' label"
}
```

```rego
# policies/resource-limits.rego
package kubernetes.admission

deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.limits
    msg := sprintf("Container %s must have resource limits", [container.name])
}

deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.requests
    msg := sprintf("Container %s must have resource requests", [container.name])
}
```

## Implementing Multi-Environment Synthesis

Generate different manifests per environment:

```typescript
// infrastructure/index.ts
import * as cdk8s from "cdk8s";
import { App } from "./app";

const app = new cdk8s.App();

const environment = process.env.ENVIRONMENT || "development";

new App(app, `app-${environment}`, {
  environment: environment as "development" | "staging" | "production",
  namespace: environment,
  replicas: environment === "production" ? 5 : 2,
  resources: {
    cpu: environment === "production" ? "500m" : "200m",
    memory: environment === "production" ? "512Mi" : "256Mi"
  }
});

app.synth();
```

Update pipeline to generate per environment:

```yaml
# .github/workflows/deploy.yml (excerpt)
synthesize-staging:
  name: Generate Staging Manifests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - name: Synthesize
      working-directory: infrastructure
      env:
        ENVIRONMENT: staging
      run: |
        npm ci
        npm run synth
    - uses: actions/upload-artifact@v3
      with:
        name: manifests-staging
        path: infrastructure/dist/

synthesize-production:
  name: Generate Production Manifests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - name: Synthesize
      working-directory: infrastructure
      env:
        ENVIRONMENT: production
      run: |
        npm ci
        npm run synth
    - uses: actions/upload-artifact@v3
      with:
        name: manifests-production
        path: infrastructure/dist/
```

## Adding Rollback Capabilities

Implement automatic rollback on failure:

```yaml
# .github/workflows/deploy.yml (excerpt)
deploy-production:
  name: Deploy to Production
  runs-on: ubuntu-latest
  steps:
    - name: Download artifacts
      uses: actions/download-artifact@v3
      with:
        name: manifests-production
        path: manifests/

    - name: Configure kubectl
      run: |
        aws eks update-kubeconfig --name production-cluster

    - name: Save current state
      run: |
        kubectl get deployment --namespace=production -o yaml > deployment-backup.yaml

    - name: Deploy
      id: deploy
      continue-on-error: true
      run: |
        kubectl apply -f manifests/
        kubectl rollout status deployment --namespace=production --timeout=10m

    - name: Verify deployment
      id: verify
      if: steps.deploy.outcome == 'success'
      run: |
        sleep 30
        kubectl get pods --namespace=production
        # Add health check logic here

    - name: Rollback on failure
      if: steps.deploy.outcome == 'failure' || steps.verify.outcome == 'failure'
      run: |
        echo "Deployment failed, rolling back..."
        kubectl apply -f deployment-backup.yaml
        kubectl rollout status deployment --namespace=production

    - name: Fail job if deployment failed
      if: steps.deploy.outcome == 'failure' || steps.verify.outcome == 'failure'
      run: exit 1
```

## Summary

CDK8s pipelines combine type-safe infrastructure code with automated deployment workflows. By generating manifests in CI/CD rather than storing them, you ensure consistency and catch errors early. Validation stages with schema checks and policy enforcement add safety, while multi-environment synthesis adapts configurations automatically. This approach scales from simple deployments to complex multi-cluster systems with rollback capabilities and approval gates.
