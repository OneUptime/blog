# Validation Summary: Retry vs. Resubmit in Argo Workflows: How to Rerun Only Failed Nodes

## Status

validated

## Post Type

Technical operations guide

## Technologies Covered

- Argo Workflows v4.1 CLI and Workflow API
- Kubernetes Workflows, Pods, RBAC, object identity, and JSONPath
- Argo retry, resubmit, memoized resubmit, and `retryStrategy`
- Argo node field selectors
- Workflow Archive, node-status offloading, artifact garbage collection, and archived logs
- `jq` JSON processing

## Sources Consulted

- [Argo Workflows: `argo retry`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_retry/)
- [Argo Workflows: `argo resubmit`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_resubmit/)
- [Argo Workflows: Node Field Selectors](https://argo-workflows.readthedocs.io/en/latest/node-field-selector/)
- [Argo Workflows: Retries and `retryStrategy`](https://argo-workflows.readthedocs.io/en/latest/retries/)
- [Argo Workflows: Step Level Memoization](https://argo-workflows.readthedocs.io/en/latest/memoization/)
- [Argo Workflows: `argo get`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_get/)
- [Argo Workflows: `argo logs`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_logs/)
- [Argo Workflows: `argo archive get`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_archive_get/)
- [Argo Workflows: `argo archive retry`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_archive_retry/)
- [Argo Workflows: `argo archive resubmit`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_archive_resubmit/)
- [Argo Workflows: Workflow Archive](https://argo-workflows.readthedocs.io/en/latest/workflow-archive/)
- [Argo Workflows: v4.1 Upgrading Guide](https://argo-workflows.readthedocs.io/en/latest/upgrading/)
- [Argo Workflows: Artifacts and Artifact Garbage Collection](https://argo-workflows.readthedocs.io/en/latest/walk-through/artifacts/)
- [Argo Workflows: Configuring Archive Logs](https://argo-workflows.readthedocs.io/en/latest/configure-archive-logs/)
- [Argo Workflows: Offloading Large Workflows](https://argo-workflows.readthedocs.io/en/latest/offloading-large-workflows/)
- [Argo Workflows: Argo Server Auth Mode](https://argo-workflows.readthedocs.io/en/latest/argo-server-auth-mode/)
- [Argo Workflows: retry and resubmit implementation at the reviewed commit](https://github.com/argoproj/argo-workflows/blob/e0b632812367ad2f2e44c661104e08d717617cbb/workflow/util/util.go)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes: `kubectl auth can-i`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [jq Manual](https://jqlang.org/manual/)

## Issues Found

- A node-field-selector example claimed it could select only failed invocations of one template, but Argo retries the default failed-step set regardless of the selector. Replaced the example with a valid successful-node restart and clarified that `--node-field-selector` must be combined with `--restart-successful` and adds nodes rather than filtering failed nodes.
- Ordinary resubmit was said to rerun every node. Corrected this to say that source node status is not carried over and the graph is evaluated again, while independently configured template-level memoization may still return cached results.
- Memoized resubmit described all successful nodes as reused and implied that only failed work reruns. Corrected this to the implementation's more precise behavior: successful Pod nodes are represented as skipped/reused nodes, while failed or errored Pod nodes and non-Pod work are reevaluated.
- The archive section implied that `--name` and `--uid` disambiguate duplicate archived Workflow names. Clarified that name arguments are supported in v4.1 and later, the flags force identifier interpretation, and a UID is required when a name has multiple archived matches. Also clarified that archive retry creates a new live object with the archived name and a new UID.
- Raw `kubectl get` node inspection can miss compressed or offloaded node status. Changed node inspection to `argo get -o json` and documented that offloaded status requires the CLI to use Argo Server.
- Replaced the ambiguous phrase "Argo archived logs" with the feature's exact `archiveLogs` name.
- Angle-bracket placeholders in Bash fences were parsed as input/output redirections. Replaced them with executable example names and a quoted result-name variable.
- The RBAC check did not account for Argo Server auth modes using different Kubernetes identities. Clarified that operators must identify the effective identity and use `kubectl auth can-i --as` where appropriate.

## Review Notes

The review targeted the current Argo Workflows v4.1 documentation and checked the official implementation where the generated CLI reference did not fully specify behavior. All documented CLI flags and selector field names are current, and the shell, JSONPath, and `jq` snippets are syntactically valid. The v4.1 archive-name behavior is version-specific; Argo Workflows v4.0 and earlier require archived Workflow UIDs. The relevant Argo retry/resubmit workflow utility tests passed locally. Commands that require a live Kubernetes cluster or configured Argo Server were not executed against a cluster during this review.
