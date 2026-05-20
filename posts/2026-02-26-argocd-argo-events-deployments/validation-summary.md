# Validation Summary: How to Use Argo Events with ArgoCD for Event-Driven Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo Events
- Argo Workflows
- Kubernetes
- GitHub webhooks
- Kubernetes Ingress and RBAC
- Argo CD CLI and REST API

## Sources Consulted
- Argo Events installation documentation: https://argoproj.github.io/argo-events/installation/
- Argo Events EventBus documentation: https://argoproj.github.io/argo-events/eventbus/eventbus/
- Argo Events GitHub EventSource example: https://raw.githubusercontent.com/argoproj/argo-events/stable/examples/event-sources/github.yaml
- Argo Events EventSource API source: https://raw.githubusercontent.com/argoproj/argo-events/stable/pkg/apis/events/v1alpha1/eventsource_types.go
- Argo Events Sensor API source: https://raw.githubusercontent.com/argoproj/argo-events/stable/pkg/apis/events/v1alpha1/sensor_types.go
- Argo Events script filter documentation: https://argoproj.github.io/argo-events/sensors/filters/script/
- Argo Events service account documentation: https://argoproj.github.io/argo-events/service-accounts/
- Argo Events HTTP trigger documentation: https://argoproj.github.io/argo-events/sensors/triggers/http-trigger/
- Argo Events trigger conditions documentation: https://argoproj.github.io/argo-events/sensors/trigger-conditions/
- Argo CD webhook documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD app sync CLI documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD OpenAPI specification: https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/swagger.json

## Issues Found
- The Argo Events installation commands described the validating admission webhook manifest as the NATS EventBus. Updated the command comment and removed the namespace flag to match the official cluster-wide install flow. The post already creates the EventBus in the next step.
- The GitHub EventSource used an unsupported `filter.branches` field. Argo Events EventSource filters use an expression field, while branch filtering is correctly handled later by Sensor data filters. Removed the invalid branch filter block.
- The GitHub EventSource used `apiToken` for webhook management but omitted `webhook.url`, which Argo Events requires when it creates GitHub hooks. Added the externally reachable webhook URL matching the Ingress example.
- The Argo Workflow trigger Sensor referenced `argo-events-sa` for RBAC, but the Sensor did not set `spec.template.serviceAccountName`. Added it so the Sensor uses the service account authorized to submit workflows.
- The script filter example used `script.content` and attempted to decode `event` manually. Argo Events expects `filters.script` to be a string, and the event data is already available as the Lua global `event`. Updated the YAML accordingly.
- The Argo CD webhook secret example patched `argocd-cm`, but current Argo CD documentation stores provider webhook secrets in `argocd-secret` under `stringData`/`data`. Updated the command to patch `argocd-secret`.

## Review Notes
- The `argoproj/argocd:v2.9.0` image is an old Argo CD version, but the example remains structurally valid for demonstrating the CLI-based sync pattern. In production, readers should pin a currently supported Argo CD image version compatible with their installation.
- The direct HTTP trigger example hardcodes an authorization token placeholder. It is technically valid YAML, but a production version should use Argo Events `secureHeaders` with a Kubernetes Secret.
