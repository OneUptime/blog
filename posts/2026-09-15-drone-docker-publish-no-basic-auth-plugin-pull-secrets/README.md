# Drone Docker 'No Basic Auth Credentials': Check Plugin and Pull Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Docker, CI/CD, Security, Troubleshooting

Description: Diagnose Drone registry authentication errors by separating step-image pulls, Dockerfile base-image pulls, and Docker plugin publishing credentials.

The message “no basic auth credentials” identifies a missing registry authentication path, but it does not identify which actor needed the credential. In a Drone Docker publishing pipeline, several different image operations can occur.

Read the first failing operation before editing a secret. Adding `image_pull_secrets` can repair a private step-image pull while leaving an application-image push unchanged.

## Identify who is contacting the registry

| Operation | Actor | Where credentials belong |
|---|---|---|
| Pull the image named in a Drone step | Runner and its Docker daemon | Docker-format secret referenced by `image_pull_secrets` |
| Pull a `FROM` image during a build | Builder used by the publishing tool | That builder's registry authentication configuration |
| Push the application image | Publishing plugin or explicit build command | Plugin settings or that command's client configuration |

Drone documents `image_pull_secrets` for fetching pipeline images. The Docker plugin separately documents `registry`, `username`, `password`, and `repo` settings for building and publishing. These interfaces should not be treated as interchangeable. [Drone pipeline images](https://docs.drone.io/pipeline/docker/syntax/images/), [Docker plugin](https://plugins.drone.io/plugins/docker)

A useful clue is timing. If the publish container never starts, inspect its image pull. If it starts and fails on a Dockerfile `FROM`, inspect the base registry. If layers build and the error occurs during push, inspect the destination identity and write permission.

## Configure publishing credentials explicitly

Create repository secrets named `registry_writer_user` and `registry_writer_token`. Give that identity the required write permission for the destination namespace, then configure:

```yaml
kind: pipeline
type: docker
name: publish-api

trigger:
  event: [push]
  branch: [main]

steps:
  - name: publish
    image: plugins/docker
    settings:
      registry: registry.example.com
      repo: registry.example.com/acme/api
      tags:
        - ${DRONE_COMMIT_SHA}
      username:
        from_secret: registry_writer_user
      password:
        from_secret: registry_writer_token
```

This assumes the repository contains a Dockerfile and the runner permits the plugin to run with the privileged capabilities required by its integrated Docker daemon. Use an approved pinned plugin version or digest in production.

The registry value identifies the authentication server; the repository value includes the full destination image name. Check that both name the same registry, including a custom port if one is required. Avoid silently pushing to Docker Hub because the intended hostname was omitted.

Do not add a `commands` block to this plugin step. Drone commands override the image entrypoint, which would replace the plugin's normal startup. To use manual Docker commands, design a separate command-driven step with an explicitly configured builder and authentication path. [Drone command execution](https://docs.drone.io/pipeline/docker/syntax/steps/)

## Add pull credentials only when the step image needs them

If your organization mirrors the plugin image into a private registry, that creates an additional credential requirement:

```yaml
image_pull_secrets:
  - internal_plugin_pull_config
```

This pipeline-level secret contains Docker `config.json` authentication data. It allows Drone to obtain the mirrored plugin image; it does not populate `settings.password`. Keep the writer token in the plugin settings even when the same registry hosts both images.

For a Dockerfile that pulls private base images from another registry, consult the selected plugin version's documented support for that authentication layout. A login to the destination registry does not establish credentials for every base-image registry. A dedicated BuildKit client with an explicit multi-registry Docker configuration is one possible alternative when the plugin's interface does not fit the requirement. [BuildKit registry output and authentication](https://github.com/moby/buildkit)

## Check scope and event restrictions

Verify secret spelling and the build's full repository name. Repository secrets are not exposed to pull requests by default, so a publish step that runs on PR events may receive no credential. Restrict publishing to the intended trusted workflow instead of enabling production credentials for arbitrary pull requests. [Drone repository secrets](https://docs.drone.io/secret/repository/)

If the value is present, verify token validity and registry-side authorization. A valid identity with pull-only access still cannot push. Some registries also require the repository to exist or an additional permission to create it; check the registry's own policy and audit logs.

## Verify the repair without hiding the failure

Push to a disposable repository or a unique commit tag, then inspect the destination registry for the resulting artifact. Keep normal error handling enabled; an ignored push failure can leave Drone green without a published image.

Record which operation failed and which credential mapping repaired it. That distinction prevents a later token rotation from recreating the same confusion between pulling the tool, pulling build inputs, and publishing the output.
