# Technical validation

The article defines an explicit stateless-service policy and exercises its chart output, including expected failure paths and autoscaling minimums.

## Checks performed

- Executed strict Helm3.17.3 lint on the exact fixture chart
- Executed16 render/error cases: defaults, zero/two/three replicas, disabled and enabled modes, HPA minimum1/2, invalid enum, negative count, zero HPA minimum and string replica input
- Parsed generated YAML and checked object count, namespace, release-specific selector, integer maxUnavailable1 and absence of minAvailable; rendered PDBs passed Kubernetes1.34.0 OpenAPI schema validation
- Confirmed all four chart snippets exactly match executed fixture files; three shell blocks passed syntax and seven-node/eight-edge Mermaid structurally checked
- Generated1280x720 social image and visually reviewed two-line title and branding without clipping

## Sources checked

- https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- https://v1-34.docs.kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- https://helm.sh/docs/v3/topics/charts/#schema-files
- https://helm.sh/docs/v3/chart_template_guide/function_list/
- https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- https://helm.sh/docs/v3/helm/helm_template/
- https://helm.sh/docs/v3/helm/helm_lint/
- https://helm.sh/docs/v3/helm/helm_get_values/
- https://helm.sh/docs/v3/helm/helm_get_manifest/
- https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment
- https://github.com/helm/helm/blob/v3.17.3/pkg/engine/funcs.go

## Limitations

- No Helm release installation/upgrade, API admission test, real HPA, Pod scheduling, eviction or node drain was performed
- Fixture emits only a PDB; integration with a real workload requires shared selectors and the actual scaling contract
- Helm3.17.3 is the tested render binary, not a recommendation of the newest supported release; Mermaid not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
