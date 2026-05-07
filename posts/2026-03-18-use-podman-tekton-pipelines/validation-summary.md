# Validation Summary: How to Use Podman with Tekton Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Tekton Pipelines
- Kubernetes
- Container image build, test, and push workflows
- Tekton CLI (`tkn`)

## Sources Consulted
- Tekton Concepts Overview: https://tekton.dev/docs/concepts/overview/
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Tekton PipelineRuns documentation: https://tekton.dev/docs/pipelines/pipelineruns/
- Tekton Workspaces documentation: https://tekton.dev/vault/pipelines-main/workspaces/
- Tekton guide for cloning a git repository: https://tekton.dev/docs/how-to-guides/clone-repository/
- Tekton getting started with Tasks: https://tekton.dev/docs/getting-started/tasks/
- Podman main CLI documentation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman image inspect documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman save documentation: https://docs.podman.io/en/v5.0.3/markdown/podman-save.1.html
- Podman load documentation: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Podman push documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman login documentation: https://docs.podman.io/en/v5.1.0/markdown/podman-login.1.html
- Podman `--privileged` option documentation: https://docs.podman.io/en/v4.3/markdown/options/privileged.html
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/

## Issues Found
1. **Built images were not actually shared between Tekton tasks.** The original post built an image in one task and then assumed later tasks could immediately `podman run` or `podman push` that image. Tekton runs each task in its own Pod, so local Podman image storage is not shared across tasks. I fixed this by saving the built image to an OCI archive in the shared workspace with `podman save`, then loading it in the test and push tasks with `podman load`.

2. **The post described the setup as rootless even though the examples were rootful.** The original explanation said Podman was being used as a "rootless" tool, but the task steps were already configured with `runAsUser: 0`. I corrected the wording and added `privileged: true` to the Podman steps so the example matches the security model typically required for Podman-in-container workflows.

3. **Registry credential handling used the wrong Podman auth path and did not match standard Kubernetes registry secret keys.** The original push task copied `config.json` to `/run/containers/0/auth.json`, which is not Podman’s documented default auth location. It also ignored the standard `.dockerconfigjson` key used by `kubernetes.io/dockerconfigjson` secrets. I changed the example to copy either `config.json` or `.dockerconfigjson` into `$HOME/.docker/config.json`, which Podman documents as a supported credential source.

4. **The pipeline commands omitted installation of the referenced `git-clone` task.** The pipeline uses `taskRef: git-clone`, but the run instructions only applied the local task files and pipeline. I added the documented Tekton Catalog install step so the example can resolve the `git-clone` task before the PipelineRun starts.

5. **The digest lookup used a generic inspect command instead of the image-specific one.** I changed `podman inspect` to `podman image inspect` for the digest lookup to make the example precise and aligned with the documented image inspection command.

## Review Notes
- The corrected workflow now accurately uses Tekton workspaces for cross-task artifact sharing, which is the supported pattern when later tasks need access to files produced earlier.
- The example still depends on cluster policy allowing privileged containers. That is technically valid, but readers on locked-down clusters may need an alternative image-building approach such as Kaniko or Buildah.
- The `registry-credentials` workspace secret must exist before running the `PipelineRun`, which is consistent with Tekton’s documented workspace behavior for secrets.
