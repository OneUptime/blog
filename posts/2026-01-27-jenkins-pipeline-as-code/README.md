# How to Configure Jenkins Pipeline as Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jenkins, Pipeline, CI/CD, DevOps, Jenkinsfile

Description: Learn how to configure Jenkins Pipeline as Code using Jenkinsfile, including declarative and scripted pipelines, stages, and best practices.

---

Pipeline as Code means your CI/CD configuration lives in version control alongside your application. No more clicking through Jenkins UI to configure jobs - everything is defined in a Jenkinsfile.

## What Is a Jenkinsfile?

A Jenkinsfile is a text file that defines your Jenkins pipeline. It goes in the root of your repository and describes the entire build, test, and deploy process.

Benefits:
1. **Version controlled** - Pipeline changes tracked with your code
2. **Code review** - Pipeline modifications go through PR review
3. **Reproducible** - Same pipeline definition across all branches
4. **Self-documenting** - The Jenkinsfile explains the CI/CD process

## Declarative vs Scripted Pipelines

Jenkins supports two pipeline syntaxes. Declarative is recommended for most use cases.

### Declarative Pipeline

Structured, opinionated syntax with clear sections:

```groovy
// Declarative Pipeline - Recommended approach
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                echo 'Building the application'
            }
        }
        stage('Test') {
            steps {
                echo 'Running tests'
            }
        }
        stage('Deploy') {
            steps {
                echo 'Deploying to production'
            }
        }
    }
}
```

### Scripted Pipeline

Full Groovy flexibility for complex scenarios:

```groovy
// Scripted Pipeline - More flexible but harder to read
node {
    stage('Build') {
        echo 'Building the application'
    }
    stage('Test') {
        echo 'Running tests'
    }
    stage('Deploy') {
        echo 'Deploying to production'
    }
}
```

### When to Use Each

| Feature | Declarative | Scripted |
|---------|-------------|----------|
| Syntax validation | Yes | No |
| Restart from stage | Yes | No |
| Options/triggers built-in | Yes | Manual |
| Complex logic | Limited | Full Groovy |
| Learning curve | Lower | Higher |

Use declarative unless you need advanced Groovy scripting.

## Pipeline Stages and Steps

Stages organize your pipeline into logical phases. Steps are the individual actions within a stage.

```groovy
pipeline {
    agent any

    stages {
        // Stage for compiling code
        stage('Build') {
            steps {
                // Run shell commands
                sh 'npm install'
                sh 'npm run build'
            }
        }

        // Stage for running tests
        stage('Test') {
            steps {
                sh 'npm test'
                // Archive test results
                junit 'test-results/*.xml'
            }
        }

        // Stage for code quality
        stage('Code Quality') {
            steps {
                sh 'npm run lint'
                // Publish HTML reports
                publishHTML([
                    reportDir: 'coverage',
                    reportFiles: 'index.html',
                    reportName: 'Coverage Report'
                ])
            }
        }

        // Stage for deployment
        stage('Deploy') {
            steps {
                sh './deploy.sh'
            }
        }
    }
}
```

## Agent Configuration

The agent directive specifies where the pipeline runs.

### Run on Any Available Node

```groovy
pipeline {
    // Run on any available agent
    agent any

    stages {
        stage('Build') {
            steps {
                sh 'make build'
            }
        }
    }
}
```

### Run on Specific Label

```groovy
pipeline {
    // Run on nodes with 'linux' label
    agent {
        label 'linux'
    }

    stages {
        stage('Build') {
            steps {
                sh 'make build'
            }
        }
    }
}
```

### Run in Docker Container

```groovy
pipeline {
    // Run inside a Docker container
    agent {
        docker {
            image 'node:18-alpine'
            // Mount workspace and set working directory
            args '-v $HOME/.npm:/root/.npm'
        }
    }

    stages {
        stage('Build') {
            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }
    }
}
```

### Different Agent Per Stage

