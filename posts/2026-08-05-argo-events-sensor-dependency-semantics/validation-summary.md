# Validation Summary: Combine Argo Sensor Dependencies with AND, OR, Reset, and Latest Events

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Argo Events Sensors
- Argo Events trigger conditions and dependency state
- Argo Events EventBus implementations
- Argo Events trigger parameterization
- Argo Workflows and WorkflowTemplates
- Kubernetes custom resources and YAML
- CloudEvents identifiers

## Sources Consulted

- [Argo Events: Trigger Conditions](https://argoproj.github.io/argo-events/sensors/trigger-conditions/)
- [Argo Events: More About Sensors and Triggers](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events: Sensor concept](https://argoproj.github.io/argo-events/concepts/sensor/)
- [Argo Events API reference](https://argoproj.github.io/argo-events/APIs/)
- [Argo Events: Parameterization](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Argo Events: Argo Workflow Trigger](https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/)
- [Argo Events v1.9.11 release](https://github.com/argoproj/argo-events/releases/tag/v1.9.11)
- [Argo Events v1.9.11 trigger parameter resolver](https://github.com/argoproj/argo-events/blob/d13fde07d944c081c25574305911908c80faa98e/pkg/sensors/triggers/params.go)
- [Argo Events v1.9.11 JetStream trigger condition implementation](https://github.com/argoproj/argo-events/blob/d13fde07d944c081c25574305911908c80faa98e/pkg/eventbus/jetstream/sensor/trigger_conn.go)
- [Argo Events v1.9.11 Kafka trigger condition implementation](https://github.com/argoproj/argo-events/blob/d13fde07d944c081c25574305911908c80faa98e/pkg/eventbus/kafka/sensor/trigger_handler.go)
- [Argo Events v1.9.11 Sensor API types](https://github.com/argoproj/argo-events/blob/d13fde07d944c081c25574305911908c80faa98e/pkg/apis/events/v1alpha1/sensor_types.go)
- [Argo Workflows: DAG walkthrough](https://argo-workflows.readthedocs.io/en/latest/walk-through/dag/)

## Issues Found

- The OR-condition section said a parameter referencing a dependency that had not arrived would “resolve as missing.” The Argo Events parameter resolver instead returns an error when the dependency event is absent and the parameter source has no default. Changed the sentence to state that parameter resolution fails unless a default `src.value` is configured.

## Review Notes

- Reviewed against Argo Events v1.9.11, the latest release as of the validation date, and the current official documentation.
- The dependency, trigger condition, `conditionsReset`, timezone, Argo Workflow trigger, and `workflowTemplateRef` field paths match the current APIs. The YAML fragments are syntactically valid.
- The latest-event behavior, implicit AND behavior, scheduled condition reset behavior, lack of keyed cross-dependency joins, and lack of trigger sequencing are consistent with the official documentation and current EventBus-specific trigger implementations.
- No deprecated APIs, invalid links, or version-specific claims requiring further changes were found.
