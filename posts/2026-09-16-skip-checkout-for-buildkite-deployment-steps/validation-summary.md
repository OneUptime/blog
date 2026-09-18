# Validation Summary: How to Skip Repository Checkout for Buildkite Deployment Steps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Buildkite Pipelines
- Buildkite Agent
- Buildkite artifacts
- Buildkite hooks and plugins
- YAML pipeline configuration
- CI/CD deployment workflows

## Sources Consulted
- [Buildkite Git checkout documentation](https://buildkite.com/docs/pipelines/configure/git-checkout)
- [Buildkite command step documentation](https://buildkite.com/docs/pipelines/configure/step-types/command-step)
- [Buildkite agent artifact CLI reference](https://buildkite.com/docs/agent/cli/reference/artifact)
- [Buildkite agent hooks documentation](https://buildkite.com/docs/agent/hooks)
- [Buildkite agent configuration reference](https://buildkite.com/docs/agent/self-hosted/configure)
- [Buildkite plugins documentation](https://buildkite.com/docs/pipelines/integrations/plugins)
- [Buildkite step dependency documentation](https://buildkite.com/docs/pipelines/configure/depends-on)

## Issues Found
- The introduction said that skipping checkout removes Git access from the job. `checkout.skip` prevents the checkout phase from cloning, fetching, or checking out code, but it does not itself revoke credentials or network access. The wording now distinguishes the skipped Git operation from access control.
- The hook-precedence explanation did not qualify the effect of `checkout-override-mode`. It now states that `environment` and `pre-checkout` hooks can change `BUILDKITE_SKIP_CHECKOUT` when agent policy has not locked the value.

## Review Notes
The native `checkout.skip` examples require Buildkite Agent v3.136.0 or newer, as stated. The legacy `BUILDKITE_SKIP_CHECKOUT` example remains supported, but consistent current agents and the native YAML key are preferable. Artifact downloads should continue to use both `--step` and an explicit `--build` value for cross-build deployments.