```groovy
pipeline {
    // No global agent - each stage specifies its own
    agent none

    stages {
        stage('Build') {
            agent {
                docker { image 'node:18' }
            }
            steps {
                sh 'npm install && npm run build'
                stash name: 'build', includes: 'dist/**'
            }
        }

        stage('Test') {
            agent {
                docker { image 'node:18' }
            }
            steps {
                unstash 'build'
                sh 'npm test'
            }
        }

        stage('Deploy') {
            agent {
                label 'deploy-server'
            }
            steps {
                unstash 'build'
                sh './deploy.sh'
            }
        }
    }
}
```

## Environment Variables

Define environment variables at pipeline or stage level.

```groovy
pipeline {
    agent any

    // Global environment variables
    environment {
        APP_NAME = 'myapp'
        APP_VERSION = '1.0.0'
        // Reference other variables
        ARTIFACT_NAME = "${APP_NAME}-${APP_VERSION}.tar.gz"
    }

    stages {
        stage('Build') {
            // Stage-specific environment variables
            environment {
                NODE_ENV = 'production'
                BUILD_ID = "${env.BUILD_NUMBER}"
            }
            steps {
                echo "Building ${env.APP_NAME} version ${env.APP_VERSION}"
                echo "Build ID: ${env.BUILD_ID}"
                sh 'printenv | sort'
            }
        }

        stage('Deploy') {
            environment {
                // Read from credentials
                DEPLOY_TOKEN = credentials('deploy-token')
            }
            steps {
                sh 'echo "Deploying with token"'
            }
        }
    }
}
```

### Built-in Environment Variables

Jenkins provides many built-in variables:

```groovy
pipeline {
    agent any

    stages {
        stage('Info') {
            steps {
                echo "Job: ${env.JOB_NAME}"
                echo "Build: ${env.BUILD_NUMBER}"
                echo "Workspace: ${env.WORKSPACE}"
                echo "Node: ${env.NODE_NAME}"
                echo "Branch: ${env.BRANCH_NAME}"
                echo "Git Commit: ${env.GIT_COMMIT}"
            }
        }
    }
}
```

## Credentials Management

Jenkins credentials are accessed securely using the credentials() helper.

### Username and Password

```groovy
pipeline {
    agent any

    environment {
        // Creates DOCKER_CREDS_USR and DOCKER_CREDS_PSW variables
        DOCKER_CREDS = credentials('docker-hub-credentials')
    }

    stages {
        stage('Push Image') {
            steps {
                sh '''
                    echo $DOCKER_CREDS_PSW | docker login -u $DOCKER_CREDS_USR --password-stdin
                    docker push myimage:latest
                '''
            }
        }
    }
}
```

### Secret Text

```groovy
pipeline {
    agent any

    stages {
        stage('Deploy') {
            environment {
                // Single secret value
                API_KEY = credentials('api-key-secret')
            }
            steps {
                sh 'curl -H "Authorization: Bearer $API_KEY" https://api.example.com/deploy'
            }
        }
    }
}
```

### SSH Key

```groovy
pipeline {
    agent any

    stages {
        stage('Deploy') {
            steps {
                // Use SSH key credential
                sshagent(['deploy-ssh-key']) {
                    sh 'ssh user@server "cd /app && git pull"'
                }
            }
        }
    }
}
```

### Secret File

```groovy
pipeline {
    agent any

    stages {
        stage('Configure') {
            environment {
                // Path to secret file
                KUBECONFIG = credentials('kubeconfig-file')
            }
            steps {
                sh 'kubectl get pods'
            }
        }
    }
}
```

## Post Actions

Post sections run after stages complete, based on the build result.

```groovy
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
    }

    post {
        // Always runs regardless of result
        always {
            echo 'Pipeline completed'
            // Clean workspace
            cleanWs()
        }

        // Runs only on success
        success {
            echo 'Build succeeded!'
            // Send success notification
            slackSend(
                channel: '#builds',
                color: 'good',
                message: "Build ${env.BUILD_NUMBER} succeeded"
            )
        }

        // Runs only on failure
        failure {
            echo 'Build failed!'
            // Send failure notification
            slackSend(
                channel: '#builds',
                color: 'danger',
                message: "Build ${env.BUILD_NUMBER} failed"
            )
            // Archive logs for debugging
            archiveArtifacts artifacts: '**/*.log', allowEmptyArchive: true
        }

        // Runs when status changes from previous build
        changed {
            echo 'Build status changed from previous run'
        }

        // Runs when build is unstable (test failures)
        unstable {
            echo 'Build is unstable'
        }

        // Runs when build was aborted
        aborted {
            echo 'Build was aborted'
        }
    }
}
```

