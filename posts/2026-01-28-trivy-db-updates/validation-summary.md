# Validation Summary: How to Configure Trivy DB Updates

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Trivy CLI
- Trivy vulnerability DB
- Trivy Java index DB
- Trivy checks bundle
- OCI registries and ORAS
- GitHub Actions
- GitLab CI
- Kubernetes CronJob
- YAML configuration

## Sources Consulted
- Trivy Databases documentation: https://trivy.dev/docs/latest/guide/configuration/db/
- Trivy Cache documentation: https://trivy.dev/docs/latest/guide/configuration/cache/
- Trivy Config File reference: https://trivy.dev/docs/latest/guide/references/configuration/config-file/
- Trivy Self-Hosting Databases documentation: https://trivy.dev/docs/latest/guide/advanced/self-hosting/
- Trivy Advanced Network Scenarios documentation: https://trivy.dev/docs/v0.57/guide/advanced/air-gap/
- Trivy Image CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy DB client source for update metadata behavior: https://github.com/aquasecurity/trivy/blob/main/pkg/db/db.go

## Issues Found
- The post described `trivy-java-db` as containing Java-specific vulnerabilities. Changed it to describe the Java index DB accurately as an artifact index used for JAR detection.
- The database size and fixed update-frequency claims were too specific and not supported by current docs. Changed them to variable sizes and metadata-driven/checks-bundle update behavior.
- The update flow said databases download from GitHub. Changed it to OCI Registry, matching Trivy's OCI-distributed DB artifacts.
- The default cache behavior said the DB expires after 12 hours. Changed this to metadata-driven reuse based on Trivy DB metadata.
- The post used `trivy image --reset`, which is not listed in the current image CLI reference. Replaced it with `trivy clean --vuln-db` followed by `trivy image --download-db-only`.
- The macOS cache path was listed as `~/.cache/trivy/`. Added the macOS cache location `~/Library/Caches/trivy/`.
- The `trivy.yaml` examples used scalar DB repository values. Changed them to list values with schema tags, matching the current config file reference.
- CI examples pre-downloaded the Java DB but only skipped the vulnerability DB on later scans. Added `--skip-java-db-update` where the examples intend to use cached DBs.
- The ORAS air-gap example used `oras pull -o` as if it directly produced the Trivy cache layout. Changed it to pull the OCI artifact, extract `db.tar.gz` and `javadb.tar.gz`, and place them in `db` and `java-db` cache subdirectories.
- The internal mirror example used `oras push` over extracted files. Changed it to `oras copy` of the OCI artifacts and configured both `--db-repository` and `--java-db-repository`.
- The workflow diagram checked `Cache < 6 hours?`. Changed it to `Before NextUpdate?` to reflect Trivy's metadata-based update decision.
- The wrapper script's macOS date parsing did not handle Trivy's RFC3339 timestamps with fractional seconds and `Z`. Normalized the timestamp and updated the BSD `date` format.
- The rate-limit example suggested `TRIVY_USERNAME` and `TRIVY_PASSWORD` for DB downloads. Replaced it with alternate DB repositories, which aligns with current Trivy database repository fallback guidance.
- The configuration reference included `cache.clear`, which is not a current Trivy config key. Replaced it with the documented `clean.vuln-db` key for `trivy clean`.

## Review Notes
Trivy was not installed in the local environment, so CLI validation was performed against the current official Trivy documentation and Trivy source rather than local `--help` output.
