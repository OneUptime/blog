# How to Migrate from Jenkins Deployment to ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Jenkins, Migration

Description: Learn how to migrate your Kubernetes deployments from Jenkins pipelines to ArgoCD GitOps with a practical guide covering pipeline decomposition and cutover strategy.

---

Jenkins has been the workhorse of CI/CD for over a decade. Many organizations use Jenkins not just for building and testing, but also for deploying to Kubernetes. The problem is that Jenkins was designed for CI, not CD. Using it for deployments means storing kubeconfig credentials in Jenkins, running imperative `kubectl apply` or `helm install` commands, and losing all the benefits of declarative GitOps.

Migrating from Jenkins deployments to ArgoCD lets you separate your CI pipeline (build and test) from your CD pipeline (deploy) while gaining drift detection, self-healing, and a clear audit trail.

## The Jenkins Deployment Problem

A typical Jenkins-based Kubernetes deployment looks like this:

```groovy
// Jenkinsfile - typical deployment pipeline
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'docker build -t myorg/app:${BUILD_NUMBER} .'
                sh 'docker push myorg/app:${BUILD_NUMBER}'
            }
        }
        stage('Deploy to Staging') {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig-staging', variable: 'KUBECONFIG')]) {
                    sh "kubectl set image deployment/app app=myorg/app:${BUILD_NUMBER} -n staging"
                }
            }
        }
        stage('Deploy to Production') {
            when { branch 'main' }
            input { message "Deploy to production?" }
            steps {
                withCredentials([file(credentialsId: 'kubeconfig-prod', variable: 'KUBECONFIG')]) {
                    sh "kubectl set image deployment/app app=myorg/app:${BUILD_NUMBER} -n production"
                }
            }
        }
    }
}
```

The problems with this approach: Jenkins holds cluster credentials, deployment state is only in Jenkins build logs, there is no drift detection, and if someone manually changes the cluster, Jenkins does not know or care.

## Target Architecture

After migration, Jenkins handles CI (build and test) and ArgoCD handles CD (deploy).

```mermaid
flowchart LR
    subgraph CI - Jenkins
        A[Code Push] --> B[Build]
        B --> C[Test]
        C --> D[Push Image]
        D --> E[Update GitOps Repo]
    end
    subgraph CD - ArgoCD
        E --> F[Detect Change]
        F --> G[Sync to Staging]
        G --> H[Health Check]
        H --> I[Promote to Production]
    end
```

## Step 1: Inventory Jenkins Deployment Jobs

Document all Jenkins jobs that deploy to Kubernetes.

```bash
# Check Jenkins for deployment jobs
# Look for jobs that:
# - Use kubectl, helm, or kustomize
# - Have kubeconfig credentials
# - Target Kubernetes namespaces

# Common patterns to search for in Jenkinsfiles:
# kubectl apply
# kubectl set image
# helm install / helm upgrade
# kustomize build | kubectl apply
```

Create a migration tracker.

```yaml
jenkins_deployment_jobs:
  - job: deploy-api
    type: freestyle
    deploys_to: [staging, production]
    method: kubectl set image
    frequency: daily
    priority: high
    migrated: false
  - job: deploy-frontend
    type: pipeline
    deploys_to: [staging, production]
    method: helm upgrade
    frequency: weekly
    priority: medium
    migrated: false
  - job: deploy-worker
    type: pipeline
    deploys_to: [production]
    method: kubectl apply
    frequency: bi-weekly
    priority: medium
    migrated: false
```

## Step 2: Create the GitOps Repository

Set up the repository that ArgoCD will use.

```text
gitops-repo/
  base/
    api/
      deployment.yaml
      service.yaml
      configmap.yaml
    frontend/
      deployment.yaml
      service.yaml
    worker/
      deployment.yaml
  overlays/
    staging/
      api/
        kustomization.yaml
      frontend/
        kustomization.yaml
    production/
      api/
        kustomization.yaml
      frontend/
        kustomization.yaml
```

Extract current manifests from whatever Jenkins uses.

```bash
# If Jenkins uses raw YAML files, copy them
# If Jenkins uses Helm, export the values
helm get values api-release -n production > api-values.yaml
helm get manifest api-release -n production | kubectl neat > api-manifests.yaml

# If Jenkins uses kubectl set image, get the deployment spec
kubectl get deployment api -n production -o yaml | kubectl neat > api-deployment.yaml
```

## Step 3: Modify Jenkins to Update Git Instead of Kubectl

This is the critical change. Jenkins stops deploying directly and instead updates the GitOps repository.

