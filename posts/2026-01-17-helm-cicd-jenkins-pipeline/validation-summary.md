# Validation Summary: Helm Chart CI/CD with Jenkins Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- Jenkins Declarative Pipeline
- Jenkins Scripted Pipeline
- Jenkins Kubernetes agents
- Jenkins Configuration as Code
- Docker Pipeline
- Trivy
- conftest / Open Policy Agent
- helm-unittest
- OCI chart registries / GitHub Container Registry
- Blue Ocean

## Sources Consulted
- Jenkins Pipeline Syntax: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Kubernetes plugin documentation: https://plugins.jenkins.io/kubernetes/
- Jenkins Configuration as Code plugin documentation: https://plugins.jenkins.io/configuration-as-code/
- Jenkins Configuration as Code credentials examples: https://github.com/jenkinsci/configuration-as-code-plugin/blob/master/demos/credentials/README.md
- Jenkins Blue Ocean documentation: https://www.jenkins.io/doc/book/blueocean/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Helm `helm push` command reference: https://helm.sh/docs/helm/helm_push/
- Helm `helm registry login` command reference: https://helm.sh/docs/helm/helm_registry_login/
- Helm `helm upgrade` command reference: https://helm.sh/docs/helm/helm_upgrade/
- Helm `helm lint` command reference: https://helm.sh/docs/helm/helm_lint/
- Trivy `config` command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_config/
- Trivy exit-code documentation: https://trivy.dev/docs/latest/configuration/others/
- conftest documentation: https://www.conftest.dev/
- helm-unittest documentation: https://github.com/helm-unittest/helm-unittest

## Issues Found
- The prerequisites listed the Kubernetes CLI plugin, but the declarative `agent { kubernetes { ... } }` and `container(...)` examples require the Jenkins Kubernetes plugin. Changed the prerequisite to "Kubernetes plugin" and added the JUnit plugin because the examples use the `junit` step.
- The examples logged in to `ghcr.io/myorg` as the registry host. Helm's registry login command authenticates to a host such as `ghcr.io`, while the organization/repository path belongs in the OCI reference. Split this into `REGISTRY_HOST` and `REGISTRY_PATH` and updated publish and deploy commands accordingly.
- The Trivy scan used `--exit-code 0` for high and critical findings, so it would not fail the CI stage. Changed it to `--exit-code 1`, and added the same failing behavior to the scripted pipeline example.
- The conftest policy test command ended with `|| true`, which made policy failures non-blocking. Removed that suppression so policy violations fail the stage.
- The declarative production deployment used an extra input choice and checked `params.CONFIRM`. The input approval gate already handles confirmation, and stage input parameters are not needed for this example. Simplified the stage to deploy after approval.
- The shared library example used the same combined registry value for login and OCI paths. Updated it to accept `registryHost` and `registryPath`.
- The Blue Ocean publish example attempted to run `helm push` against chart directories. Helm push uploads packaged chart archives, so the example now packages charts into `packages/` and pushes the resulting `.tgz` files.
- The Blue Ocean test example called `helm unittest` without installing the plugin in the snippet. Added an idempotent plugin installation step.

## Review Notes
Blue Ocean is still documented by Jenkins, but the Jenkins documentation notes that it is deprecated in July 2026 and recommends Pipeline Graph View or Stage View for users starting fresh. The post remains technically valid as of 2026-06-22, but this section may need a future refresh.
