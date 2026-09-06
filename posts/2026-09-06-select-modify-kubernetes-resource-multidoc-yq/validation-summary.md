# Validation Summary: How to Select and Modify One Kubernetes Resource in Multi-Document YAML with yq

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Mike Farah yq v4.53.6
- Kubernetes Deployments, Services, resource identity, and namespaces
- YAML multi-document streams and serialization
- Bash environment variables, output redirection, and temporary-file replacement

## Sources Consulted
- yq v4.53.6 release: https://github.com/mikefarah/yq/releases/tag/v4.53.6
- Official yq operator documentation at the reviewed release (the linked GitBook pages could not be fetched, so their upstream Markdown was consulted):
  - Select: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/select.md
  - Assignment: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/assign-update.md
  - Document splitting: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/split-into-documents.md
  - Document index: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/document-index.md
  - Environment operators: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/env-variable-operators.md
  - With: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/with.md
  - Equality: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/equals.md
- yq CLI help (`yq --help`) and eval-all implementation: https://github.com/mikefarah/yq/blob/v4.53.6/cmd/evaluate_all_command.go
- yq formatting limitations: https://github.com/mikefarah/yq/blob/v4.53.6/README.md
- Kubernetes objects: https://kubernetes.io/docs/concepts/overview/working-with-objects/
- Kubernetes object names and identity: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Deployment requirements: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes DeploymentSpec field types: https://github.com/kubernetes/api/blob/master/apps/v1/types.go
- Installed Bash manual (`man bash`, REDIRECTION section).

## Issues Found
1. The worker Deployment lacked the required selector and Pod template. Added a matching worker selector, template labels, and a container with an illustrative image so the sample has the required Deployment structure.
2. The replica validation accepted integers above the Kubernetes field's signed 32-bit limit. Added the upper bound of 2147483647 and explained the range.
3. The wording about redirecting output over the bundle omitted Bash's earlier truncation of the input file. Distinguished replacing a file with filtered output from direct `> bundle.yaml` redirection, which truncates before yq reads.
4. The omitted-namespace example needed an explicit distinction between its chosen `default` convention and kubectl's namespace resolution. Clarified the effect of the namespace flag and current context.
5. The identity discussion could imply that API version distinguishes Kubernetes objects. Clarified that version selects a manifest representation, while Kubernetes identity uses API group, resource type, namespace, and name. Kept the exact-version manifest selectors.

## Review Notes
- Executed all 12 Bash code blocks against the corrected sample using the official yq v4.53.6 binary in an isolated temporary directory. All completed successfully with the supplied valid inputs.
- Parsed transformation output and verified that all three documents remain, the Service and worker are semantically unchanged, and only the selected Deployment receives the replica update. The `with` example also updates the intended container image.
- Confirmed the deliberately filtering example outputs only one Deployment and the count expression returns 1.
- Verified zero-match and duplicate-match cases produce nonzero status with no output for the guard, and the temporary-file workflow leaves the original unchanged on these failures. Both replacement and in-place examples succeed for one match.
- Confirmed that removing `split_doc` from the collected-array transformation removes the necessary separators, and that a plain selected-path update with `-e` succeeds even with no matching resource.
- Tested replica validation with 0 and 2147483647 (accepted), and -1, 2147483648, 3.5, a quoted YAML string, and a boolean (rejected).
- Confirmed experimentally that both `*` and `?` broaden string equality matches in v4.53.6; the original warning is correct for this release.
- The short selectors and namespace-free replacement example rely on the stated bundle scope or known-single-match precondition. Automation across namespaces should use the namespace-qualified selector shown earlier.
- The temporary-file replacement creates a new file with mktemp permissions; it does not preserve the original file's metadata. The article promises guarded content replacement, not metadata preservation.
- The exact-version examples are supported by the reviewed release. The post's documentation URLs correspond to the intended official resources, although GitBook retrieval was blocked in this environment.
- No Kubernetes cluster deployment was performed. Configuration structure was checked against official requirements; registry.example.com image references are illustrative and require real images before deployment.
