# Validation Summary: How to Validate Helm Charts Before Deployment

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Helm
- Kubernetes
- JSON Schema
- Kubeval
- Kubeconform
- Fairwinds Polaris
- Kube-score
- Datree
- GitHub Actions
- pre-commit

## Sources Consulted
- Helm `helm lint` documentation: https://helm.sh/docs/helm/helm_lint/
- Helm `helm template` documentation: https://helm.sh/docs/helm/helm_template/
- Helm chart schema documentation: https://helm.sh/docs/topics/charts/
- Kubeval GitHub README: https://github.com/instrumenta/kubeval
- Kubeconform GitHub README and releases: https://github.com/yannh/kubeconform
- Fairwinds Polaris CLI and configuration documentation: https://polaris.docs.fairwinds.com/cli/ and https://polaris.docs.fairwinds.com/customization/configuration/
- Fairwinds Polaris custom checks documentation: https://polaris.docs.fairwinds.com/customization/custom-checks/
- Kube-score GitHub README and Homebrew formula: https://github.com/zegl/kube-score and https://formulae.brew.sh/formula/kube-score
- Datree CLI arguments and policy-as-code documentation: https://hub.datree.io/cli/cli-arguments and https://hub.datree.io/dashboard/policy-as-code
- Datree built-in rule documentation for liveness probes, readiness probes, CPU limits, memory limits, privileged containers, and image policies: https://hub.datree.io/built-in-rules
- Azure setup-helm GitHub Action documentation: https://github.com/Azure/setup-helm

## Issues Found
- Helm `values.schema.json` example used JSON Schema draft 2020-12. Helm documents chart schemas with draft-07 and its validation library support is draft-07 oriented, so the schema URI was changed to `https://json-schema.org/draft-07/schema#`.
- Kubeval was presented without a maintenance caveat. The official Kubeval repository states the project is no longer maintained and recommends kubeconform, so a short note was added.
- Kubeconform, Polaris, kube-score, and `azure/setup-helm` examples pinned older versions. These were updated to current documented releases available as of 2026-06-22.
- Polaris examples piped Helm output into `polaris audit --audit-path -`, but Polaris documents `--audit-path` for local files and has first-class Helm chart flags. The examples were changed to use `polaris audit --helm-chart charts/myapp`.
- The Polaris custom check `imageRegistry` was defined under `customChecks` but not enabled in `checks`. Polaris requires custom checks to have a severity in `checks`, so `imageRegistry: danger` was added and duplicate resource check entries were removed from the same mapping.
- Datree examples piped Helm output into `datree test -`, but Datree's CLI documentation describes file paths and glob inputs. The examples were changed to render the chart with `helm template --output-dir` and then run `datree test` on the rendered YAML files.
- Datree policy identifiers for liveness probe, readiness probe, CPU limit, and memory limit checks did not match Datree's documented policy-as-code identifiers. They were corrected to `CONTAINERS_MISSING_LIVENESSPROBE_KEY`, `CONTAINERS_MISSING_READINESSPROBE_KEY`, `CONTAINERS_MISSING_CPU_LIMIT_KEY`, and `CONTAINERS_MISSING_MEMORY_LIMIT_KEY`.

## Review Notes
Kubeval remains technically usable for legacy pipelines, but it is unmaintained and kubeconform is the better default for new validation workflows. Datree's public documentation is older and service-backed; teams using Datree should confirm policy availability in their own Datree account or consider actively maintained policy engines if starting fresh.
