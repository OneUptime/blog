# How to Use Jenkins Shared Libraries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jenkins, Shared Libraries, CI/CD, DevOps, Groovy

Description: Learn how to create and use Jenkins Shared Libraries to share pipeline code across multiple projects and reduce duplication.

---

> "Write it once, use it everywhere. Jenkins Shared Libraries turn copy-paste pipelines into maintainable, testable code that scales across your organization."

## What Are Shared Libraries?

Jenkins Shared Libraries allow you to define reusable pipeline code in an external source control repository. Instead of duplicating the same pipeline logic across hundreds of Jenkinsfiles, you write it once in a shared library and call it from any pipeline.

| Without Shared Libraries | With Shared Libraries |
|--------------------------|----------------------|
| Copy-paste across repos | Single source of truth |
| Inconsistent pipelines | Standardized workflows |
| Hard to update | Update once, apply everywhere |
| No unit testing | Testable Groovy code |
| Scattered tribal knowledge | Documented, versioned code |

## Library Directory Structure

A shared library repository follows a specific structure:

```
(root)
+-- src/                     # Groovy source files (classes)
|   +-- org/
|       +-- company/
|           +-- Build.groovy
|           +-- Deploy.groovy
+-- vars/                    # Global variables and custom steps
|   +-- buildApp.groovy
|   +-- deployToK8s.groovy
|   +-- notify.groovy
|   +-- notify.txt           # Optional help documentation
+-- resources/               # Non-Groovy files (configs, templates)
|   +-- deployment.yaml
|   +-- config.json
+-- test/                    # Unit tests
    +-- groovy/
        +-- BuildTest.groovy
```

**Key directories:**

- `vars/` - Contains global variables accessible directly in pipelines. This is where you define custom steps.
- `src/` - Contains Groovy classes following standard Java package structure. Used for complex logic.
- `resources/` - Contains non-Groovy files loaded via `libraryResource()`.

## Creating Custom Steps (vars Directory)

Custom steps in `vars/` are the simplest way to share pipeline logic. Each file becomes a global function.

### Basic Custom Step

```groovy
// vars/buildApp.groovy

// This function is callable as buildApp() in any pipeline
def call(Map config = [:]) {
    // Default configuration values
    def dockerImage = config.dockerImage ?: 'maven:3.8-jdk-11'
    def buildCommand = config.buildCommand ?: 'mvn clean package'

    pipeline {
        agent {
            docker {
                image dockerImage
            }
        }
        stages {
            stage('Build') {
                steps {
                    sh buildCommand
                }
            }
            stage('Archive') {
                steps {
                    archiveArtifacts artifacts: '**/target/*.jar', fingerprint: true
                }
            }
        }
    }
}
```

### Custom Step with Multiple Methods

```groovy
// vars/notify.groovy

// Main call method - notify.call() or just notify()
def call(String message, String channel = '#builds') {
    slackSend channel: channel, message: message
}

// Additional methods - notify.success(), notify.failure()
def success(String projectName) {
    def message = ":white_check_mark: *${projectName}* build succeeded"
    slackSend channel: '#builds', color: 'good', message: message
}

def failure(String projectName, String errorMessage) {
    def message = ":x: *${projectName}* build failed\n```${errorMessage}```"
    slackSend channel: '#builds', color: 'danger', message: message
}

// Method for deployment notifications
def deployed(String projectName, String environment, String version) {
    def message = ":rocket: *${projectName}* v${version} deployed to *${environment}*"
    slackSend channel: '#deployments', color: 'good', message: message
}
```

### Pipeline Step with Closure Support

```groovy
// vars/withDockerBuild.groovy

// Allows: withDockerBuild(image: 'node:18') { sh 'npm test' }
def call(Map config, Closure body) {
    def image = config.image ?: 'alpine:latest'
    def registryUrl = config.registry ?: 'https://registry.hub.docker.com'
    def credentials = config.credentials ?: 'docker-hub-creds'

    docker.withRegistry(registryUrl, credentials) {
        docker.image(image).inside {
            // Execute the closure body inside the container
            body()
        }
    }
}
```

### Reusable Deployment Step

