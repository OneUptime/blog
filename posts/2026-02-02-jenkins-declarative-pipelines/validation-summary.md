# Validation Summary: How to Use Jenkins Declarative Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins Declarative Pipeline (Jenkinsfile syntax)
- Groovy (pipeline DSL)
- Jenkins plugins: NodeJS, Kubernetes, Docker, Lockable Resources, Timestamper, Email Extension, Slack, JUnit, HTML Publisher, Credentials Binding
- Docker (build, login, push, registries)
- Kubernetes (pod agent template)
- npm / Node.js (npm ci, npm audit, npm run)
- Maven / Java / JDK (tools directive)
- Shared Libraries (`@Library` annotation)

## Sources Consulted
- Jenkins Pipeline Syntax reference: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Pipeline `options` directive: https://www.jenkins.io/doc/book/pipeline/syntax/#options
- Jenkins Pipeline `post` conditions: https://www.jenkins.io/doc/book/pipeline/syntax/#post
- Jenkins Pipeline `when` directive: https://www.jenkins.io/doc/book/pipeline/syntax/#when
- Jenkins handling credentials: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#handling-credentials
- Jenkins pipeline-basic-steps: https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/
- NodeJS plugin: https://plugins.jenkins.io/nodejs/
- Lockable Resources plugin: https://plugins.jenkins.io/lockable-resources/
- Kubernetes plugin (agent yaml form)
- Credentials Binding plugin (`withCredentials` and `usernamePassword`)

## Issues Found
No technical issues found.

Verified specifically:
- `pipeline { agent ... stages { ... } post { ... } }` block structure is correct.
- `agent any`, `agent none`, `agent { label '...' }`, `agent { docker { image '...' args '...' } }`, and `agent { kubernetes { yaml '...' } }` syntaxes are all valid.
- `environment` block with `credentials('id')` correctly auto-creates `<VAR>_USR` and `<VAR>_PSW` environment variables for username/password credentials, so `$DOCKER_CREDS_USR` / `$DOCKER_CREDS_PSW` usage is correct.
- All `options` items used (`timeout`, `buildDiscarder`, `disableConcurrentBuilds`, `timestamps`, `retry`, `skipDefaultCheckout`, `lock`) are valid; stage-level `options` placement is correct.
- `post` conditions (`always`, `success`, `failure`, `changed`, `unstable`) are all valid Jenkins post conditions.
- `when` directive sub-clauses (`branch`, `expression`, `allOf`, `anyOf`) and the `parameters` block types (`string`, `choice`, `booleanParam`, `text`, `password`) are valid.
- `parallel { stage(...) }` inside a `stage` is the correct declarative-parallel form.
- `withCredentials([usernamePassword(...)]) { sh ... }` syntax is correct.
- `@Library('name@branch') _` annotation for shared libraries is correct.
- `checkout scm`, `input message: ...`, `junit`, `publishHTML`, `archiveArtifacts`, `cleanWs`, `dir(...)` are all valid Pipeline steps.
- `java --version` with `--` (double-dash) is correct for the JDK-17 tool used in the `tools` directive (Java 9+ supports both forms; `mvn --version` and `node --version` likewise valid).

## Review Notes
- The `nodejs` symbol in the `tools` directive requires the NodeJS plugin to be installed. The post mentions "Tool names must match those configured in Jenkins Global Tool Configuration," which implicitly covers this, but readers new to Jenkins may not realize NodeJS support is plugin-provided (unlike `maven` and `jdk`, which are core).
- Several plugin-dependent features are used without explicit plugin notes: `slackSend` (Slack plugin), `emailext` (Email Extension), `publishHTML` (HTML Publisher), `lock` (Lockable Resources), `kubernetes` agent (Kubernetes plugin), `timestamps` (Timestamper). These are commonly installed but not core.
- Example container images use `node:18-alpine` and `golang:1.21`. Node 18 reached EOL in April 2025 (Node 20/22 are current LTS) and Go 1.21 is older (Go 1.24+ is current as of 2026). These are illustrative examples and not technically wrong, but could be refreshed in a future revision.
- The `retry(N)` option's phrasing ("up to N times on failure") follows the wording used in Jenkins' own official syntax docs. The underlying `retry` step semantics make `N` the total attempt cap; readers should consult Jenkins docs if precise counting matters.
- The `booleanParam(name: 'FORCE_DEPLOY', ...)` defined in the final production pipeline is never referenced in the stages — harmless but slightly misleading. Not a technical error.
