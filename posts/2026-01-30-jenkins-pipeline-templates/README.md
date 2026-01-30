# How to Create Jenkins Pipeline Templates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Jenkins, CI/CD, Pipeline, Automation

Description: Build reusable Jenkins pipeline templates with shared libraries for standardized CI/CD workflows across multiple projects.

---

Managing dozens of Jenkins pipelines across multiple projects quickly becomes a maintenance nightmare. Copy-pasting pipeline code between repositories leads to inconsistencies, duplicated bugs, and hours spent updating each pipeline when requirements change. Jenkins pipeline templates solve this problem by centralizing your CI/CD logic into reusable components.

This guide walks you through creating production-ready Jenkins pipeline templates using shared libraries. You will learn how to structure your template library, build flexible parameterized templates, implement versioning strategies, and integrate templates into your Jenkinsfiles.

## Why Use Pipeline Templates?

Before diving into implementation, let's understand when pipeline templates make sense.

| Approach | Best For | Drawbacks |
|----------|----------|-----------|
| Inline Jenkinsfile | Single projects, simple pipelines | No code reuse, duplication across repos |
| Shared Libraries | Multiple projects with similar workflows | Initial setup complexity |
| Pipeline Templates | Standardized workflows across teams | Requires library maintenance |

Pipeline templates work best when you have:

- Multiple projects following similar build and deployment patterns
- Teams that need guardrails around CI/CD practices
- Requirements for consistent logging, notifications, and artifact handling
- Compliance needs that mandate specific pipeline stages

## Shared Library Structure

Jenkins shared libraries follow a specific directory structure. Your template library repository should look like this:

```
jenkins-pipeline-templates/
├── vars/
│   ├── standardPipeline.groovy
│   ├── nodePipeline.groovy
│   ├── pythonPipeline.groovy
│   └── deployTemplate.groovy
├── src/
│   └── com/
│       └── yourcompany/
│           └── pipeline/
│               ├── BuildConfig.groovy
│               ├── NotificationHelper.groovy
│               └── ArtifactManager.groovy
├── resources/
│   └── templates/
│       ├── docker-compose.yaml
│       └── sonar-project.properties
└── README.md
```

The `vars` directory contains your pipeline templates and global variables. Each `.groovy` file here becomes callable from any Jenkinsfile that imports the library.

The `src` directory holds supporting classes written in Groovy. These classes provide utilities and helper functions used by your templates.

The `resources` directory stores static files like configuration templates that your pipelines can load at runtime.

## Setting Up the Shared Library in Jenkins

Navigate to Manage Jenkins > Configure System > Global Pipeline Libraries and add your library configuration.

```groovy
// Library configuration example
Name: pipeline-templates
Default version: main
Retrieval method: Modern SCM
Source Code Management: Git
Project Repository: https://github.com/yourcompany/jenkins-pipeline-templates.git
Credentials: github-credentials
```

Set the default version to your main branch or a specific tag. Teams can override this version in their Jenkinsfiles when needed.

## Building Your First Global Pipeline Template

Let's create a basic pipeline template that handles common stages. This template lives in `vars/standardPipeline.groovy`.

