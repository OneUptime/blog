# How to Build a Jenkins Shared Library for Standardized Kubernetes Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jenkins, Kubernetes, CI/CD, Shared Libraries, DevOps

Description: Create a Jenkins shared library that standardizes Kubernetes deployments across teams with reusable pipeline code, consistent deployment patterns, and built-in best practices for CI/CD workflows.

---

Jenkins shared libraries eliminate pipeline code duplication by providing reusable functions and standardized deployment patterns. A well-designed shared library for Kubernetes deployments ensures consistency, enforces best practices, and simplifies pipeline development across teams. This guide demonstrates building a comprehensive shared library for Kubernetes CI/CD operations.

## Understanding Jenkins Shared Libraries

Shared libraries are Groovy code repositories containing reusable functions, classes, and pipeline templates. They are loaded into pipelines using the `@Library` annotation, providing access to custom steps and standardized workflows. This approach promotes code reuse and maintains consistent deployment practices.

## Creating the Library Structure

Create the library repository:

```bash
# Library structure
jenkins-k8s-library/
├── vars/
│   ├── buildDockerImage.groovy
│   ├── deployToKubernetes.groovy
│   ├── runTests.groovy
│   ├── scanImage.groovy
│   └── standardPipeline.groovy
├── src/
│   └── com/
│       └── example/
│           └── kubernetes/
│               ├── Deployment.groovy
│               └── Helm.groovy
└── resources/
    └── com/
        └── example/
            └── templates/
                └── deployment.yaml
```

## Building a Docker Build Function

Create `vars/buildDockerImage.groovy`:

```groovy
// vars/buildDockerImage.groovy
def call(Map config) {
    def imageName = config.imageName
    def dockerfile = config.dockerfile ?: 'Dockerfile'
    def context = config.context ?: '.'
    def buildArgs = config.buildArgs ?: []

    echo "Building Docker image: ${imageName}"

    def buildArgsString = buildArgs.collect { k, v -> "--build-arg ${k}=${v}" }.join(' ')

    sh """
        docker build \
            -t ${imageName} \
            -f ${dockerfile} \
            ${buildArgsString} \
            ${context}
    """

    if (config.push) {
        echo "Pushing image to registry..."
        sh "docker push ${imageName}"
    }

    return imageName
}
```

Usage in Jenkinsfile:

```groovy
@Library('k8s-library@main') _

pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                script {
                    buildDockerImage(
                        imageName: "registry.example.com/myapp:${env.BUILD_NUMBER}",
                        dockerfile: 'Dockerfile',
                        buildArgs: [
                            VERSION: env.BUILD_NUMBER,
                            BUILD_DATE: sh(script: 'date -u +%Y-%m-%dT%H:%M:%SZ', returnStdout: true).trim()
                        ],
                        push: true
                    )
                }
            }
        }
    }
}
```

## Creating a Kubernetes Deployment Function

Create `vars/deployToKubernetes.groovy`:

```groovy
// vars/deployToKubernetes.groovy
def call(Map config) {
    def namespace = config.namespace
    def deployment = config.deployment
    def image = config.image
    def kubeconfig = config.kubeconfig ?: "${env.HOME}/.kube/config"
    def timeout = config.timeout ?: '5m'
    def waitForRollout = config.waitForRollout != false

    echo "Deploying ${deployment} to namespace ${namespace}"

    withCredentials([file(credentialsId: config.kubeconfigId, variable: 'KUBECONFIG_FILE')]) {
        sh """
            export KUBECONFIG=${KUBECONFIG_FILE}

            kubectl set image deployment/${deployment} \
                ${deployment}=${image} \
                --namespace=${namespace} \
                --record
        """

        if (waitForRollout) {
            sh """
                export KUBECONFIG=${KUBECONFIG_FILE}

                kubectl rollout status deployment/${deployment} \
                    --namespace=${namespace} \
                    --timeout=${timeout}
            """
        }

        // Get deployment status
        def status = sh(
            script: """
                export KUBECONFIG=${KUBECONFIG_FILE}
                kubectl get deployment/${deployment} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Progressing")].status}'
            """,
            returnStdout: true
        ).trim()

        if (status != 'True') {
            error("Deployment ${deployment} failed to reach ready state")
        }

        echo "✓ Deployment successful"
    }
}
```

