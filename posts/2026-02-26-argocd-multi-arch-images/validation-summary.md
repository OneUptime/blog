# Validation Summary: How to Make ArgoCD Work with Multi-Arch Images

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- Kubernetes Deployments, node selectors, node labels, and topology spread constraints
- Docker Buildx and Docker image manifests
- crane / go-containerregistry
- Helm values in Argo CD Applications
- GitHub Actions

## Sources Consulted
- Kubernetes well-known labels, annotations, and taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes assigning Pods to nodes: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/
- Kubernetes pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Docker Buildx build CLI reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker manifest CLI reference: https://docs.docker.com/reference/cli/docker/manifest/
- Docker build-push-action documentation: https://github.com/docker/build-push-action
- Docker setup-qemu-action documentation: https://github.com/docker/setup-qemu-action
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Image Updater application configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/
- Argo CD Image Updater image configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- GitHub Actions workflow syntax: https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax
- go-containerregistry / crane documentation: https://github.com/google/go-containerregistry

## Issues Found
- Kubernetes Deployment examples were missing `spec.template.metadata.labels` matching `spec.selector.matchLabels`. Added pod-template labels so the Deployment manifests are valid and so topology spread constraints can count the workload's own pods.
- The text said to use node affinity while the examples used `nodeSelector`. Updated the wording and Helm comment to say node selector.
- The topology spread section described the example as high availability across architectures. With `whenUnsatisfiable: ScheduleAnyway`, the constraint is a preference when perfect spread is not possible, so the wording now says it prefers spreading replicas.
- The Argo CD Image Updater example used legacy Application annotations as the primary current configuration. Updated it to the current `ImageUpdater` custom resource format from the stable docs.
- The Image Updater explanation said it does not care about architecture. Updated the wording to note that metadata-inspecting strategies such as `newest-build` or `digest` may need platform configuration when Image Updater runs on a different architecture than the workload.
- The CI section said the workflow triggered Argo CD sync, but the shown workflow only builds and pushes the image. Updated the wording to say the workflow builds multi-arch images for Argo CD to deploy.

## Review Notes
The Docker and GitHub Actions snippets use older major versions for some Docker actions, but the referenced actions and inputs are still valid. Future maintenance could update those action versions to the newest released majors after testing them in the target repository.
