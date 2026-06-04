# Validation Summary: How to Build Policy Testing Frameworks with Gatekeeper gator CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- OPA Gatekeeper
- Gatekeeper gator CLI
- ConstraintTemplate and Constraint YAML
- Rego policy validation
- GitLab CI
- GitHub Actions
- Make

## Sources Consulted
- Gatekeeper latest gator CLI documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/latest/gator/
- Gatekeeper v3.14 gator CLI documentation, used as the closest published versioned docs for v3.15-era behavior: https://open-policy-agent.github.io/gatekeeper/website/docs/v3.14.x/gator/
- Gatekeeper v3.15.0 GitHub release metadata and release assets: https://github.com/open-policy-agent/gatekeeper/releases/tag/v3.15.0
- Official v3.15.0 `gator test --help` and `gator verify --help` output from the release binary.
- Official `openpolicyagent/gatekeeper:v3.15.0` container image inspection.

## Issues Found
- The expected `gator test -f .` output did not match the actual v3.15.0 output. Updated the example to show the invalid Pod violation line emitted by `gator test`.
- The post said multiple constraints could be tested for interaction in one suite. Gatekeeper documents each `Test` in a `Suite` as independent, so the text now says to run multiple independent policy tests in one suite.
- Several `gator verify` suite examples used inline YAML under `object`. In v3.15.0, suite `object` values are file paths relative to the suite. Updated these examples to use fixture file paths.
- The external data example put inline YAML under test-level `inventory`. Gatekeeper documents `inventory` as case-level paths to files containing Kubernetes objects. Moved `inventory` under each case and changed it to file paths.
- The GitLab CI example used the Gatekeeper controller image as if it included `gator`. The official image entrypoint is `/manager` and `/gator` is not present. Replaced it with an Alpine image that downloads the v3.15.0 gator release binary.
- The reporting section used `gator test --verbose`, but v3.15.0 supports `--verbose` on `gator verify`, not `gator test`. Updated the command accordingly.
- The reporting and Makefile examples used `gator test --output=junit`, but v3.15.0 only supports `json` and `yaml` output for `gator test`. Updated these examples to use JSON output.
- The Makefile used `gator verify policies/tests/suites/*.yaml`, which can expand to multiple positional arguments, while `gator verify` accepts one path. Updated it to use the recursive `...` path form.
- The Makefile suggested `opa fmt -d policies/templates/` for Rego embedded in YAML templates. Replaced that target with `gator verify`, which validates the Gatekeeper policy suites directly.
- The performance section called generated Pod manifests a test suite. Updated the wording to "a large set of resources."

## Review Notes
The post pins examples to Gatekeeper/gator v3.15.0. That version remains usable for the examples reviewed, but current Gatekeeper documentation is newer and includes additional gator features. Future updates could refresh the pinned version and CI examples to the latest supported release.
