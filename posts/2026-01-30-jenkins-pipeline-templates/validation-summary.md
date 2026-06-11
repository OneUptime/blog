# Validation Summary: How to Create Jenkins Pipeline Templates

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Jenkins Pipeline
- Jenkins Shared Libraries
- Declarative Pipeline
- Groovy
- Jenkins Pipeline steps and plugins
- Node.js, npm, pnpm, and Yarn
- Docker
- Maven and Gradle
- SonarQube
- Kubernetes kubectl
- YAML configuration
- Jenkins Pipeline Unit testing

## Sources Consulted
- Jenkins Shared Libraries documentation: https://www.jenkins.io/doc/book/pipeline/shared-libraries/
- Jenkins Declarative Pipeline syntax reference: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Pipeline Utility Steps documentation: https://www.jenkins.io/doc/pipeline/steps/pipeline-utility-steps/
- Jenkins Slack Notification Plugin step reference: https://www.jenkins.io/doc/pipeline/steps/slack/
- Jenkins JUnit Plugin step reference: https://www.jenkins.io/doc/pipeline/steps/junit/
- Jenkins Workspace Cleanup Plugin step reference: https://www.jenkins.io/doc/pipeline/steps/ws-cleanup/
- Jenkins HTML Publisher Plugin step reference: https://www.jenkins.io/doc/pipeline/steps/htmlpublisher/
- Jenkins HTTP Request Plugin step reference: https://www.jenkins.io/doc/pipeline/steps/http_request/
- Jenkins environment variables documentation: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#using-environment-variables
- npm audit documentation: https://docs.npmjs.com/cli/v8/commands/npm-audit
- npm ci documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/
- pnpm install documentation: https://pnpm.io/cli/install
- JenkinsPipelineUnit project documentation: https://github.com/jenkinsci/JenkinsPipelineUnit

## Issues Found
- The shared library tree did not include `resources/version.txt`, but the `versionCheck` example used `libraryResource('version.txt')`. Added `version.txt` under `resources/` and clarified the comment because `libraryResource` loads files from the shared library `resources` directory.
- The Node.js `runSecurityAudit` example said it would fail on high-severity vulnerabilities but used `|| true` on the threshold audit command, suppressing that failure. Changed the flow to archive a JSON report first, then run `npm audit --audit-level=${auditLevel}` without suppressing the exit code.
- The base pipeline default used `agent: 'any'` but rendered it as `agent { label pipelineConfig.agent }`, which would require a Jenkins node labeled `any` and is not equivalent to Declarative `agent any`. Changed the default label to `linux`.
- The monorepo example invoked `standardPipeline()` inside another Declarative `pipeline` block. Jenkins shared-library Declarative pipelines must be whole-pipeline definitions, and only one Declarative Pipeline can execute per build. Reworked the example to use Scripted Pipeline fan-out steps inside the existing pipeline.
- The `.pipeline.yaml` example used nested keys such as `testing.enabled` and `deployment.enabled`, but the provided `BuildConfig` and `standardPipeline` examples consume flat keys such as `runTests` and `deployEnabled`. Updated the YAML example to use the flat configuration keys.

## Review Notes
Several snippets depend on commonly installed Jenkins plugins: Slack Notification, Workspace Cleanup, Pipeline Utility Steps, HTML Publisher, HTTP Request, JUnit, Docker Pipeline, and SonarQube Scanner for Jenkins. The examples are technically valid when those plugins and matching tool names or agent labels are configured in Jenkins.
