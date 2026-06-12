# Validation Summary: How to Use Jenkins Shared Libraries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins Pipeline
- Jenkins Shared Libraries
- Groovy
- Declarative Pipeline
- Docker Pipeline
- Kubernetes `kubectl`
- Jenkins Test Harness
- Jenkins Pipeline Unit
- Spock

## Sources Consulted
- Jenkins Shared Libraries documentation: https://www.jenkins.io/doc/book/pipeline/shared-libraries/
- Jenkins Using a Jenkinsfile documentation: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- Jenkins Docker Pipeline documentation: https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins Pipeline `sh` step reference: https://www.jenkins.io/doc/pipeline/steps/workflow-durable-task-step/
- Jenkins Test Harness documentation: https://www.jenkins.io/doc/developer/testing/
- JenkinsRule Javadoc: https://javadoc.jenkins.io/component/jenkins-test-harness/org/jvnet/hudson/test/JenkinsRule.html
- Jenkins Pipeline Unit project documentation: https://github.com/jenkinsci/JenkinsPipelineUnit
- Kubernetes `kubectl set image` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes `kubectl rollout status` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post described each `vars/` file as becoming a global function. Jenkins exposes `vars/*.groovy` files as global variables; a `call()` method makes the variable invokable like a function. Updated the wording in the directory and custom-step sections.
- The `resources/` description omitted Jenkins' limitation that `libraryResource()` loads resources from external shared libraries. Updated the wording to include this scope.
- The `GitUtils.fileChanged()` example used `String.contains(filePath)`, which can match partial filenames. Changed it to compare against `readLines().contains(filePath)` for exact path matching.
- The `standardPipeline` example called shared-library class methods in a Declarative `environment` directive and called `notify.success()` / `notify.failure()` outside `script` blocks. Jenkins documents that object method calls from shared-library globals require `script` blocks in Declarative Pipeline. Moved dynamic environment setup into an `Initialize` stage with `script`, and wrapped notification method calls in `script`.
- The failure notification used `currentBuild.rawBuild.getLog(50)`, which commonly requires trusted access or script approval. Replaced it with a sandbox-friendlier failure message using `env.BUILD_NUMBER`.
- The global/folder library section implied an unsupported generic priority order. Replaced it with Jenkins-documented resolution notes covering implicit loading, default versions, override behavior, and the `library()` step limitation for implicitly loaded libraries.
- The folder-level library section did not mention that folder-level libraries are always untrusted. Added that caveat.
- The trusted library security instructions referred to disabling sandbox restrictions and permissive SCM settings. Reworded them to align with Jenkins' trusted library model and the current Manage Jenkins > System configuration labels.
- The Jenkins Test Harness example referenced `Result.FAILURE` without importing `hudson.model.Result`, and used a JUnit 4 rule without an explicit `@Test` annotation. Added the missing import and annotation.

## Review Notes
The remaining examples are illustrative and assume the required Jenkins plugins and credentials are installed, including Docker Pipeline, Slack notification support, Credentials Binding, Pipeline: Shared Groovy Libraries, and Kubernetes CLI access on the agent. The Docker, Git, and `kubectl` command usage is consistent with the official references checked.
