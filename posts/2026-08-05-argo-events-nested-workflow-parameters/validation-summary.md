# Validation Summary: Pass Nested Argo Events Payloads to WorkflowTemplate Parameters Safely

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Argo Events Sensors, dependencies, filters, transforms, and workflow triggers
- Argo Workflows and WorkflowTemplate parameters
- Kubernetes custom resources and server-side dry run
- JQ and Lua event transformation
- Go templates and Sprig functions
- GJSON and SJSON path syntax
- JSON serialization and internal event contracts

## Sources Consulted

- [Argo Events v1.9.11 release](https://github.com/argoproj/argo-events/releases/tag/v1.9.11)
- [Argo Events trigger parameterization](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Argo Events event transformation](https://argoproj.github.io/argo-events/sensors/transform/)
- [Argo Events data filters](https://argoproj.github.io/argo-events/sensors/filters/data/)
- [Argo Events API reference](https://argoproj.github.io/argo-events/APIs/)
- [Argo Events GitHub event structure](https://argoproj.github.io/argo-events/eventsources/setup/github/)
- [Argo Events lint documentation](https://argoproj.github.io/argo-events/lint/)
- [Argo Events v1.9.11 parameter-resolution implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/sensors/triggers/params.go)
- [Argo Events v1.9.11 transform implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/sensors/dependencies/transform.go)
- [Argo Workflows v4.0.8 release](https://github.com/argoproj/argo-workflows/releases/tag/v4.0.8)
- [Argo Workflows parameters](https://argo-workflows.readthedocs.io/en/latest/walk-through/parameters/)
- [Argo Workflows WorkflowTemplate reference](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/)
- [Argo Workflows v4.0.8 AnyString implementation](https://github.com/argoproj/argo-workflows/blob/v4.0.8/pkg/apis/workflow/v1alpha1/anystring.go)
- [kubectl apply reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [jq 1.7 alternative operator](https://jqlang.org/manual/v1.7/#alternative-operator)
- [GJSON path syntax](https://github.com/tidwall/gjson/blob/master/SYNTAX.md)
- [SJSON path syntax](https://github.com/tidwall/sjson#path-syntax)

## Issues Found

- The WorkflowTemplate interpolated event-derived parameters directly into a `sh -c` program. A value containing a single quote could break out of the shell quoting and alter the command. The parameters are now assigned to container environment variables and expanded as double-quoted shell arguments, so the shell treats their contents as data.
- The explanation of JQ's `//` operator said that it treats `false` and `null` as alternative values. JQ actually discards left-hand results that are `false` or `null` and selects the right-hand alternative when no other left-hand result exists. The wording was corrected while retaining the warning that `false` may be meaningful for booleans.

## Review Notes

- The complete Sensor snippet passes `argo-events lint` from Argo Events v1.9.11.
- The WorkflowTemplate snippet passes `argo template lint` from Argo Workflows v4.0.8.
- The JQ normalization expression was exercised against a representative GitHub payload, and the upstream Argo Events dependency-transform and trigger-parameter unit test suites passed.
- Dependency transforms are present in Argo Events v1.6.0 and remain supported in v1.9.11. The stated transform ordering and event-data-only scope match the documentation and implementation.
- The `kubectl apply --server-side --dry-run=server -f sensor.yaml` syntax is current. Its result remains cluster-specific because it depends on the installed CRD and admission configuration.
- `argo-events lint` does not validate external resources such as the referenced ServiceAccount or WorkflowTemplate; the post appropriately also recommends server-side dry run and a nonproduction end-to-end delivery.
