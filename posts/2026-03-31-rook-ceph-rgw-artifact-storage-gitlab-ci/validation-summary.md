# Validation Summary: How to Use Ceph RGW as Artifact Storage for GitLab CI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook Ceph (RGW / RADOS Gateway)
- GitLab CI/CD (Omnibus and Helm chart)
- GitLab Runner (distributed cache with S3)
- radosgw-admin CLI
- AWS CLI (S3-compatible)
- Maven (build tool used in examples)

## Sources Consulted
- GitLab documentation: Object storage configuration for Omnibus — https://docs.gitlab.com/ee/administration/object_storage.html
- GitLab Runner documentation: Distributed cache with S3 — https://docs.gitlab.com/runner/configuration/advanced-configuration.html#the-runnerscaches3-section
- GitLab CI/CD YAML reference: artifacts and cache keywords — https://docs.gitlab.com/ee/ci/yaml/
- GitLab Helm chart: Object storage configuration — https://docs.gitlab.com/charts/advanced/external-object-storage/
- Ceph documentation: radosgw-admin user management — https://docs.ceph.com/en/latest/radosgw/admin/
- Rook Ceph documentation: Object Store (RGW) — https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/

## Issues Found

### Issue 1 (Major): Incorrect cache configuration in gitlab.rb
**What was wrong:** The post included `gitlab_rails['cache_object_store_enabled']` and `gitlab_rails['cache_object_store_connection']` settings in `/etc/gitlab/gitlab.rb`. These settings do not exist. GitLab CI/CD cache is not a server-side object storage feature — it is managed by the GitLab Runner. The S3 cache backend must be configured in the runner's `config.toml`, not in `gitlab.rb`.

**What was changed:** Removed the bogus `cache_object_store_*` settings from the `gitlab.rb` block. Added a new "Configure GitLab Runner Cache with S3" section with the correct `config.toml` configuration using `[runners.cache.s3]`.

### Issue 2 (Minor): Maven cache path mismatch in .gitlab-ci.yml
**What was wrong:** The pipeline cached `.m2/repository` (a project-relative path), but Maven by default writes its local repository to `~/.m2/repository` (the user home directory). Without redirecting Maven to use the project-local path, the cache directive would cache an empty or nonexistent directory.

**What was changed:** Added a top-level `variables` block with `MAVEN_OPTS: "-Dmaven.repo.local=.m2/repository"` so Maven writes to the cached path. Also added the `cache` block to the `build` job so both build and test stages benefit from the dependency cache.

## Review Notes
- The post uses the legacy per-object-type configuration (`artifacts_object_store_*`) rather than the consolidated object storage configuration (`object_store`) introduced in GitLab 13.x. The legacy format still works but GitLab recommends the consolidated form for new setups. This is not incorrect, just worth noting for future updates.
- The Helm chart section shows credentials in plaintext values.yaml. In production, the connection details should be stored in a Kubernetes Secret referenced by `connection.secret` and `connection.key`. The inline format is acceptable for a tutorial but readers should be aware of this.
- The `radosgw-admin user create` command, AWS CLI bucket creation, and artifact verification commands are all correct.
