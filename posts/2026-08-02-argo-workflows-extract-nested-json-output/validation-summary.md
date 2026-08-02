# Validation Summary: How to Extract a Nested JSON Field from an Argo Workflow Output Parameter

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered

- Argo Workflows
- Kubernetes Workflow custom resources
- Argo expression tags and expr
- JSON and JSONPath
- DAG and Steps output parameters
- `withParam` loops
- Python 3.13
- `kubectl`, Argo CLI, and `jq`

## Sources Consulted

- [Argo Workflows: Workflow Variables](https://argo-workflows.readthedocs.io/en/latest/variables/)
- [Argo Workflows: Output Parameters](https://argo-workflows.readthedocs.io/en/latest/walk-through/output-parameters/)
- [Argo Workflows: Loops](https://argo-workflows.readthedocs.io/en/latest/walk-through/loops/)
- [Argo Workflows: Conditional Artifacts and Parameters](https://argo-workflows.readthedocs.io/en/latest/conditional-artifacts-parameters/)
- [Argo Workflows: Kubernetes Resources](https://argo-workflows.readthedocs.io/en/latest/walk-through/kubernetes-resources/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Argo Workflows CLI: `argo get`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_get/)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Python 3.13: `json` encoder and decoder](https://docs.python.org/3.13/library/json.html)
- [Python: `pathlib`](https://docs.python.org/3/library/pathlib.html)
- [Argo Workflows v4 source and examples](https://github.com/argoproj/argo-workflows)
- [Argo Workflows v4.0.8 release](https://github.com/argoproj/argo-workflows/releases/tag/v4.0.8)
- [Docker Official Image: Python](https://hub.docker.com/_/python)
- [Docker Official Image: Alpine](https://hub.docker.com/_/alpine)

## Issues Found

- The script extractor chained `.get()` calls through `order` and `customer`. If either intermediate value was explicitly `null` or another non-object type, Python would raise `AttributeError` instead of producing the explicit validation error promised by the example. Added object-type checks for the document root, `order`, and `order.customer` before reading `id`.
- The resource-template output parameter was named `service-cluster-ip`, but its JSONPath selects `.status.loadBalancer.ingress[0].ip`, which is a load balancer ingress IP rather than the Service's cluster IP. Renamed the output parameter to `service-load-balancer-ip`.

## Review Notes

- Expression tags and `valueFrom.expression` require Argo Workflows v3.1 or later. As of the validation date, the reviewed patterns are supported by the current stable Argo Workflows v4.0.8 release.
- Both complete Workflow manifests passed offline linting with the Argo Workflows v4.0.8 CLI. All Python snippets passed syntax parsing, the cited container image tags resolved in their registries, and the JSONPath bracket-notation example was checked against the JSONPath implementation used by current Argo Workflows.