```groovy
// vars/standardPipeline.groovy
// This template provides a standard build pipeline with checkout, build, test, and deploy stages.
// Teams can customize behavior through the config map parameter.

def call(Map config = [:]) {
    // Set default values for configuration options
    def defaults = [
        buildTool: 'maven',
        jdkVersion: 'jdk17',
        runTests: true,
        deployEnabled: false,
        notifySlack: true,
        slackChannel: '#builds',
        timeoutMinutes: 30
    ]

    // Merge user config with defaults
    config = defaults + config

    pipeline {
        agent {
            label config.agentLabel ?: 'linux'
        }

        options {
            timeout(time: config.timeoutMinutes, unit: 'MINUTES')
            buildDiscarder(logRotator(numToKeepStr: '10'))
            disableConcurrentBuilds()
            timestamps()
        }

        tools {
            jdk config.jdkVersion
        }

        environment {
            APP_NAME = config.appName ?: env.JOB_BASE_NAME
            BUILD_VERSION = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'unknown'}"
        }

        stages {
            stage('Checkout') {
                steps {
                    checkout scm
                    script {
                        // Store git information for later use
                        env.GIT_COMMIT = sh(
                            script: 'git rev-parse HEAD',
                            returnStdout: true
                        ).trim()
                        env.GIT_BRANCH = sh(
                            script: 'git rev-parse --abbrev-ref HEAD',
                            returnStdout: true
                        ).trim()
                    }
                }
            }

            stage('Build') {
                steps {
                    script {
                        buildProject(config.buildTool, config)
                    }
                }
            }

            stage('Test') {
                when {
                    expression { config.runTests }
                }
                steps {
                    script {
                        runTests(config.buildTool, config)
                    }
                }
                post {
                    always {
                        junit allowEmptyResults: true, testResults: '**/target/surefire-reports/*.xml'
                    }
                }
            }

            stage('Code Analysis') {
                when {
                    expression { config.sonarEnabled ?: false }
                }
                steps {
                    script {
                        runSonarAnalysis(config)
                    }
                }
            }

            stage('Deploy') {
                when {
                    allOf {
                        expression { config.deployEnabled }
                        branch 'main'
                    }
                }
                steps {
                    script {
                        deployApplication(config)
                    }
                }
            }
        }

        post {
            success {
                script {
                    if (config.notifySlack) {
                        notifySlack(config.slackChannel, 'SUCCESS', config)
                    }
                }
            }
            failure {
                script {
                    if (config.notifySlack) {
                        notifySlack(config.slackChannel, 'FAILURE', config)
                    }
                }
            }
            cleanup {
                cleanWs()
            }
        }
    }
}

// Helper function to build based on the selected tool
def buildProject(String tool, Map config) {
    switch(tool) {
        case 'maven':
            sh "mvn clean package -DskipTests ${config.mavenArgs ?: ''}"
            break
        case 'gradle':
            sh "./gradlew clean build -x test ${config.gradleArgs ?: ''}"
            break
        case 'npm':
            sh 'npm ci'
            sh 'npm run build'
            break
        default:
            error "Unsupported build tool: ${tool}"
    }
}

// Helper function to run tests based on the selected tool
def runTests(String tool, Map config) {
    switch(tool) {
        case 'maven':
            sh "mvn test ${config.mavenTestArgs ?: ''}"
            break
        case 'gradle':
            sh "./gradlew test ${config.gradleTestArgs ?: ''}"
            break
        case 'npm':
            sh 'npm test'
            break
        default:
            error "Unsupported build tool: ${tool}"
    }
}

// SonarQube analysis integration
def runSonarAnalysis(Map config) {
    withSonarQubeEnv(config.sonarServer ?: 'SonarQube') {
        sh """
            mvn sonar:sonar \
                -Dsonar.projectKey=${config.sonarProjectKey ?: env.APP_NAME} \
                -Dsonar.projectName="${config.sonarProjectName ?: env.APP_NAME}"
        """
    }
}

// Deployment helper - customize based on your infrastructure
def deployApplication(Map config) {
    def environment = config.deployEnvironment ?: 'staging'

    echo "Deploying ${env.APP_NAME} version ${env.BUILD_VERSION} to ${environment}"

    if (config.deployScript) {
        sh config.deployScript
    } else {
        // Default deployment using kubectl
        sh """
            kubectl set image deployment/${env.APP_NAME} \
                ${env.APP_NAME}=${config.dockerRegistry}/${env.APP_NAME}:${env.BUILD_VERSION} \
                -n ${environment}
        """
    }
}

// Slack notification helper
def notifySlack(String channel, String status, Map config) {
    def color = status == 'SUCCESS' ? 'good' : 'danger'
    def message = "${env.APP_NAME} build #${env.BUILD_NUMBER} ${status}"

    slackSend(
        channel: channel,
        color: color,
        message: message,
        teamDomain: config.slackTeam ?: 'yourcompany'
    )
}
```

## Creating a Parameterized Node.js Template

