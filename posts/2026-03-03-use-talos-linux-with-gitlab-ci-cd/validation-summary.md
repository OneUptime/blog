# Validation Summary: How to Use Talos Linux with GitLab CI/CD

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Talos Linux and talosctl
- GitLab CI/CD and GitLab Runner
- Docker-in-Docker
- Kubernetes and kubectl
- GitLab Container Registry

## Sources Consulted
- Talos Linux v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Linux GitHub releases: https://github.com/siderolabs/talos/releases
- GitLab Docker-in-Docker documentation: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab Runner Docker executor documentation: https://docs.gitlab.com/runner/executors/docker/
- GitLab CI/CD artifacts and caching documentation: https://docs.gitlab.com/ci/caching/
- GitLab CI/CD variables documentation: https://docs.gitlab.com/ci/variables/
- Kubernetes kubectl installation documentation: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The runner configuration used `docker:24-dind` as the job image. Changed it to `docker:29.0.0-cli`, leaving the DinD daemon image for `services`, which matches GitLab's documented Docker-in-Docker pattern.
- The explanation for `privileged = true` incorrectly attributed the need to Talos socket access. Clarified that privileged mode is required for the Docker-in-Docker service to run nested containers.
- The Talos version and CLI examples used older v1.7-era commands. Updated the examples to Talos v1.13.0 and changed `talosctl cluster create --provisioner docker` to the current `talosctl cluster create docker` form, removing flags no longer accepted by the Docker provider.
- The pipeline saved Docker images under `/tmp` and attempted to pass them as artifacts, but GitLab artifact paths must be relative to the project directory. Reworked the flow to push the image to the GitLab Container Registry.
- The integration test used `docker load` to load an image into the DinD daemon, which does not make the image available to Talos node containerd. Replaced this with registry push/pull usage and an image pull secret.
- The examples installed `kubectl` from Alpine packages, which can lag the Kubernetes cluster version. Added a pinned kubectl download that stays within the supported version skew for the default Talos v1.13 Kubernetes version.
- The multi-stage cluster reuse section implied artifacts or GitLab environments alone could keep the cluster alive across stages. Added the requirement for a persistent self-hosted Docker daemon or shell runner.
- The production deployment example wrote `TALOSCONFIG` from an environment variable into a file. Updated it to use a GitLab file-type CI/CD variable, where the variable value is already a file path.
- The resource limit example used v1.7 flags (`--cpus`, `--memory`) that are not valid for the current Docker provider. Updated them to `--cpus-controlplanes` and `--memory-controlplanes`.
- Several standalone YAML snippets referenced anchors defined in earlier snippets. Added the required anchor definitions so each YAML example parses independently.

## Review Notes
The snippets remain illustrative and assume the Kubernetes manifests use a deployment named `myapp` with a container named `myapp`. For a production pipeline, consider using a custom CI image that already contains `docker`, `talosctl`, and a compatible `kubectl` to reduce install time.
