# Fixing Portainer stack.env and .env Variable Substitution in Git Stacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, Environment Variables, GitOps, Docker Swarm, Troubleshooting

Description: Distinguish Compose interpolation from container environment injection and make Portainer Git-stack variables behave consistently on Standalone and Swarm.

---

Portainer, Docker Compose, and a running container can all use environment variables, but they do not use them at the same time. A variable can successfully replace `${TAG}` in a Compose file and still be absent inside the container. The reverse is also possible.

The reliable fix is to decide whether each value belongs to Compose interpolation or to the container's runtime environment, then configure that phase explicitly.

## First Identify the Two Variable Phases

Consider this service:

```yaml
services:
  api:
    image: registry.example.com/team/api:${IMAGE_TAG:?IMAGE_TAG is required}
    ports:
      - "${API_PORT:-8080}:8080"
    environment:
      LOG_LEVEL: ${LOG_LEVEL:-info}
    env_file:
      - runtime.env
```

There are two separate operations:

1. **Compose interpolation** replaces `${IMAGE_TAG}`, `${API_PORT}`, and `${LOG_LEVEL}` while Docker Compose builds its application model. Interpolation can affect image names, ports, volume names, and any other YAML value.
2. **Container environment injection** creates environment variables inside `api`. The `environment` and `env_file` service attributes perform this operation.

An interpolation source does not automatically expose every value to the container. For example, `IMAGE_TAG` can select an image without becoming an environment variable inside that image. Likewise, a key in `runtime.env` can enter the container even though it is not available to interpolate another Compose field.

## What `.env` Does

Docker Compose uses a default `.env` file as an interpolation source. In normal Compose CLI usage, its lookup is tied to the project and working-directory rules. For a Portainer Git stack, the least surprising repository layout keeps it beside the base Compose file:

```text
.
└── deploy
    ├── compose.yaml
    ├── .env
    └── runtime.env
```

The Portainer Compose path would be `deploy/compose.yaml`. Keeping the files together also makes a clean local checkout reproduce the deployment more closely.

Portainer's automatic-update documentation adds an important condition: a repository `.env` file is processed when it exists and the stack variables were not previously defined. If the same key already exists in Portainer's managed stack variables, changing only the repository `.env` may not produce the result expected.

Avoid defining one key in the shell, Portainer UI, an uploaded environment file, repository `.env`, service `environment`, and service `env_file` at once. Docker documents different precedence rules for interpolation and for a container's final environment; overlapping sources make an otherwise valid deployment difficult to reason about.

## What Portainer's `stack.env` Does

When environment variables are entered in Portainer or uploaded while creating a stack, Portainer can make those managed values available while processing the stack. On Docker Standalone and Podman, Portainer also documents this pattern for placing all of those values in the container environment:

```yaml
services:
  api:
    image: registry.example.com/team/api:${IMAGE_TAG}
    env_file:
      - stack.env
```

`stack.env` is a Portainer-managed file for this deployment path. It is not the standard Docker Compose default interpolation file, and it should not be treated as a repository file that developers edit. `${IMAGE_TAG}` is resolved from the values Portainer supplies to Compose; `env_file: stack.env` separately injects those values into the container.

Do not commit a hand-written `stack.env` containing secrets to imitate this behavior. Its name has a special purpose in Portainer-managed stacks and plain environment files are not a secret store.

## Docker Swarm Needs a Different Pattern

Portainer's documentation says its `env_file: stack.env` method does not work for Docker Swarm stacks. Docker's `docker stack deploy` workflow also does not automatically perform `.env` substitution in the same way as `docker compose`.

For values that must reach a Swarm service, map the Portainer-supplied interpolation values explicitly:

```yaml
services:
  api:
    image: registry.example.com/team/api:${IMAGE_TAG:?IMAGE_TAG is required}
    environment:
      LOG_LEVEL: ${LOG_LEVEL:-info}
      METRICS_ENDPOINT: ${METRICS_ENDPOINT:?METRICS_ENDPOINT is required}
    deploy:
      replicas: 3
```