Different technology stacks require different pipeline configurations. Here is a specialized template for Node.js projects.

```groovy
// vars/nodePipeline.groovy
// Specialized pipeline template for Node.js applications.
// Includes npm caching, security audits, and Docker image building.

def call(Map config = [:]) {
    def defaults = [
        nodeVersion: '18',
        packageManager: 'npm',
        runLint: true,
        runSecurityAudit: true,
        buildDocker: false,
        dockerRegistry: 'docker.io',
        cacheNpmModules: true,
        testCoverage: true,
        coverageThreshold: 80
    ]

    config = defaults + config

    pipeline {
        agent {
            docker {
                image "node:${config.nodeVersion}-alpine"
                args '-v npm-cache:/root/.npm'
            }
        }

        options {
            timeout(time: 20, unit: 'MINUTES')
            buildDiscarder(logRotator(numToKeepStr: '15'))
            timestamps()
        }

        environment {
            CI = 'true'
            NPM_CONFIG_CACHE = '/root/.npm'
            APP_NAME = config.appName ?: env.JOB_BASE_NAME
            IMAGE_TAG = "${env.BUILD_NUMBER}"
        }

        stages {
            stage('Install Dependencies') {
                steps {
                    script {
                        installDependencies(config)
                    }
                }
            }

            stage('Lint') {
                when {
                    expression { config.runLint }
                }
                steps {
                    script {
                        runLinter(config)
                    }
                }
            }

            stage('Security Audit') {
                when {
                    expression { config.runSecurityAudit }
                }
                steps {
                    script {
                        runSecurityAudit(config)
                    }
                }
            }

            stage('Test') {
                steps {
                    script {
                        runNodeTests(config)
                    }
                }
                post {
                    always {
                        junit allowEmptyResults: true, testResults: 'junit.xml'
                        script {
                            if (config.testCoverage) {
                                publishCoverageReport(config)
                            }
                        }
                    }
                }
            }

            stage('Build') {
                steps {
                    script {
                        buildNodeApp(config)
                    }
                }
            }

            stage('Build Docker Image') {
                when {
                    expression { config.buildDocker }
                }
                agent {
                    label 'docker'
                }
                steps {
                    script {
                        buildDockerImage(config)
                    }
                }
            }

            stage('Push Docker Image') {
                when {
                    allOf {
                        expression { config.buildDocker }
                        branch 'main'
                    }
                }
                agent {
                    label 'docker'
                }
                steps {
                    script {
                        pushDockerImage(config)
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
}

def installDependencies(Map config) {
    if (config.packageManager == 'yarn') {
        sh 'yarn install --frozen-lockfile'
    } else if (config.packageManager == 'pnpm') {
        sh 'npm install -g pnpm && pnpm install --frozen-lockfile'
    } else {
        sh 'npm ci'
    }
}

def runLinter(Map config) {
    def lintCommand = config.lintCommand ?: 'npm run lint'
    sh lintCommand
}

def runSecurityAudit(Map config) {
    // Run npm audit and fail on high severity vulnerabilities
    def auditLevel = config.auditLevel ?: 'high'
    sh "npm audit --audit-level=${auditLevel} || true"

    // Generate audit report
    sh 'npm audit --json > npm-audit-report.json || true'
    archiveArtifacts artifacts: 'npm-audit-report.json', allowEmptyArchive: true
}

def runNodeTests(Map config) {
    def testCommand = config.testCommand ?: 'npm test'

    if (config.testCoverage) {
        sh "${testCommand} -- --coverage --coverageReporters=lcov --coverageReporters=text"
    } else {
        sh testCommand
    }
}

def publishCoverageReport(Map config) {
    // Publish coverage to Jenkins
    publishHTML([
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'coverage/lcov-report',
        reportFiles: 'index.html',
        reportName: 'Coverage Report'
    ])

    // Check coverage threshold
    if (config.coverageThreshold > 0) {
        def coverageFile = readFile('coverage/lcov-report/index.html')
        def matcher = coverageFile =~ /(\d+\.?\d*)%/
        if (matcher) {
            def coverage = matcher[0][1] as Double
            if (coverage < config.coverageThreshold) {
                unstable("Coverage ${coverage}% is below threshold ${config.coverageThreshold}%")
            }
        }
    }
}

def buildNodeApp(Map config) {
    def buildCommand = config.buildCommand ?: 'npm run build'
    sh buildCommand

    // Archive build artifacts
    if (config.archiveBuild) {
        archiveArtifacts artifacts: "${config.buildOutput ?: 'dist'}/**/*"
    }
}

def buildDockerImage(Map config) {
    def imageName = "${config.dockerRegistry}/${env.APP_NAME}:${env.IMAGE_TAG}"
    def dockerfile = config.dockerfile ?: 'Dockerfile'

    sh """
        docker build \
            -f ${dockerfile} \
            -t ${imageName} \
            --build-arg NODE_VERSION=${config.nodeVersion} \
            --build-arg BUILD_VERSION=${env.IMAGE_TAG} \
            .
    """

    // Tag as latest for main branch
    if (env.BRANCH_NAME == 'main') {
        sh "docker tag ${imageName} ${config.dockerRegistry}/${env.APP_NAME}:latest"
    }
}

def pushDockerImage(Map config) {
    def imageName = "${config.dockerRegistry}/${env.APP_NAME}:${env.IMAGE_TAG}"

    withCredentials([usernamePassword(
        credentialsId: config.dockerCredentialsId ?: 'docker-hub-credentials',
        usernameVariable: 'DOCKER_USER',
        passwordVariable: 'DOCKER_PASS'
    )]) {
        sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
        sh "docker push ${imageName}"

        if (env.BRANCH_NAME == 'main') {
            sh "docker push ${config.dockerRegistry}/${env.APP_NAME}:latest"
        }
    }
}
```

