# How to Integrate ArgoCD with Jenkins Pipeline

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Jenkins, CI/CD

Description: Learn how to integrate ArgoCD with Jenkins pipelines for GitOps-based Kubernetes deployments, including Jenkinsfile examples, sync verification, and promotion workflows.

---

Jenkins is one of the most widely used CI/CD tools in enterprise environments. Integrating it with ArgoCD creates a clean separation between the CI pipeline (build, test, publish) managed by Jenkins and the CD pipeline (deploy to Kubernetes) managed by ArgoCD through GitOps principles.

This guide covers practical Jenkins pipeline configurations for working with ArgoCD, from basic image updates to multi-stage promotion workflows.

## Jenkins and ArgoCD Architecture

In a GitOps setup with Jenkins:

```mermaid
flowchart LR
    A[SCM Push] --> B[Jenkins Pipeline]
    B --> C[Build & Test]
    C --> D[Push Image to Registry]
    D --> E[Update Git Manifests]
    E --> F[ArgoCD Detects Change]
    F --> G[ArgoCD Deploys to K8s]
    G --> H[Jenkins Verifies Health]
```

Jenkins handles everything up to updating the Git manifests. ArgoCD takes over from there.

## Prerequisites

Before setting up the integration:

1. **ArgoCD CLI or API access** from Jenkins nodes
2. **Git credentials** for the deployment repository
3. **ArgoCD service account** with appropriate permissions

### Setting Up ArgoCD Credentials in Jenkins

Add the following credentials to Jenkins:

1. Go to **Manage Jenkins > Manage Credentials**
2. Add a **Secret text** credential for `ARGOCD_TOKEN` (ArgoCD API token)
3. Add a **Secret text** credential for `ARGOCD_SERVER` (ArgoCD server address)
4. Add a **Username with password** credential for `GIT_DEPLOY_CREDS` (Git deploy token)

