# How to Bring an Existing Docker Compose Stack Under Portainer Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, Stacks, Migration, Volumes, GitOps

Description: Safely move a Docker Compose project created outside Portainer into full Portainer stack management without losing persistent data or project identity.

---

Portainer can discover a Docker Compose project that was created from the CLI, but it marks resources deployed outside Portainer as external and provides only limited control. Portainer does not have the original Compose model, environment values, Git reference, or deployment history that it would have stored for a Portainer-created stack.

Adding Portainer access-control labels changes who can access external resources; it does not import the missing stack definition. The reliable way to gain full stack management is to preserve the existing state, stop the CLI-managed project, and redeploy the authoritative Compose definition through Portainer.

Treat this as a controlled migration, not an ownership toggle.

## First Distinguish External from Orphaned

Two Portainer states look similar but have different fixes:

- **External or limited stack:** Docker resources exist, but they were deployed outside this Portainer instance. Recreate the deployment through Portainer.
- **Orphaned Portainer stack:** Portainer still has a stack record from an environment that was removed. Portainer documents a **Show all orphaned stacks** and **Associate** workflow to attach that existing record to a re-added environment.

Do not use the orphan association workflow as a general Compose import mechanism. It recovers Portainer's own stored stack metadata; it does not reconstruct a Compose file from arbitrary containers.

## Recover the Authoritative Inputs

Before stopping anything, collect the exact inputs that created the running project:

```bash
docker compose ls
docker compose -p billing -f compose.yaml ps
docker compose -p billing -f compose.yaml config
```

The rendered `config` output is useful for comparing the effective model, but it can contain resolved values. Store it securely and do not commit secrets.

Inspect Compose labels when the original project name is uncertain:

```bash
docker inspect <container-name> \
  --format '{{ index .Config.Labels "com.docker.compose.project" }}'

docker inspect <container-name> \
  --format '{{ index .Config.Labels "com.docker.compose.service" }}'
```

Docker Compose uses the project name to group and prefix resources. Record:

- the project name;
- every Compose file and override, in order;
- the `.env` or `--env-file` inputs used for interpolation;
- service profiles and scale values;
- image names, tags, and digests;
- bind-mount host paths and named-volume names;
- external networks, volumes, configs, and secrets;
- registry credentials needed by the target Docker environment.

The running container configuration alone is not always enough to reproduce the project. It cannot preserve comments, extension fields, build source, variable defaults, profiles, or the intent of multiple merged files.

## Protect Data Before Recreating Containers

Containers will be recreated, so data that exists only in a container's writable layer is at risk. Move important state into a named volume, bind mount, or external service and take an application-consistent backup.

Inventory mounts:

```bash
docker inspect <container-name> --format '{{ json .Mounts }}'
docker volume ls
docker volume inspect <volume-name>
```

Docker documents these `docker compose down` behaviors:

- service containers and project networks are removed by default;
- named volumes are retained unless `--volumes` is requested;
- external networks and volumes are never removed;
- anonymous volumes are not removed by default, but a later `up` does not automatically remount them because they have no stable name.

For migration-critical data, use explicit named volumes or external volumes. Do not run `docker compose down --volumes`.

An explicit external mapping makes reuse independent of a changed project prefix:

```yaml
services:
  database:
    image: postgres:17
    volumes:
      - database-data:/var/lib/postgresql/data

volumes:
  database-data:
    external: true
    name: billing_database-data
```

Compose now looks up the existing engine volume named `billing_database-data` and does not own its lifecycle. Confirm the name with `docker volume inspect`; do not guess it.

## Preserve the Project Identity

Compose resource names commonly include the project name, such as `billing_default` and `billing_database-data`. Portainer uses the stack name as the deployment identity, so use the existing Compose project name as the new Portainer stack name where possible.

Docker's project-name precedence includes the CLI `-p` option, `COMPOSE_PROJECT_NAME`, a top-level Compose `name:`, and directory-derived defaults. Remove accidental ambiguity before migration. A top-level name can make CLI testing reproducible:

```yaml
name: billing

services:
  web:
    image: registry.example.com/billing/web:2026.08.1
```

