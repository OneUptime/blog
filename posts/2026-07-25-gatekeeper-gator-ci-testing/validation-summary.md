# Validation Summary: How to Test Gatekeeper Policies in CI with Gator Before They Reach a Cluster

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Open Policy Agent Gatekeeper
- Gator CLI v3.23.0
- Kubernetes ConstraintTemplates and Constraints
- Gator verification Suites
- Kubernetes AdmissionReview v1
- Gatekeeper ExpansionTemplates
- GitHub Actions
- Go 1.26

## Sources Consulted
- Gatekeeper official Gator CLI documentation (https://open-policy-agent.github.io/gatekeeper/website/docs/gator/)
- Gatekeeper v3.23.0 release (https://github.com/open-policy-agent/gatekeeper/releases/tag/v3.23.0)
- Gator v3.23.0 `test` command source and exit-code handling (https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/cmd/gator/test/test.go)
- Gator v3.23.0 Suite runner, including AdmissionReview and inventory handling (https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/pkg/gator/verify/runner.go)
- Gator v3.23.0 Suite types (https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/pkg/gator/verify/suite.go)
- Gator v3.23.0 assertion implementation (https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/pkg/gator/verify/assertion.go)
- Gatekeeper v3.23.0 Go module declaration (https://github.com/open-policy-agent/gatekeeper/blob/v3.23.0/go.mod)
- Gatekeeper official handling of constraint violations and enforcement actions (https://open-policy-agent.github.io/gatekeeper/website/docs/violations/)
- Gatekeeper Library testing conventions (https://open-policy-agent.github.io/gatekeeper-library/website/)
- Kubernetes AdmissionReview v1 API reference (https://kubernetes.io/docs/reference/config-api/apiserver-admission.v1/)
- GitHub official `checkout` action (https://github.com/actions/checkout)
- GitHub official `setup-go` action (https://github.com/actions/setup-go)

## Issues Found
- AdmissionReview handling was described too broadly. `gator verify` recognizes an AdmissionReview case and passes its request metadata to policy evaluation, while `gator test` reviews supplied input as Kubernetes objects and does not interpret an AdmissionReview wrapper specially. The post now directs metadata-based policy tests to `gator verify` and accurately describes the limitation of `gator test`.
- The post advised CI to report how many tests ran, but Gator does not emit a numeric test count. The text now recommends `--verbose`, which prints individual test and case names, and the CI command now enables that flag.
- The GitHub Actions example used older action majors (`actions/checkout@v4` and `actions/setup-go@v5`). Both references were updated to the current official majors, `actions/checkout@v6` and `actions/setup-go@v6`.

## Review Notes
- Gatekeeper/Gator v3.23.0 is a valid release published on July 9, 2026. Its `go.mod` requires Go 1.26.0, so the CI example's `go-version: "1.26.x"` is correctly aligned.
- The official v3.23.0 release binary was used to verify `gator version`, repeated `--filename` inputs, directory inputs, JSON output, deny-result exit status, recursive `gator verify`, verbose Suite output, and `gator expand`.
- Suite-relative paths, assertion values (`yes`, `no`, and exact counts), message regular expressions, inventory loading, and the `expansion` field match the v3.23.0 implementation and official documentation.
- All external links in the post resolved successfully at review time.
