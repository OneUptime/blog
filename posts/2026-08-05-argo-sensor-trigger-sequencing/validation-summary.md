# Validation Summary: Why Argo Sensor Triggers Do Not Wait for Each Other

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Argo Events Sensors and triggers
- Argo Workflow triggers
- Argo Workflows and WorkflowTemplates
- Workflow DAG dependencies and enhanced `depends` expressions
- Workflow retries, outputs, exit handlers, and synchronization
- Kubernetes custom resources and `kubectl`
- Argo Workflows CLI

## Sources Consulted

- [Argo Events Sensor concept](https://argoproj.github.io/argo-events/concepts/sensor/)
- [Argo Events Sensors and triggers](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events trigger conditions](https://argoproj.github.io/argo-events/sensors/trigger-conditions/)
- [Argo Events API reference](https://argoproj.github.io/argo-events/APIs/)
- [Argo Events Argo Workflow trigger](https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/)
- [Argo Events resource linting](https://argoproj.github.io/argo-events/lint/)
- [Argo Events 1.9.11 Sensor listener implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/sensors/listener.go)
- [Argo Events 1.9.11 Sensor API types](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/apis/events/v1alpha1/sensor_types.go)
- [Argo Workflows DAG documentation](https://argo-workflows.readthedocs.io/en/latest/walk-through/dag/)
- [Argo Workflows enhanced depends logic](https://argo-workflows.readthedocs.io/en/latest/enhanced-depends-logic/)
- [Argo Workflows retries](https://argo-workflows.readthedocs.io/en/latest/retries/)
- [Argo Workflows output parameters](https://argo-workflows.readthedocs.io/en/latest/walk-through/output-parameters/)
- [Argo Workflows exit handlers](https://argo-workflows.readthedocs.io/en/latest/walk-through/exit-handlers/)
- [Argo Workflows synchronization](https://argo-workflows.readthedocs.io/en/latest/synchronization/)
- [Argo Workflows WorkflowTemplates](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/)
- [Argo Workflows `argo get` CLI reference](https://argo-workflows.readthedocs.io/en/latest/cli/argo_get/)
- [Alpine Linux release branches](https://www.alpinelinux.org/releases/)

## Issues Found

- The post said that a task named in classic DAG `dependencies` must succeed before a dependent task runs. Argo's compatibility behavior also considers `Skipped` and `Daemoned` satisfied outcomes. The orchestration and output examples now use explicit enhanced expressions such as `depends: migrate.Succeeded`, and the explanation now accurately describes classic `dependencies` behavior.
- The trigger-retry explanation implied that `retryStrategy` by itself retries an unsuccessful trigger execution. In Argo Events 1.9.11, triggers without `atLeastOnce` are dispatched asynchronously, so their execution errors do not reach the caller's retry loop. The post now explains that `atLeastOnce: true` is required for observed execution retries and that this still does not provide exactly-once execution or cross-trigger sequencing.
- The post said `errorOnFailedRound` could put the Sensor into an error state and stop processing. Although the field and that description remain in the generated API reference, the Argo Events 1.9.11 Sensor implementation never reads the field. The post now warns readers not to rely on it and recommends idempotency, retries, and dead-letter handling instead.
- The examples used `alpine:3.20`, whose standard support ended on April 1, 2026. The image references were updated to the supported `alpine:3.23` series.

## Review Notes

- The Sensor and DAG fragments are intentionally partial. A deployment still needs the referenced `WorkflowTemplate` resources and appropriate Sensor and Workflow service-account RBAC.
- The Argo Events behavior was checked against the current v1.9.11 release implementation. The Sensor examples passed the official Argo Events linter, and the WorkflowTemplate passed offline linting with the Argo Workflows v4.0.8 CLI when supplied with stub definitions for its two external template references.
- The post's core recommendation—encode dependent work in one Workflow rather than relying on Sensor trigger list order—is correct.