Portainer can still supply its own project identity when deploying, so verify the actual names after a staging deployment. For persistent resources shared beyond the stack, explicit `name:` plus `external: true` is clearer than relying on implicit prefixes.

Avoid `container_name` unless a hard-coded name is genuinely required. It reduces portability and prevents normal Compose scaling.

## Choose the Portainer Source of Truth

Portainer supports four stack inputs: Web editor, upload, Git repository, and a custom template. For an existing production stack, Git is usually the strongest long-term source because changes are reviewed and Portainer can track a repository reference and commit.

If using Git, commit:

- the base Compose file and any additional Compose files;
- non-secret files referenced by relative path;
- safe defaults only;
- documentation for required Portainer environment variables, secrets, volumes, and registries.

Do not commit production passwords or private keys merely to make the migration convenient. Configure secrets through an appropriate secret mechanism and enter non-secret deployment variables in Portainer where intended.

## Plan a Controlled Cutover

Running the old and new projects simultaneously can cause host-port conflicts, duplicate scheduled work, or two writers using the same database. Use a maintenance window unless the application has a tested parallel migration design.

A Docker Standalone cutover is typically:

1. Stop incoming work or drain the application.
2. Take and verify the final data backup.
3. Record current image digests and container health.
4. From the original project directory, run `docker compose -p billing -f compose.yaml down` **without** `--volumes`.
5. Confirm old containers are gone and required named volumes still exist.
6. In Portainer, open the correct environment, choose **Stacks**, then **Add stack**.
7. Use the same stack/project name and deploy from the chosen source.
8. Select the exact private registries and supply required variables.
9. Validate the new containers before reopening traffic.

For Swarm, use the original stack definition and remove the old stack from a manager before Portainer deploys it. Swarm images must be available from a registry to every eligible node; an image built only on the manager is not distributable stack state.

Do not delete the “limited stack” in Portainer without understanding what that action will remove from Docker. Perform lifecycle changes through the original deployment tool until the planned cutover point.

## Validate More Than “Containers Are Running”

After Portainer deploys the stack, compare:

```bash
docker compose ls
docker ps --filter label=com.docker.compose.project=billing
docker volume inspect billing_database-data
docker network ls
```

Check all of these:

1. Each service uses the intended image tag and digest.
2. Persistent mount sources match the pre-migration names.
3. Database schema and record counts are intact.
4. Bind mounts point to paths on the Docker endpoint host, not an unrelated Portainer container path.
5. Service discovery, external networks, health checks, and published ports work.
6. Portainer shows full stack actions and the expected source method rather than only an external resource listing.
7. Access control grants the intended users or teams.
8. A harmless Compose change can be updated through Portainer and rolled back.

Portainer access-control labels such as `io.portainer.accesscontrol.teams` are useful for resources intentionally deployed outside Portainer, but they do not replace this full-control validation.

## Keep a Rollback Path

Retain the original Compose files, environment inputs, image digests, and a tested backup until the new stack has operated successfully. If deployment fails, remove only the newly created containers and networks, leave the protected volumes intact, and use the original Compose command to restore the prior project.

Portainer versions can offer an option to remove associated volumes when deleting a stack. Leave that option disabled during a migration rollback unless data deletion is explicitly intended and separately backed up.

The safest ownership transition preserves three identities: the Compose model in source control, the project/stack name that scopes resources, and the persistent volume names that hold data. Portainer can then manage future deployments because it created the stack from those known inputs—not because it inferred intent from already-running containers.

## Official Documentation

- [Portainer: Access Control for Resources Deployed Outside Portainer](https://docs.portainer.io/advanced/access-control)
- [Portainer: Add a New Docker Stack](https://docs.portainer.io/user/docker/stacks/add)
- [Portainer: Recover Orphaned Stacks](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-i-recover-orphaned-stacks-from-a-previously-deleted-environment)
- [Docker: Specify a Compose Project Name](https://docs.docker.com/compose/how-tos/project-name/)
- [Docker: `docker compose down`](https://docs.docker.com/reference/cli/docker/compose/down/)
- [Docker Compose: Volumes](https://docs.docker.com/reference/compose-file/volumes/)
