# Validation Summary: Transform Argo Events Payloads with Lua or JQ Before Filtering

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Argo Events Sensors, dependencies, transformations, filters, conditions, and triggers
- Argo Events CLI
- JQ and the Go `gojq` implementation
- Lua and the GopherLua runtime
- CloudEvents data and context
- Kubernetes custom resources, server-side apply, and server dry-run validation
- Argo Workflows parameterization

## Sources Consulted

- [Argo Events event transformation documentation](https://argoproj.github.io/argo-events/sensors/transform/)
- [Argo Events filter introduction](https://argoproj.github.io/argo-events/sensors/filters/intro/)
- [Argo Events data filter documentation](https://argoproj.github.io/argo-events/sensors/filters/data/)
- [Argo Events script filter documentation](https://argoproj.github.io/argo-events/sensors/filters/script/)
- [Argo Events parameterization tutorial](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Argo Events lint documentation](https://argoproj.github.io/argo-events/lint/)
- [Argo Events v1.9.11 transformation implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/sensors/dependencies/transform.go)
- [Argo Events v1.9.11 filter implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/pkg/sensors/dependencies/filter.go)
- [Argo Events v1.9.11 CLI lint implementation](https://github.com/argoproj/argo-events/blob/v1.9.11/cmd/commands/lint.go)
- [gojq project documentation](https://github.com/itchyny/gojq)
- [GopherLua project documentation](https://github.com/yuin/gopher-lua)
- [Kubernetes `kubectl apply` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)

## Issues Found

- The primary Sensor example looked like a complete resource but omitted the required trigger. The introduction to the snippet now states that the trigger is omitted, making its excerpt status explicit without expanding the example's scope.
- The post linked to the Lua 5.4 reference manual, but Argo Events v1.9.11 executes transform scripts with GopherLua, which implements Lua 5.1 plus documented extensions. The post now identifies GopherLua and links to its compatibility documentation.
- The documented filter-order sentence omitted the script filter. The post now preserves the documented expression/data/context/time sequence and notes that the current Sensor implementation evaluates a configured script filter afterward.
- The post said transformed payload growth increases EventBus-to-Sensor processing. Transformation occurs inside the Sensor after the event has been received, so the text now attributes the additional work to Sensor processing and memory, logs, and generated resources.
- The post described Lua and JQ transforms as inherently pure. The Lua runtime is not an enforced purity sandbox, so the wording now presents side-effect-free reshaping as the required design practice rather than a runtime guarantee.
- The examples did not enforce string types for every field in their displayed contracts, even though the fixture matrix says wrong types must be rejected. String data filters were added for the previously unchecked fields; optional `revision` may remain empty but cannot pass as a non-string value.

## Review Notes

- The exact JQ and Lua examples were executed through the Argo Events v1.9.11 transformation implementation and produced the described normalized fields.
- A complete Sensor assembled from the JQ dependency and filter example with a log trigger passed `argo-events lint` built from Argo Events v1.9.11.
- The `argo-events lint sensor.yaml` syntax is current, and the `kubectl apply --server-side --dry-run=server -f sensor.yaml` flags match the current Kubernetes CLI reference.
- As the post correctly notes, schema and lint validation do not execute transformation logic; fixture events are still required to test runtime behavior and failure paths.