## Pattern 1: Basic Image Tag Update Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        IMAGE_NAME = 'registry.example.com/my-app'
        IMAGE_TAG = "${env.GIT_COMMIT.take(7)}"
        DEPLOY_REPO = 'https://github.com/myorg/k8s-manifests.git'
        APP_PATH = 'apps/my-app/production'
    }

    stages {
        stage('Build') {
            steps {
                script {
                    docker.build("${IMAGE_NAME}:${IMAGE_TAG}")
                }
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Push Image') {
            steps {
                script {
                    docker.withRegistry('https://registry.example.com', 'docker-registry-creds') {
                        docker.image("${IMAGE_NAME}:${IMAGE_TAG}").push()
                        docker.image("${IMAGE_NAME}:${IMAGE_TAG}").push('latest')
                    }
                }
            }
        }

        stage('Update Deployment Manifests') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'git-deploy-creds',
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_PASS'
                )]) {
                    sh """
                        # Clone the deployment repository
                        git clone https://${GIT_USER}:${GIT_PASS}@github.com/myorg/k8s-manifests.git deploy-repo
                        cd deploy-repo/${APP_PATH}

                        # Install kustomize if not available
                        curl -sL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz | tar xz
                        ./kustomize edit set image ${IMAGE_NAME}=${IMAGE_NAME}:${IMAGE_TAG}

                        # Commit and push
                        git config user.name "Jenkins CI"
                        git config user.email "jenkins@example.com"
                        git add .
                        git commit -m "Deploy ${IMAGE_NAME}:${IMAGE_TAG} from Jenkins build #${BUILD_NUMBER}"
                        git push
                    """
                }
            }
        }
    }

    post {
        success {
            echo "Deployment manifests updated. ArgoCD will sync automatically."
        }
        failure {
            echo "Pipeline failed. No deployment changes made."
        }
    }
}
```

## Pattern 2: Sync and Verify Pipeline

For pipelines that need to trigger ArgoCD sync and verify the deployment:

```groovy
// Jenkinsfile
pipeline {
    agent any

    environment {
        ARGOCD_SERVER = credentials('argocd-server')
        ARGOCD_TOKEN = credentials('argocd-token')
        APP_NAME = 'my-app'
    }

    stages {
        stage('Build and Push') {
            steps {
                // ... build and push steps ...
                echo "Build complete"
            }
        }

        stage('Update Manifests') {
            steps {
                // ... update Git manifests ...
                echo "Manifests updated"
            }
        }

        stage('Install ArgoCD CLI') {
            steps {
                sh """
                    curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
                    chmod +x argocd
                """
            }
        }

        stage('Trigger ArgoCD Sync') {
            steps {
                sh """
                    ./argocd login ${ARGOCD_SERVER} \\
                        --auth-token ${ARGOCD_TOKEN} \\
                        --grpc-web \\
                        --insecure

                    # Refresh to pick up latest changes
                    ./argocd app get ${APP_NAME} --refresh --grpc-web

                    # Trigger sync
                    ./argocd app sync ${APP_NAME} --grpc-web

                    # Wait for sync and health
                    ./argocd app wait ${APP_NAME} \\
                        --sync \\
                        --health \\
                        --timeout 300 \\
                        --grpc-web
                """
            }
        }

        stage('Verify Deployment') {
            steps {
                sh """
                    HEALTH=\$(./argocd app get ${APP_NAME} -o json --grpc-web | jq -r '.status.health.status')
                    SYNC=\$(./argocd app get ${APP_NAME} -o json --grpc-web | jq -r '.status.sync.status')

                    echo "Health: \${HEALTH}"
                    echo "Sync: \${SYNC}"

                    if [ "\${HEALTH}" != "Healthy" ] || [ "\${SYNC}" != "Synced" ]; then
                        echo "Deployment verification failed!"
                        exit 1
                    fi

                    echo "Deployment verified successfully!"
                """
            }
        }
    }

    post {
        failure {
            // Optionally rollback on failure
            sh """
                echo "Deployment failed. Consider rolling back."
                # ./argocd app rollback ${APP_NAME} --grpc-web
            """
        }
    }
}
```

## Pattern 3: Multi-Stage Promotion Pipeline

A promotion pipeline that moves builds through staging to production:

```groovy
// Jenkinsfile
pipeline {
    agent any

    parameters {
        string(name: 'IMAGE_TAG', description: 'Image tag to deploy')
        choice(name: 'TARGET_ENV', choices: ['staging', 'production'], description: 'Target environment')
    }

    environment {
        IMAGE_NAME = 'registry.example.com/my-app'
        ARGOCD_SERVER = credentials('argocd-server')
        ARGOCD_TOKEN = credentials('argocd-token')
    }

    stages {
        stage('Validate Parameters') {
            steps {
                script {
                    if (!params.IMAGE_TAG) {
                        error "IMAGE_TAG parameter is required"
                    }
                    echo "Deploying ${IMAGE_NAME}:${params.IMAGE_TAG} to ${params.TARGET_ENV}"
                }
            }
        }

        stage('Production Approval') {
            when {
                expression { params.TARGET_ENV == 'production' }
            }
            steps {
                input message: "Deploy ${params.IMAGE_TAG} to PRODUCTION?",
                      ok: 'Deploy to Production',
                      submitter: 'admin,sre-team'
            }
        }

        stage('Update Manifests') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'git-deploy-creds',
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_PASS'
                )]) {
                    sh """
                        git clone https://${GIT_USER}:${GIT_PASS}@github.com/myorg/k8s-manifests.git deploy-repo
                        cd deploy-repo/apps/my-app/${params.TARGET_ENV}

                        curl -sL https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz | tar xz
                        ./kustomize edit set image ${IMAGE_NAME}=${IMAGE_NAME}:${params.IMAGE_TAG}

                        git config user.name "Jenkins CI"
                        git config user.email "jenkins@example.com"
                        git add .
                        git commit -m "Promote ${IMAGE_NAME}:${params.IMAGE_TAG} to ${params.TARGET_ENV}"
                        git push
                    """
                }
            }
        }

        stage('Sync and Verify') {
            steps {
                sh """
                    curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
                    chmod +x argocd
                    ./argocd login ${ARGOCD_SERVER} --auth-token ${ARGOCD_TOKEN} --grpc-web --insecure

                    APP_NAME="my-app-${params.TARGET_ENV}"
                    ./argocd app sync \${APP_NAME} --grpc-web
                    ./argocd app wait \${APP_NAME} --sync --health --timeout 300 --grpc-web
                """
            }
        }
    }

    post {
        success {
            slackSend channel: '#deployments',
                      message: "Deployed ${IMAGE_NAME}:${params.IMAGE_TAG} to ${params.TARGET_ENV} - Build #${BUILD_NUMBER}"
        }
        failure {
            slackSend channel: '#deployments',
                      message: "FAILED: Deploy ${IMAGE_NAME}:${params.IMAGE_TAG} to ${params.TARGET_ENV} - Build #${BUILD_NUMBER}"
        }
    }
}
```

## Pattern 4: Shared Library for ArgoCD Operations

Create a Jenkins Shared Library for reusable ArgoCD operations:

```groovy
// vars/argocd.groovy (in your shared library)
def login(Map config) {
    sh """
        curl -sSL -o /tmp/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
        chmod +x /tmp/argocd
        /tmp/argocd login ${config.server} \\
            --auth-token ${config.token} \\
            --grpc-web \\
            --insecure
    """
}

