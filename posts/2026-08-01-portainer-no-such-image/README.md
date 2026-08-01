# Portainer “No Such Image” During Stack Deployment: Pull Policies, Registries, and Tags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container Images, Registries, Docker Compose, Troubleshooting

Description: Resolve Portainer stack image failures by checking the rendered reference, pull policy, registry credentials, build output, Swarm distribution, and platform manifest.

---

Portainer's “no such image” message describes the final symptom: the Docker endpoint cannot use the exact image reference requested by the stack. It does not by itself prove that the repository is missing, that Portainer failed to authenticate, or that a build should have run.

Work from the rendered image reference outward. Most incidents reduce to a wrong interpolated tag, a pull policy that forbids pulling, credentials for the wrong registry, an image built only on another machine, or a manifest that does not support the target node.

## Find the Exact Requested Image

An image reference has this general form:

```text
[HOST[:PORT]/]PATH[:TAG]
```

If the host is omitted, Docker uses Docker Hub. If the tag is omitted, Docker uses `latest`. Those defaults make a short-looking reference easy to send to the wrong place.

Render the same Compose model and variables used by Portainer:

```bash
docker compose -f deploy/compose.yaml config --images
```

For this service:

```yaml
services:
  api:
    image: ${REGISTRY_HOST}/team/api:${RELEASE_TAG}
```

an empty or stale variable can create a different reference from the one tested locally. Make release inputs required:

```yaml
image: ${REGISTRY_HOST:?Set REGISTRY_HOST}/team/api:${RELEASE_TAG:?Set RELEASE_TAG}
```

Copy the rendered reference exactly. Confirm that its registry, repository path, capitalization, tag, and optional digest all match the published artifact.

## Pull the Reference on the Target Endpoint

Test against the same Docker environment that Portainer deploys to:

```bash
docker pull registry.example.com/team/api:git-a1b2c3d
docker image inspect registry.example.com/team/api:git-a1b2c3d
```

The error category matters:

- **not found** or **manifest unknown** usually means the repository or tag does not exist at that registry;
- **unauthorized** or **denied** points to missing credentials, insufficient scope, or the wrong registry selection;
- **no matching manifest** means the tag exists but has no image for the node's operating system or CPU architecture;
- **no such image** with pulling disabled means the exact reference is absent from that Docker endpoint's local cache.

A local image on a laptop is not present on a remote Docker host just because both are visible in the same workflow. Even an image on the Portainer Server host is not automatically available to the environment managed through an Agent or remote socket.

## Understand `pull_policy`

Docker Compose's service-level `pull_policy` controls how it obtains an image. The most relevant values are:

- `always`: always ask the registry for the image;
- `never`: use only the platform's cached image and fail when it is absent;
- `missing`: pull only when the image is not cached, with the special rule that `latest` is always pulled;
- `build`: build the image;
- time-based policies such as `daily`, `weekly`, and `every_12h` in Compose implementations that support them.

When a service has `image` but no `build`, the default behavior is effectively `missing`. A common self-inflicted failure is:

```yaml
services:
  api:
    image: registry.example.com/team/api:git-a1b2c3d
    pull_policy: never
```

This can work on the node where the image happened to be built and fail everywhere else.

When both `image` and `build` are present, Compose follows `pull_policy`. Without an explicit policy, the Compose build specification says it first attempts to pull the image and builds from source if the image is not found. That behavior applies to Docker Compose; it does not make Swarm build an image, and it does not remove Portainer's Git-build limitations.

## Know What Portainer's Re-Pull Option Changes

Portainer's **Re-pull image** option retrieves current image content when updating a stack. It is useful when a mutable tag such as `staging` points to a newer manifest.

Re-pulling does not:

- change an incorrect repository or tag;
- build source from the Git repository;
- create a missing registry manifest;
- grant registry permission;
- add support for the node's architecture.