## Parallel Execution

Run stages in parallel to speed up pipelines.

```groovy
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }

        // Run tests in parallel
        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test:unit'
                    }
                }
                stage('Integration Tests') {
                    steps {
                        sh 'npm run test:integration'
                    }
                }
                stage('E2E Tests') {
                    agent {
                        docker { image 'cypress/included:latest' }
                    }
                    steps {
                        sh 'npm run test:e2e'
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                sh './deploy.sh'
            }
        }
    }
}
```

### Parallel with Fail Fast

Stop all parallel branches if one fails:

```groovy
pipeline {
    agent any

    stages {
        stage('Test') {
            // Abort other branches if one fails
            failFast true
            parallel {
                stage('Unit') {
                    steps {
                        sh 'npm run test:unit'
                    }
                }
                stage('Lint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
            }
        }
    }
}
```

## Input and Approval Steps

Add manual approval gates to your pipeline.

```groovy
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Deploy to Staging') {
            steps {
                sh './deploy.sh staging'
            }
        }

        // Manual approval before production
        stage('Approval') {
            steps {
                // Wait for manual approval
                input(
                    message: 'Deploy to production?',
                    ok: 'Deploy',
                    submitter: 'admin,release-team',
                    parameters: [
                        choice(
                            name: 'DEPLOY_ENV',
                            choices: ['us-east', 'us-west', 'eu-west'],
                            description: 'Select deployment region'
                        )
                    ]
                )
            }
        }

        stage('Deploy to Production') {
            steps {
                sh './deploy.sh production'
            }
        }
    }
}
```

### Timeout for Input

Prevent pipelines from waiting indefinitely:

```groovy
pipeline {
    agent any

    stages {
        stage('Approval') {
            steps {
                timeout(time: 1, unit: 'HOURS') {
                    input message: 'Approve deployment?'
                }
            }
        }
    }
}
```

## Pipeline Libraries

Shared libraries let you reuse pipeline code across projects.

### Create a Shared Library

Directory structure:

```
jenkins-shared-library/
├── vars/
│   ├── buildApp.groovy       # Global variables/functions
│   ├── deployApp.groovy
│   └── notifySlack.groovy
├── src/
│   └── com/
│       └── example/
│           └── Utils.groovy  # Helper classes
└── resources/
    └── templates/            # Template files
```

### Define a Global Variable

```groovy
// vars/buildApp.groovy

// Call method - invoked when you use buildApp()
def call(Map config = [:]) {
    // Default values
    def nodeVersion = config.nodeVersion ?: '18'
    def buildCmd = config.buildCmd ?: 'npm run build'

    pipeline {
        agent {
            docker { image "node:${nodeVersion}" }
        }

        stages {
            stage('Install') {
                steps {
                    sh 'npm ci'
                }
            }
            stage('Build') {
                steps {
                    sh buildCmd
                }
            }
        }
    }
}
```

### Define a Helper Function

```groovy
// vars/notifySlack.groovy

def call(String status, String channel = '#builds') {
    def color = status == 'SUCCESS' ? 'good' : 'danger'
    def message = "${env.JOB_NAME} #${env.BUILD_NUMBER} - ${status}"

    slackSend(
        channel: channel,
        color: color,
        message: message
    )
}
```

### Configure Library in Jenkins

In Jenkins, go to Manage Jenkins - Configure System - Global Pipeline Libraries:

```yaml
Name: my-shared-library
Default version: main
Retrieval method: Modern SCM
Source Code Management: Git
Project Repository: https://github.com/myorg/jenkins-shared-library.git
```

### Use Library in Jenkinsfile

```groovy
// Load library at top of Jenkinsfile
@Library('my-shared-library') _

// Use the buildApp step
buildApp(
    nodeVersion: '20',
    buildCmd: 'npm run build:prod'
)
```

