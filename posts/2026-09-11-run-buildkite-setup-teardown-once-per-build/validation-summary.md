# Validation Summary: How to Run Buildkite Setup and Teardown Once per Build

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Buildkite pipelines, command steps, job hooks, dependencies, and build metadata
- Kubernetes namespaces, labels, resource reconciliation, and finalizers
- kubectl
- Bash
- YAML

## Sources Consulted
- Buildkite agent hooks: https://buildkite.com/docs/agent/hooks
- Buildkite dependency failure and cancellation behavior: https://buildkite.com/docs/pipelines/configure/depends-on
- Buildkite command step attributes: https://buildkite.com/docs/pipelines/configure/step-types/command-step
- Buildkite environment variables, including BUILDKITE_BUILD_ID: https://buildkite.com/docs/pipelines/configure/environment-variables
- Buildkite metadata CLI: https://buildkite.com/docs/agent/cli/reference/meta-data
- kubectl create namespace: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- kubectl apply: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl label: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl delete: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes object names and IDs: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes finalizers: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Installed kubectl documentation: `kubectl label --help`.
- Bash built-in documentation: `help set` and `help export`. The GNU web manual could not be retrieved; local built-in help and syntax checks were used instead.
- Author link checked: https://github.com/nawazdhandala

## Issues Found
- **Namespace creation could precede ownership labels.** The original setup script created the namespace with `kubectl apply`, then issued a separate labeling request. Cancellation or agent loss between those requests could leave an unlabeled namespace that the proposed external label-based recovery process would miss. Changed setup to add both labels to the generated manifest using `kubectl label --local -f - ... -o yaml` before applying it. The namespace and its recovery labels now reach Kubernetes in the same manifest. Updated the adjacent explanation to describe this correction.

## Review Notes
- Confirmed that job hooks execute per command job and agent lifecycle hooks do not provide per-build orchestration.
- Confirmed the step fields and explicit dependencies. Cleanup allows failed dependencies and consumers that never run because setup failed; cancellation still requires external recovery.
- Confirmed build-scoped metadata get/set syntax and the build UUID used for deterministic resource identity. The prefixed UUID fits Kubernetes namespace naming constraints, and the label keys and values are valid.
- Confirmed client dry-run generation, stdin-based apply, local labeling, namespace lookup, ignore-not-found deletion, and asynchronous deletion flags. Namespace existence alone does not establish application readiness, as the post explains.
- Parsed the pipeline YAML and checked that cleanup depends on all three preceding steps. All three Bash examples passed `bash -n`.
- Executed the revised namespace-generation and local-labeling pipeline with the installed kubectl and an empty kubeconfig. Verified that the output contains the expected namespace name and both ownership labels before any server operation.
- No live Buildkite build or Kubernetes resource mutation was performed. Application installation, readiness checks, the repository-specific test runner, actual retry/cancellation behavior, and the external cleanup process still require the disposable-environment validation described in the post.
- No specific product versions are claimed. The reviewed commands and fields are documented and no deprecated usage was found. The existing termination and retry caveats remain appropriate.
- All external links in the post resolved to the intended documentation or author profile.
