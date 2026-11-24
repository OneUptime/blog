# Technical validation

Actual kubectl and a disposable API reproduced the identity-reuse retry sequence. The fixture used no functioning application workloads.

## Checks performed

- Reviewed kubectl0.34.0 drain initial node field selector, namespace/name eviction request, retry loop and UID-aware completion wait; checked upstream report and version differences
- Ran actual kubectl1.34.0 against a disposable Kubernetes1.34.0 API with seeded Ready Pod and zero-allowance PDB status; observed first eviction rejection
- Recreated the fixture Pod under its StatefulSet name with a different UID on worker-b and observed another retry from the original drain process
- Interrupted the original kubectl with SIGINT, confirmed worker-a remained cordoned, and executed the article fresh drain with timeout5m; replacement UID and deletionTimestamp remained unchanged
- Executed all five exact shell blocks, including before/current inventories, jq identity comparisons, PDB inspection and fresh node inventory; temporary kubeconfig removed and all local processes stopped
- Five shell blocks passed bash syntax and seven-node/six-edge Mermaid passed structural checking
- Generated1280x720 social image and visually reviewed two-line title and branding without clipping

## Sources checked

- https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-lifetime
- https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#pod-identity
- https://github.com/kubernetes/kubectl/blob/v0.34.0/pkg/drain/drain.go
- https://github.com/kubernetes/kubernetes/issues/138229
- https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- https://github.com/kubernetes/kubectl/blob/v0.34.0/pkg/drain/filters.go
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Limitations

- No scheduler, StatefulSet controller, PDB controller, kubelet or real application ran; the harness explicitly created/recreated Pods and seeded status
- The demonstrated behavior is scoped to kubectl1.34.0 and the local API fixture; other client/server versions, webhooks and maintenance operators were not exercised
- The harness did not relax the PDB to demonstrate destructive eviction of the replacement; the risk of name-targeted eviction is explained from tagged request-construction source
- Mermaid was structurally checked but not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