```groovy
// vars/deployToK8s.groovy

def call(Map config) {
    // Validate required parameters
    if (!config.namespace) {
        error "namespace is required"
    }
    if (!config.deployment) {
        error "deployment is required"
    }

    def namespace = config.namespace
    def deployment = config.deployment
    def image = config.image
    def kubeConfig = config.kubeConfig ?: 'kubeconfig-prod'
    def timeout = config.timeout ?: 300

    withCredentials([file(credentialsId: kubeConfig, variable: 'KUBECONFIG')]) {
        // Update the deployment image
        sh """
            kubectl set image deployment/${deployment} \
                ${deployment}=${image} \
                -n ${namespace}
        """

        // Wait for rollout to complete
        sh """
            kubectl rollout status deployment/${deployment} \
                -n ${namespace} \
                --timeout=${timeout}s
        """
    }
}
```

## Creating Classes (src Directory)

Use `src/` for complex logic that benefits from object-oriented design.

### Utility Class

```groovy
// src/org/company/GitUtils.groovy
package org.company

class GitUtils implements Serializable {

    def steps  // Reference to pipeline steps

    GitUtils(steps) {
        this.steps = steps
    }

    // Get the current branch name
    String getBranchName() {
        return steps.sh(
            script: 'git rev-parse --abbrev-ref HEAD',
            returnStdout: true
        ).trim()
    }

    // Get the short commit hash
    String getShortCommit() {
        return steps.sh(
            script: 'git rev-parse --short HEAD',
            returnStdout: true
        ).trim()
    }

    // Get the commit author
    String getAuthor() {
        return steps.sh(
            script: 'git log -1 --pretty=format:"%an"',
            returnStdout: true
        ).trim()
    }

    // Check if a file was changed in the last commit
    boolean fileChanged(String filePath) {
        def changes = steps.sh(
            script: "git diff --name-only HEAD~1 HEAD",
            returnStdout: true
        ).trim()
        return changes.contains(filePath)
    }

    // Get list of changed files
    List<String> getChangedFiles() {
        def output = steps.sh(
            script: "git diff --name-only HEAD~1 HEAD",
            returnStdout: true
        ).trim()
        return output ? output.split('\n').toList() : []
    }
}
```

### Build Configuration Class

```groovy
// src/org/company/BuildConfig.groovy
package org.company

class BuildConfig implements Serializable {

    String projectName
    String dockerRegistry
    String dockerImage
    String kubeNamespace
    List<String> notifyChannels
    Map<String, String> environments

    // Default constructor with sensible defaults
    BuildConfig() {
        this.dockerRegistry = 'registry.company.com'
        this.notifyChannels = ['#builds']
        this.environments = [
            dev: 'dev-cluster',
            staging: 'staging-cluster',
            prod: 'prod-cluster'
        ]
    }

    // Builder pattern for fluent configuration
    BuildConfig withProjectName(String name) {
        this.projectName = name
        return this
    }

    BuildConfig withDockerImage(String image) {
        this.dockerImage = image
        return this
    }

    BuildConfig withNamespace(String namespace) {
        this.kubeNamespace = namespace
        return this
    }

    // Get full image tag
    String getFullImageTag(String version) {
        return "${dockerRegistry}/${dockerImage}:${version}"
    }

    // Validate configuration
    void validate() {
        if (!projectName) {
            throw new IllegalStateException("projectName is required")
        }
        if (!dockerImage) {
            throw new IllegalStateException("dockerImage is required")
        }
    }
}
```

### Using Classes from vars/

