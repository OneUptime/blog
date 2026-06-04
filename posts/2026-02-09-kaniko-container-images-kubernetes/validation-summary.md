# Validation Summary: How to Build Container Images Inside Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kaniko
- Kubernetes Pods and Jobs
- Kubernetes Secrets
- Tekton Pipelines and Tasks
- Docker registry authentication
- Docker multi-architecture manifests
- Trivy image scanning
- Dockerfiles

## Sources Consulted
- Kaniko official GoogleContainerTools README: https://github.com/GoogleContainerTools/kaniko
- Kaniko maintained fork README: https://github.com/osscontainertools/kaniko
- Kaniko releases: https://github.com/GoogleContainerTools/kaniko/releases
- Tekton Pipelines deprecations: https://tektoncd-pipeline.mintlify.app/migration/deprecations
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Tekton Pipelines documentation: https://tekton.netlify.app/docs/pipelines/pipelines/
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Docker manifest CLI reference: https://docs.docker.com/reference/cli/docker/manifest/
- Trivy image command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/

## Issues Found
- The post presented Kaniko as a current default choice without mentioning that the original GoogleContainerTools Kaniko repository was archived on June 3, 2025. Added a maintenance-status caveat and advised pinning a known image version or using a maintained fork for new CI/CD use.
- The post claimed Kaniko "runs as non-root user" and the troubleshooting section said Kaniko runs as non-root by default. Corrected this to say Kaniko can run without privileged containers, and that root may still be needed to unpack some base images or run Dockerfile commands.
- The Docker registry Secret example used `docker.io` as the Docker Hub server. Updated it to `https://index.docker.io/v1/`, matching Kubernetes' default and Kaniko's Docker Hub credential guidance.
- Tekton examples used `tekton.dev/v1beta1`, which Tekton deprecated in favor of `tekton.dev/v1`. Updated Task and Pipeline examples to `tekton.dev/v1`.
- The Trivy pipeline consumed `$(tasks.build.results.image-url)` even though the custom `kaniko-build` Task did not define or emit that result. Added an `image-url` Task result and a small follow-up step to write the pushed image reference.
- The secure-build Pipeline invoked `kaniko-build` without passing its required image parameters. Added `image-name` and `image-tag` Pipeline params and passed them to the build Task.
- The multi-architecture example placed amd64 and arm64 builds in one Pod, but Kaniko's `--custom-platform` is not CPU emulation and cannot make a container run on a different architecture node. Split the example into architecture-specific Jobs with `kubernetes.io/arch` node selectors.
- The private Git repository example mounted a `kubernetes.io/basic-auth` Secret as `/root/.git-credentials`, but the Secret data did not contain a `.git-credentials` key and Kaniko documents private Git auth through URL tokens or `GIT_TOKEN` / `GIT_USERNAME` / `GIT_PASSWORD`. Replaced the mount with an Opaque Secret injected through `envFrom`.

## Review Notes
- The YAML snippets were syntax-checked with PyYAML after edits.
- The examples still use `:latest` in several snippets for readability, while the Best Practices section correctly recommends pinning Kaniko image versions.
- Kaniko is useful for trusted builds that avoid Docker daemon access, but it should not be treated as a complete sandbox for untrusted Dockerfiles.
