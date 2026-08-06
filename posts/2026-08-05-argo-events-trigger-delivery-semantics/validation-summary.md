# Validation Summary: Choose Argo Events Trigger Delivery Semantics by Failure Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo Events Sensors and triggers
- Argo Events EventBus implementations (JetStream, Kafka, and deprecated NATS)
- NATS JetStream consumers and acknowledgments
- Argo Workflows and WorkflowTemplates
- Kubernetes API object creation and naming
- HTTP triggers, status policies, retries, and idempotency

## Sources Consulted
- [Argo Events Trigger API](https://argoproj.github.io/argo-events/APIs/#argoproj.io/v1alpha1.Trigger)
- [Argo Events Sensors, delivery guarantees, retries, and DLQ triggers](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events HTTP trigger documentation](https://argoproj.github.io/argo-events/sensors/triggers/http-trigger/)
- [Argo Events Kubernetes object trigger documentation](https://argoproj.github.io/argo-events/sensors/triggers/k8s-object-trigger/)
- [Argo Events EventBus overview](https://argoproj.github.io/argo-events/concepts/eventbus/)
- [Argo Events Sensor listener implementation](https://github.com/argoproj/argo-events/blob/master/pkg/sensors/listener.go)
- [Argo Events JetStream Sensor connection implementation](https://github.com/argoproj/argo-events/blob/master/pkg/eventbus/jetstream/sensor/trigger_conn.go)
- [Argo Events HTTP trigger implementation](https://github.com/argoproj/argo-events/blob/master/pkg/sensors/triggers/http/http.go)
- [Argo Events standard Kubernetes trigger implementation](https://github.com/argoproj/argo-events/blob/master/pkg/sensors/triggers/standard-k8s/standard-k8s.go)
- [Argo Events at-least-once example](https://github.com/argoproj/argo-events/blob/master/examples/sensors/trigger-with-atleast-once-semantics.yaml)
- [NATS JetStream consumer acknowledgments and redelivery](https://docs.nats.io/nats-concepts/jetstream/consumers)
- [Kubernetes object names and `generateName`](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/)
- [Argo Workflows WorkflowTemplate references](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/#create-workflow-from-workflowtemplate-spec)

## Issues Found
- The post said an exhausted trigger failure enables broker redelivery. Current Sensor code waits for the blocking trigger, its configured retries, and any DLQ processing, but the EventBus handler then acknowledges the event even when those attempts fail. The text now states that broker redelivery instead remains possible when the Sensor dies or its acknowledgment is lost before completion.
- The EventBus claim was too broad. The deprecated NATS EventBus explicitly ignores `atLeastOnce`; the post now identifies JetStream or Kafka as the appropriate implementations when the setting matters.
- The at-most-once discussion could be read as a guarantee that an external side effect never repeats. The post now states that this mode is not a transactional uniqueness guarantee.
- The duplicate Workflow scenario conflated an ordinary lost response with broker redelivery. It now distinguishes an in-process `retryStrategy` retry from redelivery caused by a Sensor crash before broker acknowledgment.
- The Kubernetes idempotency guidance implied that the built-in `k8s` trigger could inspect an `AlreadyExists` response and accept a matching object. The built-in create trigger returns that response as an error, so the post now assigns inspection and conflict-to-success handling to custom trigger or recovery logic.
- The HTTP failure test implied status-code retry classification. By default, a received HTTP response is successful unless `policy.status.allow` rejects it, and the generic retry loop does not distinguish `403`, `429`, and `500`. The retry explanation and failure-injection step now describe the actual behavior.
- A single Workflow can coordinate two effects but does not make unrelated external effects atomic. The partial-success guidance now reserves the transactional-outbox recommendation for atomic database/effect coupling.

## Review Notes
- The YAML field names, nesting, HTTP method, Kubernetes `create` operation, Workflow `workflowTemplateRef`, and backoff values in the post match the current APIs.
- The current upstream at-least-once example places `atLeastOnce` under `template`, which conflicts with the generated Trigger API and CRD schema. The post correctly places it alongside `template`, `retryStrategy`, `rateLimit`, and `dlqTrigger` and advises validation against the installed CRD.
- Implementation-sensitive claims were checked against both the current Argo Events repository state and the latest published `v1.9.11` tag available during review.