## Creating Extendable Base Templates

Sometimes you need templates that other templates can extend. This pattern uses Groovy closures to allow customization.

```groovy
// vars/basePipeline.groovy
// A base pipeline template that provides extension points for customization.
// Other templates can extend this by providing custom stage implementations.

def call(Map config = [:], Closure body = null) {
    def pipelineConfig = [
        // Default configuration
        agent: 'any',
        timeout: 30,
        checkoutEnabled: true,
        cleanupEnabled: true,

        // Extension points - closures that can be overridden
        preBuild: null,
        postBuild: null,
        preTest: null,
        postTest: null,
        preDeploy: null,
        postDeploy: null,
        customStages: []
    ] + config

    // Allow body closure to modify configuration
    if (body) {
        body.delegate = pipelineConfig
        body.resolveStrategy = Closure.DELEGATE_FIRST
        body()
    }

    pipeline {
        agent {
            label pipelineConfig.agent
        }

        options {
            timeout(time: pipelineConfig.timeout, unit: 'MINUTES')
            timestamps()
        }

        stages {
            stage('Checkout') {
                when {
                    expression { pipelineConfig.checkoutEnabled }
                }
                steps {
                    checkout scm
                }
            }

            stage('Pre-Build') {
                when {
                    expression { pipelineConfig.preBuild != null }
                }
                steps {
                    script {
                        pipelineConfig.preBuild()
                    }
                }
            }

            stage('Build') {
                steps {
                    script {
                        if (pipelineConfig.buildSteps) {
                            pipelineConfig.buildSteps()
                        } else {
                            echo 'No build steps defined'
                        }
                    }
                }
            }

            stage('Post-Build') {
                when {
                    expression { pipelineConfig.postBuild != null }
                }
                steps {
                    script {
                        pipelineConfig.postBuild()
                    }
                }
            }

            stage('Pre-Test') {
                when {
                    expression { pipelineConfig.preTest != null }
                }
                steps {
                    script {
                        pipelineConfig.preTest()
                    }
                }
            }

            stage('Test') {
                steps {
                    script {
                        if (pipelineConfig.testSteps) {
                            pipelineConfig.testSteps()
                        } else {
                            echo 'No test steps defined'
                        }
                    }
                }
            }

            stage('Post-Test') {
                when {
                    expression { pipelineConfig.postTest != null }
                }
                steps {
                    script {
                        pipelineConfig.postTest()
                    }
                }
            }

            stage('Custom Stages') {
                when {
                    expression { pipelineConfig.customStages.size() > 0 }
                }
                steps {
                    script {
                        pipelineConfig.customStages.each { customStage ->
                            stage(customStage.name) {
                                customStage.steps()
                            }
                        }
                    }
                }
            }

            stage('Pre-Deploy') {
                when {
                    expression { pipelineConfig.preDeploy != null }
                }
                steps {
                    script {
                        pipelineConfig.preDeploy()
                    }
                }
            }

            stage('Deploy') {
                when {
                    expression { pipelineConfig.deploySteps != null }
                }
                steps {
                    script {
                        pipelineConfig.deploySteps()
                    }
                }
            }

            stage('Post-Deploy') {
                when {
                    expression { pipelineConfig.postDeploy != null }
                }
                steps {
                    script {
                        pipelineConfig.postDeploy()
                    }
                }
            }
        }

        post {
            always {
                script {
                    if (pipelineConfig.cleanupEnabled) {
                        cleanWs()
                    }
                }
            }
        }
    }
}
```

