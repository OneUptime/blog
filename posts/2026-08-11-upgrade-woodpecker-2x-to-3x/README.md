# How to Upgrade Woodpecker 2.x to 3.x Without Breaking Secrets, Cron Schedules, Privileged Plugins, or Webhooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, Upgrade, Migration, Secrets, Webhooks

Description: Upgrade Woodpecker 2.x to 3.x with a staged plan for database backups, workflow syntax, secrets, cron conversion, privileged plugins, and repaired webhooks.

---

Woodpecker 3.x is not a drop-in image-tag change for a 2.x installation. The server can migrate its database automatically, but it cannot make every repository's workflow semantics, plugin trust decision, cron expression, filesystem permission, or forge webhook safe on your behalf.

The low-risk approach is to separate preparation from cutover. Move to the final 2.8 patch, adopt syntax that 2.8 and 3.x both accept, inventory external state, take a tested backup, and only then start the 3.x server. This guide targets Woodpecker 3.17.0, the current stable release at the time of writing.

## Understand the Four Kinds of State

Treat the installation as four related systems:

1. **Database state:** users, repositories, secret records, registries, cron entries, pipeline history, and settings.
2. **Deployment state:** server and agent environment variables, database connection, agent secret, encryption keys, mounted data, proxy settings, and image tags.
3. **Repository state:** `.woodpecker.yml`, `.woodpecker.yaml`, and files inside `.woodpecker/` on every active branch.
4. **Forge state:** OAuth application, repository webhooks, delivery permissions, public Woodpecker URL, and status-reporting access.

A database migration covers only the first category. A successful server startup does not prove that a scheduled build, secret-consuming deployment, Docker build plugin, or webhook still works.

## Phase 1: Patch to Woodpecker 2.8.3

If the installation is on an earlier 2.x release, first update server, agents, and CLI to 2.8.3 and validate normal operation. This gives you the final 2.x behavior and lets you prepare workflows using syntax already supported by 2.8.

Do not use an unpinned `latest` tag. Woodpecker removed it for 3.x specifically to prevent accidental major upgrades. Record exact image digests and keep the old 2.8.3 deployment manifest available for rollback.

In this preparation window, verify:

- users can sign in through the forge;
- a controlled push creates a pipeline;
- every agent registers and runs a small job;
- a representative secret-consuming workflow succeeds;
- each critical cron can run on demand;
- each privileged plugin succeeds with the existing policy.

These results form the pre-upgrade baseline.

## Phase 2: Migrate Workflow Syntax Before Cutover

Woodpecker 3.0 removes several deprecated forms. Search every active repository and branch, including shared templates or configuration extensions:

~~~bash
rg -n '^\s*(secrets|pipeline|platform|branches|environment|group):|includes:|excludes:' \
  .woodpecker.yml .woodpecker.yaml .woodpecker/ 2>/dev/null
~~~

### Replace Step `secrets` with `from_secret`

The stored secret object remains a named server-side value. What 3.x removes is the step-level `secrets:` injection syntax.

Woodpecker 2.x form:

~~~yaml
steps:
  - name: publish
    image: alpine:3.22
    secrets: [deploy_token]
    commands:
      - ./publish.sh
~~~

Woodpecker 3.x form, also supported as the migration path in 2.8:

~~~yaml
steps:
  - name: publish
    image: alpine:3.22
    environment:
      DEPLOY_TOKEN:
        from_secret: deploy_token
    commands:
      - ./publish.sh
~~~

Secret names and environment-variable names are now independent. Also, 3.x preserves the declared case instead of automatically uppercasing names. Audit scripts that expected `$DEPLOY_TOKEN` from a lowercase `deploy_token` declaration.

Plugin settings continue to support secret references:

~~~yaml
steps:
  - name: publish-image
    image: woodpeckerci/plugin-docker-buildx:6.1.1
    settings:
      password:
        from_secret: registry_password
~~~

### Convert Environment Lists to Maps

Woodpecker 3.x rejects list-style environment definitions:

~~~yaml
# 2.x
environment:
  - APP_ENV=production
  - LOG_LEVEL=info

# 3.x
environment:
  APP_ENV: production
  LOG_LEVEL: info
~~~

### Remove Obsolete Filters and Keys

The 3.0 migration notes identify these changes:

- `includes` and `excludes` filter options are removed;
- the `environment` filter is replaced by `when.evaluate`;
- step `group` is replaced by explicit `depends_on` relationships;
- former `pipeline:`, `platform:`, and `branches:` deprecations now produce errors;
- several built-in variables are removed or renamed, including the move from `CI_COMMIT_URL` to `CI_PIPELINE_FORGE_URL`;
- empty built-in values are no longer injected.

Update and run the workflows on 2.8 before the major cutover wherever the compatibility overlap allows. That makes a YAML failure a repository change you can review normally rather than an emergency production edit.

