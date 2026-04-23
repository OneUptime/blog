# Validation Summary: How to Push Images to Registries from Rancher Desktop

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- `nerdctl`
- Docker CLI
- Docker Hub
- Google Artifact Registry
- Private container registries

## Sources Consulted
- Rancher Desktop introduction: https://docs.rancherdesktop.io/
- Rancher Desktop installation requirements and Linux credential-store notes: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop image workflow and namespace behavior: https://docs.rancherdesktop.io/tutorials/working-with-images/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop release notes documenting `rdctl reset`: https://github.com/rancher-sandbox/rancher-desktop/releases
- Docker `login` reference: https://docs.docker.com/reference/cli/docker/login/
- Docker `image push` reference: https://docs.docker.com/reference/cli/docker/image/push/
- Docker `image tag` reference: https://docs.docker.com/reference/cli/docker/image/tag/
- `nerdctl` command reference: https://github.com/containerd/nerdctl/blob/main/docs/command-reference.md
- Google Artifact Registry authentication for Docker: https://docs.cloud.google.com/artifact-registry/docs/docker/authentication
- Google Artifact Registry naming format: https://cloud.google.com/artifact-registry/docs/docker/names
- Google Artifact Registry Docker quickstart: https://cloud.google.com/artifact-registry/docs/docker/store-docker-container-images
- Google Cloud transition guidance from Container Registry: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr

## Issues Found
- The original post title and description said the guide explained how to push images to registries, but the body was a generic Rancher Desktop overview covering Kubernetes and Helm instead of build, tag, authenticate, and push steps. I replaced those sections with registry-push instructions that match the stated topic.
- Several `rdctl` commands were outdated or incorrect for current Rancher Desktop documentation. I removed `rdctl status`, replaced deprecated or mismatched reset guidance with `rdctl reset --factory`, and updated container-engine configuration examples to current dotted flag names.
- The original description referenced GCR-era guidance without acknowledging that Container Registry was shut down for writes on March 18, 2025. I updated the post to use Google Artifact Registry commands and naming conventions instead.
- The post did not mention Rancher Desktop's `nerdctl` namespace behavior, which can cause pushes to fail or appear to miss local images if users build in `k8s.io`. I added the namespace caveat where relevant.
- The original article omitted the Linux `pass` setup required by Rancher Desktop for `docker login` and `nerdctl login`. I added the official `gpg` and `pass init` troubleshooting steps.

## Review Notes
- `rdctl set` requires Rancher Desktop to be running; the updated post keeps that flow but avoids version-pinning to Kubernetes releases that may not exist in a given Rancher Desktop build.
- Google Artifact Registry is the recommended replacement for legacy Container Registry workflows. Existing `gcr.io` URLs can still exist when hosted through Artifact Registry, but new guidance should prefer Artifact Registry terminology and hostnames.
