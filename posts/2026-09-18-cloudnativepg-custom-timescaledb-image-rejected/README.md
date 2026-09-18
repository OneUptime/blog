# CloudNativePG Rejects a Custom PostgreSQL or TimescaleDB Image: Verify Labels, UID, Binaries, and Extensions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, Kubernetes, TimescaleDB, Troubleshooting, Container

Description: Diagnose custom PostgreSQL image failures in CloudNativePG by checking version detection, runtime identity, required executables, and extension compatibility.

A PostgreSQL image that works with `docker run` can still fail under CloudNativePG. The operator controls startup, security settings, initialization, and replication. A custom image must provide compatible binaries and libraries without relying on its normal entrypoint to prepare the server.

This guide follows the [CloudNativePG 1.30 image requirements](https://cloudnative-pg.io/docs/1.30/container_images/). The title mentions labels because they are useful inspection evidence, but adding an arbitrary OCI label is not a general fix. CloudNativePG's documented PostgreSQL major-version detection uses the image tag or an explicit image catalog major.

## Separate admission from runtime failure

First identify where the request fails:

```bash
kubectl get cluster app-db -n database -o yaml
kubectl get pods -n database -l cnpg.io/cluster=app-db
kubectl get events -n database --sort-by=.metadata.creationTimestamp
```

If the Kubernetes API rejects the Cluster manifest, read the admission error before debugging PostgreSQL. If a Pod exists, describe it and inspect both initialization and database-container logs:

```bash
kubectl describe pod app-db-2 -n database
kubectl logs app-db-2 -n database -c postgres
kubectl logs app-db-2 -n database -c postgres --previous
```

Use the actual Pod and container names from the manifest. The previous-log command is useful only after a container restart. An image pull authorization failure, unsupported CPU architecture, missing executable, and PostgreSQL extension error require different fixes.

## Verify the actual PostgreSQL major

When using `imageName`, the tag must begin with a recognizable PostgreSQL version. A tag such as `17.11-custom1` conveys a PostgreSQL major; `latest-timescaledb` does not. A TimescaleDB extension version is not a PostgreSQL major version.

An ImageCatalog can explicitly supply the major when the existing image tag does not follow that convention. The [image catalog documentation](https://cloudnative-pg.io/docs/1.30/image_catalog/) explains that the declared major must match the binaries. A catalog declaration cannot convert a PostgreSQL 16 image into PostgreSQL 17.

Inspect the candidate locally using an approved image and an isolated environment. These commands do not mount a production data volume:

```bash
IMAGE=registry.example.com/database/postgresql:17.11-custom1
docker image inspect "$IMAGE" --format '{{json .Config.Labels}}'
docker image inspect "$IMAGE" --format '{{json .Config.User}}'
docker run --rm --entrypoint postgres "$IMAGE" --version
```

Also inspect the architecture and immutable digest through your registry tooling. Keep labels for provenance and build information, but verify the binary itself. Never change the major-version tag merely to bypass a validation error on an existing data directory.

## Check executables and startup assumptions

The required executable set includes `initdb`, `postgres`, `pg_ctl`, `pg_controldata`, and `pg_basebackup` on `PATH`. Locale support must be present. Barman Cloud executables are not a general requirement for current CloudNativePG images when using the separate backup plugin.

For a candidate image that contains a shell, run:

```bash
docker run --rm --entrypoint sh "$IMAGE" -c '
  id
  command -v initdb postgres pg_ctl pg_controldata pg_basebackup
  postgres --version
'
```

For shell-less images, use individual entrypoints and build-time checks instead. Verify shared-library dependencies as part of the image build. An executable can exist but fail because its dynamic loader or a required library is missing.

CloudNativePG replaces the image's entrypoint with its instance manager. Do not depend on `docker-entrypoint-initdb.d` scripts, startup package installation, or an image's automatic tuning script. Move database initialization into the operator's supported bootstrap configuration and bake required operating-system files into the image.

## Match the runtime identity

CloudNativePG's [Cluster API](https://cloudnative-pg.io/docs/1.30/cloudnative-pg.v1/#clusterspec) exposes `postgresUID` and `postgresGID`, both defaulting to 26. If the image uses different IDs, verify them and configure the matching values. This is an illustrative fragment, not a universal TimescaleDB setting:

```yaml
spec:
  postgresUID: 999
  postgresGID: 999
```

Check the actual Pod security context, image account, mounted-volume ownership, and storage-driver behavior together. Existing data written under a different identity needs a planned ownership migration. Do not solve a permission problem by making PostgreSQL privileged or running it as root; CloudNativePG normally uses a non-root, restricted security context.

## Validate TimescaleDB as an extension

Choose a TimescaleDB version that supports the exact PostgreSQL major in the image. The vendor's [upgrade guidance](https://github.com/timescale/docs/blob/latest/self-hosted/upgrades/upgrade-pg.md) treats these as a compatibility pair. The [TimescaleDB Docker image](https://github.com/timescale/timescaledb-docker/blob/main/README.md) also has initialization behavior that CloudNativePG will not automatically run.

Install the appropriate extension control files, SQL scripts, and shared libraries in the image. PostgreSQL's [extension packaging documentation](https://www.postgresql.org/docs/18/extend-extensions.html) explains their roles. For a tested image, configure preloading through the Cluster:

```yaml
spec:
  postgresql:
    shared_preload_libraries:
      - timescaledb
```

Then create or manage the extension in each intended database through a supported bootstrap or database-management workflow. Preloading a library alone does not create the database extension. Conversely, creating the SQL extension cannot compensate for a missing or incompatible library.

Test initialization, a second replica, backup and restore, and a switchover in an isolated cluster before deploying the image. Check `pg_available_extensions`, installed extension versions, representative hypertable operations, and background jobs. A candidate that only starts one primary has not yet demonstrated that it works with the operator's full lifecycle.
