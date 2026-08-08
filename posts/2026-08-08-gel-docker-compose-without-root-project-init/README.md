# Initialize Gel with Docker Compose Without Root-owned Project Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gel, EdgeDB, Docker Compose, Containers, Migrations, Local Development

Description: Run Gel in Compose and create migrations as your host user without using root-owned project initialization inside the server container.

---

`gel project init` is a local-development convenience that links a source directory to a CLI-managed instance. It is not a required server bootstrap step. Running it as root inside a container often creates root-owned `gel.toml`, `dbschema`, migration, and local CLI configuration files on a bind mount.

With Docker Compose, keep three concerns separate:

1. Compose creates and starts the Gel server container.
2. Source-controlled `gel.toml` and `dbschema` describe the application project.
3. A host CLI or disposable CLI container connects explicitly and creates migrations as the developer's UID and GID.

This avoids both root-owned files and a hidden CLI-managed instance inside a container.

## What `project init` Actually Does

The official CLI reference says `gel project init` can create an instance, a schema directory, a `gel.toml` file, and a local association between the directory and an instance. That association is stored in user-specific CLI configuration.

A Compose service already defines the instance lifecycle, network address, port, storage, and environment. Creating another local instance from inside the container is the wrong ownership model. Even linking the Compose instance from a root shell writes credentials for root, not for the host developer or CI user.

You can still keep a normal project layout in version control:

```text
app/
├── compose.yaml
├── gel.toml
└── dbschema/
    ├── default.gel
    └── migrations/
```

A minimal current project file is:

```toml
[instance]
server-version = "6"
```

Pin a point release if reproducibility requires it. The project file is a repository artifact, so create and edit it as the host user.

## A Development Compose File

The following example deliberately uses Gel's documented insecure development mode. It must not be copied into production:

```yaml
services:
  gel:
    image: geldata/gel:6
    environment:
      GEL_SERVER_SECURITY: insecure_dev_mode
    volumes:
      - gel-data:/var/lib/gel/data
      - ./dbschema:/dbschema:ro
    ports:
      - '5656:5656'

  cli:
    image: geldata/gel-cli
    profiles: ['tools']
    user: '${LOCAL_UID:-1000}:${LOCAL_GID:-1000}'
    working_dir: /workspace
    environment:
      HOME: /tmp/gel-cli-home
    volumes:
      - .:/workspace
    entrypoint:
      - gel
      - --host=gel
      - --port=5656
      - --tls-security=insecure
    depends_on:
      - gel

volumes:
  gel-data:
```

The named volume persists the database. The read-only schema mount lets the server image read committed migrations without giving the server process ownership of source files. The tools service is disabled during ordinary `docker compose up` because it belongs to a profile.

The official image attempts to apply migrations found in `/dbschema/migrations` unless `GEL_DOCKER_APPLY_MIGRATIONS` is set to `never`. This documented default behavior applies committed migrations at server startup; it does not invent a first migration from an edited `.gel` schema. The explicit writable `HOME` also prevents the arbitrary-UID tools process from trying to place cache or configuration under a root-owned home directory.

## Start the Server Without Initializing a Project

Start the database and inspect its logs:

```bash
docker compose up -d gel
docker compose logs -f gel
```

When the server is ready, query it directly:

```bash
docker compose run --rm cli query \
  'select sys::get_version_as_str()'
```

There is no `project init` in this flow. Connection flags tell the disposable CLI exactly which Compose service to use.

If the Gel CLI is already installed on the host, the equivalent development connection is:

```bash
gel --host localhost --port 5656 \
  --tls-security insecure \
  query 'select sys::get_version_as_str()'
```

In a production-style Compose deployment, use authentication and strict TLS rather than these development flags.

## Create Migrations as the Host User

Pass the host numeric identity into Compose:

```bash
LOCAL_UID=$(id -u) LOCAL_GID=$(id -g) \
  docker compose run --rm cli migration create
```

Because `/workspace` is a bind mount and the CLI process runs with the host identity, the new file under `dbschema/migrations` is host-owned. Review it before applying it.

On Linux, verify ownership and the migration chain:

```bash
ls -ln dbschema dbschema/migrations

LOCAL_UID=$(id -u) LOCAL_GID=$(id -g) \
  docker compose run --rm cli migration log --from-fs
```

macOS and Windows Desktop use a virtualized file-sharing layer, so numeric ownership presentation differs, but avoiding a root CLI still prevents common permission problems and makes Linux CI behavior predictable.

Apply a newly reviewed migration explicitly:

```bash
LOCAL_UID=$(id -u) LOCAL_GID=$(id -g) \
  docker compose run --rm cli migrate
```

Alternatively, recreate the server and let the official image apply committed migrations at startup. Explicit application usually gives a clearer failure boundary during development and CI.

## Do Not Share a Root CLI Configuration Volume

The official Docker documentation shows how a CLI credentials volume can link an instance. That is useful for interactive work, but it is not required when connection flags or `GEL_DSN` are supplied. A shared config volume can become confusing when:

- it was first written by root;
- it points at a stale container hostname or port;
- several Compose projects reuse the same instance alias;
- CI accidentally persists developer credentials; or
- `branch switch` changes the default target for another task.

For automation, prefer an explicit DSN or host, port, branch, user, password, and TLS settings supplied through the secret system. Keep credentials out of the repository and command output.

## Production Changes

The development Compose file omits controls that a production deployment needs. At minimum:

- remove `GEL_SERVER_SECURITY=insecure_dev_mode`;
- configure a password or another documented authentication method;
- mount TLS certificate and private-key files as secrets;
- use `GEL_SERVER_TLS_CERT_FILE` and `GEL_SERVER_TLS_KEY_FILE`;
- avoid publishing port 5656 to untrusted networks;
- pin an approved image digest or point release;
- add readiness monitoring using `/server/status/ready`;
- back up and restore-test the persistent data; and
- decide whether migrations run in the database container or a single deployment job.

Do not scale multiple containers that all race to perform the same deployment migration. Make migration ownership explicit even though the image offers convenient automatic application.

## EdgeDB Versions Before 6

The same architectural rule applies to legacy EdgeDB containers, but names differ. Official configuration documentation states that server versions before 6 use `EDGEDB_` rather than `GEL_` environment variables. Legacy projects use `edgedb.toml`, `[edgedb]`, and `.esdl` schema files. Do not mix a Gel 6 image with only legacy-prefixed server variables and assume they were applied.

## Official Documentation

- [Running Gel with Docker](https://docs.geldata.com/reference/running/deployment/docker)
- [Gel project initialization](https://docs.geldata.com/reference/using/cli/gel_project/gel_project_init)
- [Gel projects](https://docs.geldata.com/reference/using/projects)
- [Gel migrations CLI](https://docs.geldata.com/reference/using/cli/gel_migration)
- [Gel server configuration](https://docs.geldata.com/reference/running/configuration)
- [Docker Compose services reference](https://docs.docker.com/reference/compose-file/services/)

## Conclusion

Compose should own the containerized server, while the repository owns `gel.toml`, schema, and migrations. Connect with explicit parameters and run a disposable CLI as the host UID and GID. That produces predictable files, avoids root-specific project state, and keeps local, CI, and production responsibilities visible.
