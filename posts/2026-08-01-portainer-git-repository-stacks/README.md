# How to Deploy and Update Portainer Stacks from a Git Repository

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitOps, Docker Compose, Git, Stacks, Continuous Deployment

Description: Configure a Portainer Git-backed stack, understand commit-hash update checks, and choose safe polling, webhook, image-pull, and redeployment behavior.

---

A Git-backed Portainer stack gives Portainer a reproducible Compose definition and a commit to track. Portainer clones the repository, deploys the configured Compose path, and can later check the selected Git reference by polling or webhook.

Git updates, image updates, and forced container recreation are three separate events. Most surprises come from treating them as one.

## Organize a Deployable Repository

A simple repository can look like this:

```text
.
├── deploy
│   ├── compose.yaml
│   ├── compose.production.yaml
│   └── .env
└── config
    └── proxy.conf
```

Portainer's **Compose path** is relative to the repository root, for example:

```text
deploy/compose.yaml
```

If adding `deploy/compose.production.yaml` as an **Additional path**, Portainer treats the files like multiple Docker Compose `-f` arguments and applies Docker's merge rules. All relative paths in merged files are resolved from the first, base Compose file, not independently from each override file.

Portainer clones the entire Git repository and needs enough free space for it. Current Portainer documentation says Git submodules are not fetched, so do not place required Compose files, build sources, configs, or certificates only in a submodule.

## Create the Stack

In the target Docker environment:

1. Open **Stacks** and select **Add stack**.
2. Choose **Git Repository**.
3. Enter a stable stack name.
4. Enter the repository URL.
5. Enable authentication for a private repository and select or enter the correct Git credential.
6. Select the repository reference, such as a production branch or release tag.
7. Set the Compose path from the repository root.
8. Add override files through **Additional paths** in the intended merge order.
9. Configure non-secret environment values and the required image registries.
10. Deploy and verify the services.

Portainer supports Basic or Token authorization according to the provider. GitHub, GitLab, and Bitbucket Cloud can expect Basic Auth framing even when the password value is a personal access token. Give the credential read-only repository scope where possible.

Do not enable **Skip TLS verification** as a routine fix. Install a trusted CA for an internal Git service; skipping verification removes server-certificate validation and should be a narrowly assessed exception.

## Understand the Commit-Hash Check

For automatic GitOps updates, Portainer stores the commit hash from the most recent deployment. During an update check it:

1. retrieves the newest commit hash for the configured reference;
2. compares that hash with the one stored for the stack;
3. does nothing when they match, unless force-redeployment behavior applies;
4. pulls repository contents when they differ;
5. processes the Compose path and additional paths;
6. deploys the resulting model;
7. records the new deployed commit hash.

The comparison is for the reference's commit, not a content diff limited to one Compose file. A monorepo commit elsewhere can therefore trigger repository processing. Docker still may leave a container untouched if its service configuration and selected image have not changed.

Portainer's manual **Pull and redeploy** path is different: its documentation says manual updates do not perform the normal commit-hash short circuit and force a redeployment.

## Choose Polling or a Webhook

With **GitOps updates** enabled, Portainer offers:

- **Polling:** Portainer checks the repository at a configured interval. It is easy to operate but creates periodic Git traffic and adds up to one interval of deployment delay.
- **Webhook:** an external system sends the generated webhook URL after a push or release. It is prompt and avoids polling, but the URL is a deployment credential and must be protected.

Call webhooks with `POST`, restrict who can read and invoke the URL, and avoid logging it in public CI output. Verify edition, environment type, and network exposure requirements for webhook features in the installed Portainer version.

Trigger production from a protected branch or release workflow rather than every unreviewed commit. The repository reference should express promotion policy, not merely convenience.

## Separate Re-Pull from Force Redeployment

Portainer exposes two GitOps settings with different purposes.

### Re-pull image

When enabled, Portainer pulls the most recent version of referenced images during an update. This matters for mutable tags such as `latest` or `production`.

It does not change the tag in the Compose model, build a missing image, or make an unpublished tag exist. Registry credentials and platform compatibility still have to be correct.

### Force redeployment

