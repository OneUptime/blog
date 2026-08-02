# Why a Stack Works with docker compose but Fails in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, Docker Swarm, Stacks, Troubleshooting, Containers, DevOps

Description: Diagnose Portainer stack failures by comparing the target engine, Compose inputs, variables, files, builds, registry credentials, external resources, and Swarm behavior.

---

When `docker compose up -d` succeeds but the same YAML fails as a Portainer stack, the YAML is rarely the only input that changed. The local command also uses a Docker context, working directory, environment variables, optional override files, registry credentials, build context, and host filesystem. Portainer runs with its own execution context against the environment selected in its UI.

There is one more major branch: on Docker Standalone, a Portainer stack is a Compose deployment; on Docker Swarm, Portainer deploys the file as a Swarm stack. Docker documents that `docker stack deploy` uses the legacy Compose version 3 format and does not implement the complete current Compose Specification.

The fastest fix is to identify which hidden input differs rather than repeatedly editing syntax at random.

## Start by Comparing What Actually Ran

Write down the exact local command, including flags and environment:

```bash
docker context show
docker compose version
docker compose \
  --env-file .env.production \
  -f compose.yaml \
  -f compose.production.yaml \
  config --quiet
```

Then answer these questions:

- Does the active Docker context point to the same Engine as the Portainer environment?
- Is that Portainer environment Docker Standalone or Docker Swarm?
- Did the local command include `--env-file`, multiple `-f` files, `--profile`, `--project-directory`, or `--project-name`?
- Did local Compose automatically load `compose.override.yaml`?
- Did the local machine already have images, networks, volumes, secrets, or credentials that the remote Engine lacks?

`docker compose config` renders the real application model after merging files, interpolating variables, and expanding short syntax. Use these narrower views when useful:

```bash
docker compose \
  --env-file .env.production \
  -f compose.yaml \
  -f compose.production.yaml \
  config --services

docker compose \
  --env-file .env.production \
  -f compose.yaml \
  -f compose.production.yaml \
  config --images

docker compose \
  --env-file .env.production \
  -f compose.yaml \
  -f compose.production.yaml \
  config --environment
```

Be cautious with full rendered output: interpolation can place sensitive values in the terminal or an artifact. `config --quiet` checks the model without printing it.

In Portainer, select the same main Compose path and add the same extra files in the same order. Portainer's Git stack workflow supports additional paths as the equivalent of multiple `-f` options. Docker's merge rules make order significant, and all relative paths in merged files are resolved from the first, base Compose file.

## Cause 1: Portainer Is Targeting a Different Docker Engine

Local `docker compose` often targets Docker Desktop or the local socket. Portainer may target a Linux server, a remote Agent, or a Swarm. That changes:

- available CPU architecture and operating system;
- host paths, devices, and file permissions;
- networks and named volumes;
- occupied host ports;
- installed runtime and logging plugins;
- cached images and registry trust;
- whether the daemon is a Swarm manager.

Compare `docker info` from the local context with the environment details in Portainer. If possible, create a Docker context for the same remote Engine and test there. A successful deployment to a laptop proves the Compose model works on the laptop; it does not prove that `/srv/app`, GPU device IDs, ARM images, or port `443` exist on the Portainer target.

## Cause 2: Variables Came from Your Shell or Local `.env`

Docker Compose interpolates `${VARIABLE}` before sending the model to Docker. Docker documents this precedence for interpolation:

1. the shell environment;
2. a file selected with `--env-file`;
3. the default `.env` in the Compose project directory.

Your interactive shell is not Portainer's environment. For example:

```yaml
services:
  api:
    image: registry.example.com/platform/api:${IMAGE_TAG}
    environment:
      DATABASE_HOST: ${DATABASE_HOST}
    ports:
      - "${API_PORT}:8080"
```

If `IMAGE_TAG`, `DATABASE_HOST`, or `API_PORT` exists only in your shell, the Portainer deployment may report an unset variable, render an invalid image name, or claim an unexpected port.

Define stack variables in Portainer individually or use **Load variables from .env file** while creating the stack. Prefer required-value expressions for values that must never silently become empty:

```yaml
services:
  api:
    image: registry.example.com/platform/api:${IMAGE_TAG:?Set IMAGE_TAG in Portainer}
    environment:
      DATABASE_HOST: ${DATABASE_HOST:?Set DATABASE_HOST in Portainer}
```

Do not confuse interpolation with container environment files. Interpolation changes the Compose model. An `env_file` entry supplies variables to a container at runtime. On Docker Standalone, Portainer supports the special filename `stack.env` to expose variables entered in the UI as a service `env_file`:

```yaml
services:
  api:
    env_file:
      - stack.env
```

Portainer documents that `env_file` is not supported by `docker stack deploy` on Swarm. Docker also documents that normal `.env` substitution is a Compose CLI feature and is not supported by Swarm itself. For a Portainer Swarm stack, define values through Portainer and express the required service environment explicitly in the stack model.

## Cause 3: The Compose File References Local Files

