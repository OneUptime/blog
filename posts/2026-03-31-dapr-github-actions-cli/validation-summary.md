# Validation Summary: How to Use GitHub Actions with Dapr CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr CLI (init, run, stop, publish, status, components)
- GitHub Actions (workflow YAML, actions/checkout@v4, actions/setup-python@v5, dapr/setup-dapr@v2, azure/k8s-set-context@v3)
- Kubernetes (kubectl, Dapr on Kubernetes)
- Python (subscriber app, pytest)
- Pub/Sub messaging pattern with Dapr

## Sources Consulted
- Dapr CLI reference documentation — https://docs.dapr.io/reference/cli/
- `dapr init` CLI reference — https://docs.dapr.io/reference/cli/dapr-init/
- `dapr run` CLI reference — https://docs.dapr.io/reference/cli/dapr-run/
- `dapr stop` CLI reference — https://docs.dapr.io/reference/cli/dapr-stop/
- `dapr publish` CLI reference — https://docs.dapr.io/reference/cli/dapr-publish/
- `dapr status` CLI reference — https://docs.dapr.io/reference/cli/dapr-status/
- `dapr components` CLI reference — https://docs.dapr.io/reference/cli/dapr-components/
- dapr/setup-dapr GitHub Action — https://github.com/dapr/setup-dapr
- dapr/cli GitHub repository — https://github.com/dapr/cli (confirmed default branch is `master`)

## Issues Found
No technical issues found.

## Review Notes
- All Dapr CLI flags verified as correct: `--runtime-version`, `--resources-path`, `--publish-app-id`, `--kubernetes`/`-k`, `--wait`, `--app-id`, `--app-port`, `--pubsub`, `--topic`, `--data`.
- The install script URL correctly references the `master` branch of dapr/cli (the repo uses `master`, not `main`).
- The `dapr/setup-dapr@v2` action exists and its `version` input is confirmed.
- GitHub Actions expression syntax (`${{ github.run_id }}`, `${{ secrets.KUBE_CONFIG }}`) is used correctly — these are substituted before shell execution, so they work properly even inside single-quoted strings in the YAML.
- The `if: always()` cleanup pattern for stopping Dapr processes is a recommended best practice.
- Dapr runtime version 1.13.0 referenced in the post is a valid release version.
