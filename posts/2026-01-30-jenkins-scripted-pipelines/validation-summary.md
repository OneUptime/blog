# Validation Summary: How to Build Jenkins Scripted Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins Scripted Pipeline
- Jenkins Declarative Pipeline
- Groovy-based Pipeline syntax
- Jenkins Shared Libraries
- Jenkins Credentials Binding
- Jenkins Pipeline steps: `node`, `stage`, `parallel`, `retry`, `timeout`, `archiveArtifacts`, `stash`, `unstash`, `junit`, `input`
- Jenkins plugins: HTML Publisher, Workspace Cleanup, Email Extension, Slack Notification
- Docker CLI
- Kubernetes `kubectl`
- npm

## Sources Consulted
- Jenkins Pipeline documentation: https://www.jenkins.io/doc/book/pipeline/
- Jenkins Pipeline Syntax reference: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Pipeline Steps reference: https://www.jenkins.io/doc/pipeline/steps/
- Jenkins Credentials Binding Pipeline step reference: https://www.jenkins.io/doc/pipeline/steps/credentials-binding/
- Jenkins Shared Libraries documentation: https://www.jenkins.io/doc/book/pipeline/shared-libraries/
- Jenkins Pipeline Basic Steps reference: https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/
- Jenkins Core Pipeline steps reference: https://www.jenkins.io/doc/pipeline/steps/core/
- Jenkins HTML Publisher Pipeline step reference: https://www.jenkins.io/doc/pipeline/steps/htmlpublisher/
- Jenkins Workspace Cleanup Pipeline step reference: https://www.jenkins.io/doc/pipeline/steps/ws-cleanup/
- Jenkins Slack Notification Pipeline step reference: https://www.jenkins.io/doc/pipeline/steps/slack/
- Jenkins agent/controller documentation: https://www.jenkins.io/doc/book/using/using-agents/
- Docker `login` CLI reference: https://docs.docker.com/reference/cli/docker/login/
- Kubernetes `kubectl set image` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- npm `audit` CLI documentation: https://docs.npmjs.com/cli/v11/commands/npm-audit/

## Issues Found
- The post described Scripted Pipeline as having the "full power of Groovy" and implied plain Groovy semantics. Jenkins documents Scripted Pipeline as a Groovy-based DSL with differences from plain Groovy due to Pipeline durability and CPS serialization, so the wording was changed to "Groovy-based control flow" and similar phrasing.
- The post implied a Scripted Pipeline must be wrapped in a `node` block. Jenkins documents `node` as a key/core pattern but not a mandatory syntax requirement, so the wording was changed to describe it as the typical/common structure.
- The execution-flow diagram and text used the older term "Jenkins Master." Current Jenkins documentation uses "Jenkins controller," so the terminology was updated.
- The dynamic generation examples used `collection.each` closures. Jenkins documentation warns that some Groovy idioms such as `collection.each` are not fully supported in Scripted Pipeline because of CPS serialization, so those examples were changed to `for` loops and local loop variables.
- The Shared Library configuration path used "Manage Jenkins > Configure System." Current Jenkins documentation refers to "Manage Jenkins > System," so the navigation text was updated.
- The production example used `npm audit --production`. Current npm documentation describes dependency omission through the `omit` config and treats `--production` as a shorthand; the example was updated to `npm audit --omit=dev`.

## Review Notes
The Jenkins Pipeline examples rely on commonly installed plugins and tools (`htmlpublisher`, `ws-cleanup`, `slack`, `emailext`, Docker, `kubectl`, `nvm`, and npm scripts). The snippets are technically valid, but a real Jenkins controller must have those plugins installed and the referenced tools available on the selected agents.