def sync(String appName, Integer timeout = 300) {
    sh """
        /tmp/argocd app sync ${appName} --grpc-web
        /tmp/argocd app wait ${appName} --sync --health --timeout ${timeout} --grpc-web
    """
}

def getStatus(String appName) {
    def status = sh(
        script: "/tmp/argocd app get ${appName} -o json --grpc-web",
        returnStdout: true
    )
    return readJSON(text: status)
}

def isHealthy(String appName) {
    def status = getStatus(appName)
    return status.status.health.status == 'Healthy' && status.status.sync.status == 'Synced'
}
```

Use the shared library in your pipeline:

```groovy
// Jenkinsfile
@Library('my-shared-library') _

pipeline {
    agent any

    stages {
        stage('Deploy') {
            steps {
                withCredentials([
                    string(credentialsId: 'argocd-server', variable: 'ARGOCD_SERVER'),
                    string(credentialsId: 'argocd-token', variable: 'ARGOCD_TOKEN')
                ]) {
                    script {
                        argocd.login(server: env.ARGOCD_SERVER, token: env.ARGOCD_TOKEN)
                        argocd.sync('my-app')

                        if (!argocd.isHealthy('my-app')) {
                            error "Application is not healthy after deployment"
                        }
                    }
                }
            }
        }
    }
}
```

## Using the ArgoCD REST API Instead of CLI

If installing the ArgoCD CLI is not practical, use the REST API directly with curl:

```groovy
stage('Sync via API') {
    steps {
        withCredentials([
            string(credentialsId: 'argocd-server', variable: 'ARGOCD_SERVER'),
            string(credentialsId: 'argocd-token', variable: 'ARGOCD_TOKEN')
        ]) {
            sh """
                # Trigger sync via REST API
                curl -s -X POST \\
                    "https://${ARGOCD_SERVER}/api/v1/applications/my-app/sync" \\
                    -H "Authorization: Bearer ${ARGOCD_TOKEN}" \\
                    -H "Content-Type: application/json" \\
                    -d '{}'

                # Poll for sync completion
                for i in \$(seq 1 60); do
                    STATUS=\$(curl -s \\
                        "https://${ARGOCD_SERVER}/api/v1/applications/my-app" \\
                        -H "Authorization: Bearer ${ARGOCD_TOKEN}" | \\
                        jq -r '.status.sync.status')
                    HEALTH=\$(curl -s \\
                        "https://${ARGOCD_SERVER}/api/v1/applications/my-app" \\
                        -H "Authorization: Bearer ${ARGOCD_TOKEN}" | \\
                        jq -r '.status.health.status')

                    echo "Sync: \${STATUS}, Health: \${HEALTH}"

                    if [ "\${STATUS}" = "Synced" ] && [ "\${HEALTH}" = "Healthy" ]; then
                        echo "Deployment complete!"
                        exit 0
                    fi
                    sleep 5
                done
                echo "Timeout waiting for deployment"
                exit 1
            """
        }
    }
}
```

## Security Best Practices for Jenkins

**Use credential binding**: Never hardcode tokens in Jenkinsfiles. Use Jenkins credential store.

**Limit RBAC scope**: The Jenkins ArgoCD account should only have permissions for applications it deploys.

**Use pipeline-level credentials**: Scope credentials to specific pipelines rather than making them globally available.

**Audit trail**: Jenkins builds are logged, providing an audit trail of who triggered deployments.

## Conclusion

Jenkins and ArgoCD work well together when you respect the separation of concerns: Jenkins builds and tests, ArgoCD deploys. The image tag update pattern is the cleanest GitOps approach, but the ArgoCD CLI and REST API are available for pipelines that need tighter control over the deployment process. Shared libraries help standardize ArgoCD operations across multiple Jenkins pipelines. For other CI integrations, see our guides on [GitHub Actions](https://oneuptime.com/blog/post/2026-02-26-argocd-github-actions-integration/view) and [CircleCI](https://oneuptime.com/blog/post/2026-02-26-argocd-circleci-integration/view).
