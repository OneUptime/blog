# Why “Re-Pull Image and Redeploy” Fails in Portainer-and What to Check

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container Image, Deployment, Troubleshooting, Registries

Description: Diagnose why Portainer keeps running an old image after a pull or redeploy, from mutable tags and registry access to stack configuration and platform mismatches.

---

The button may say **Pull latest image**, **Re-pull image**, **Recreate**, or **Redeploy**, depending on whether you are working with a container, service, or stack. The important distinction is that three separate things must succeed:

1. Portainer asks the target Docker environment to resolve and pull the configured image reference.
2. Docker obtains a compatible manifest and any layers that are not already cached.
3. The container or service is replaced so that it starts from the newly resolved image.

If the application still looks old, determine which of those stages failed. Repeating the same button without making that distinction usually hides the useful evidence.

## First, Prove That the Tag Actually Changed

Image tags are names, not version guarantees. A publisher can move `myapp:latest` or `myapp:production` to a new manifest, but it can also push the same content again. Docker identifies image content by digest.

Run the pull directly on the Docker host represented by the Portainer environment:

```bash
docker image pull registry.example.com/acme/myapp:production

docker image inspect \
  registry.example.com/acme/myapp:production \
  --format '{{json .RepoDigests}}'
```

Compare that result with the image ID used by the running container:

```bash
docker inspect myapp --format 'container image ID: {{.Image}}'

docker image inspect \
  registry.example.com/acme/myapp:production \
  --format 'local tag image ID: {{.Id}}'
```

If the two image IDs are identical, the container is already using the locally resolved image. If the registry was expected to contain a new build, inspect the publishing pipeline and the remote tag rather than Portainer.

If your stack uses an immutable digest, pulling cannot silently move it forward:

```yaml
services:
  api:
    image: registry.example.com/acme/myapp@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

That is intentional. Digest pinning makes deployments repeatable. Update the digest in the stack definition when you deliberately approve a new image.

## Check the Exact Image Reference Portainer Is Resolving

Small reference differences point Docker at different repositories:

```text
acme/myapp:production
docker.io/acme/myapp:production
registry.example.com/acme/myapp:production
registry.example.com/team/acme/myapp:production
```

For a stack, variables can make the effective reference less obvious:

```yaml
services:
  api:
    image: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
```

Confirm the environment values stored with the Portainer stack. If you have the same Compose file and environment file locally, render the resolved model:

```bash
docker compose --env-file .env config --images
```

Common mistakes include an old `IMAGE_TAG`, an environment variable defined in Portainer but not in the developer's shell, a typo that falls back to a default value, or a second override file used only by the local deployment.

Also check whether the service has both `build:` and `image:`. Compose follows `pull_policy` when both are present. A locally built image and an image pulled from a registry are not interchangeable merely because they end with the same tag.

## Reproduce the Pull on the Correct Docker Environment

Portainer is a management layer; the Docker daemon for the selected environment performs the pull. A successful `docker pull` on your laptop proves nothing about a remote host.

Run this on the managed host, using the complete reference from the stack:

```bash
docker login registry.example.com
docker pull registry.example.com/acme/myapp:production
```

The error normally identifies the next branch of the investigation:

- `unauthorized` or `denied`: the registry credentials do not have pull access to that repository, or Portainer is using a different registry entry.
- `x509: certificate signed by unknown authority`: the Docker daemon does not trust the registry's certificate chain.
- `manifest unknown`: that tag or digest does not exist in the named repository.
- `no matching manifest`: the registry has no image for the host's operating system or architecture.
- timeout or DNS errors: fix connectivity from the Docker host or daemon, not just from the browser running Portainer.

For a private registry, configure the registry in Portainer and make sure the deployment selects it. Registry authentication and TLS trust are separate: valid credentials do not repair an untrusted certificate, and installing a CA does not grant repository permission.

## Make Sure the Workload Was Replaced, Not Merely Restarted

A restart stops and starts the same container. It does not change the image recorded in that container's configuration. Portainer's container edit flow replaces the old container with a newly created one; a stack or Swarm service update must likewise cause the workload to be reconciled.

After the operation, inspect creation time and image ID:

```bash
docker inspect myapp \
  --format 'created={{.Created}} image={{.Image}} status={{.State.Status}}'
