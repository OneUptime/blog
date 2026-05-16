# Validation Summary: How to Set Up Concourse CI on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Concourse CI (Helm chart deployment)
- Talos Linux
- Kubernetes (StatefulSet, Service, Ingress, Secrets)
- Helm v3
- fly CLI
- PostgreSQL (chart subchart)
- Prometheus (metrics)
- HashiCorp Vault (credential manager integration)
- cert-manager (Ingress TLS)
- registry-image / git / slack-notification resource types
- Go (example pipeline target)

## Sources Consulted
- Concourse Helm chart values: https://github.com/concourse/concourse-chart/blob/master/values.yaml
- Concourse Helm chart README: https://github.com/concourse/concourse-chart/blob/master/README.md
- Concourse fly CLI documentation: https://concourse-ci.org/fly.html
- Concourse administration / prune-worker: https://concourse-ci.org/administration.html
- Concourse Prometheus metrics emitter source: https://github.com/concourse/concourse/blob/master/atc/metric/emitter/prometheus.go
- Homebrew fly cask: https://formulae.brew.sh/cask/fly
- Concourse download page: https://concourse-ci.org/download.html

## Issues Found
1. **Prometheus metrics endpoint was wrong.** The post claimed "Concourse exposes metrics on the `/api/v1/info` endpoint." That endpoint returns Concourse server version info, not Prometheus metrics. Fixed the comment to clarify metrics are served at `/metrics` on the dedicated Prometheus bind port (default 9391).
2. **Wrong Helm chart field name for Prometheus port.** The post used `port: 9391` under `concourse.web.prometheus`. The actual chart field is `bindPort` (mirroring the upstream `--prometheus-bind-port` flag). Changed `port` → `bindPort`.
3. **Wrong values path for the main-team local user.** The post nested it under `concourse.web.auth.mainTeam.localUser`, but the Concourse Helm chart has no `auth` key under `concourse.web`. The correct paths are `concourse.web.mainTeam.localUser` (comma-separated list of usernames granted the owner role) and `concourse.web.localAuth.enabled` (toggle for local-user auth). Restructured the YAML accordingly.
4. **Bash fence around a YAML config block.** The monitoring section opened a ```bash fence around a YAML Helm values snippet. Changed the fence to ```yaml so syntax highlighting and copy-paste are correct.
5. **Missing markdown heading prefix.** The "Resource Type Extensions" section title was missing its `##` heading prefix, so it rendered as plain body text instead of a section header. Added `## `.

## Review Notes
- The Homebrew cask `fly` (`brew install --cask fly`) is currently the correct Concourse fly CLI on macOS (it is NOT Fly.io's flyctl, which is `brew install flyctl`). However, per formulae.brew.sh the cask is marked deprecated with a disable date of 2026-09-01; after that date readers should prefer downloading fly from the Concourse web UI (bottom-right download link) or GitHub releases. Left as-is for now since the cask still works as of the validation date.
- The Kubernetes secret namespace `concourse-main` assumes the Helm release name is `concourse` (the chart computes `${RELEASE}-${TEAM}`). The `helm install` command in the post uses `concourse` as the release name, so this is consistent — readers using a different release name need to substitute accordingly.
- Concourse worker `guardian` runtime is deprecated/removed in newer Concourse releases; `containerd` (used in the post) is the recommended modern runtime.
- The values file mixes top-level `web:` / `worker:` / `postgresql:` (Kubernetes-level pod/replica/resource settings) with `concourse.web:` / `concourse.worker:` (Concourse application settings). This dual-namespace layout is by design in the upstream chart and is correctly used in the post.
- `fly trigger-job -j myapp/test -w` uses `-w` to watch the build output; this is correct.
- `fly prune-worker -w <name>` is valid; `-w` is the short form of `--worker`.

