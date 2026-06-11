# Validation Summary: How to Implement Jenkins Shared Libraries Advanced

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Jenkins Shared Libraries
- Jenkins Declarative and Scripted Pipeline
- Groovy
- Jenkins Credentials Binding Plugin
- Jenkins Pipeline Unit
- Kubernetes kubectl
- Helm
- Terraform
- Docker
- Mermaid

## Sources Consulted
- Jenkins Shared Libraries documentation: https://www.jenkins.io/doc/book/pipeline/shared-libraries/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Credentials Binding Plugin Pipeline steps: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Jenkins Pipeline Unit documentation: https://github.com/jenkinsci/JenkinsPipelineUnit
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Helm lint command documentation: https://helm.sh/docs/helm/helm_lint/
- Terraform CLI documentation: https://developer.hashicorp.com/terraform/cli
- Apache Groovy JSON processing documentation: https://groovy-lang.org/processing-json.html
- Groovy JsonSlurperClassic API documentation: https://docs.groovy-lang.org/2.4.7/html/gapi/groovy/json/JsonSlurperClassic.html

## Issues Found
- The DSL example defined a Declarative `pipeline {}` block inside a class under `src/`. Jenkins documentation states that full Declarative Pipelines in shared libraries can only be defined in `vars/*.groovy` inside a `call` method, and only one Declarative Pipeline can run per build. Changed the builder to use Scripted Pipeline primitives (`node`, `stage`, `checkout`) so dynamic stages and conditionals work from the class.
- The library entry point was shown as `vars/pipeline.groovy`, which conflicts with Jenkins' Declarative `pipeline` block and did not match the earlier directory structure. Renamed the example entry point and Jenkinsfile usage to `standardPipeline`.
- The `PipelineBuilder` example referenced `GradleBuilder`, `NodeBuilder`, `GoBuilder`, and `KubernetesDeployer` without imports, and the directory tree did not include the Node and Go builder classes. Added the imports and listed the missing builder class files.
- The JSON configuration block included a JavaScript-style comment inside a `json` fenced block, which made the snippet invalid JSON. Removed the comment from the JSON snippet.
- The `ConfigLoader` used `JsonSlurper`, which can produce lazy map implementations that are problematic to keep as object state in Jenkins Pipeline CPS execution. Switched the example to `JsonSlurperClassic` and typed the stored map.

## Review Notes
The remaining snippets are illustrative and assume project-specific classes such as `DockerBuilder`, `GradleBuilder`, `NodeBuilder`, `GoBuilder`, and `KubernetesDeployer` exist. The kubectl, Helm, Terraform, credentials binding, shared-library layout, `libraryResource`, and Jenkins Pipeline Unit examples are consistent with the referenced documentation.
