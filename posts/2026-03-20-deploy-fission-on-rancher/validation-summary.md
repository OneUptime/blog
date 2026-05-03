# Validation Summary: How to Deploy Fission on Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Fission (Kubernetes serverless framework)
- Rancher / Kubernetes
- Helm (chart-based install)
- Fission CLI
- Node.js function runtime
- Python function runtime (with builder)
- HTTP triggers, time triggers, Kafka message queue triggers (KEDA-backed)

## Sources Consulted
- Fission documentation site: https://fission.io/docs/
- Fission installation guide: https://fission.io/docs/installation/
- `fission environment create` reference: https://fission.io/docs/reference/fission-cli/fission_environment_create/
- `fission function create` reference: https://fission.io/docs/reference/fission-cli/fission_function_create/
- `fission function test` reference: https://fission.io/docs/reference/fission-cli/fission_function_test/
- `fission httptrigger create` reference: https://fission.io/docs/reference/fission-cli/fission_httptrigger_create/
- `fission timetrigger create` reference: https://fission.io/docs/reference/fission-cli/fission_timetrigger_create/
- `fission mqtrigger create` reference: https://fission.io/docs/reference/fission-cli/fission_mqtrigger_create/
- Node.js environment docs: https://fission.io/docs/usage/languages/nodejs/
- Apache Kafka trigger docs: https://fission.io/docs/usage/triggers/message-queue-trigger/kafka/
- Fission Helm chart repo: https://github.com/fission/fission-charts
- Fission GitHub releases: https://github.com/fission/fission/releases
- Homebrew formulae API (verified absence of `fission` formula)

## Issues Found

1. **macOS install used a non-existent Homebrew formula.** The post recommended `brew install fission`, but there is no official Homebrew formula for Fission (the Homebrew formulae API returns 404). The official docs only document the curl-based binary install. Replaced the `brew install fission` line with the equivalent curl install for macOS using the `fission-darwin-amd64` release asset, mirroring the Linux instruction directly above it.

2. **Image references used the legacy Docker Hub path.** The post used `fission/node-env`, `fission/python-env`, and `fission/python-builder`. The current official docs publish environment and builder images to GitHub Container Registry under `ghcr.io/fission/...`. Updated the three image references in Step 3 to `ghcr.io/fission/node-env`, `ghcr.io/fission/python-env`, and `ghcr.io/fission/python-builder`.

## Review Notes
- All Fission CLI flags used in the post (`fission environment create`, `function create`, `httptrigger create`, `function test`, `timetrigger create`, `mqtrigger create`) are valid against the current CLI reference.
- CPU/memory units in the `environment create` example are correct as-is: `--mincpu`/`--maxcpu` are millicores and `--minmemory`/`--maxmemory` are megabytes. The chosen values (40m/200m, 64Mi/256Mi) are reasonable for small Node.js/Python workloads, though the post does not call out the units explicitly. Worth clarifying in a future revision.
- The Node.js function signature (`module.exports = async function(context) { ... }`) and the use of `context.request.body` match the official Node.js environment contract.
- The Helm chart name `fission-charts/fission-all`, the repo URL `https://fission.github.io/fission-charts/`, and the `serviceType` / `routerServiceType` values are all valid.
- The Kafka `mqtrigger` example works on modern Fission because `--mqtkind` defaults to `keda`, so `--mqtype kafka` is interpreted as a KEDA-backed Kafka trigger. In a real cluster the trigger usually also needs `--metadata bootstrapServers=...` (and often `--secret` for SASL auth) to actually scale; the post's minimal example will create the trigger object but not a working scaler against a production Kafka. Consider expanding this example in a future revision.
- The `--url` flag on `httptrigger create` is still supported but the docs note it is being deprecated in favor of `--prefix` for prefix-based exposure. Not an error today, but worth watching for future Fission releases.
- The supported-languages list in the introduction is accurate but understated — Fission also officially ships Java (JVM), .NET, Perl, and a generic Binary environment. Not incorrect, just incomplete.
