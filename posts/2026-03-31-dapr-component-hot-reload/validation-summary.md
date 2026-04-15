# Validation Summary: How to Configure Component Hot Reload in Dapr Self-Hosted Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Component Hot Reload (preview feature)
- Dapr Self-Hosted Mode
- Redis State Store (`state.redis`)
- Redis Pub/Sub (`pubsub.redis`)
- Dapr Metadata API

## Sources Consulted
- Dapr: Updating Components (Hot Reload) — https://docs.dapr.io/operations/components/component-updates/
- Dapr: Preview Features List — https://docs.dapr.io/operations/support/support-preview-features/
- Dapr: How to Enable Preview Features — https://docs.dapr.io/operations/configuration/preview-features/
- Dapr: dapr run CLI Reference — https://docs.dapr.io/reference/cli/dapr-run/
- Dapr: Metadata API Reference — https://docs.dapr.io/reference/api/metadata_api/
- Dapr: Self-Hosted Overview — https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-overview/
- Dapr: Redis State Store Setup — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr: Redis Streams Pub/Sub Setup — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr v1.13 Release Announcement — https://blog.dapr.io/posts/2024/03/05/dapr-v1.13-is-now-available/

## Issues Found

### 1. Incorrect CLI flag `--enable-hot-reload` (Critical)
- **What was wrong:** The post claimed hot reload is enabled via a `--enable-hot-reload` flag on `dapr run`. This flag does not exist.
- **What was changed:** Replaced with the correct approach: enabling the `HotReload` feature gate in a Dapr Configuration YAML file and passing it via `--config ./hotreload-config.yaml`. Added a complete Configuration YAML example.
- **Why:** Hot reload is a preview feature controlled through Dapr's feature gate system, not a CLI flag. Using the nonexistent flag would cause `dapr run` to fail.

### 2. Incorrect version (v1.12+ should be v1.13+)
- **What was wrong:** The post stated hot reload is available from Dapr v1.12+.
- **What was changed:** Updated all version references from v1.12+ to v1.13+.
- **Why:** Component hot reload was introduced in Dapr v1.13, as confirmed by the official release announcement and documentation.

### 3. Log message capitalization
- **What was wrong:** Log messages were shown with lowercase "component" (e.g., `component updated:`).
- **What was changed:** Capitalized to `Component updated:`, `Component loaded:`, `Component removed:` to match the Dapr source code.
- **Why:** The Dapr runtime source code uses capital "C" in these log messages.

### 4. Missing preview feature caveat
- **What was wrong:** The post did not mention that hot reload is a preview feature or that it has limitations.
- **What was changed:** Added a note that hot reload is a preview feature and does not apply to Actor State Store or Workflow Backend components.
- **Why:** Readers need to know this is not yet a stable feature and has component type limitations.

### 5. Summary paragraph referenced nonexistent flag
- **What was wrong:** The summary mentioned launching apps with `--enable-hot-reload`.
- **What was changed:** Updated to reference the `HotReload` feature gate and `--config` flag instead.
- **Why:** Consistency with the corrected instructions in the body of the post.

## Review Notes
- The `dapr run` command examples were also missing the `--` separator before the application command (`node app.js`). The `--` separator is recommended by the Dapr CLI docs to clearly separate Dapr flags from the application command. This was added in the corrected examples.
- The "Component removed" log message could not be fully verified in the Dapr source code. It is plausible but the exact wording may differ. Readers should check their actual Dapr logs.
- Hot reload remains a preview feature as of Dapr v1.14+. Its behavior or API may change in future releases.
