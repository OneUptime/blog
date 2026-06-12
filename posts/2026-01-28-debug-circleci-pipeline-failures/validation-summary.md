# Validation Summary: How to Debug CircleCI Pipeline Failures

## Status
validated

## Post Type
Guide / Checklist

## Technologies Covered
- CircleCI (CI/CD platform)
- YAML (CircleCI config format)
- Docker (executor)
- macOS executor
- SSH (rerun-with-SSH feature)

## Sources Consulted
- CircleCI Configuration Reference - `store_artifacts`: https://circleci.com/docs/configuration-reference/#storeartifacts
- CircleCI Debugging with SSH: https://circleci.com/docs/ssh-access-jobs/
- CircleCI Caching documentation: https://circleci.com/docs/caching/
- CircleCI Local CLI (`circleci local execute`): https://circleci.com/docs/local-cli/
- CircleCI Executors documentation: https://circleci.com/docs/executor-types/

## Issues Found
No technical issues found.

- The `store_artifacts` YAML snippet uses the correct step name and `path` key as documented in the CircleCI configuration reference.
- The "Rerun with SSH" feature is a real CircleCI capability accessible from the job page in the web UI.
- The cache-key invalidation advice (changing the key when a cache appears corrupted) matches CircleCI's recommended approach, since cache writes are immutable per key.
- The recommendation to reproduce locally with the same Docker image is correct; macOS executor jobs cannot be fully reproduced locally without macOS hardware, but using the same toolchain/image locally is sound general advice.

## Review Notes
- The post is intentionally high-level (a checklist-style guide) and does not go deep into specific CLI commands or config examples. The single technical artifact (the `store_artifacts` step) is correct.
- A future revision could mention the `circleci local execute` CLI by name for the "Reproduce Locally" step and note that the macOS executor cannot be replicated outside of macOS hardware. These are improvements, not corrections.
- No version-specific claims are made, so the post should remain accurate across CircleCI 2.x config versions.