```groovy
// vars/standardPipeline.groovy
import org.company.GitUtils
import org.company.BuildConfig

def call(Map params) {
    // Create instances of our classes
    def gitUtils = new GitUtils(this)
    def config = new BuildConfig()
        .withProjectName(params.projectName)
        .withDockerImage(params.dockerImage)
        .withNamespace(params.namespace ?: 'default')

    config.validate()

    pipeline {
        agent any

        environment {
            COMMIT_SHA = gitUtils.getShortCommit()
            BRANCH_NAME = gitUtils.getBranchName()
            IMAGE_TAG = config.getFullImageTag("${BRANCH_NAME}-${COMMIT_SHA}")
        }

        stages {
            stage('Build') {
                steps {
                    script {
                        docker.build(env.IMAGE_TAG)
                    }
                }
            }

            stage('Push') {
                steps {
                    script {
                        docker.withRegistry("https://${config.dockerRegistry}", 'registry-creds') {
                            docker.image(env.IMAGE_TAG).push()

                            // Also tag as latest for main branch
                            if (env.BRANCH_NAME == 'main') {
                                docker.image(env.IMAGE_TAG).push('latest')
                            }
                        }
                    }
                }
            }

            stage('Deploy') {
                when {
                    branch 'main'
                }
                steps {
                    deployToK8s(
                        namespace: config.kubeNamespace,
                        deployment: config.projectName,
                        image: env.IMAGE_TAG
                    )
                }
            }
        }

        post {
            success {
                notify.success(config.projectName)
            }
            failure {
                notify.failure(config.projectName, currentBuild.rawBuild.getLog(50).join('\n'))
            }
        }
    }
}
```

## Loading Libraries in Pipelines

### Implicit Loading (Recommended)

When a library is configured globally, it loads automatically:

```groovy
// Jenkinsfile - library loads implicitly
standardPipeline(
    projectName: 'my-service',
    dockerImage: 'my-service',
    namespace: 'production'
)
```

### Explicit Loading with @Library

```groovy
// Load specific version of a library
@Library('my-shared-library@v1.2.0') _

// Load multiple libraries
@Library(['common-lib@main', 'deploy-lib@v2.0']) _

// Load and import specific classes
@Library('my-shared-library') import org.company.BuildConfig

pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                buildApp(dockerImage: 'maven:3.8')
            }
        }
    }
}
```

### Dynamic Loading with library()

```groovy
// Load library dynamically based on condition
pipeline {
    agent any
    stages {
        stage('Setup') {
            steps {
                script {
                    // Load library at runtime
                    def lib = library('my-shared-library@main')

                    // Use loaded library
                    lib.org.company.GitUtils.new(this).getBranchName()
                }
            }
        }
    }
}
```

## Global vs Folder-Level Libraries

### Global Libraries

Configured in Jenkins system configuration, available to all pipelines:

**Manage Jenkins > Configure System > Global Pipeline Libraries**

```
Name: company-shared-lib
Default version: main
Retrieval method: Modern SCM
  - Git
  - Project Repository: https://github.com/company/jenkins-shared-lib
```

Global libraries can be trusted (run without sandbox) or untrusted.

### Folder-Level Libraries

Configured at the folder level, available only to pipelines in that folder:

**Folder > Configure > Pipeline Libraries**

This is useful for team-specific libraries or when different teams need different library versions.

### Library Priority

1. Libraries specified in the Jenkinsfile (`@Library`)
2. Folder-level libraries
3. Global libraries

## Versioning Libraries

Use Git tags and branches for versioning:

```groovy
// Use a specific tag
@Library('shared-lib@v1.2.3') _

// Use a branch
@Library('shared-lib@release/2.0') _

// Use a commit SHA
@Library('shared-lib@abc1234') _

// Use main/master for latest (not recommended for production)
@Library('shared-lib@main') _
```

### Semantic Versioning Strategy

```bash
# Tag releases with semantic versions
git tag -a v1.0.0 -m "Initial stable release"
git tag -a v1.1.0 -m "Added deployToK8s step"
git tag -a v1.1.1 -m "Fixed deployToK8s timeout handling"
git push --tags
```

### Version Migration Guide

Keep a CHANGELOG.md in your library repository:

```markdown
# Changelog

## [2.0.0] - 2026-01-27
### Breaking Changes
- `deployToK8s` now requires `namespace` parameter
- Removed deprecated `deployToECS` step

### Added
- `deployToK8s.rollback()` method
- Support for canary deployments

## [1.2.0] - 2026-01-15
### Added
- `notify.deployed()` method for deployment notifications
```

## Testing Shared Libraries

### Unit Testing with Spock

