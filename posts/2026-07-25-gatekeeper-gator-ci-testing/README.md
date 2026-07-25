# How to Test Gatekeeper Policies in CI with Gator Before They Reach a Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Gator, Kubernetes, CI, Policy Testing

Description: Build deterministic Gatekeeper policy tests with Gator, assert allowed and denied fixtures, and run the same pinned tool version in CI.

---

Gator evaluates Gatekeeper ConstraintTemplates, Constraints, and Kubernetes objects locally. It catches policy compilation errors, bad parameters, unexpected matches, and regressions before a cluster webhook is involved.

It does not replace a staging cluster for TLS, RBAC, API discovery, webhook ordering, or load testing. It moves policy logic failures earlier.

## Pin the tool version

Use a Gator version aligned with the Gatekeeper release you deploy. For example:

```bash
go install github.com/open-policy-agent/gatekeeper/v3/cmd/gator@v3.23.0
gator version
```

Gatekeeper also publishes release binaries, and Homebrew provides `gator`. In CI, pin an exact release and verify the downloaded artifact according to your software supply-chain policy. Avoid an unpinned `@master` build.

## Organize policy and fixtures

A practical layout is:

```text
policy/
  template.yaml
  constraint.yaml
  suite.yaml
  samples/
    allowed.yaml
    missing-owner.yaml
    wrong-owner.yaml
```

Keep fixtures small. Each should demonstrate one behavior and use realistic Kubernetes API versions.

## Use `gator test` for a quick evaluation

Pass files or directories with repeated `--filename` flags:

```bash
gator test \
  --filename=policy/template.yaml \
  --filename=policy/constraint.yaml \
  --filename=policy/samples/missing-owner.yaml
```

Or evaluate a candidate manifest from standard input:

```bash
cat rendered-manifest.yaml \
  | gator test --filename=policy/
```

Structured output is useful for CI artifacts:

```bash
gator test --filename=policy/ --output=json
```

`gator test` returns zero when inputs are ingested, evaluation succeeds, and no blocking violation is found. Evaluation errors and blocking violations return nonzero.

Enforcement action affects the exit result. A Constraint using `deny` or an empty action makes a violation fail the command. `warn` and `dryrun` violations are printed but do not produce the same blocking exit behavior. Do not assume a successful shell status means there were no warnings.

For an enforcement-independent assertion suite, use `gator verify`.

## Write explicit Gator suites

A Suite declares a template, Constraint, and cases:

```yaml
apiVersion: test.gatekeeper.sh/v1alpha1
kind: Suite
tests:
  - name: required-owner-label
    template: template.yaml
    constraint: constraint.yaml
    cases:
      - name: accepts-owned-workload
        object: samples/allowed.yaml
        assertions:
          - violations: no
      - name: rejects-missing-owner
        object: samples/missing-owner.yaml
        assertions:
          - violations: 1
          - violations: 1
            message: required label
```

Paths are relative to the Suite file; absolute paths are not allowed. Run one Suite or discover all Suites recursively:

```bash
gator verify policy/suite.yaml
gator verify ./...
```

Gator silently ignores YAML files that do not declare the Suite API and kind, so make sure CI targets the intended Suite path and reports how many tests ran.

## Test more than one denied example

For every policy, include:

- The smallest allowed object.
- The smallest denied object.
- Missing optional fields and empty maps.
- Every relevant container type: regular, init, and ephemeral.
- Each matched resource kind.
- Namespace and label selector boundaries.
- Parameter edge cases.
- Update or delete AdmissionReviews if the policy reads operation or old object.

If a policy reads `userInfo`, wrap the object in an `admission.k8s.io/v1` AdmissionReview fixture. Plain Kubernetes objects used by `gator test` do not contain the original request identity.

## Supply inventory for referential policies

`gator verify` cases can load objects into `data.inventory`:

```yaml
cases:
  - name: existing-serviceaccount
    object: samples/pod.yaml
    inventory:
      - samples/serviceaccounts.yaml
    assertions:
      - violations: no
```

Add both present and missing-reference cases. Local inventory is deterministic, while the live Gatekeeper cache is eventually consistent, so cluster tests must still cover synchronization timing.

## Test workload expansion

If production uses an `ExpansionTemplate`, declare it in the test:

```yaml
tests:
  - name: deployment-expansion
    template: template.yaml
    constraint: constraint.yaml
    expansion: expansion.yaml
    cases:
      - name: denied-deployment
        object: samples/deployment.yaml
        assertions:
          - violations: yes
```

Also run `gator expand` and retain the expanded manifest as a CI artifact when debugging:

```bash
gator expand \
  --filename=policy/expansion.yaml \
  --filename=policy/samples/deployment.yaml
```

## Add a minimal CI job

The following GitHub Actions example compiles a pinned Gator and runs all Suites:

```yaml
name: gatekeeper-policy
on:
  pull_request:
    paths:
      - "policy/**"
jobs:
  gator:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.26.x"
      - name: Install pinned Gator
        run: |
          go install github.com/open-policy-agent/gatekeeper/v3/cmd/gator@v3.23.0
          gator version
      - name: Verify policy suites
        run: gator verify ./policy/...
```

Align the Go version with the selected Gatekeeper release. If your organization permits only digest-pinned Actions, pin those dependencies to reviewed commit SHAs.

Add a separate cluster integration job for server-side dry run, webhook failure policy, mutation interactions, and performance. Gator tests policy semantics, not every control-plane dependency.

## Official documentation

- [Gatekeeper Gator CLI](https://open-policy-agent.github.io/gatekeeper/website/docs/gator/)
- [Gatekeeper Library testing conventions](https://open-policy-agent.github.io/gatekeeper-library/website/)
- [Gatekeeper releases](https://github.com/open-policy-agent/gatekeeper/releases)
- [Kubernetes AdmissionReview API](https://kubernetes.io/docs/reference/config-api/apiserver-admission.v1/)
