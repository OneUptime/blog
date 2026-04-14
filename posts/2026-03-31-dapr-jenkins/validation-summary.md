# Validation Summary: How to Use Jenkins with Dapr Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Jenkins (Declarative Pipelines)
- Dapr CLI (runtime version 1.13.0)
- Docker (build, push, socket mounting)
- Kubernetes (kubectl deployments)
- Trivy (container image security scanning)
- pytest (unit and integration testing)
- Slack Notification Plugin (build notifications)

## Sources Consulted
- Jenkins Declarative Pipeline syntax documentation (https://www.jenkins.io/doc/book/pipeline/syntax/)
- Jenkins Credentials Binding Plugin documentation — `credentials()` helper in environment block (https://www.jenkins.io/doc/book/pipeline/jenkinsfile/#handling-credentials)
- Jenkins Kubernetes CLI Plugin — `withKubeConfig` step (https://plugins.jenkins.io/kubernetes-cli/)
- Jenkins Slack Notification Plugin — `slackSend` step (https://plugins.jenkins.io/slack/)
- Dapr CLI reference — `dapr init`, `dapr run`, `dapr stop` commands (https://docs.dapr.io/reference/cli/)
- Dapr CLI install script (https://raw.githubusercontent.com/dapr/cli/master/install/install.sh)
- Trivy CLI documentation — `image` subcommand, `--exit-code`, `--severity` flags (https://aquasecurity.github.io/trivy/)

## Issues Found
1. **Missing Slack Notification Plugin in Prerequisites**: The pipeline uses `slackSend` in the global `post` block for build failure/success notifications, but the "Slack Notification Plugin" was not listed in the Prerequisites section. Without this plugin installed, the pipeline would fail at the notification step. Added "Slack Notification Plugin (for build notifications)" to the prerequisites list.

## Review Notes
- The `credentials('docker-hub-credentials')` binding in the environment block assumes a "Username with Password" credential type in Jenkins. This is the only type that auto-generates the `_USR` and `_PSW` suffixed variables used in the Docker login step. This is standard practice and not incorrect, but readers should be aware the credential must be configured as that specific type.
- The `dapr init` command inside a Docker container works because the Docker socket is mounted from the host. This is a common CI pattern but means Dapr sidecar containers run on the host Docker daemon, not inside the build container.
- The `--resources-path` flag is correct for Dapr CLI versions compatible with runtime 1.13.0 (the older `--components-path` was deprecated in CLI v1.11).
- Trivy image scanning via Docker socket mount is a valid approach, though newer Trivy versions also support scanning without Docker via `--image-src` options.