This local-development pattern depends on an entire directory, not just the YAML:

```yaml
services:
  web:
    build: .
    env_file:
      - .env
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

Pasting the YAML into Portainer's web editor or uploading only the Compose file does not upload the Dockerfile, `.env`, `nginx.conf`, source tree, or any other sibling file.

An absolute bind source is always a path on the target Docker host:

```yaml
volumes:
  - /srv/myapp/nginx.conf:/etc/nginx/nginx.conf:ro
```

Create and permission `/srv/myapp/nginx.conf` on the environment managed by Portainer, not on the browser workstation and not merely inside the Portainer Server container. On Swarm, a task can be scheduled on different nodes, so the path must exist with the same content on every eligible node or placement must constrain the service appropriately.

For repository-managed files, deploy the stack from Git. Portainer clones the repository and lets you select the Compose path. Portainer Business Edition also has an **Enable relative path volumes** option: it copies the repository into a specified local or network filesystem path and sets the deployment working directory so references such as `./nginx.conf` resolve there. The feature must be enabled explicitly, and the destination must exist and be writable. On Swarm, the configured network path must be available to every relevant node.

Without that relative-path feature, prefer one of these portable designs:

- bake immutable application files into the image;
- pre-provision an absolute path on each target host;
- use a named volume for mutable data;
- use platform configs or secrets for small managed files.

## Cause 4: Local Compose Builds an Image

Your workstation has the source tree and Dockerfile, so this works locally:

```yaml
services:
  worker:
    build:
      context: .
      dockerfile: Dockerfile
```

Portainer's documentation says image builds from Git stacks are not fully implemented, and its current known-issues guidance says Compose build steps are unsupported for remote Docker environments. Swarm nodes also need a distributable image rather than an image that exists only in one local daemon.

The reliable deployment pattern is:

1. Build in CI or another controlled build environment.
2. Push the image to a registry.
3. Give Portainer a pull credential for that registry.
4. Reference the published image and remove `build` from the deployment Compose file.

```yaml
services:
  worker:
    image: registry.example.com/platform/worker:1.8.3
```

Use a fixed release tag or digest so local and Portainer deployments resolve the same artifact.

## Cause 5: Registry Credentials Exist Only on the CLI Machine

`docker login` stores credentials for the Docker client that ran it. Those credentials are not automatically copied into Portainer.

Add the private registry under **Registries**, enable authentication, and use a least-privilege token. While creating or updating the stack, explicitly select the correct registry. Portainer recommends explicit selection when multiple entries use the same provider, because Docker might otherwise receive the wrong credentials.

For a private CA, make every target Docker daemon trust it. In Swarm, any node that may run a task must be able to resolve the registry, trust its certificate, authenticate, and pull the image.

Typical evidence of this cause includes:

- `pull access denied`;
- `unauthorized: authentication required`;
- `no basic auth credentials`;
- `x509: certificate signed by unknown authority`.

## Cause 6: An External Resource Is Missing

Compose does not create resources marked `external`. Docker's documentation states that an external network or volume must already exist on the target platform.

```yaml
services:
  api:
    networks:
      - proxy
    volumes:
      - shared-data:/data

networks:
  proxy:
    external: true
    name: reverse-proxy

volumes:
  shared-data:
    external: true
    name: platform-shared-data
```

Check the Portainer target rather than the local Engine:

```bash
docker network inspect reverse-proxy
docker volume inspect platform-shared-data
```

The same rule applies to external Swarm secrets and configs. Create them on the target before deploying, or define non-external resources in a supported way.

Project naming can hide this issue. Local Compose normally derives a project name from its directory or `-p`; Portainer uses the stack name to group resources. Automatically created resources therefore receive different prefixes. Do not hard-code a locally derived network or volume name in another stack unless you deliberately declare a stable external name.

Also look for conflicts caused by fixed `container_name` values and published ports. If the local deployment is still running on the same Engine, Portainer cannot create another container with the same explicit name or bind the same host port.

## Cause 7: Portainer Is Deploying to Swarm

A Docker Standalone environment and a Swarm environment are different deployment targets even when both accept YAML that resembles Compose.

Portainer's documented Git update flow uses Compose for Docker Standalone and `docker stack deploy` for Swarm. Docker notes that Swarm's stack command uses the legacy Compose version 3 format rather than the full current Compose Specification. It may reject or ignore fields that the modern `docker compose` CLI supports; Docker's own stack example shows an unsupported `links` option being ignored.

Common changes required for Swarm include:

- Publish an image to a registry instead of relying on `build` or a manager-local image.
- Replace local `restart` expectations with an appropriate `deploy.restart_policy`.
- Put replicas, placement, update behavior, and Swarm resource limits under `deploy`.
- Remove Compose-only features not supported by `docker stack deploy`, such as `extends`.
- Replace service `env_file` usage with explicit service environment configuration.
- Make bind-mounted data available on all eligible nodes or add intentional placement constraints.
- Use Swarm secrets and configs for cluster-managed sensitive or configuration data.

Do not suppress an “unsupported option” warning without checking its effect. A deployment can be accepted while silently omitting behavior the application needs.

## Cause 8: Portainer Security Policy Blocks the Requested Capability

Portainer can prevent non-administrators from deploying dangerous Docker features. Depending on environment policy, bind mounts, privileged mode, host PID access, device mappings, added capabilities, `sysctl` values, or stacks themselves can be disabled.

If the same stack deploys for a Portainer administrator but not for a standard user, inspect the environment's **Setup** security settings and the user's effective access. Do not solve this by promoting the user to global administrator. Remove the unnecessary capability or grant the narrowest role and environment access that satisfies the workload.

## Cause 9: Deployment Succeeded but the Application Failed

Separate a Portainer deployment error from a container startup error. The stack can be created successfully while an application exits because it cannot read a file, connect to its database, or write a volume.

For Docker Standalone, inspect all containers, including exited ones:

```bash
docker ps -a \
  --filter label=com.docker.compose.project=my-stack