## Phase 3: Inventory Secrets, Crons, Plugins, and Hooks

Build a migration worksheet without exporting secret values into plaintext.

For each repository, organization, and global scope, record secret **names**, allowed events, and plugin-image filters. Confirm the actual secret value exists in your source-of-truth secret manager or recovery process. A database backup preserves Woodpecker's records, but it should not be the only copy of irreplaceable credentials.

For each cron, record:

- repository and cron ID;
- name and enabled state;
- 2.x six-field schedule;
- intended wall-clock time and time zone;
- selected branch;
- current next execution.

For privileged workloads, enumerate exact plugin image names and tags from workflow YAML. Do not use a broad wildcard or tagless allowlist just to make the upgrade pass.

For webhooks, capture a successful pre-upgrade forge delivery: repository, hook URL, event type, response status, and timestamp. Confirm which repositories are active and whether any reverse proxy or external authentication layer treats webhook requests specially.

Also export the complete deployment configuration, including:

- `WOODPECKER_HOST` and any `WOODPECKER_EXPERT_*` overrides;
- forge OAuth client and secret configuration;
- database driver and datasource;
- `WOODPECKER_AGENT_SECRET` or its mounted file;
- `WOODPECKER_ENCRYPTION_KEY`, key file, or Tink keyset if database secret encryption is enabled;
- agent labels, backend, volumes, and resource limits;
- TLS certificate and reverse-proxy configuration.

Losing an encryption key while retaining an encrypted database makes the secret records unusable. Back up the key material separately with the same controls applied to other production credentials.

## Phase 4: Take a Consistent, Tested Backup

Woodpecker automatically runs database migrations but does not create database backups. Use the database vendor's supported backup tooling.

- For SQLite, stop the Woodpecker server before copying the database and any file-backed log/artifact directories, or use SQLite's online backup mechanism correctly.
- For PostgreSQL, take a consistent `pg_dump` plus any separately stored files.
- For MySQL or MariaDB, take a consistent logical or physical backup appropriate to the deployment.

Record the old server and agent image digests alongside the backup. Test restoration to an isolated database or host and verify that Woodpecker 2.8.3 can start against the restored copy.

A rollback is not “put the old image tag back.” Once 3.x has migrated the database, roll back the application **and** restore the matching pre-upgrade database and configuration. Never point an older server at a database already migrated by a newer major release unless Woodpecker explicitly documents that path.

## Phase 5: Prepare the 3.x Deployment

Pin server and agent images explicitly:

~~~yaml
services:
  woodpecker-server:
    image: woodpeckerci/woodpecker-server:v3.17.0
    volumes:
      - woodpecker-server-data:/var/lib/woodpecker

  woodpecker-agent:
    image: woodpeckerci/woodpecker-agent:v3.17.0
    environment:
      WOODPECKER_BACKEND: docker
~~~

Carry forward the existing database, agent authentication, forge, and encryption settings. Apply the documented environment-variable renames. Important examples include:

- `WOODPECKER_ESCALATE` → `WOODPECKER_PLUGINS_PRIVILEGED`;
- `WOODPECKER_FILTER_LABELS` → `WOODPECKER_AGENT_LABELS`;
- `WOODPECKER_DEFAULT_CLONE_IMAGE` → `WOODPECKER_DEFAULT_CLONE_PLUGIN`;
- `WOODPECKER_ROOT_URL` and `WOODPECKER_ROOT_PATH` → `WOODPECKER_HOST`;
- `WOODPECKER_WEBHOOK_HOST` → `WOODPECKER_EXPERT_WEBHOOK_HOST`.

Docker backend resource-limit settings moved from the server to agents. Kubernetes agents no longer assume an image-pull Secret named `regcred`; set `WOODPECKER_BACKEND_K8S_PULL_SECRET_NAMES` explicitly when required.

Woodpecker 3.x images use UID and GID 1000 for non-privileged server and CLI execution. Check ownership and write access on mounted server data before cutover. The Docker-backed agent has separate rootful requirements for mounting the Docker socket; do not blindly apply the server's security context to it.

## Phase 6: Define Privileged Plugins Explicitly

Woodpecker 3.x grants no plugin privileged mode by default. The Docker Buildx plugin is the most common workload affected. Configure an exact allowlist on the server:

~~~yaml
services:
  woodpecker-server:
    environment:
      WOODPECKER_PLUGINS_PRIVILEGED: >-
        woodpeckerci/plugin-docker-buildx:6.1.1
~~~

The image reference must match the workflow. Woodpecker's migration guidance recommends Buildx plugin 5.0.0 or later and recommends specifying tags. Pin the version you have reviewed rather than copying an example forever.

Privileged mode is a security boundary. Do not enable it for arbitrary images, and do not confuse it with repository trust or trusted clone plugins. After cutover, test one non-production image build and confirm the plugin receives privileged mode while an unlisted image does not.

