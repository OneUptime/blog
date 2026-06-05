# Validation Summary: How to Update and Maintain a Custom Collector Distribution

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Builder (OCB)
- GitHub Actions
- GitHub CLI
- Go modules and Go vulnerability scanning
- Bash and YAML configuration

## Sources Consulted
- OpenTelemetry custom collector documentation: https://opentelemetry.io/docs/collector/custom-collector/
- OpenTelemetry Collector Builder README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/cmd/builder/README.md
- OpenTelemetry Collector releases repository: https://github.com/open-telemetry/opentelemetry-collector-releases
- OpenTelemetry Collector v0.97.0 release notes via GitHub CLI: https://github.com/open-telemetry/opentelemetry-collector/releases/tag/v0.97.0
- OpenTelemetry Collector v0.97.0 and v0.153.0 go.mod files: https://github.com/open-telemetry/opentelemetry-collector
- OpenTelemetry Collector Contrib probabilistic sampler source and README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/probabilisticsamplerprocessor
- OpenTelemetry Collector component documentation: https://opentelemetry.io/docs/collector/components/
- GitHub Actions setup-go documentation: https://github.com/actions/setup-go
- Go govulncheck documentation: https://go.dev/doc/tutorial/govulncheck

## Issues Found
- The version update script used unescaped semantic versions in `sed` regular expressions, so dots could match any character. I added an escaped version pattern before replacement.
- The scheduled GitHub Actions release lookup used the latest release from `open-telemetry/opentelemetry-collector-releases`, which can be a `cmd/builder/...` or `cmd/opampsupervisor/...` release instead of a collector distribution release. I changed the query to select tags matching `vX.Y.Z`.
- Manual workflow input was not normalized if the user included a leading `v`. I stripped the leading `v` before comparing versions or installing OCB.
- The CI examples installed `go.opentelemetry.io/collector/cmd/builder@latest`, which can mismatch the target collector release. I pinned OCB installation to the target collector version.
- The CI examples used Go 1.22, which is too old for current collector releases such as v0.153.0. I changed the workflow to use the stable Go release.
- The smoke test assumed `http://localhost:13133/health` was always available. I clarified that this check requires `config-test.yaml` to enable the `health_check` extension.
- The probabilistic sampler example incorrectly claimed `mode: proportional` became a new required field after v0.95.0. I changed the wording to describe it as an explicit newer sampling mode rather than a version-specific required field.

## Review Notes
The post is technically relevant and useful. Future improvements could pin examples to a single collector release family or mention that provider module versions may use the stable `v1.x` collector module line while many pipeline components still use `v0.x`.
