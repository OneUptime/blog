# Validation Summary: How to Use Skaffold for Kubernetes Development Workflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Skaffold
- Kubernetes
- kubectl
- Helm
- Kustomize
- Docker
- Cloud Native Buildpacks
- Jib
- GitHub Actions
- GitLab CI
- VS Code debugging

## Sources Consulted
- Skaffold documentation: https://skaffold.dev/docs/
- Skaffold installation documentation: https://skaffold.dev/docs/install/
- Skaffold skaffold.yaml reference: https://skaffold.dev/docs/references/yaml/
- Skaffold file sync documentation: https://skaffold.dev/docs/filesync/
- Skaffold Helm deployer documentation: https://skaffold.dev/docs/deployers/helm/
- Skaffold Buildpacks builder documentation: https://skaffold.dev/docs/builders/builder-types/buildpacks/
- Skaffold custom builder documentation: https://skaffold.dev/docs/builders/builder-types/custom/
- Skaffold port forwarding documentation: https://skaffold.dev/docs/port-forwarding/
- Skaffold profiles documentation: https://skaffold.dev/docs/environment/profiles/
- Skaffold CLI reference: https://skaffold.dev/docs/references/cli/
- Skaffold v4beta6 schema reference: https://pkg.go.dev/github.com/GoogleContainerTools/skaffold/v2/pkg/skaffold/schema/v4beta6
- GitHub Actions checkout documentation: https://github.com/actions/checkout
- Azure k8s-set-context documentation: https://github.com/Azure/k8s-set-context

## Issues Found
- Updated Skaffold examples from `skaffold/v4beta6` to `skaffold/v4beta14`, the current schema version supported by the latest Skaffold v2.22.1 binary used for validation.
- Moved raw Kubernetes manifest paths from deprecated/invalid `deploy.kubectl.manifests` placement to top-level `manifests.rawYaml`, with `deploy.kubectl: {}` used to apply rendered manifests.
- Moved the Kustomize example from `deploy.kustomize.paths` to top-level `manifests.kustomize.paths`, with `deploy.kubectl: {}` for deployment.
- Corrected Helm image injection to use artifact-scoped template variables: `IMAGE_REPO_myapp`, `IMAGE_TAG_myapp`, and `IMAGE_DIGEST_myapp`.
- Added equivalent Helm image template mappings to the staging and production profile examples so Skaffold can associate the built artifact with the chart image fields.
- Updated `actions/checkout@v3` to `actions/checkout@v4`.
- Changed the debug port forwarding example from `resourceType: pod` to `resourceType: deployment`, because a pod created by a Deployment will not normally have the literal name `myapp`.

## Review Notes
Validated all 11 complete Skaffold YAML snippets with the latest Skaffold standalone binary (`v2.22.1`) using `skaffold diagnose --yaml-only`; all parsed successfully, including named profiles. The examples are still illustrative and assume supporting files such as Dockerfiles, Kubernetes manifests, Helm charts, and application dependencies exist.
