# Validation Summary: How to Integrate Flux CD with Argo Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Argo Workflows
- Argo Events
- Kubernetes
- Helm
- Kaniko
- Go
- GitHub webhooks

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI reconcile documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Argo Helm chart repository index: https://argoproj.github.io/argo-helm/index.yaml
- Argo Workflows Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-workflows/values.yaml
- Argo Workflows WorkflowTemplate documentation: https://argo-workflows.readthedocs.io/en/latest/workflow-templates/
- Argo Workflows volume documentation: https://argo-workflows.readthedocs.io/en/latest/walk-through/volumes/
- Argo Workflows executor documentation: https://argo-workflows.readthedocs.io/en/latest/workflow-executors/
- Argo Events installation documentation: https://argoproj.github.io/argo-events/installation/
- Argo Events EventBus documentation: https://argoproj.github.io/argo-events/eventbus/eventbus/
- Argo Events GitHub EventSource documentation and examples: https://argoproj.github.io/argo-events/eventsources/setup/github/
- Argo Events Sensor documentation and examples: https://argoproj.github.io/argo-events/concepts/sensor/
- Go 1.26 release notes: https://go.dev/doc/go1.26
- Kaniko README: https://github.com/GoogleContainerTools/kaniko

## Issues Found
- The Argo Workflows HelmRelease used chart version `0.41.x` and `executor.type: emissary`. Current Argo Workflows chart releases are `1.0.x`, and non-Emissary executors were removed as of Argo Workflows 3.4. Updated the chart version and removed the obsolete executor setting.
- The Argo Workflows server auth configuration used `server.extraArgs` with `--auth-mode=server`. The current chart documents `server.authModes`, so the example now uses `authModes: [server]`.
- The Argo Events install omitted an EventBus. Argo Events requires a namespaced EventBus for EventSources and Sensors to communicate, so a default JetStream EventBus was added.
- The Kaniko build step used command substitution in arguments passed directly to `/kaniko/executor`, which would not be evaluated by a shell. Updated the step to use Kaniko's debug image and invoke `/kaniko/executor` through `sh -c`.
- The Go test container used `golang:1.22`, which is no longer a current supported Go release. Updated it to `golang:1.26`.
- The Argo Events Sensor did not specify a service account with permission to create Workflows. Added the service account, Role, RoleBinding, and `spec.template.serviceAccountName`.
- The GitHub EventSource omitted the service and externally reachable webhook URL needed for GitHub webhook delivery/registration. Added a service port and placeholder `webhook.url`.
- The GitHub webhook secret key name in the EventSource did not match the documented Argo Events examples. Aligned the EventSource and `kubectl create secret` command to use the `secret` key.

## Review Notes
- Local `helm`, `kubectl`, `flux`, and `argo` binaries were not installed in the review environment, so CLI behavior was checked against official documentation rather than local `--help` output.
- The tutorial still uses placeholder repository, registry, token, and ingress host values that readers must replace for their environment.