This still involves both phases: Portainer supplies `LOG_LEVEL` while rendering the stack, and the `environment` entry puts the rendered value in each task container.

Use Docker secrets or configs for passwords, API tokens, private keys, and file-shaped configuration. Environment variables can appear in inspection output, support bundles, process environments, and application diagnostics.

## Use Required Values and Defaults Deliberately

Compose supports shell-style interpolation operators. Two are especially useful in Git stacks:

```yaml
services:
  worker:
    image: registry.example.com/team/worker:${RELEASE:?Set RELEASE in Portainer}
    environment:
      LOG_FORMAT: ${LOG_FORMAT:-json}
```

- `${RELEASE:?Set RELEASE in Portainer}` stops rendering when the value is unset or empty.
- `${LOG_FORMAT:-json}` uses `json` when the value is unset or empty.

Failing before deployment is safer than silently producing `image: ...:` or an empty connection address. Quote values that YAML could otherwise interpret as booleans or numbers, and distinguish an intentionally empty string from an omitted variable.

## Diagnose the Rendered Model Before Redeploying

Reproduce the Git checkout in a clean directory and inspect what Compose sees:

```bash
docker compose -f deploy/compose.yaml config --environment
docker compose -f deploy/compose.yaml config
docker compose -f deploy/compose.yaml config --images
```

`config --environment` shows values used for interpolation. `config` shows the resulting Compose model, and `config --images` catches malformed or unexpected image references quickly. Run these commands with the same variable sources intended for Portainer; a developer's exported shell variables can otherwise hide a missing deployment value.

After deployment, inspect the container or service configuration to confirm only the expected runtime keys arrived. Take care not to paste secret-bearing output into tickets or logs.

When GitOps updates appear to ignore a `.env` change, check:

1. whether the selected Git reference actually moved to a new commit;
2. whether the `.env` file is beside the base Compose file and included in the clone;
3. whether the key was already defined as a Portainer stack variable;
4. whether the value is needed for interpolation, runtime injection, or both;
5. whether the target is Docker Standalone or Swarm;
6. whether an override Compose file replaces the relevant `environment` or `env_file` entry.

Portainer's manual **Pull and redeploy** bypasses the normal unchanged-commit check, so it is useful after correcting managed variables. It does not repair incorrect precedence or move a value between the two phases.

## Preserve Supporting Files in Git Mode

Keep the Compose file, its `.env`, and referenced runtime files together in the repository whenever policy permits. Portainer clones the whole repository for a Git-backed stack, but its documentation warns that detaching a stack from Git downloads only the main Compose file. Additional Compose files and environment files are not preserved by that detachment operation.

Before detaching, copy every required file and record the managed variables through an approved secret-handling process. Detaching is not a safe export mechanism for a multi-file deployment.

## A Predictable Variable Policy

A small policy prevents most variable failures:

- Keep non-secret deployment defaults in a repository `.env` only when every environment should share them.
- Put environment-specific interpolation values in Portainer, with one authoritative source per key.
- Map runtime values explicitly under `environment`, or use a reviewed runtime `env_file` on supported Standalone deployments.
- Use Portainer's `stack.env` pattern only where its documentation supports it, not in Swarm.
- Store sensitive material in Docker secrets or another secret manager.
- Require critical image tags, hostnames, and IDs with `${VAR:?message}`.
- Review the rendered Compose model before promotion.

Once interpolation and runtime injection are treated as separate contracts, `stack.env` and `.env` stop looking interchangeable and Git-stack updates become reproducible.

## Official Documentation

- [Portainer: Add a new stack](https://docs.portainer.io/user/docker/stacks/add)
- [Portainer: Environment variable management in Docker—.env vs. stack.env](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/environment-variable-management-in-docker-.env-vs.-stack.env)
- [Portainer: How automatic updates for stacks work](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work)
- [Docker: Interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [Docker: Set environment variables](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/)
- [Docker: Environment variable precedence](https://docs.docker.com/compose/how-tos/environment-variables/envvars-precedence/)