Here is how a project would extend this base template:

```groovy
// Jenkinsfile using the extendable base template
@Library('pipeline-templates') _

basePipeline(agent: 'linux', timeout: 45) {
    // Define build steps
    buildSteps = {
        sh 'make build'
    }

    // Define test steps
    testSteps = {
        sh 'make test'
    }

    // Add pre-build hook
    preBuild = {
        sh 'make setup-dependencies'
    }

    // Add custom stages
    customStages = [
        [
            name: 'Integration Tests',
            steps: {
                sh 'make integration-test'
            }
        ],
        [
            name: 'Performance Tests',
            steps: {
                sh 'make perf-test'
            }
        ]
    ]

    // Define deployment
    deploySteps = {
        sh 'make deploy ENV=production'
    }
}
```

## Supporting Classes for Templates

Complex templates benefit from supporting classes that encapsulate common logic. These classes live in the `src` directory.

```groovy
// src/com/yourcompany/pipeline/BuildConfig.groovy
// Provides configuration management for pipeline templates.
// Supports loading configuration from YAML files and environment variables.

package com.yourcompany.pipeline

class BuildConfig implements Serializable {
    private Map config
    private def script

    BuildConfig(script, Map defaults = [:]) {
        this.script = script
        this.config = defaults
    }

    // Load configuration from a YAML file in the repository
    void loadFromYaml(String path = '.pipeline.yaml') {
        if (script.fileExists(path)) {
            def yamlContent = script.readFile(path)
            def yamlConfig = script.readYaml(text: yamlContent)
            this.config = this.config + yamlConfig
        }
    }

    // Load configuration from environment variables with a prefix
    void loadFromEnv(String prefix = 'PIPELINE_') {
        script.env.getEnvironment().each { key, value ->
            if (key.startsWith(prefix)) {
                def configKey = key.replace(prefix, '').toLowerCase()
                this.config[configKey] = value
            }
        }
    }

    // Get a configuration value with a default
    def get(String key, defaultValue = null) {
        return this.config.containsKey(key) ? this.config[key] : defaultValue
    }

    // Set a configuration value
    void set(String key, value) {
        this.config[key] = value
    }

    // Check if a feature is enabled
    boolean isEnabled(String feature) {
        def value = get(feature, false)
        return value == true || value == 'true' || value == '1'
    }

    // Get the full configuration map
    Map getAll() {
        return this.config.clone()
    }

    // Validate required configuration keys
    void validate(List requiredKeys) {
        def missing = requiredKeys.findAll { !this.config.containsKey(it) }
        if (missing) {
            throw new IllegalArgumentException("Missing required configuration: ${missing.join(', ')}")
        }
    }
}
```