```groovy
// test/groovy/vars/NotifyTest.groovy
import spock.lang.Specification

class NotifyTest extends Specification {

    def notify
    def slackMessages = []

    def setup() {
        // Create a mock pipeline context
        def binding = new Binding()
        binding.setVariable('slackSend', { Map args ->
            slackMessages << args
        })

        def shell = new GroovyShell(binding)
        notify = shell.evaluate(new File('vars/notify.groovy'))
    }

    def "success sends green message to builds channel"() {
        when:
        notify.success('my-project')

        then:
        slackMessages.size() == 1
        slackMessages[0].channel == '#builds'
        slackMessages[0].color == 'good'
        slackMessages[0].message.contains('my-project')
        slackMessages[0].message.contains('succeeded')
    }

    def "failure sends red message with error details"() {
        when:
        notify.failure('my-project', 'NullPointerException')

        then:
        slackMessages.size() == 1
        slackMessages[0].color == 'danger'
        slackMessages[0].message.contains('NullPointerException')
    }
}
```

### Integration Testing with Jenkins Test Harness

```groovy
// test/groovy/vars/DeployToK8sTest.groovy
import org.junit.Rule
import org.jvnet.hudson.test.JenkinsRule
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition
import org.jenkinsci.plugins.workflow.job.WorkflowJob

class DeployToK8sTest {

    @Rule
    public JenkinsRule jenkins = new JenkinsRule()

    void testDeployRequiresNamespace() {
        def job = jenkins.createProject(WorkflowJob, 'test-job')
        job.definition = new CpsFlowDefinition('''
            @Library('my-shared-lib@test') _
            deployToK8s(deployment: 'my-app', image: 'my-image:latest')
        ''', true)

        def build = jenkins.buildAndAssertStatus(Result.FAILURE, job)
        jenkins.assertLogContains('namespace is required', build)
    }
}
```

### Pipeline Testing with Jenkins Pipeline Unit

```groovy
// test/groovy/TestHelper.groovy
import com.lesfurets.jenkins.unit.BasePipelineTest

class TestHelper extends BasePipelineTest {

    @Override
    void setUp() {
        super.setUp()

        // Register shared library
        helper.registerSharedLibrary(
            library()
                .name('my-shared-lib')
                .defaultVersion('main')
                .allowOverride(true)
                .implicit(false)
                .targetPath('.')
                .retriever(localSource('.'))
                .build()
        )

        // Mock pipeline steps
        helper.registerAllowedMethod('sh', [Map], { Map args ->
            if (args.returnStdout) {
                return 'mocked-output'
            }
        })

        helper.registerAllowedMethod('slackSend', [Map], { /* mock */ })
        helper.registerAllowedMethod('withCredentials', [List, Closure], { list, closure ->
            closure()
        })
    }
}
```

## Security Considerations

### Sandbox Restrictions

By default, shared libraries run in the Groovy sandbox with restricted permissions:

```groovy
// This will fail in sandbox mode
def process = "ls -la".execute()  // Runtime.exec is blocked

// Use approved methods instead
def output = sh(script: 'ls -la', returnStdout: true)
```

### Script Approval

For global trusted libraries, disable sandbox restrictions carefully:

**Manage Jenkins > Configure System > Global Pipeline Libraries**
- Check "Load implicitly" for auto-loading
- Check "Allow default version to be overridden"
- For trusted libraries, leave "Modern SCM" security settings permissive

### Credentials Handling

```groovy
// vars/secureStep.groovy

def call(Map config) {
    // Never log credentials
    def sensitiveData = config.password

    // Use withCredentials to inject secrets
    withCredentials([
        usernamePassword(
            credentialsId: config.credentialsId,
            usernameVariable: 'USERNAME',
            passwordVariable: 'PASSWORD'
        )
    ]) {
        // Credentials available as environment variables
        sh '''
            # Password is masked in logs
            curl -u $USERNAME:$PASSWORD https://api.example.com
        '''
    }
}
```

### Input Validation