## Creating a Helm Deployment Function

Create `src/com/example/kubernetes/Helm.groovy`:

```groovy
package com.example.kubernetes

class Helm implements Serializable {
    def script

    Helm(script) {
        this.script = script
    }

    def upgrade(Map config) {
        def release = config.release
        def chart = config.chart
        def namespace = config.namespace
        def values = config.values ?: []
        def setValues = config.set ?: [:]
        def wait = config.wait != false
        def timeout = config.timeout ?: '5m'
        def createNamespace = config.createNamespace ?: false

        script.echo "Upgrading Helm release: ${release}"

        def valuesArgs = values.collect { "-f ${it}" }.join(' ')
        def setArgs = setValues.collect { k, v -> "--set ${k}=${v}" }.join(' ')
        def namespaceArg = createNamespace ? '--create-namespace' : ''

        script.sh """
            helm upgrade ${release} ${chart} \
                --namespace ${namespace} \
                ${namespaceArg} \
                --install \
                ${valuesArgs} \
                ${setArgs} \
                ${wait ? '--wait' : ''} \
                --timeout ${timeout}
        """

        return release
    }

    def rollback(String release, String namespace, Integer revision = 0) {
        script.echo "Rolling back ${release} in ${namespace}"

        if (revision > 0) {
            script.sh "helm rollback ${release} ${revision} --namespace ${namespace}"
        } else {
            script.sh "helm rollback ${release} --namespace ${namespace}"
        }
    }

    def test(String release, String namespace) {
        script.echo "Testing ${release}"
        script.sh "helm test ${release} --namespace ${namespace}"
    }
}
```

Create wrapper in `vars/helmDeploy.groovy`:

```groovy
// vars/helmDeploy.groovy
def call(Map config) {
    def helm = new com.example.kubernetes.Helm(this)

    try {
        helm.upgrade(config)

        if (config.runTests) {
            helm.test(config.release, config.namespace)
        }
    } catch (Exception e) {
        if (config.rollbackOnFailure) {
            echo "Deployment failed, rolling back..."
            helm.rollback(config.release, config.namespace)
        }
        throw e
    }
}
```

## Creating a Standard Pipeline Template

Create `vars/standardPipeline.groovy`:

```groovy
// vars/standardPipeline.groovy
def call(Map config) {
    pipeline {
        agent {
            kubernetes {
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
  - name: kubectl
    image: bitnami/kubectl:latest
    command: ['cat']
    tty: true
  - name: helm
    image: alpine/helm:latest
    command: ['cat']
    tty: true
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
"""
            }
        }

        environment {
            IMAGE_NAME = "${config.registry}/${config.appName}:${env.BUILD_NUMBER}"
            DEPLOY_NAMESPACE = config.namespace ?: 'default'
        }

        stages {
            stage('Checkout') {
                steps {
                    checkout scm
                }
            }

            stage('Test') {
                when {
                    expression { config.runTests != false }
                }
                steps {
                    script {
                        runTests(config.testConfig ?: [:])
                    }
                }
            }

            stage('Build') {
                steps {
                    container('docker') {
                        script {
                            buildDockerImage(
                                imageName: env.IMAGE_NAME,
                                push: true
                            )
                        }
                    }
                }
            }

            stage('Scan') {
                when {
                    expression { config.scan != false }
                }
                steps {
                    script {
                        scanImage(
                            image: env.IMAGE_NAME,
                            severity: 'CRITICAL,HIGH'
                        )
                    }
                }
            }

            stage('Deploy to Dev') {
                steps {
                    container('kubectl') {
                        script {
                            deployToKubernetes(
                                namespace: 'dev',
                                deployment: config.appName,
                                image: env.IMAGE_NAME,
                                kubeconfigId: 'dev-kubeconfig'
                            )
                        }
                    }
                }
            }

            stage('Deploy to Production') {
                when {
                    branch 'main'
                }
                steps {
                    input message: 'Deploy to production?'

                    container('kubectl') {
                        script {
                            deployToKubernetes(
                                namespace: 'production',
                                deployment: config.appName,
                                image: env.IMAGE_NAME,
                                kubeconfigId: 'prod-kubeconfig'
                            )
                        }
                    }
                }
            }
        }

        post {
            success {
                echo "Pipeline completed successfully"
                script {
                    if (config.notifications) {
                        sendNotification(
                            status: 'SUCCESS',
                            message: "Deployment of ${config.appName} successful"
                        )
                    }
                }
            }
            failure {
                echo "Pipeline failed"
                script {
                    if (config.notifications) {
                        sendNotification(
                            status: 'FAILURE',
                            message: "Deployment of ${config.appName} failed"
                        )
                    }
                }
            }
        }
    }
}
```