## Phase 7: Cut Over in a Controlled Window

Use a maintenance window that prevents a surge of webhook and cron work during database migration.

1. Stop or quiesce 2.8 agents so they accept no new workflows.
2. Stop the 2.8 server and take the final consistent backup.
3. Start only the 3.17 server against the production database.
4. Follow server logs until every database migration completes and the health endpoint is ready.
5. Sign in and inspect repositories, secret metadata, registries, cron records, and settings.
6. Start 3.17 agents one backend or pool at a time.
7. Run a no-secret manual smoke workflow.
8. Run a controlled push, secret-consuming canary, privileged-plugin canary, and cron canary.

Do not declare success merely because the home page loads. Server startup, agent execution, and forge delivery cover different components.

## Phase 8: Inspect Cron Conversion

Woodpecker 3.x uses standard five-field Linux cron syntax without seconds. The automatic database migration attempts to convert schedules. The official example is:

~~~text
2.x: 0 0 8 * * *
3.x:   0 8 * * *
~~~

For every important cron, compare the migrated schedule and `NextExec` with the worksheet. Set the intended IANA time zone, verify the branch still exists, and run the cron once on demand. Then observe its first natural scheduled occurrence.

Also update CLI automation from `woodpecker-cli cron` to `woodpecker-cli repo cron`. A cron whose database record migrated correctly can still appear broken if an external management script continues using the removed command path.

## Phase 9: Repair Every Repository Webhook

Woodpecker 3.0 changes webhook tokens for stronger security. Existing repository hooks must be updated with **Repair all** in the admin settings, or repaired individually where that is operationally safer.

After repair:

1. Open the forge's webhook settings and confirm the destination is the current public Woodpecker URL.
2. Send a controlled push and inspect the forge delivery status.
3. Correlate the delivery timestamp with reverse-proxy and Woodpecker server logs.
4. Confirm exactly one pipeline appears for the commit.
5. Verify Woodpecker can report the resulting status back to the forge.

Woodpecker 3.0 also changes the HTTP-message signature on outbound requests to external configuration services/extensions to RFC 9421. Update custom extension verifiers or intermediary proxies that inspect those Woodpecker-signed requests. This is separate from incoming forge webhook validation and the webhook-token change handled by **Repair all**.

## Phase 10: Validate Secrets Without Revealing Them

Use a dedicated canary secret with a non-sensitive value and test all relevant scopes and policies:

~~~yaml
steps:
  - name: verify-secret-injection
    image: alpine:3.22
    environment:
      CANARY_TOKEN:
        from_secret: migration_canary_token
    commands:
      - test -n "$CANARY_TOKEN"
~~~

Do not print the value. Test repository, organization, and global precedence separately if the installation uses all three. Test allowed events and plugin image restrictions, because a secret can exist in the UI yet be intentionally withheld from a particular event or image.

Finally, rotate temporary canary credentials and remove any migration-only access.

## Acceptance Checklist

The upgrade is complete only when all of these are true:

- 3.17 server and agents run pinned, matching versions;
- database migration logs contain no unresolved error;
- mounted data is writable by the intended container user;
- active repositories and settings are present;
- workflow files use 3.x syntax and current built-in variables;
- secret names, scopes, event filters, and image filters match the inventory;
- a canary secret is injected without being logged;
- cron expressions, time zones, branches, and next executions are correct;
- privileged plugins are explicitly and narrowly allowlisted;
- every active repository hook is repaired and a push delivery succeeds;
- one test per backend or agent pool completes;
- the pre-upgrade backup and rollback procedure remain available through the observation window.

## Official Documentation

- [Woodpecker 3.0 migration notes](https://woodpecker-ci.org/migrations#300)
- [Woodpecker 3.17.0 release](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0)
- [Woodpecker 2.8.3 release](https://github.com/woodpecker-ci/woodpecker/releases/tag/v2.8.3)
- [Woodpecker server configuration and database migrations](https://woodpecker-ci.org/docs/administration/configuration/server)
- [Woodpecker secrets](https://woodpecker-ci.org/docs/usage/secrets)
- [Woodpecker cron jobs](https://woodpecker-ci.org/docs/usage/cron)
- [Woodpecker workflow syntax](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Woodpecker project settings](https://woodpecker-ci.org/docs/usage/project-settings)
- [Woodpecker container image policy](https://woodpecker-ci.org/docs/administration/general#container-images)

## Conclusion

A safe Woodpecker 2.x-to-3.x migration is a state-preservation exercise, not an image pull. Prepare compatible workflow syntax on 2.8.3, inventory secrets, crons, privileged images, and hooks, and test a restorable database backup. During cutover, migrate the server first, upgrade agents deliberately, inspect cron conversion, define exact privileged-plugin allowlists, repair webhook tokens, and validate secrets with canaries. That sequence makes each failure attributable and keeps rollback real.
