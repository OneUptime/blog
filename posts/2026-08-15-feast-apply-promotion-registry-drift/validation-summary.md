# Validation Summary: Promote Feast Definitions Without Registry Drift

## Status
validated

## Post Type
Technical guide / CI/CD operations guide

## Technologies Covered
- Feast 0.65.0
- Feast CLI (`plan`, `apply`, `delete`, and `registry-dump`)
- Feast feature repositories and projects
- File and SQL Feast registries
- Feast Python SDK
- Offline and online feature stores
- Python feature server and registry caching
- Git-based CI/CD promotion across staging and production

## Sources Consulted
- Feast 0.65.0 release: https://github.com/feast-dev/feast/releases/tag/v0.65.0
- Running Feast in production: https://docs.feast.dev/how-to-guides/running-feast-in-production
- Feast CLI reference: https://docs.feast.dev/reference/feast-cli-commands
- Feast 0.65.0 CLI implementation: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/cli/cli.py
- Feast 0.65.0 repository-wide plan/apply implementation: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/repo_operations.py
- Feast 0.65.0 registry-diff and deletion implementation: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/diff/registry_diff.py
- Feast 0.65.0 `FeatureStore.apply()` implementation and partial-apply semantics: https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/feature_store.py
- Feast feature repository and `.feastignore`: https://docs.feast.dev/reference/feature-repository
- Feast registry concepts and deletion API: https://docs.feast.dev/getting-started/components/registry
- Feast project isolation: https://docs.feast.dev/getting-started/concepts/project
- Feast SQL registry: https://docs.feast.dev/reference/registries/sql
- Feast registry cache tuning: https://docs.feast.dev/how-to-guides/online-server-performance-tuning#registry-cache-tuning
- Feast Python feature server: https://docs.feast.dev/reference/feature-servers/python-feature-server
- Feast FeatureService retrieval model: https://docs.feast.dev/getting-started/concepts/feature-retrieval
- Feast alpha FeatureView versioning and limitations: https://docs.feast.dev/reference/alpha-feature-view-versioning
- Feast entity-key serialization migration guidance: https://docs.feast.dev/how-to-guides/entity-reserialization-of-from-v2-to-v3

## Issues Found
1. **The post described CLI deletion semantics incorrectly.** The current CLI and registry prose documentation says that `feast apply` does not delete omitted objects, but the released Feast 0.65.0 implementation performs a repository-wide diff, marks repository-managed objects absent from the parsed repository for deletion, and can remove associated infrastructure. The lower-level `FeatureStore.apply()` method is the API that defaults to partial application. Replaced the no-deletion claim with the version-accurate CLI behavior and documented the SDK distinction.

2. **The drift and rollback advice inherited the same deletion error.** Registry-only objects were described as surviving apply, and a Git revert was said to leave release-added registry objects behind. Updated the drift gate to review registry-only objects as proposed deletions, and updated rollback guidance to warn that reapplying an older revision can delete objects and associated infrastructure while still not undoing feature values already written.

3. **The environment-overlay layout omitted the invocation needed for Feast to scan the shared definitions.** A nested `feature_store.yaml` is supported through the global `-f/--feature-store-yaml` option, but running Feast from an environment subdirectory would exclude the sibling `definitions/` directory from recursive discovery. Added a correct repository-root `feast -f environments/staging/feature_store.yaml plan` example.

4. **The semantic drift inventory was too narrow for a safe equality check.** Names, schemas, sources, entities, TTLs, and services do not cover transformations, serving flags, permissions, and other user-controlled object fields. Expanded the comparison to all user-controlled object-spec fields while retaining the instruction to ignore runtime and approved environment-specific metadata.

5. **The cache guidance did not cover a zero TTL.** A positive cache or server refresh interval provides a propagation bound, but `cache_ttl_seconds: 0` disables SDK-driven expiry. Clarified that an explicit refresh or restart is required when no separate server refresh interval is active.

6. **The rollback wording implied that a FeatureService is a deployed traffic target and that native multi-version FeatureView serving is broadly available.** A FeatureService is registry metadata, and Feast's native FeatureView versioning remains alpha with backend limitations. Reworded the recommendation to switch consumers between separately named, version-suffixed FeatureServices and FeatureViews.

## Review Notes
- The review used Feast 0.65.0, the current stable release on the validation date, and cross-checked current master documentation and source where the prose documentation was inconsistent.
- Feast's current CLI-reference and registry pages incorrectly conflate the SDK's partial-by-default behavior with CLI `feast apply`. The corrections follow the tagged 0.65.0 executable implementation, which performs repository-wide deletion reconciliation.
- `feast plan` exists in Feast 0.65.0, but infrastructure planning remains dependent on provider and online-store support; the post already preserves this caveat.
- The recursive Python discovery, `.feastignore`, infrastructure-change, cloud-cost, SQL-registry concurrency, project-isolation, staging-parity, and registry-cache claims were verified.
- All five external documentation links in the post returned HTTP 200 and pointed to the intended official Feast resources.