Using the standard pipeline:

```groovy
@Library('k8s-library@main') _

standardPipeline(
    registry: 'registry.example.com',
    appName: 'myapp',
    namespace: 'production',
    runTests: true,
    scan: true,
    notifications: true
)
```

## Creating Helper Functions

Create `vars/runTests.groovy`:

```groovy
// vars/runTests.groovy
def call(Map config = [:]) {
    def testCommand = config.command ?: 'npm test'
    def testImage = config.image ?: 'node:18'

    echo "Running tests with command: ${testCommand}"

    docker.image(testImage).inside {
        sh """
            npm ci
            ${testCommand}
        """
    }
}
```

Create `vars/scanImage.groovy`:

```groovy
// vars/scanImage.groovy
def call(Map config) {
    def image = config.image
    def severity = config.severity ?: 'CRITICAL,HIGH'
    def exitCode = config.exitCode ?: 1

    echo "Scanning ${image} for vulnerabilities..."

    def result = sh(
        script: """
            trivy image \
                --severity ${severity} \
                --exit-code ${exitCode} \
                --format json \
                --output scan-results.json \
                ${image}
        """,
        returnStatus: true
    )

    archiveArtifacts artifacts: 'scan-results.json', fingerprint: true

    if (result != 0) {
        error("Vulnerability scan found issues in ${image}")
    }

    echo "✓ Security scan passed"
}
```

## Configuring the Library in Jenkins

Add library in Jenkins configuration:

```groovy
// In Jenkins UI: Manage Jenkins > Configure System > Global Pipeline Libraries

// Or in Jenkins Configuration as Code:
unclassified:
  globalLibraries:
    libraries:
      - name: 'k8s-library'
        defaultVersion: 'main'
        retriever:
          modernSCM:
            scm:
              git:
                remote: 'https://github.com/your-org/jenkins-k8s-library.git'
                credentialsId: 'github-credentials'
```

## Testing the Library

Create a test pipeline:

```groovy
@Library('k8s-library@main') _

pipeline {
    agent any
    stages {
        stage('Test Build Function') {
            steps {
                script {
                    buildDockerImage(
                        imageName: 'test-image:latest',
                        push: false
                    )
                }
            }
        }

        stage('Test Deploy Function') {
            steps {
                script {
                    // Mock deployment
                    echo "Deployment function tested"
                }
            }
        }
    }
}
```

## Conclusion

A well-designed Jenkins shared library for Kubernetes standardizes deployment practices, reduces code duplication, and ensures consistency across teams. By providing reusable functions for common operations like building images, deploying to Kubernetes, and running tests, the library accelerates pipeline development while enforcing best practices. Regular updates, comprehensive documentation, and thorough testing keep the library valuable and reliable for your organization's CI/CD needs.