When enabled, Portainer redeploys at the interval or webhook trigger even if Git has not changed and overwrites local drift. Use it when Git is authoritative and periodic reconciliation is intentional.

Without it, automatic updates trigger only when Portainer sees a new commit hash. Pushing a new image under the same mutable tag without a Git commit can therefore leave the current container unchanged.

The most auditable workflow avoids that ambiguity:

```yaml
services:
  api:
    image: registry.example.com/billing/api:2026.08.01-4f2c8d1
```

Build and push an immutable tag, update the Compose file to that tag, review the commit, and let Portainer deploy the changed commit. A digest pin provides even stronger content identity:

```yaml
services:
  api:
    image: registry.example.com/billing/api@sha256:<verified-digest>
```

## Keep Environment-Specific Values Deliberate

Portainer can store environment variables separately from the Git Compose file and leaves `${VARIABLE}` expressions visible in source. It can also load variables from an uploaded `.env` file.

A repository `.env` file can be processed when no values have already been defined for the stack. Avoid defining the same name in several places; precedence becomes difficult to audit. Keep harmless defaults in Git and manage secrets with Docker secrets or another dedicated secret system.

For Docker Standalone and Podman, Portainer can materialize its managed values through `stack.env` when the Compose file explicitly uses `env_file: stack.env`. Docker Swarm does not support `env_file` through `docker stack deploy`; define Swarm service environment entries explicitly and use secrets/configs for files.

## Treat Git as the Only Compose Editor

For a Git-deployed stack, Portainer's Compose editor is not the source of truth. Portainer documents that the file must be edited in the repository. You can still view or change the stack's separately stored environment variables and manually pull and redeploy.

Portainer also offers **Detach from Git**, but detachment is irreversible. It stores the main Compose file in Portainer and does not download additional Compose files or repository `.env` files. A stack that depends on those inputs can change meaning after detachment. Export and flatten the complete effective model before using it.

Never make emergency edits only to live containers and assume GitOps will preserve them. The next force redeployment can overwrite local changes. Commit the correction or deliberately suspend reconciliation while following an incident procedure.

## Validate Before and After Deployment

In a clean checkout, render the same file order:

```bash
docker compose \
  -f deploy/compose.yaml \
  -f deploy/compose.production.yaml \
  config

docker compose \
  -f deploy/compose.yaml \
  -f deploy/compose.production.yaml \
  config --images
```

Rendering verifies merges, interpolation, and relative paths. It does not prove Portainer has the same stored variables or registry credentials, so compare those separately without exposing secrets.

After deployment, verify:

- Portainer displays the expected repository, reference, Compose path, and deployed commit;
- services use the intended image digest;
- all additional files were applied in the expected order;
- private images pull on the actual Docker endpoint or every Swarm node;
- volumes, networks, health checks, and published ports are correct;
- a controlled test commit is detected once, deployed, and recorded;
- reverting the Git change restores the previous known-good model.

## A Safe Release Loop

1. Build, scan, and push a uniquely tagged image in CI.
2. Update the image reference in the deployment repository.
3. Render the Compose model and run policy checks in CI.
4. Review and merge into the protected deployment reference.
5. Trigger Portainer by webhook or wait for polling.
6. Verify the deployed commit, service health, and image digest.
7. Roll back by reverting the deployment commit, not by silently changing the running container.

Git-backed deployment is reliable when every change has a stable identity: a Git commit for configuration, an immutable image tag or digest for code, and explicit Portainer state for environment-specific inputs.

## Official Documentation

- [Portainer: Add a Stack from a Git Repository](https://docs.portainer.io/user/docker/stacks/add#option-3-git-repository)
- [Portainer: How Automatic Git Updates Work](https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work)
- [Portainer: Inspect, Update, or Detach a Stack](https://docs.portainer.io/user/docker/stacks/edit)
- [Portainer: Stack Webhooks](https://docs.portainer.io/user/docker/stacks/webhooks)
- [Docker Compose: Merge Multiple Compose Files](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)
- [Docker Compose: Render the Effective Configuration](https://docs.docker.com/reference/cli/docker/compose/config/)
