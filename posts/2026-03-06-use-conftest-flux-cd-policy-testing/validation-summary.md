# Validation Summary: How to Use Conftest with Flux CD for Policy Testing

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Conftest
- Open Policy Agent (OPA)
- Rego
- Flux CD
- Kubernetes manifests
- Kustomize
- HelmRelease and GitRepository Flux resources
- GitHub Actions
- SOPS-encrypted Kubernetes Secrets

## Sources Consulted
- Conftest installation documentation: https://www.conftest.dev/install/
- Conftest usage and policy documentation: https://www.conftest.dev/
- Conftest exceptions documentation: https://www.conftest.dev/exceptions/
- Conftest options and output documentation: https://www.conftest.dev/options/ and https://www.conftest.dev/output/
- OPA Rego policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- OPA v1.0 upgrade notes for Rego `if` and `contains`: https://www.openpolicyagent.org/docs/v0-upgrade
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- GitHub Actions checkout documentation: https://github.com/actions/checkout

## Issues Found
- The Conftest Linux installation URL used a non-existent `latest/download/conftest_Linux_x86_64.tar.gz` asset. Updated the installation snippets to resolve the latest release version through the GitHub API and download the current versioned Linux tarball name.
- The Rego examples used pre-OPA-v1 partial set rule syntax such as `deny[msg] { ... }` and `warn[msg] { ... }`. Updated policy and test examples to current Rego syntax using `contains` and `if`.
- The exception example did not match Conftest's current exception syntax and the policy commands loaded only `policy/base/`, which would omit `policy/exceptions/`. Updated exception rules to `exception contains rules if { ... }` and changed Conftest commands to load `policy/`.
- The exception example described targeted bypasses, but unnamed `deny` rules are not suitable for targeted Conftest exceptions. Renamed deny rules with identifiers such as `deny_containers_run_as_root` and `deny_required_labels`.
- The HelmRelease chart version policy only detected `>=` ranges and would incorrectly reject HelmReleases using `chartRef`. Updated the rule to apply to `.spec.chart` templates and reject non-exact chart versions with a regex.
- The Kustomization interval policy used substring checks that would reject values like `90s` even though they are longer than one minute. Updated it to use `time.parse_duration_ns`.
- The bash overlay loop incremented `ERRORS` inside a pipeline subshell, so rendered overlay failures could be lost. Reworked the loop to use process substitution.
- The unit test examples used old Rego test syntax and queried the generic `deny` set. Updated them to current syntax and specific named deny rules.

## Review Notes
Verified extracted Rego snippets with Conftest 0.68.2 / OPA 1.15.2. The policy unit tests passed, a sample manifest produced the expected warning/failure output, and the root-running deployment exception was reported as a Conftest exception.