```groovy
// src/com/yourcompany/pipeline/NotificationHelper.groovy
// Handles notifications to various channels including Slack, email, and webhooks.

package com.yourcompany.pipeline

class NotificationHelper implements Serializable {
    private def script
    private Map config

    NotificationHelper(script, Map config = [:]) {
        this.script = script
        this.config = config
    }

    // Send notification to Slack
    void sendSlack(String message, String status = 'INFO') {
        def colorMap = [
            'SUCCESS': 'good',
            'FAILURE': 'danger',
            'WARNING': 'warning',
            'INFO': '#439FE0'
        ]

        def channel = config.slackChannel ?: '#builds'
        def color = colorMap[status] ?: '#439FE0'

        script.slackSend(
            channel: channel,
            color: color,
            message: message
        )
    }

    // Send email notification
    void sendEmail(String subject, String body, List recipients = []) {
        def to = recipients ?: config.emailRecipients ?: []

        if (to.isEmpty()) {
            script.echo 'No email recipients configured'
            return
        }

        script.emailext(
            subject: subject,
            body: body,
            to: to.join(','),
            mimeType: 'text/html'
        )
    }

    // Send webhook notification
    void sendWebhook(String url, Map payload) {
        def jsonPayload = script.writeJSON(returnText: true, json: payload)

        script.httpRequest(
            url: url,
            httpMode: 'POST',
            contentType: 'APPLICATION_JSON',
            requestBody: jsonPayload,
            validResponseCodes: '200:299'
        )
    }

    // Build status notification that sends to all configured channels
    void notifyBuildStatus(String status) {
        def message = buildStatusMessage(status)

        if (config.slackEnabled) {
            sendSlack(message, status)
        }

        if (config.emailEnabled) {
            sendEmail("Build ${status}: ${script.env.JOB_NAME}", message)
        }

        if (config.webhookUrl) {
            sendWebhook(config.webhookUrl, [
                status: status,
                job: script.env.JOB_NAME,
                build: script.env.BUILD_NUMBER,
                url: script.env.BUILD_URL
            ])
        }
    }

    private String buildStatusMessage(String status) {
        return """
            Job: ${script.env.JOB_NAME}
            Build: #${script.env.BUILD_NUMBER}
            Status: ${status}
            URL: ${script.env.BUILD_URL}
        """.stripIndent()
    }
}
```

## Template Versioning Strategies

Versioning your pipeline templates prevents breaking changes from affecting production builds. Here are three approaches with their tradeoffs.

| Strategy | Pros | Cons |
|----------|------|------|
| Git Tags | Explicit version control, immutable | Manual tag management |
| Git Branches | Easy to test changes | Can drift from main |
| Semantic Versioning | Clear compatibility expectations | Requires discipline |

### Using Git Tags for Versioning

Create tags for each release of your template library:

```bash
# Tag a new version
git tag -a v1.0.0 -m "Initial stable release"
git push origin v1.0.0

# Tag a patch release
git tag -a v1.0.1 -m "Fix notification bug"
git push origin v1.0.1

# Tag a minor release with new features
git tag -a v1.1.0 -m "Add Python pipeline template"
git push origin v1.1.0
```

Projects reference specific versions in their Jenkinsfile:

```groovy
// Pin to a specific version for stability
@Library('pipeline-templates@v1.0.0') _

standardPipeline(
    appName: 'my-service',
    buildTool: 'maven'
)
```

### Branch-Based Versioning

Maintain separate branches for major versions:

```groovy
// Use the v1 branch for all 1.x releases
@Library('pipeline-templates@v1') _

// Use the v2 branch for 2.x releases with breaking changes
@Library('pipeline-templates@v2') _
```

### Version Compatibility Helper

Add a version check to your templates to ensure compatibility:

```groovy
// vars/versionCheck.groovy
// Validates that the Jenkinsfile is compatible with the library version.

def call(String requiredVersion) {
    def currentVersion = libraryVersion()

    if (!isCompatible(currentVersion, requiredVersion)) {
        error """
            Pipeline template version mismatch!
            Required: ${requiredVersion}
            Current: ${currentVersion}

            Update your @Library annotation to use a compatible version.
        """
    }

    echo "Pipeline template version ${currentVersion} is compatible with ${requiredVersion}"
}

def libraryVersion() {
    // Read version from a version file in the library
    def versionFile = libraryResource('version.txt')
    return versionFile.trim()
}

def isCompatible(String current, String required) {
    def currentParts = current.tokenize('.')
    def requiredParts = required.tokenize('.')

    // Major version must match
    if (currentParts[0] != requiredParts[0]) {
        return false
    }

    // Current minor version must be >= required
    if (currentParts[1].toInteger() < requiredParts[1].toInteger()) {
        return false
    }

    return true
}
```