For production, publish immutable tags such as a Git commit SHA or pin a digest. Commit that new reference to the Git stack. The deployment history then records which artifact was requested instead of silently changing the contents behind a reused tag.

## Select the Correct Registry in Portainer

Add the private registry and its credential to Portainer, then select that registry for the stack. The hostname in the rendered `image` reference must match the registry whose credential is supplied.

Portainer's stack documentation warns that when more than one registry from the same provider exists, the wrong credential can be selected. Make the selection explicit rather than assuming that any Docker Hub, GitHub Container Registry, or cloud-registry credential is interchangeable.

The credential also needs permission to read the exact repository path. Successful login to a registry does not imply access to every namespace in it.

## Swarm Must Pull on Every Eligible Node

A Docker Swarm service can be scheduled on any eligible node. The image therefore needs to be in a registry reachable by those nodes, with credentials available to the deployment.

Docker's stack tooling can send registry authentication to Swarm agents with `--with-registry-auth`. In Portainer, choose the appropriate registry credential for the stack so the equivalent deployment path has the credentials it needs.

For a failing service, inspect task-level errors rather than only the manager's local image list:

```bash
docker service ps --no-trunc mystack_api
```

One worker may lack DNS, CA trust, network access, registry credentials, or the correct platform manifest even though the manager can pull successfully. Portainer's image pull operation is also environment- and node-specific; pulling to one selected node does not preload all Swarm nodes.

Docker Swarm ignores the Compose `build` section during `docker stack deploy`. Build and push the image first, then deploy its `image` reference.

## Do Not Depend on a Portainer Git Build

Portainer's official FAQ says Git-stack image builds are not fully implemented and recommends building separately and pushing to a registry. Portainer also documents a known issue in version 2.29.2 and later where Compose build steps fail for remote Docker environments.

A durable pipeline is:

1. build the image in CI;
2. test it;
3. publish it to the target registry with an immutable tag and, if needed, a multi-platform manifest;
4. update the Git stack's `image` reference;
5. let Portainer deploy that commit.

For example:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag registry.example.com/team/api:git-a1b2c3d \
  --push \
  services/api
```

This removes ambiguity about which Docker daemon owns a locally built image and makes the artifact available to remote and Swarm nodes.

## A Fast Triage Sequence

Use this order to avoid changing multiple controls at once:

1. Run `docker compose config --images` with deployment-equivalent variables.
2. Confirm the exact tag or digest exists in the rendered registry path.
3. Pull that exact reference on the affected endpoint or Swarm node.
4. Classify the response as missing, unauthorized, unreachable, or platform-incompatible.
5. Inspect `pull_policy`; remove `never` unless every target node is intentionally preloaded.
6. Verify Portainer selected the credential for the hostname in the image reference.
7. For Swarm, inspect `docker service ps --no-trunc` and test every relevant node path.
8. If the stack contains `build`, publish the artifact externally and deploy only `image`.
9. Review Portainer's stack events and logs for the original registry error, not only the final summary.

“No such image” becomes straightforward once the requested reference, acquisition policy, target daemon, and registry artifact are each made explicit.

## Official Documentation

- [Portainer: Add a new stack](https://docs.portainer.io/user/docker/stacks/add)
- [Portainer: Pull an image](https://docs.portainer.io/user/docker/images/pull)
- [Portainer known issue: Docker Compose files including build steps fail](https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail)
- [Docker Compose: `pull_policy`](https://docs.docker.com/reference/compose-file/services/#pull_policy)
- [Docker Compose Build Specification](https://docs.docker.com/reference/compose-file/build/)
- [Docker: Build, tag, and publish an image](https://docs.docker.com/get-started/docker-concepts/building-images/build-tag-and-publish-an-image/)
- [Docker CLI: `docker stack deploy`](https://docs.docker.com/reference/cli/docker/stack/deploy/)
- [Docker: Create a Swarm service using a private registry image](https://docs.docker.com/engine/swarm/services/#create-a-service-using-an-image-on-a-private-registry)
