# Validation Summary: Argo Events vs WorkflowEventBinding for Workflow Triggers

## Status

validated

## Post Type

Technical comparison guide

## Technologies Covered

- Argo Workflows
- Argo Server events API
- WorkflowEventBinding
- Argo Events
- EventSource, EventBus, and Sensor custom resources
- Kubernetes RBAC and service accounts
- HTTP webhooks and CloudEvents
- NATS JetStream and Kafka event transport

## Sources Consulted

- [Argo Workflows events API and WorkflowEventBinding](https://argo-workflows.readthedocs.io/en/latest/events/)
- [Argo Workflows `argo server` CLI options](https://argo-workflows.readthedocs.io/en/latest/cli/argo_server/)
- [Argo Workflows webhook clients](https://argo-workflows.readthedocs.io/en/latest/webhooks/)
- [Argo Workflows access tokens](https://argo-workflows.readthedocs.io/en/latest/access-token/)
- [Argo Workflows WorkflowEventBinding CRD schema](https://github.com/argoproj/argo-workflows/blob/main/manifests/base/crds/full/argoproj.io_workfloweventbindings.yaml)
- [Argo Workflows server flag definitions](https://github.com/argoproj/argo-workflows/blob/main/cmd/argo/commands/server.go)
- [Argo Workflows event server implementation](https://github.com/argoproj/argo-workflows/blob/main/server/event/event_server.go)
- [Argo Events architecture](https://argoproj.github.io/argo-events/concepts/architecture/)
- [Argo Events EventBus](https://argoproj.github.io/argo-events/eventbus/eventbus/)
- [Argo Events webhook authentication](https://argoproj.github.io/argo-events/eventsources/webhook-authentication/)
- [Argo Events GitHub EventSource](https://argoproj.github.io/argo-events/eventsources/setup/github/)
- [Argo Events event transformation](https://argoproj.github.io/argo-events/sensors/transform/)
- [Argo Events Sensor filters](https://argoproj.github.io/argo-events/sensors/filters/intro/)
- [Argo Events trigger conditions](https://argoproj.github.io/argo-events/sensors/trigger-conditions/)
- [Argo Events trigger delivery, retries, rate limits, and dead-letter triggers](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events Argo Workflow trigger](https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/)
- [Argo Events API reference](https://argoproj.github.io/argo-events/APIs/)
- [Argo Events service accounts](https://argoproj.github.io/argo-events/service-accounts/)
- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes service accounts and cross-namespace access](https://kubernetes.io/docs/concepts/security/service-accounts/)

## Issues Found

- The post treated Argo Server event dispatch as unconditionally asynchronous. Current Argo Server versions dispatch synchronously by default; `--event-async-dispatch` opts into the in-memory operation queue. The comparison table, response semantics, failure guidance, test matrix, and conclusion now distinguish the default synchronous mode from optional asynchronous dispatch.
- The high-availability wording implied that multiple Argo Server replicas make already accepted queued events safe from a receiving-server failure. The operation queue is process-local, so replicas improve endpoint availability but do not durably replicate an accepted queued event. The post now states that distinction explicitly.
- The post referred to the binding's service account token, but a `WorkflowEventBinding` does not have a service account. The wording now assigns the required template-read and Workflow-create permissions to the authenticated client identity.

## Review Notes

- Both YAML examples parse successfully and match the current `argoproj.io/v1alpha1` CRD schemas and official examples. The `curl` request relies on `-d` to select POST, which is valid.
- The current Argo Workflows events guide still describes dispatch as always asynchronous. The generated `argo server` CLI reference and server source show that `--event-async-dispatch` defaults to false, so the corrections follow the current runtime behavior.
- The Argo Events delivery guarantees depend on the selected EventBus and trigger configuration. The post correctly avoids promising exactly-once business execution and recommends idempotency.
- All external links in the post returned HTTP 200 during validation.