```groovy
// Jenkinsfile - modified for GitOps
pipeline {
    agent any
    environment {
        GITOPS_REPO = 'https://github.com/myorg/gitops-repo.git'
        IMAGE_TAG = "${BUILD_NUMBER}"
    }
    stages {
        stage('Build') {
            steps {
                sh 'docker build -t registry.myorg.com/api:${IMAGE_TAG} .'
                sh 'docker push registry.myorg.com/api:${IMAGE_TAG}'
            }
        }
        stage('Test') {
            steps {
                sh 'docker run registry.myorg.com/api:${IMAGE_TAG} npm test'
            }
        }
        stage('Update GitOps Repo') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-token',
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_TOKEN'
                )]) {
                    sh """
                        git clone https://${GIT_USER}:${GIT_TOKEN}@github.com/myorg/gitops-repo.git
                        cd gitops-repo

                        # Update image tag in the staging overlay
                        cd overlays/staging/api
                        kustomize edit set image registry.myorg.com/api=registry.myorg.com/api:${IMAGE_TAG}

                        git add .
                        git commit -m "deploy: api ${IMAGE_TAG} to staging"
                        git push
                    """
                }
            }
        }
    }
}
```

Now Jenkins builds the image and updates Git. ArgoCD detects the Git change and deploys to staging automatically.

## Step 4: Set Up ArgoCD Applications

Create ArgoCD Applications for each environment.

```yaml
# staging-api.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-staging
  namespace: argocd
spec:
  project: staging
  source:
    repoURL: https://github.com/myorg/gitops-repo.git
    path: overlays/staging/api
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: staging
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
---
# production-api.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-production
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/myorg/gitops-repo.git
    path: overlays/production/api
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  # Manual sync for production
  syncPolicy:
    syncOptions:
      - CreateNamespace=false
```

## Step 5: Implement Production Promotion

Replace Jenkins's "Deploy to Production" stage with a Git-based promotion workflow.

```bash
#!/bin/bash
# promote-to-production.sh
# Called manually or via a separate Jenkins job

APP=$1
# Get the image tag currently deployed to staging
STAGING_IMAGE=$(kubectl get deployment "$APP" -n staging \
  -o jsonpath='{.spec.template.spec.containers[0].image}')

echo "Promoting $APP with image $STAGING_IMAGE to production"

cd gitops-repo/overlays/production/$APP
kustomize edit set image "registry.myorg.com/${APP}=${STAGING_IMAGE}"

git add .
git commit -m "promote: $APP to production - $STAGING_IMAGE"
git push

echo "Promotion committed. ArgoCD will sync when manually triggered."
```

If you still want Jenkins to orchestrate the promotion (for existing approval workflows), keep a minimal Jenkins job.

```groovy
// Jenkinsfile-promote
pipeline {
    agent any
    parameters {
        string(name: 'APP', description: 'Application to promote')
    }
    stages {
        stage('Approve') {
            input { message "Promote ${params.APP} to production?" }
            steps {
                echo "Approved by ${currentBuild.rawBuild.getCause(Cause.UserIdCause)?.getUserId()}"
            }
        }
        stage('Promote') {
            steps {
                sh "./promote-to-production.sh ${params.APP}"
            }
        }
        stage('Sync ArgoCD') {
            steps {
                sh "argocd app sync ${params.APP}-production --timeout 300"
            }
        }
    }
}
```

## Step 6: Remove Kubeconfig from Jenkins

After all deployments are migrated, remove cluster credentials from Jenkins.

```groovy
// Verify no Jenkins jobs still use kubeconfig
// Search all Jenkinsfiles for:
// - withCredentials.*kubeconfig
// - kubectl
// - helm install/upgrade/rollback
```

This is a significant security improvement. Jenkins no longer has direct access to your clusters.

## Step 7: Parallel Running Period

Run Jenkins and ArgoCD in parallel for a transition period.

```mermaid
gantt
    title Migration Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Set up GitOps repo      :a1, 2026-03-01, 3d
    Migrate staging apps    :a2, after a1, 5d
    section Phase 2
    Modify Jenkins pipelines :a3, after a2, 5d
    Validate staging deploys :a4, after a3, 7d
    section Phase 3
    Migrate production apps  :a5, after a4, 5d
    Parallel running         :a6, after a5, 14d
    section Phase 4
    Remove Jenkins deploy    :a7, after a6, 3d
    Remove kubeconfig        :a8, after a7, 1d
```

## Step 8: Update Team Workflows

Document the new deployment workflow for your team.

Old workflow: Merge PR, Jenkins builds, Jenkins deploys to staging, manually trigger Jenkins for production.

New workflow: Merge PR, Jenkins builds and updates GitOps repo, ArgoCD auto-syncs to staging, team reviews staging, someone promotes to production via PR or script, ArgoCD syncs production.

## Conclusion

Migrating from Jenkins to ArgoCD for deployments is about separation of concerns. Jenkins keeps doing what it does well - building and testing. ArgoCD takes over what it does better - deploying and maintaining cluster state. The migration path is clear: create a GitOps repository, modify Jenkins to update Git instead of calling kubectl, set up ArgoCD Applications, and gradually cut over. The biggest benefit is not just the improved deployment workflow - it is that your clusters now have a single source of truth and automatic drift correction that Jenkins never provided.
