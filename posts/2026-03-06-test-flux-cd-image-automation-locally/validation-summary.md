# Validation Summary: How to Test Flux CD Image Automation Locally

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Flux CD image-reflector-controller and image-automation-controller
- Flux ImageRepository, ImagePolicy, ImageUpdateAutomation, and GitRepository APIs
- Kubernetes manifests and kubectl
- kind local clusters
- Local Docker/OCI registry
- Docker image build, tag, and push workflows
- GitOps image update markers

## Sources Consulted
- Flux image reflector and automation controllers: https://fluxcd.io/flux/components/image/
- Flux ImagePolicy documentation and v1 status fields: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image reflector v1 API reference: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide and marker syntax: https://fluxcd.io/flux/guides/image-update/
- Flux install command documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- kind local registry documentation: https://kind.sigs.k8s.io/docs/user/local-registry/

## Issues Found
- The `local-registry.yaml` example created namespaced Pod and Service resources before creating the `registry` Namespace. Moved the Namespace to the beginning of the manifest so a direct `kubectl apply -f local-registry.yaml` can succeed.
- The kind registry configuration used the older direct `registry.mirrors` containerd patch. Updated it to the current kind-documented `config_path = "/etc/containerd/certs.d"` approach and added per-node `hosts.toml` configuration for both `localhost:5001` and `kind-registry:5000`.
- The registry setup script did not handle an existing stopped registry container. Added a `docker start` branch so rerunning the script works when the container exists but is not running.
- The split image/tag marker example used a Kubernetes Deployment with the tag stored separately in an environment variable, which does not update the actual container image tag. Replaced it with a values-style YAML example where repository and tag are separate fields, matching Flux's documented marker use case.
- The "Apply All Resources" command list omitted `image-policy-alpha.yaml` and `git-source-for-updates.yaml`, even though both resources were defined and the automation depends on the GitRepository. Added both apply commands.
- Several verification commands queried `.status.latestImage`, which is not the current `image.toolkit.fluxcd.io/v1` ImagePolicy status field. Updated them to read `.status.latestRef.image` and `.status.latestRef.tag`.

## Review Notes
The tutorial assumes a reachable in-cluster Gitea service and repository at `gitea.gitea.svc.cluster.local`; that setup is outside the scope of the post. The Flux CRDs and CLI examples otherwise match current documented Flux image automation APIs after the corrections above.