## Calling Templates from Jenkinsfile

Here are several examples showing how to use pipeline templates in your projects.

### Minimal Configuration

For projects that follow all conventions, the template call can be very simple:

```groovy
// Jenkinsfile - Minimal example
@Library('pipeline-templates') _

standardPipeline()
```

### Standard Maven Project

A typical Java project with Maven builds:

```groovy
// Jenkinsfile - Maven project
@Library('pipeline-templates@v1.2.0') _

standardPipeline(
    appName: 'user-service',
    buildTool: 'maven',
    jdkVersion: 'jdk17',
    runTests: true,
    sonarEnabled: true,
    sonarProjectKey: 'com.yourcompany:user-service',
    deployEnabled: true,
    deployEnvironment: 'staging',
    notifySlack: true,
    slackChannel: '#user-service-builds'
)
```

### Node.js Project with Docker

A Node.js application that builds Docker images:

```groovy
// Jenkinsfile - Node.js with Docker
@Library('pipeline-templates@v1.2.0') _

nodePipeline(
    appName: 'frontend-app',
    nodeVersion: '20',
    packageManager: 'pnpm',
    runLint: true,
    runSecurityAudit: true,
    testCoverage: true,
    coverageThreshold: 85,
    buildDocker: true,
    dockerRegistry: 'ghcr.io/yourcompany',
    dockerCredentialsId: 'github-packages-token'
)
```

### Multiple Pipelines in One Repository

For monorepos with multiple services:

```groovy
// Jenkinsfile - Monorepo example
@Library('pipeline-templates@v1.2.0') _

def services = [
    [name: 'api-gateway', path: 'services/api-gateway', tool: 'gradle'],
    [name: 'user-service', path: 'services/user-service', tool: 'maven'],
    [name: 'notification-service', path: 'services/notifications', tool: 'maven']
]

pipeline {
    agent any

    stages {
        stage('Build Services') {
            steps {
                script {
                    def parallelStages = [:]

                    services.each { service ->
                        parallelStages[service.name] = {
                            dir(service.path) {
                                standardPipeline(
                                    appName: service.name,
                                    buildTool: service.tool,
                                    checkoutEnabled: false
                                )
                            }
                        }
                    }

                    parallel parallelStages
                }
            }
        }
    }
}
```

### Configuration from YAML File

Load pipeline configuration from a file in the repository:

```groovy
// Jenkinsfile - YAML configuration
@Library('pipeline-templates@v1.2.0') _

import com.yourcompany.pipeline.BuildConfig

def config = new BuildConfig(this, [
    buildTool: 'maven',
    runTests: true
])

config.loadFromYaml('.pipeline.yaml')
config.loadFromEnv('PIPELINE_')

standardPipeline(config.getAll())
```

With a corresponding `.pipeline.yaml` file:

```yaml
# .pipeline.yaml
appName: my-service
buildTool: maven
jdkVersion: jdk17

testing:
  enabled: true
  coverage: true
  coverageThreshold: 80

deployment:
  enabled: true
  environment: staging
  strategy: rolling

notifications:
  slack:
    enabled: true
    channel: '#my-service-builds'
  email:
    enabled: false
```

## Testing Pipeline Templates

Testing pipeline templates before releasing them prevents production issues. Here is a testing approach using Jenkins shared library testing frameworks.