docker logs my-stack-api-1
docker inspect my-stack-api-1
```

For Swarm:

```bash
docker stack services my-stack
docker stack ps --no-trunc my-stack
docker service logs my-stack_api
```

The extended task error from `docker stack ps --no-trunc` often reveals a missing mount, rejected image, unsupported platform, or port allocation failure. Portainer Server logs can show errors that occurred before Docker created a resource:

```bash
docker logs portainer --since 15m
```

Do not rely on warm local state. A developer volume may already contain a migrated database, a local network may already exist, or a cached image may hide a broken registry path. Test from a clean environment when possible and add health checks for services whose readiness matters.

## Error-to-Cause Map

| Error or symptom | Most likely difference | First check |
|---|---|---|
| `invalid reference format` | Empty image variable | Portainer stack variables and `${VAR:?message}` checks |
| `network ... declared as external, but could not be found` | Network exists only on local Engine | `docker network inspect` on the Portainer target |
| `volume ... declared as external, but could not be found` | Volume name or target differs | `docker volume inspect` on the target |
| `bind source path does not exist` or empty mounted directory | Local relative/absolute path is unavailable remotely | Stack source method and target-host path |
| `pull access denied` or `unauthorized` | CLI-only registry login | Portainer registry entry and stack registry selection |
| `x509: certificate signed by unknown authority` | Target daemon lacks registry CA | CA trust on every node that pulls |
| `Unable to upgrade to tcp, received 200` during build | Remote Compose build limitation | Build in CI and deploy a registry image |
| `unsupported option` | Swarm stack parser differs from Compose | `docker stack deploy` compatibility |
| `port is already allocated` | Local deployment or another service owns the port | Running containers/services on the target |
| Service remains `0/1` | Runtime failure after stack creation | `docker stack ps --no-trunc` and service logs |
| A service is absent | Local profile or override was not reproduced | Effective file list, profiles, and rendered services |

## A Repeatable Migration Workflow

1. Confirm that local Compose and Portainer target the same Engine type and platform.
2. Record every local flag, override file, profile, and environment-variable source.
3. Run `docker compose config --quiet`, then compare services and images with the Portainer inputs.
4. Build images externally and push immutable releases to a registry.
5. Configure that registry and its CA trust in Portainer and on target nodes.
6. Replace workstation-relative files with Git relative-path support, platform configs, named volumes, or pre-provisioned absolute host paths.
7. Create intentional external networks, volumes, secrets, and configs on the target.
8. Adapt the file to `docker stack deploy` when the Portainer environment is Swarm.
9. Deploy, then inspect Portainer logs and Docker container or service task errors separately.

This workflow turns “it works on my machine” into a concrete comparison of two deployment models.

## Official Documentation

- [Portainer: Add a new stack](https://docs.portainer.io/user/docker/stacks/add)
- [Portainer: How automatic stack updates work](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work)
- [Portainer: Environment variables, `.env`, and `stack.env`](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env)
- [Portainer: How relative path support works](https://docs.portainer.io/advanced/relative-paths)
- [Portainer: Compose build steps on remote environments](https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail)
- [Docker: `docker compose config`](https://docs.docker.com/reference/cli/docker/compose/config/)
- [Docker: Variable interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [Docker: Merge Compose files](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)
- [Docker: Deploy a stack to Swarm](https://docs.docker.com/engine/swarm/stack-deploy/)
- [Docker: `docker stack deploy`](https://docs.docker.com/reference/cli/docker/stack/deploy/)
- [Docker: External networks in Compose](https://docs.docker.com/compose/how-tos/networking/#use-an-existing-network)
- [Docker: External volumes in Compose](https://docs.docker.com/reference/compose-file/volumes/#external)

## Conclusion

Portainer does not receive the implicit state surrounding a successful local Compose command. Make the target, merged files, variables, image, registry credentials, filesystem content, and external resources explicit. Then account for Swarm's different executor when applicable. Once those inputs match, most mysterious Portainer stack failures become an ordinary, traceable deployment error.