```

For a Compose stack, inspect all project containers rather than an unrelated container with a similar name:

```bash
docker ps -a \
  --filter label=com.docker.compose.project=my-stack \
  --format 'table {{.Names}}\t{{.Image}}\t{{.ID}}\t{{.Status}}'
```

For Swarm, a new task can be scheduled on another node. From a manager node, inspect the service and its tasks:

```bash
docker service inspect my-stack_api \
  --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}'

docker service ps my-stack_api --no-trunc
```

Every node that may run the service must be able to reach the registry and run the image's platform. A pull on the manager does not establish that every worker can pull successfully.

## Check How the Stack Is Managed

The editable source of truth depends on how the stack was created:

- **Web editor or uploaded file:** update and redeploy the stack definition stored by Portainer.
- **Git repository:** update the tracked branch or reference, verify repository credentials, and let Portainer fetch the intended revision.
- **External stack:** Portainer did not create the stack, so management and update options are deliberately limited.
- **Container created outside a stack:** recreate that container; updating a similarly named stack will not affect it.

In the stack list, Portainer can show an image-update indicator. A grey hyphen means Portainer could not determine whether a newer image is available; it does not prove that the image is current. Reloading the indicator only refreshes that check-it is not itself a deployment.

## The New Image May Be Running Even If the UI Looks Unchanged

Once the running container's image ID matches the newly pulled image, move above the container layer:

- A browser, CDN, or reverse proxy may still serve cached assets.
- A volume may contain application files that mask files at the same path in the image.
- A bind mount may replace the image's configuration or static-content directory with host files.
- A database migration or application startup step may not have run.
- Traffic may be reaching another replica, service, host, or environment.

Inspect mounts before blaming the pull:

```bash
docker inspect myapp \
  --format '{{range .Mounts}}{{println .Type .Source "->" .Destination}}{{end}}'
```

Docker mounts obscure image content at the mount destination. Rebuilding a file into the image will therefore have no visible effect if a volume or bind mount covers that path.

## A Reliable Redeploy Checklist

Use this order so each test eliminates a class of causes:

1. Record the environment ID, stack name, service name, full image reference, and current container image ID.
2. Confirm the registry tag points to the expected digest.
3. Pull that exact reference on the target Docker host.
4. Resolve any authentication, certificate, DNS, timeout, rate-limit, or platform error.
5. Confirm the Portainer stack's effective variables and image reference.
6. Redeploy or recreate the correct resource with image pulling enabled.
7. Verify that a new container or Swarm task uses the expected image ID or digest.
8. If the image is correct, inspect mounts, caches, replicas, routing, and application logs.

For production deployments, prefer unique release tags or approved digests over repeatedly overwriting `latest`. The redeploy then becomes observable: a changed reference is a code-reviewed deployment input, and the running digest provides an unambiguous result.

## Official Documentation

- [Portainer: Edit or duplicate a container](https://docs.portainer.io/user/docker/containers/edit)
- [Portainer: Manage Docker stacks](https://docs.portainer.io/user/docker/stacks)
- [Portainer: Add a Docker Swarm service](https://docs.portainer.io/user/docker/services/add)
- [Docker: Pull an image](https://docs.docker.com/reference/cli/docker/image/pull/)
- [Docker Compose file reference: services, image, and pull policy](https://docs.docker.com/reference/compose-file/services/)
- [Docker Compose: Render the resolved configuration](https://docs.docker.com/reference/cli/docker/compose/config/)
- [Docker: Bind mounts and obscured container data](https://docs.docker.com/engine/storage/bind-mounts/)