```groovy
// vars/deployToK8s.groovy

def call(Map config) {
    // Validate and sanitize inputs
    def namespace = config.namespace?.replaceAll(/[^a-z0-9-]/, '')
    def deployment = config.deployment?.replaceAll(/[^a-z0-9-]/, '')

    if (!namespace || namespace.length() < 2) {
        error "Invalid namespace: ${config.namespace}"
    }

    if (!deployment || deployment.length() < 2) {
        error "Invalid deployment: ${config.deployment}"
    }

    // Safe to use in shell commands now
    sh "kubectl get deployment ${deployment} -n ${namespace}"
}
```

## Using Resources

Load configuration files, templates, and other resources:

```groovy
// resources/kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{NAME}}
  namespace: {{NAMESPACE}}
spec:
  replicas: {{REPLICAS}}
  template:
    spec:
      containers:
        - name: app
          image: {{IMAGE}}
```

```groovy
// vars/applyK8sTemplate.groovy

def call(Map config) {
    // Load the template from resources
    def template = libraryResource('kubernetes/deployment.yaml')

    // Replace placeholders
    def manifest = template
        .replace('{{NAME}}', config.name)
        .replace('{{NAMESPACE}}', config.namespace)
        .replace('{{REPLICAS}}', config.replicas.toString())
        .replace('{{IMAGE}}', config.image)

    // Write and apply
    writeFile file: 'deployment.yaml', text: manifest
    sh 'kubectl apply -f deployment.yaml'
}
```

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Keep steps focused** | Each var should do one thing well |
| **Use descriptive names** | `deployToK8s` not `deploy`, `notifySlack` not `notify` |
| **Document parameters** | Add `.txt` files in vars/ for help |
| **Version with tags** | Use semantic versioning for releases |
| **Test your code** | Unit test classes, integration test steps |
| **Validate inputs** | Check required params, sanitize shell inputs |
| **Handle errors** | Use try-catch and meaningful error messages |
| **Log appropriately** | Use echo for progress, avoid logging secrets |
| **Make it configurable** | Use defaults but allow overrides |
| **Keep backward compatibility** | Deprecate before removing |

## Common Patterns

### Factory Pattern for Environments

```groovy
// vars/getEnvironment.groovy

def call(String envName) {
    def environments = [
        dev: [
            cluster: 'dev-cluster',
            namespace: 'development',
            replicas: 1
        ],
        staging: [
            cluster: 'staging-cluster',
            namespace: 'staging',
            replicas: 2
        ],
        prod: [
            cluster: 'prod-cluster',
            namespace: 'production',
            replicas: 3
        ]
    ]

    if (!environments.containsKey(envName)) {
        error "Unknown environment: ${envName}. Valid: ${environments.keySet()}"
    }

    return environments[envName]
}
```

### Pipeline Template Pattern

```groovy
// vars/microservicePipeline.groovy

def call(Closure body) {
    // Default configuration
    def config = [
        dockerRegistry: 'registry.company.com',
        kubeNamespace: 'default',
        runTests: true,
        notifySlack: true
    ]

    // Allow overrides
    body.resolveStrategy = Closure.DELEGATE_FIRST
    body.delegate = config
    body()

    // Run the pipeline with merged config
    pipeline {
        agent any
        stages {
            stage('Build') {
                steps {
                    sh "docker build -t ${config.dockerRegistry}/${config.imageName}:${BUILD_NUMBER} ."
                }
            }
            stage('Test') {
                when { expression { config.runTests } }
                steps {
                    sh 'npm test'
                }
            }
            stage('Deploy') {
                steps {
                    deployToK8s(
                        namespace: config.kubeNamespace,
                        deployment: config.imageName,
                        image: "${config.dockerRegistry}/${config.imageName}:${BUILD_NUMBER}"
                    )
                }
            }
        }
    }
}

// Usage in Jenkinsfile:
// microservicePipeline {
//     imageName = 'my-service'
//     kubeNamespace = 'production'
//     runTests = true
// }
```

Jenkins Shared Libraries are essential for scaling CI/CD across organizations. They provide consistency, reduce maintenance overhead, and enable testing of your pipeline code. Start with simple vars/ functions and evolve to classes as your needs grow.

For monitoring your Jenkins pipelines and deployments, [OneUptime](https://oneuptime.com) provides comprehensive observability with alerts, dashboards, and incident management to keep your CI/CD running smoothly.
