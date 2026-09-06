# Validation Summary: How to Split Kubernetes YAML into Files Named by Kind and Resource Name with yq

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Mike Farah yq v4, tested with v4.53.6
- Kubernetes resource manifests, namespaces, and List documents
- YAML multi-document streams
- Bash, environment variables, and filesystem staging

## Sources Consulted
- Mike Farah yq: Split into Multiple Files — https://mikefarah.gitbook.io/yq/usage/split-into-multiple-files
- Mike Farah yq: File Operators — https://mikefarah.gitbook.io/yq/operators/file-operators
- Mike Farah yq: String Operators — https://mikefarah.gitbook.io/yq/operators/string-operators
- Mike Farah yq: Boolean Operators — https://mikefarah.gitbook.io/yq/operators/boolean-operators
- Mike Farah yq: Environment Variable Operators — https://mikefarah.gitbook.io/yq/operators/env-variable-operators
- Mike Farah yq v4.53.6 split writer source — https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/printer_writer.go (read through the corresponding raw.githubusercontent.com URL)
- Mike Farah yq v4.53.6 release executable and local `--help` output — https://github.com/mikefarah/yq/releases/tag/v4.53.6
- Kubernetes: Object Names and IDs — https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes: Namespaces — https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes: Deployments — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- **Namespace-aware collision check did not compare generated filenames.** It compared slash-separated tuples, although output names join components with hyphens. Distinct valid tuples can therefore pass that check but select the same output file. Replaced its identity expression with the actual output filename expression and explicitly placed the preflight before splitting. Confirmed that ConfigMaps with namespace/name pairs `a` / `b-configmap-c` and `a-configmap-b` / `c` pass the old check but fail the corrected one.
- **The Deployment sample was presented as a complete Kubernetes object.** Its specification contains only replicas, without the required selector and Pod template. Kept the compact example, explicitly identified it as abbreviated and not ready to apply, and clarified that splitting preserves each entire input document.
- **List splitting lacked applicable preflight instructions.** The earlier checks operate on top-level documents and cannot directly validate the resources inside a List. Added the precise expression substitutions and input filename needed to validate and collision-check the items before splitting.

## Review Notes
- Executed all ten Bash blocks successfully against the supplied sample inputs using the official Darwin ARM64 yq v4.53.6 executable, with output confined to temporary directories.
- Verified the expected kind-name and namespace-aware filenames, List item output, indexed output, fresh staging directory behavior, and document-separator suppression. The adapted List preflights also passed.
- Tested rejection of empty input, an invalid resource name, explicit null namespace, and duplicate kind-name identities using the relevant gates. Each gate has its own scope; the component and collision checks must both succeed.
- Confirmed experimentally that a dotted name without an explicit suffix can remain `.com`, an explicit `.yaml` suffix is preserved, and a repeated filename is overwritten by the later document. The versioned writer source confirms extension detection, parent-directory creation, file truncation, and a zero-based result counter.
- The regular expressions are deliberately filesystem component checks, not complete Kubernetes validation. They do not enforce all API-specific naming constraints, namespace length limits, or filesystem filename-length limits. The existing distinction between an omitted namespace and cluster scope is correct.
- Validation and splitting must use the same unchanged input. Publication guarantees remain dependent on the filesystem and deployment process, as stated in the article.
- Kubernetes manifest requirements were reviewed against official documentation; no live cluster deployment or server-side schema validation was performed. The abbreviated Deployment is intentionally not deployable.
- The cited v4.53.6 release and source were available and verified. No deprecated syntax was identified in the tested commands. GitBook pages that the browser fetcher could not read were retrieved directly over HTTPS.
