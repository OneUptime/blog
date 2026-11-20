# Validation Summary: Fix MLRun API 412 'Waiting for Migrations' After an Upgrade

## Status
validated

## Post Type
Technical troubleshooting and upgrade recovery guide.

## Technologies Covered
- MLRun Python SDK and HTTP API
- MLRun Community Edition Helm chart
- Kubernetes deployments, pods, jobs, logs, events, and persistent storage
- Database schema migrations and metadata preservation
- Python, Bash, kubectl, and JSONPath
- HTTP 412 Precondition Failed

## Sources Consulted
- [MLRun CE chart migration instructions](https://github.com/mlrun/ce/blob/development/charts/mlrun-ce/README.md#triggering-db-migrations): manual migration entry point, optional upgrade migration job, and schema downgrade restriction.
- [MLRun HTTP database client implementation](https://docs.mlrun.org/en/stable/_modules/mlrun/db/httpdb.html#HTTPRunDB.trigger_migrations): migration request and background-task waiting behavior.
- [MLRun API operation implementation](https://github.com/mlrun/mlrun/blob/development/server/py/services/api/api/endpoints/operations.py): chief routing, existing migration task handling, no-op response, and failed migration state.
- [MLRun API operation tests](https://github.com/mlrun/mlrun/blob/development/server/py/services/api/tests/unit/api/test_operations.py): exact HTTP 412 waiting message and successful migration trigger response.
- [MLRun API state definitions](https://github.com/mlrun/mlrun/blob/development/mlrun/common/schemas/_shared/constants.py): distinct waiting, in-progress, failed, completed, and online state descriptions.
- [MLRun client environment setup](https://docs.mlrun.org/en/stable/setup-guide.html): client compatibility, API URL configuration through MLRUN_DBPATH, and authentication setup.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/): resource listing, output formats, namespace selection, and sorting.
- [kubectl rollout status reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/): deployment rollout inspection and duration timeout.
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/): all-container logs, relative time filtering, and previous-container logs.
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/): list iteration, field selection, and quoted tab/newline output.
- [RFC 9110, section 15.5.13](https://www.rfc-editor.org/rfc/rfc9110.html#name-412-precondition-failed): HTTP 412 semantics.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post contains relevant implementation examples and qualifies for technical validation.
- The server test confirms that a project read receives HTTP 412 with the quoted waiting message before migrations are triggered. State definitions distinguish this from an active or failed migration; retaining the complete message is appropriate.
- The documented SDK method sends the migration operation and waits when the response provides a background task. It can return without a task when no migration is needed. The post correctly requires server-side confirmation and recovery checks rather than treating a returned client call as sufficient evidence.
- The server routes migration execution to the chief role. Its failed-migration state rejects retriggering until an API restart; the post appropriately recommends investigating the original exception rather than repeatedly triggering migrations. A waiting message after a prior failure must be interpreted in the context of restarts and the specific replica.
- The CE development chart documents an optional upgrade migration job and no schema downgrade path. These moving documentation targets do not establish support in every released chart; the post explicitly requires checking the installed version and upgrade instructions.
- All two Bash code blocks passed bash -n, and the Python code block passed Python AST parsing. Kubernetes flags and JSONPath syntax were checked against official references. No deprecated API or command was identified in the examples.
- Namespace, deployment, and pod names are intentional placeholders. The Python example assumes an installed compatible MLRun client with its endpoint and authentication configured before execution.
- The referenced technical links resolve to the intended official resources. The author's GitHub profile is attribution rather than a technical source.
- Validation used official documentation, upstream implementation/tests, and local syntax checks. No live MLRun deployment or Kubernetes cluster was supplied, so database migration execution, rollout completion, and workload recovery were not tested against an installation.