```groovy
// test/vars/StandardPipelineTest.groovy
// Unit tests for the standard pipeline template

import com.lesfurets.jenkins.unit.BasePipelineTest
import org.junit.Before
import org.junit.Test
import static org.junit.Assert.*

class StandardPipelineTest extends BasePipelineTest {

    @Before
    void setUp() {
        super.setUp()

        // Mock Jenkins environment variables
        binding.setVariable('env', [
            JOB_NAME: 'test-job',
            BUILD_NUMBER: '42',
            BRANCH_NAME: 'main'
        ])

        // Mock credentials
        helper.registerAllowedMethod('withCredentials', [List, Closure], { list, closure ->
            closure()
        })

        // Mock shell commands
        helper.registerAllowedMethod('sh', [String], { cmd ->
            println "Mock sh: ${cmd}"
            return ''
        })
    }

    @Test
    void testDefaultConfiguration() {
        def script = loadScript('vars/standardPipeline.groovy')

        script.call([:])

        // Verify default stages were executed
        assertTrue(helper.callStack.any { it.methodName == 'stage' && it.args[0] == 'Checkout' })
        assertTrue(helper.callStack.any { it.methodName == 'stage' && it.args[0] == 'Build' })
        assertTrue(helper.callStack.any { it.methodName == 'stage' && it.args[0] == 'Test' })
    }

    @Test
    void testDeployDisabledByDefault() {
        def script = loadScript('vars/standardPipeline.groovy')

        script.call([:])

        // Verify deploy stage was skipped
        assertFalse(helper.callStack.any {
            it.methodName == 'stage' && it.args[0] == 'Deploy' && it.args[1]?.when != false
        })
    }

    @Test
    void testCustomBuildTool() {
        def script = loadScript('vars/standardPipeline.groovy')

        script.call([buildTool: 'gradle'])

        // Verify gradle command was used
        assertTrue(helper.callStack.any {
            it.methodName == 'sh' && it.args[0].contains('gradlew')
        })
    }
}
```

## Best Practices for Pipeline Templates

Following these practices will help you maintain healthy pipeline templates over time.

### Keep Templates Focused

Each template should handle one type of workflow. Avoid creating a single template that tries to handle every possible scenario. Instead, create specialized templates for different use cases and a base template for shared logic.

### Document Configuration Options

Add clear documentation for every configuration option your template accepts:

```groovy
/**
 * Standard Pipeline Template
 *
 * Configuration Options:
 * @param appName         Application name (default: job name)
 * @param buildTool       Build tool: maven, gradle, npm (default: maven)
 * @param jdkVersion      JDK version to use (default: jdk17)
 * @param runTests        Enable test stage (default: true)
 * @param deployEnabled   Enable deployment stage (default: false)
 * @param timeoutMinutes  Pipeline timeout in minutes (default: 30)
 */
def call(Map config = [:]) {
    // Implementation
}
```

### Use Sensible Defaults

Templates should work out of the box with minimal configuration. Set defaults that make sense for most projects, and only require explicit configuration for values that vary between projects.

### Handle Errors Gracefully

Wrap potentially failing operations in try-catch blocks and provide meaningful error messages:

```groovy
def deployApplication(Map config) {
    try {
        sh config.deployScript
    } catch (Exception e) {
        echo "Deployment failed: ${e.message}"

        if (config.rollbackEnabled) {
            echo 'Attempting rollback...'
            sh config.rollbackScript
        }

        throw e
    }
}
```

### Log Important Information

Include logging that helps with debugging without being noisy:

```groovy
echo "Building ${env.APP_NAME} version ${env.BUILD_VERSION}"
echo "Using build tool: ${config.buildTool}"
echo "Deploy enabled: ${config.deployEnabled}"
```

## Conclusion

Pipeline templates transform Jenkins from a collection of ad-hoc scripts into a standardized CI/CD platform. By investing time in building well-structured templates, you reduce maintenance burden, improve consistency across projects, and make it easier for teams to adopt CI/CD best practices.

Start with a simple template that covers your most common use case. As you identify patterns across projects, extract them into shared functions and new templates. Version your templates carefully, and always test changes before releasing them to production pipelines.

The examples in this guide provide a foundation you can adapt to your organization's specific needs. The key is finding the right balance between flexibility and standardization, giving teams enough options to handle their unique requirements while maintaining consistency where it matters.
