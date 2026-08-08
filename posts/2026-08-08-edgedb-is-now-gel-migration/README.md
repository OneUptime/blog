# EdgeDB Is Now Gel: What Must You Rename?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, Migration, CLI, TypeScript, Schema

Description: A version-aware checklist for moving EdgeDB projects to Gel names without confusing a product rename with a server upgrade.

---

EdgeDB was renamed to Gel with server version 6. The database model and query language did not restart from zero, but the supported names around them changed: the CLI, project file, schema extension, client packages, environment variables, container image, and GitHub Action all have Gel-era equivalents.

Treat the rename and the server upgrade as two separate changes. A repository can adopt Gel names while it still targets EdgeDB 5, because the current CLI continues to understand the deprecated project file. Conversely, replacing a container tag with version 6 changes the running server and requires an upgrade plan. A large search-and-replace that mixes both operations makes rollback unnecessarily difficult.

## The Current Naming Map

For a project moving from EdgeDB 5 naming to Gel 6 or later naming, inventory at least these surfaces:

| Before | Current | Important detail |
| --- | --- | --- |
| `edgedb` CLI | `gel` CLI | Update scripts, CI, shell aliases, and runbooks |
| `edgedb.toml` | `gel.toml` | The old filename is deprecated but still supported |
| `[edgedb]` table | `[instance]` table | This table contains `server-version` |
| schema files ending in `.esdl` | schema files ending in `.gel` | Migration files still end in `.edgeql` |
| `edgedb` npm package | `gel` npm package | Update imports as well as dependencies |
| `@edgedb/generate` | `@gel/generate` | Regenerate committed artifacts after changing it |
| `@edgedb/*` auth and AI packages | `@gel/*` equivalents | Check every framework integration individually |
| `EdgeDBError` | `GelError` | Relevant to JavaScript error handling |
| `EDGEDB_*` server variables | `GEL_*` server variables | The old prefix applies to server versions before 6 |
| `edgedb/setup-edgedb@v1` | `geldata/setup-gel@v1` | Update workflow examples and cache keys |
| `edgedb/edgedb` image | `geldata/gel` image | Pin a deliberate major or point version in production |

The query language is still called EdgeQL, so `.edgeql` query and migration files do not become `.gelql`. The default schema directory remains `dbschema`.

## Upgrade the CLI Before Editing the Repository

Start by recording the versions that currently work:

```bash
edgedb --version
gel --version
```

Gel's v5 upgrade guide recommends updating the CLI with:

```bash
gel cli upgrade
```

If an older installation says it cannot perform that update, the documented bridge is:

```bash
edgedb cli upgrade
gel cli upgrade
```

This upgrades the client-side tool, not a remote database server. Afterward, run `gel --version` in the same non-interactive environment used by CI, because an interactive shell and a build runner can resolve different executables.

## Rename the Project Contract

A minimal old project file might be:

```toml
[edgedb]
server-version = "5.7"
```

Rename it to `gel.toml` and change the table name:

```toml
[instance]
server-version = "5.7"
```

Keeping `5.7` during this commit is useful. It proves that the naming migration works without silently requesting Gel 6. Only change `server-version` when the instance upgrade has been planned and tested.

Then rename schema source files, for example:

```text
dbschema/default.esdl  ->  dbschema/default.gel
```

Do not rename files under `dbschema/migrations/`; those are EdgeQL migration scripts and retain the `.edgeql` extension. Run a repository-wide search for `.esdl`, `edgedb.toml`, and `[edgedb]` in editors, code-generation scripts, Docker build contexts, ignore files, and deployment manifests.

## Move Client Packages Deliberately

For TypeScript, Gel provides a codemod:

```bash
npx @gel/codemod@latest
```

Review its diff rather than assuming every integration is mechanical. A representative manual update is:

```ts
// Before
import { createClient, EdgeDBError } from 'edgedb';

// Current
import { createClient, GelError } from 'gel';
```

Update package scripts too:

```json
{
  "scripts": {
    "generate": "npx @gel/generate edgeql-js"
  }
}
```

Delete or regenerate generated query-builder output according to the project's normal policy. Do not leave generated files importing `edgedb` while application code imports `gel`; that can install two compatibility layers and obscure which version is actually used.

Gel's official v5 upgrade guide lists the current language clients as `gel` on PyPI and npm, `gel-go`, and `gel-rust`. Search lockfiles and deployment images for old package names, but let the package manager rewrite lock data rather than editing it by hand.

## Update Runtime Configuration

Current clients discover production connections through Gel-prefixed settings such as:

```bash
GEL_DSN='gel://app_user:secret@db.example.com:5656/main'
```

Current server and Docker settings similarly use names such as `GEL_SERVER_PASSWORD`, `GEL_SERVER_DATADIR`, and `GEL_SERVER_TLS_CERT_FILE`. Official configuration documentation explicitly says versions before 6 use the `EDGEDB_` prefix. Therefore, change variables in the same deployment that changes the server generation, or temporarily provide a tested compatibility bridge in the deployment system. Never print either form of a DSN to CI logs.

For GitHub Actions, update both setup and commands:

```yaml
- uses: geldata/setup-gel@v1
- run: gel query 'select sys::get_version_as_str()'
```

Pinning the action by commit SHA may be required by your supply-chain policy.

## Upgrade the Instance Separately

The supported path depends on how the instance is managed:

- Gel Cloud instances can be upgraded through the Cloud console or `gel instance upgrade`.
- Local project-managed instances can use `gel project upgrade --to-latest`. This command is not for self-hosted remote instances.
- The official EdgeDB 5 to Gel 6 guide recommends a new Gel 6 instance plus dump and restore for remote instances.

Do not infer server state from the executable name. Query it:

```bash
gel query 'select sys::get_version_as_str()'
```

For a remote upgrade, confirm the backend PostgreSQL prerequisite, test dump and restore with production-like volume, freeze writes for the final dump, restore into an empty target, and update the application DSN only after verification. Keep the old instance read-only and recoverable during the rollback window.

## A Safe Commit Sequence

Separate the work into observable checkpoints:

1. Upgrade the CLI on developer and CI runners.
2. Rename `edgedb.toml`, its table, and `.esdl` files while retaining the old server target.
3. Update packages, imports, generators, actions, documentation, and scripts.
4. Build and run application tests against the existing server generation.
5. Prepare and rehearse the server upgrade independently.
6. Change the server target, image or package, and runtime variables in a controlled deployment.
7. Query the running version and exercise read, write, migration, backup, and restore paths.

Compatibility shims are a migration aid, not a reason to leave mixed naming indefinitely. New client releases are published under Gel names, so the final state should use those names consistently.

## Official Documentation

- [Upgrading from EdgeDB v5 to Gel](https://docs.geldata.com/resources/upgrading)
- [Gel connection parameters](https://docs.geldata.com/reference/using/connection)
- [Gel server configuration and environment variables](https://docs.geldata.com/reference/running/configuration)
- [Gel schema reference](https://docs.geldata.com/reference/datamodel)
- [EdgeDB to Gel JavaScript and TypeScript migration guide](https://www.geldata.com/updates)
- [EdgeDB is now Gel announcement](https://www.geldata.com/blog/edgedb-is-now-gel-and-postgres-is-the-future)

## Conclusion

The durable migration is more than changing one binary name. Move the project file, table, schema extensions, packages, generators, actions, environment variables, and operational language to Gel, while keeping EdgeQL migration files intact. Most importantly, prove the naming-only change first and perform the server upgrade as a separate, recoverable operation.
