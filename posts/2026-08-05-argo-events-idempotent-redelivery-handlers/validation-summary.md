# Validation Summary: Make Argo Event Handlers Idempotent Across Sensor Redelivery

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo Events Sensors, EventBus delivery, and triggers
- Argo Workflows
- Kubernetes object names, labels, and resource creation
- PostgreSQL constraints and atomic conflict handling
- CloudEvents
- GitHub webhooks
- YAML, SQL, and JSON
- Idempotent and resumable event processing

## Sources Consulted
- Argo Events, More About Sensors and Triggers: https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/
- Argo Events API reference: https://argoproj.github.io/argo-events/APIs/
- Argo Events trigger parameterization: https://argoproj.github.io/argo-events/tutorials/02-parameterization/
- Argo Events Argo Workflow trigger: https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/
- Argo Events Kubernetes object trigger: https://argoproj.github.io/argo-events/sensors/triggers/k8s-object-trigger/
- Argo Events Sensor listener implementation at commit `77cb8cb8f3e014ab3c66c2bfef886155f876ea86`: https://github.com/argoproj/argo-events/blob/77cb8cb8f3e014ab3c66c2bfef886155f876ea86/pkg/sensors/listener.go
- Argo Events Argo Workflow trigger implementation at commit `77cb8cb8f3e014ab3c66c2bfef886155f876ea86`: https://github.com/argoproj/argo-events/blob/77cb8cb8f3e014ab3c66c2bfef886155f876ea86/pkg/sensors/triggers/argo-workflow/argo-workflow.go
- Argo Events Kubernetes trigger implementation at commit `77cb8cb8f3e014ab3c66c2bfef886155f876ea86`: https://github.com/argoproj/argo-events/blob/77cb8cb8f3e014ab3c66c2bfef886155f876ea86/pkg/sensors/triggers/standard-k8s/standard-k8s.go
- Argo Workflows parameters: https://argo-workflows.readthedocs.io/en/latest/walk-through/parameters/
- Argo Workflows synchronization: https://argo-workflows.readthedocs.io/en/latest/synchronization/
- Kubernetes object names and IDs: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes labels and selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- PostgreSQL constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL `INSERT` and `ON CONFLICT`: https://www.postgresql.org/docs/current/sql-insert.html
- CloudEvents specification: https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md
- GitHub webhook delivery headers: https://docs.github.com/en/webhooks/webhook-events-and-payloads#delivery-headers

## Issues Found
- The introduction implied that Sensor trigger execution is generally redelivered or retried after a crash. Argo Events defaults trigger execution to at-most-once and defaults to no trigger retry. Clarified that `atLeastOnce: true` is required for at-least-once execution and that explicit retries use `retryStrategy`.
- The introduction described the Sensor duplicate cache as universally five minutes. The Argo Events delivery documentation's five-minute statement is scoped to its NATS Streaming discussion, while delivery implementations differ. Reworded this as a short-lived recent-event cache without assigning one duration to every EventBus path.
- The external API checkpoint advice assumed that every API accepting an idempotency key lets a client retrieve the original result. Changed it to recommend retrying with the same key or retrieving the result according to the specific API's contract.
- The Kubernetes resource section referred generically to an Argo Events “create trigger,” even though Workflows can be launched through the `argoWorkflow` `submit` operation or the generic Kubernetes `create` operation. Named both operations and retained the warning that neither automatically treats `AlreadyExists` as semantic success.
- The post said `generateName` always permits another object. Kubernetes normally generates a new suffixed name, but name generation can still fail with HTTP 409 after unsuccessful uniqueness attempts. Reworded the claim to say that `generateName` normally creates another object and therefore is not logical-operation deduplication.

## Review Notes
- The YAML under “Pass the Key into the Workflow” and “Use Deterministic Kubernetes Resources Carefully” is intentionally a manifest fragment rather than a standalone Workflow; the field paths and values are valid in context.
- The PostgreSQL table definition is syntactically valid. Its primary key enforces operation-key uniqueness, and PostgreSQL provides atomic conflict handling through `INSERT ... ON CONFLICT`; the post correctly warns against a separate check-then-act sequence.
- The post correctly treats transport deduplication, deterministic Kubernetes names, and Argo Workflows synchronization as supporting mechanisms rather than substitutes for durable effect-boundary idempotency.
- All URLs in the post resolved to the intended official documentation. No specific product version is claimed; the review used documentation and source current on 2026-08-06.
