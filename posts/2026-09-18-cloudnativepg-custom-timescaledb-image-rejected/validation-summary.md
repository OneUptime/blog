# Validation Summary: Fix Rejected CloudNativePG PostgreSQL or TimescaleDB Images

## Status

validated

## Post Type

Technical troubleshooting guide with shell commands and Kubernetes configuration fragments.

## Technologies Covered

- CloudNativePG 1.30 and its Cluster, ImageCatalog, and Database resources
- PostgreSQL container images, executables, locales, and extensions
- Kubernetes admission, Pods, logs, security contexts, and storage permissions
- Docker image inspection and entrypoint overrides
- TimescaleDB compatibility, initialization, and extension lifecycle
- Barman Cloud Plugin

## Sources Consulted

- [CloudNativePG 1.30 container image requirements](https://cloudnative-pg.io/docs/1.30/container_images/) — required executables, locales, image tags, entrypoint replacement, and Barman Cloud requirements.
- [CloudNativePG 1.30 image catalogs](https://cloudnative-pg.io/docs/1.30/image_catalog/) — explicit major versions and the responsibility to match the image binaries.
- [CloudNativePG 1.30 Cluster API](https://cloudnative-pg.io/docs/1.30/cloudnative-pg.v1/#clusterspec) — UID/GID fields and defaults.
- [CloudNativePG 1.30 security](https://cloudnative-pg.io/docs/1.30/security/) — non-root execution, security contexts, and volume permissions.
- [CloudNativePG 1.30 PostgreSQL configuration](https://cloudnative-pg.io/docs/1.30/postgresql_conf/) — shared preload library list and missing-library startup failures.
- [CloudNativePG 1.30 bootstrap](https://cloudnative-pg.io/docs/1.30/bootstrap/) — supported post-initialization SQL configuration.
- [CloudNativePG 1.30 database management](https://cloudnative-pg.io/docs/1.30/declarative_database_management/) — declarative extension creation and updates.
- [Docker image inspect](https://docs.docker.com/reference/cli/docker/image/inspect/), [image pull](https://docs.docker.com/reference/cli/docker/image/pull/), and [container run](https://docs.docker.com/reference/cli/docker/container/run/) — inspection formatting, local image retrieval, entrypoint overrides, and automatic removal.
- [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/), and [kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) — resource inspection, selectors, namespaces, event sorting, container selection, and previous logs.
- [TimescaleDB PostgreSQL upgrade guidance](https://github.com/timescale/docs/blob/latest/self-hosted/upgrades/upgrade-pg.md) — compatible PostgreSQL and TimescaleDB versions.
- [TimescaleDB Docker image README](https://github.com/timescale/timescaledb-docker/blob/main/README.md) — inherited PostgreSQL image behavior and automatic initialization-time tuning.
- [TimescaleDB project README](https://raw.githubusercontent.com/timescale/timescaledb/main/README.md) — extension installation and setup.
- [PostgreSQL 18 extension packaging](https://www.postgresql.org/docs/18/extend-extensions.html) — control files, SQL scripts, shared libraries, and database-scoped extension objects.
- [PostgreSQL 17 postgres command](https://www.postgresql.org/docs/17/app-postgres.html) — the version-reporting option.
- [PostgreSQL 17 pg_available_extensions](https://www.postgresql.org/docs/17/view-pg-available-extensions.html) — available and installed extension version information.

## Issues Found

- **Missing local-image prerequisite:** The inspection sequence started with `docker image inspect`, which requires the image to be available locally. On a machine without the candidate image, those commands fail before the later `docker run` can pull it. Added `docker pull "$IMAGE"` before inspection and clarified that the illustrative registry reference must be replaced with the actual candidate image.

## Review Notes

- The post is technically relevant. Its documented image requirements, tag/catalog version detection, UID/GID defaults, entrypoint behavior, and preload configuration agree with CloudNativePG 1.30 documentation.
- The image reference, Pod names, namespace, and UID/GID values are examples requiring environment-specific substitution. The YAML blocks are valid configuration fragments, not complete Cluster manifests.
- Image labels are provenance evidence, not a documented replacement for tag/catalog major-version detection. An explicit catalog major does not change the binaries or make an incompatible data directory usable.
- The TimescaleDB upgrade source resolves and supports the compatibility claim, but its repository was archived on April 20, 2026. Check the vendor's maintained compatibility guidance when selecting a concrete release pair. No specific TimescaleDB release is asserted to support every PostgreSQL version.
- The PostgreSQL 18 packaging reference supports the general packaging claims; the post does not apply PostgreSQL 18-only extension search-path features to its PostgreSQL 17 example.
- The shell-based identity command shows the image's configured execution identity with its entrypoint bypassed. It does not alone establish the PostgreSQL account identity or the effective Kubernetes identity; the post correctly calls for inspecting the account and Pod security context together.
- Initialization and database logs can reside in different Pods or containers. Follow the post's instruction to substitute the actual names; `--previous` refers to the previous instance of the selected container.
- Verified command syntax and documented behavior, reviewed YAML fields against the API, and checked the referenced technical URLs. Shell code blocks passed `bash -n`; validation.json was parsed and checked for the requested status and date.
- This was a documentation and static-syntax review. No candidate image, production volume, or Kubernetes cluster was executed or modified. Image-specific library loading, permissions, replication, backup/restore, switchover, hypertables, and background jobs still require the isolated lifecycle tests described in the post.