### Use Library Functions in Pipeline

```groovy
@Library('my-shared-library') _

pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
    }

    post {
        success {
            // Use shared function
            notifySlack('SUCCESS')
        }
        failure {
            notifySlack('FAILURE')
        }
    }
}
```

## Complete Example Pipeline

A production-ready Jenkinsfile combining all concepts:

```groovy
@Library('my-shared-library') _

pipeline {
    agent none

    options {
        // Timeout entire pipeline
        timeout(time: 1, unit: 'HOURS')
        // Keep last 10 builds
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // Prevent concurrent builds
        disableConcurrentBuilds()
        // Add timestamps to console output
        timestamps()
    }

    environment {
        APP_NAME = 'myapp'
        DOCKER_REGISTRY = 'registry.example.com'
        DOCKER_CREDS = credentials('docker-registry')
    }

    stages {
        stage('Build') {
            agent {
                docker { image 'node:18-alpine' }
            }
            steps {
                sh 'npm ci'
                sh 'npm run build'
                stash name: 'dist', includes: 'dist/**'
            }
        }

        stage('Test') {
            parallel {
                stage('Unit Tests') {
                    agent {
                        docker { image 'node:18-alpine' }
                    }
                    steps {
                        unstash 'dist'
                        sh 'npm run test:unit'
                    }
                    post {
                        always {
                            junit 'test-results/unit/*.xml'
                        }
                    }
                }
                stage('Integration Tests') {
                    agent {
                        docker { image 'node:18-alpine' }
                    }
                    steps {
                        unstash 'dist'
                        sh 'npm run test:integration'
                    }
                }
            }
        }

        stage('Build Image') {
            agent { label 'docker' }
            steps {
                unstash 'dist'
                script {
                    def image = docker.build("${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_NUMBER}")
                    docker.withRegistry("https://${DOCKER_REGISTRY}", 'docker-registry') {
                        image.push()
                        image.push('latest')
                    }
                }
            }
        }

        stage('Deploy Staging') {
            agent { label 'deploy' }
            environment {
                KUBECONFIG = credentials('kubeconfig-staging')
            }
            steps {
                sh "kubectl set image deployment/${APP_NAME} app=${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_NUMBER}"
                sh "kubectl rollout status deployment/${APP_NAME}"
            }
        }

        stage('Approval') {
            when {
                branch 'main'
            }
            steps {
                timeout(time: 24, unit: 'HOURS') {
                    input message: 'Deploy to production?', submitter: 'release-team'
                }
            }
        }

        stage('Deploy Production') {
            when {
                branch 'main'
            }
            agent { label 'deploy' }
            environment {
                KUBECONFIG = credentials('kubeconfig-production')
            }
            steps {
                sh "kubectl set image deployment/${APP_NAME} app=${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_NUMBER}"
                sh "kubectl rollout status deployment/${APP_NAME}"
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            notifySlack('SUCCESS')
        }
        failure {
            notifySlack('FAILURE')
        }
    }
}
```

## Best Practices Summary

1. **Use declarative pipelines** - Easier to read, validate, and maintain
2. **Keep Jenkinsfile in repo root** - Version control your pipeline with your code
3. **Use shared libraries** - Avoid duplicating pipeline code across projects
4. **Parallelize where possible** - Speed up builds by running independent stages concurrently
5. **Use credentials helper** - Never hardcode secrets in your Jenkinsfile
6. **Add timeouts** - Prevent hung builds from consuming resources
7. **Clean workspaces** - Use cleanWs() in post always to free disk space
8. **Use Docker agents** - Isolate builds and ensure consistent environments
9. **Add meaningful stage names** - Make the pipeline status clear at a glance
10. **Implement proper error handling** - Use post sections for notifications and cleanup

---

Jenkins Pipeline as Code brings the benefits of version control and code review to your CI/CD configuration. Start with a simple declarative pipeline, then expand with shared libraries as your needs grow. Monitor your pipeline health and build times with [OneUptime](https://oneuptime.com) to ensure your CI/CD infrastructure stays reliable.
