# Validation Summary: How to Integrate ArgoCD with Argo Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Argo Workflows
- Argo Events
- Argo CD Image Updater
- Kubernetes
- GitOps
- Kaniko
- GitHub webhooks

## Sources Consulted
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Application declarative setup: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD sync options, including CreateNamespace: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo Workflows WorkflowTemplate documentation: https://argo-workflows.readthedocs.io/en/latest/workflow-templates/
- Argo Workflows volume documentation: https://argo-workflows.readthedocs.io/en/latest/walk-through/volumes/
- Argo Events getting started guide: https://argoproj.github.io/argo-events/quick_start/
- Argo Events GitHub EventSource documentation: https://argoproj.github.io/argo-events/eventsources/setup/github/
- Argo Events Argo Workflow trigger documentation: https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/
- Argo Events EventSource services documentation: https://argoproj.github.io/argo-events/eventsources/services/
- Argo CD Image Updater application configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/
- Argo CD Image Updater image configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Kaniko executor repository documentation: https://github.com/GoogleContainerTools/kaniko

## Issues Found
- The prerequisites installed Argo CD and Argo Workflows, but the post later used Argo Events resources. Added Argo Events installation, EventBus creation, and Sensor RBAC setup commands.
- The Argo Events Sensor and EventSource were placed in `argo-events` while the WorkflowTemplate and submitted Workflow were in `argo`, which made the example incomplete from an RBAC and namespace perspective. Moved the EventSource and Sensor example resources to `argo` and added `spec.template.serviceAccountName: operate-workflow-sa`.
- The GitHub EventSource used an API token but omitted the EventSource service and externally reachable `webhook.url` needed for GitHub webhook registration. Added a service block and placeholder reachable URL.
- The Kaniko Docker config secret mount did not map a Kubernetes `kubernetes.io/dockerconfigjson` secret key to `/kaniko/.docker/config.json`. Added the `items` mapping from `.dockerconfigjson` to `config.json`.
- The Argo CD Image Updater example used legacy Application annotations and the renamed `latest` strategy. Replaced it with the current `ImageUpdater` custom resource format and the `newest-build` update strategy.

## Review Notes
- The examples are still illustrative and use placeholder repositories, secrets, and URLs that users must replace for their environment.
- The workflow uses a shared ReadWriteOnce PVC across DAG tasks. This is valid Kubernetes syntax, but in multi-node clusters users may prefer artifacts, node affinity, or storage that supports the desired concurrent access pattern.
- The Kaniko project repository is archived, so teams may want to evaluate maintained builders such as BuildKit for new production CI pipelines.
