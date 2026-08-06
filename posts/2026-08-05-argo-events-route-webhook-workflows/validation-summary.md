# Validation Summary: Route One Argo Events Webhook to Different Workflows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo Events EventSource
- Argo Events Sensor
- Argo Events data filters and event transformations
- Argo Events trigger conditions and parameterization
- NATS JetStream and legacy NATS Streaming EventBus implementations
- Argo Workflows and WorkflowTemplate references
- Kubernetes, kubectl, and service accounts
- Webhooks and CloudEvents
- JQ and Lua

## Sources Consulted
- Argo Events v1.9.11 release: https://github.com/argoproj/argo-events/releases/tag/v1.9.11
- Argo Events API reference: https://argoproj.github.io/argo-events/APIs/
- Argo Events webhook EventSource: https://argoproj.github.io/argo-events/eventsources/setup/webhook/
- Argo Events webhook authentication: https://argoproj.github.io/argo-events/eventsources/webhook-authentication/
- Argo Events data filters: https://argoproj.github.io/argo-events/sensors/filters/data/
- Argo Events filter introduction: https://argoproj.github.io/argo-events/sensors/filters/intro/
- Argo Events trigger conditions: https://argoproj.github.io/argo-events/sensors/trigger-conditions/
- Argo Events duplicate dependencies and trigger behavior: https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/
- Argo Events trigger parameterization: https://argoproj.github.io/argo-events/tutorials/02-parameterization/
- Argo Events Argo Workflow trigger: https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/
- Argo Events event transformation: https://argoproj.github.io/argo-events/sensors/transform/
- Argo Events service accounts: https://argoproj.github.io/argo-events/service-accounts/
- Argo Events v1.9.11 Sensor types and validation source: https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/apis/events/v1alpha1/sensor_types.go and https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/reconciler/sensor/validate.go
- Argo Events v1.9.11 Argo Workflow trigger implementation and generated labels: https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/sensors/triggers/argo-workflow/argo-workflow.go
- Argo Workflows conditional execution: https://argo-workflows.readthedocs.io/en/latest/walk-through/conditionals/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- curl command-line reference: https://curl.se/docs/manpage.html

## Issues Found
- The post stated without qualification that one Sensor can define multiple dependencies for the same EventSource event. That works with JetStream, but Argo Events rejects duplicate `eventSourceName` and `eventName` combinations in one Sensor when using the legacy NATS Streaming EventBus. I added the JetStream prerequisite and the documented one-Sensor-per-route fallback for NATS Streaming.
- The routing table described rollback as limited to an allowed environment set, but the rollback dependency filtered only on `body.action` and therefore accepted any or missing environment. I added anchored `staging` and `production` environment values to that dependency so the YAML matches the routing table.
- The routing table said an unknown action would be rejected and alerted even though it had no matching dependency or trigger. In that configuration Argo Events starts no Workflow and cannot run an alert trigger, so I clarified that alerting must happen separately.

## Review Notes
- Reviewed against Argo Events v1.9.11, the latest release on 2026-08-06.
- The EventSource and Sensor examples pass the Argo Events v1.9.11 built-in linter when validated with its offline JetStream EventBus model, and every YAML block parses successfully.
- The `workflowTemplateRef` resources are valid skeletons, but the referenced WorkflowTemplates, RBAC objects, webhook Secret, EventBus, and deployment-specific rollback parameters must exist in the target cluster as the post indicates.
- The Sensor pod selector and generated Workflow label keys used by the `kubectl` examples match the current Argo Events implementation.
