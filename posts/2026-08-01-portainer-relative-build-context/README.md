# Portainer Cannot Find a Relative Build Context: How Git Stack Paths Really Work

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, Docker Build, Git, Build Context, Troubleshooting

Description: Diagnose missing Docker build contexts in Portainer Git stacks by resolving Compose paths, Dockerfile locations, merged files, and Portainer build limitations.

---

A Compose stack can build correctly from a developer's current directory and fail in Portainer with a missing context, missing Dockerfile, or failed `COPY`. The usual cause is not Portainer's Git clone. It is a path that was interpreted relative to a different base than the author expected.

There are three path bases to keep separate: the Git repository root, the base Compose file's directory, and the Docker build context.

## Map Each Path to Its Actual Base

Suppose the repository is organized like this:

```text
.
├── deploy
│   ├── compose.yaml
│   └── compose.production.yaml
└── services
    └── api
        ├── Dockerfile
        ├── package.json
        └── src
            └── server.js
```

Portainer interprets the **Compose path** from the repository root:

```text
deploy/compose.yaml
```

Docker Compose interprets a relative `build.context` from the directory containing the base Compose file. Because the base file is in `deploy`, the API context is:

```yaml
services:
  api:
    build:
      context: ../services/api
      dockerfile: Dockerfile
```

The `dockerfile` path is then interpreted relative to the build context. Here it resolves to `services/api/Dockerfile`.

Using `context: ./services/api` would resolve to `deploy/services/api`, which does not exist. Using `dockerfile: ../services/api/Dockerfile` would also be wrong because that path is evaluated from the context, not from `deploy`.

## Multiple Compose Files Keep One Path Base

An override file does not get its own independent relative-path base. Docker's Compose merge documentation states that paths in all merged files are evaluated relative to the first, base Compose file.

If Portainer uses:

```text
Compose path:    deploy/compose.yaml
Additional path: deploy/compose.production.yaml
```

then a build path added by `compose.production.yaml` must still be written relative to `deploy/compose.yaml`'s directory.

This rule makes `docker compose -f deploy/compose.yaml -f deploy/compose.production.yaml ...` deterministic, but it surprises authors who test the override as a standalone file.

## `COPY` Can See Only the Build Context

Docker sends the selected context to the builder. A plain `COPY` source is resolved within the default build context and cannot use parent paths to reach a file outside it.

This fails when the context is `../services/api`:

```dockerfile
COPY ../../shared/package.json ./shared/package.json
```

Docker removes the parent-directory navigation from a local `COPY` source, so this looks for `shared/package.json` inside the context rather than reaching the repository's `shared` directory. If the image truly needs both `services/api` and `shared`, move the context high enough to include both and adjust the Dockerfile path:

```yaml
services:
  api:
    build:
      context: ..
      dockerfile: services/api/Dockerfile
```

The Dockerfile would then copy repository-relative paths:

```dockerfile
COPY services/api/package.json services/api/package.json
COPY shared/package.json shared/package.json
```

A repository-wide context can be large and can expose unintended files to the build. Add a carefully reviewed `.dockerignore` at the context root, and never include Git credentials, local secrets, or build outputs that are not needed.

## Portainer Clones the Repository, Not Its Submodules

Portainer's Git-stack documentation says the entire repository is cloned and that Git submodules are not supported. A path may therefore be correct relative to the main repository yet still be absent because its content lives only in a submodule.

Vendor the required build input into the repository, publish it as a package or build artifact, or build the image in CI where submodules can be fetched deliberately. Do not rely on the developer workstation's initialized submodule.

Also check filename case. A macOS checkout can tolerate `dockerfile` when the file is named `Dockerfile`, while a Linux filesystem used by Portainer does not.

## Relative-Path Volumes Are a Different Feature

Portainer Business Edition has an **Enable relative path volumes** option for Git deployments. It supports bind-mounting repository content with relative volume paths and uses the Compose file's directory as the working directory.

That option does not repair `build.context`, change Dockerfile resolution, fetch submodules, or expand what `COPY` can access. Build paths follow the Docker Compose build specification whether or not relative-path volumes are enabled.

## Swarm Does Not Build the Image

Docker's `docker stack deploy` documentation warns that the Swarm stack command ignores the `build` section. Every Swarm node that may run a task needs to pull an already published image.

This Compose model is therefore incomplete as a Swarm release process:

```yaml
services:
  api:
    build:
      context: ../services/api
    image: registry.example.com/team/api:2026.08.01
```

Build and push `registry.example.com/team/api:2026.08.01` before deploying the stack. The `image` reference, not the local context, is what Swarm schedules.

## Account for Current Portainer Build Limitations

Portainer's official FAQ says building an image while deploying a Git-based stack is not fully implemented and recommends building the image separately, pushing it to a registry, and referencing it in the Compose file.

Portainer also documents a known issue affecting Compose files with build steps on remote Docker environments in Portainer 2.29.2 and later. Its published workaround is the same durable release pattern: build outside Portainer, push to a registry, and remove the `build` section before stack deployment.

Even where an inline build currently succeeds, production deployments are more repeatable when CI publishes a unique, non-reused tag or the deployment pins a digest:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag registry.example.com/team/api:git-a1b2c3d \
  --push \
  services/api
```

The Git stack then contains only the deployable artifact:

```yaml
services:
  api:
    image: registry.example.com/team/api:git-a1b2c3d
```

This separates source compilation from orchestration, gives every node the same artifact, and makes rollback a tag or digest change.

## Reproduce the Failure from a Clean Clone

Test from the repository root in a fresh checkout, without untracked files or initialized submodules masking missing inputs:

```bash
docker compose \
  -f deploy/compose.yaml \
  -f deploy/compose.production.yaml \
  config

docker compose \
  -f deploy/compose.yaml \
  -f deploy/compose.production.yaml \
  build --no-cache api
```

Then check the path chain in order:

1. Is the Portainer Compose path correct relative to the repository root?
2. Is the context correct relative to the base Compose file?
3. Is `dockerfile` correct relative to that context?
4. Are all `COPY` sources inside the context and not removed by `.dockerignore`?
5. Does the case of every filename match exactly?
6. Is required content hidden in an unsupported Git submodule?
7. Is the target Swarm or an affected remote Docker environment where deployment-time builds are not supported?

If the rendered paths are correct but Portainer still cannot build, stop changing `../` segments blindly. Publish the image in a build system and make the stack consume that explicit artifact.

## Official Documentation

- [Portainer: Add a Git repository stack](https://docs.portainer.io/user/docker/stacks/add#option-3-git-repository)
- [Portainer: Can I build an image while deploying a stack from Git?](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/can-i-build-an-image-while-deploying-a-stack-application-from-git)
- [Portainer known issue: Docker Compose files including build steps fail](https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail)
- [Portainer: Relative path support](https://docs.portainer.io/advanced/relative-paths)
- [Docker Compose Build Specification](https://docs.docker.com/reference/compose-file/build/)
- [Docker: Merge Compose files](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)
- [Docker: Build context](https://docs.docker.com/build/concepts/context/)
- [Docker: Deploy a stack to a Swarm](https://docs.docker.com/engine/swarm/stack-deploy/)
