# Validation Summary: How to Set Up Portainer in an Air-Gapped Environment

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer CE and BE
- Docker Engine and Docker CLI
- Docker Registry (Distribution)
- Helm
- Kubernetes
- SHA-256 checksum verification

## Sources Consulted
- Portainer CE Docker install docs: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Agent install docs: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer Docker update docs: https://docs.portainer.io/start/upgrade/docker
- Portainer custom registry docs: https://docs.portainer.io/admin/registries/add/custom
- Portainer deprecated features docs: https://docs.portainer.io/advanced/deprecated
- Portainer requirements docs: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer lifecycle policy: https://docs.portainer.io/sts/start/lifecycle
- Portainer Kubernetes chart index: https://raw.githubusercontent.com/portainer/k8s/master/index.yaml
- Portainer Kubernetes chart values: https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/values.yaml
- Portainer Kubernetes repo README: https://raw.githubusercontent.com/portainer/k8s/master/README.md
- Docker image save docs: https://docs.docker.com/reference/cli/docker/image/save/
- Docker daemon / insecure registry docs: https://docs.docker.com/reference/cli/dockerd/
- CNCF Distribution registry deployment docs: https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution insecure registry docs: https://distribution.github.io/distribution/about/insecure/
- Helm pull docs: https://helm.sh/docs/v3/helm/helm_pull/
- Kubernetes container runtime docs: https://kubernetes.io/docs/setup/production-environment/container-runtimes

## Issues Found
- Corrected the Portainer image names. The post used `portainer/portainer-agent` and `portainer/portainer-be`, but the official images are `portainer/agent` and `portainer/portainer-ee`. I updated the examples and aligned them to the supported `lts` tag.
- Removed the deprecated `--no-analytics` flag from the Portainer startup example. Current Portainer documentation marks that flag as deprecated, and newer releases no longer use the older analytics behavior described in the post.
- Added the local registry image to the offline transfer workflow and updated the registry container image from `registry:2` to `registry:3`. Without transferring the registry image first, the registry setup step would fail in a true air-gapped environment.
- Fixed the custom registry URL example to use `http://your-server-ip:5000`. Portainer assumes `https://` when no protocol is provided, so the original example did not match the plain HTTP registry configured earlier in the post.
- Replaced the invalid `daemon.json` example. The original JSON block contained a comment and an unnecessary `local-registry:5000` entry, which made the snippet invalid or misleading. I replaced it with valid Docker daemon configuration for the reachable registry endpoint.
- Updated stale version-specific content. The post referenced Portainer `2.22.0` and Helm chart `1.0.51`, which are no longer current. I replaced the Portainer examples with `lts` tags and updated the Helm chart example to the current Portainer-aligned chart version `2.39.0`.
- Clarified the Kubernetes registry requirement. The Helm section now notes that each Kubernetes node must be able to reach and trust the local registry in its configured container runtime, otherwise the offline deployment can still fail with image pull errors.

## Review Notes
- The Docker-based examples now use Portainer's `lts` tag, which is a moving supported release tag and is a better fit for maintenance than the original stale fixed version.
- The Helm chart version is current as of this review, but Helm chart versions should be rechecked during future validations because the Portainer chart follows the product release cadence.
- An HTTP registry is acceptable in a tightly controlled air-gapped environment, but both Docker and Distribution documentation recommend TLS with a trusted CA when feasible.
