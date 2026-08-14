# Test Terraform Modules Across Core and Provider Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Infrastructure Testing, Provider Versions, CI/CD, Compatibility Testing, Dependency Management

Description: Build a focused compatibility matrix that tests a Terraform module at its declared minimums, current pins, and upgrade edges without mixing lock files.

---

A reusable Terraform module has at least two independent compatibility surfaces: Terraform Core and every provider it requires. Testing only the versions installed on a developer's laptop proves one point in that space. Testing every possible combination is usually too slow and expensive to maintain.

A useful matrix is small, intentional, and reproducible. It tests the minimum versions the module promises, the versions consumers currently pin, and selected upgrade edges. Each cell gets an isolated root configuration and dependency lock decision.

## Separate Constraints From Selections

Three Terraform mechanisms are often confused:

- `required_version` states which Terraform Core versions may evaluate the module.
- `required_providers` declares provider source addresses and compatible version constraints.
- `.terraform.lock.hcl` records the provider versions selected for one root configuration.

The lock file currently tracks providers, not remote module selections. A reusable child module should generally declare the minimum provider version it is known to support and avoid an unnecessarily narrow upper bound. The root module that deploys infrastructure owns the final selection and can use tighter constraints. HashiCorp's version-constraint guidance distinguishes these two roles.

For example, a reusable module might say:

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"
    }
  }
}
```

The module's Terraform minimum must match the Terraform language features its runtime configuration actually uses. Test features can impose a separate, higher minimum on the test runner. The native test framework is available from Terraform 1.6, while provider mocking arrived in 1.7. A module may support Terraform 1.5 at runtime yet keep mock-based tests that require a newer test runner; document that distinction instead of silently claiming the tests execute on 1.5.

## Choose Cells That Represent a Promise or a Risk

A practical initial matrix contains:

1. **Declared minimum:** the lowest Terraform and provider versions the module claims to support.
2. **Consumer baseline:** the exact versions used by a representative production root and its committed lock file.
3. **Newest allowed:** a regular upgrade lane that resolves the newest provider satisfying the module and harness constraints.
4. **Next Terraform minor:** the next Core version before the organization rolls it out, when available.

Add a pair only when an interaction justifies it. For example, test an older provider with a newer Terraform version if a major consumer actually runs that pair, or if a provider protocol or state migration changed near that boundary. Do not build a Cartesian product merely because CI supports a matrix.

Label experimental cells as non-blocking at first, but never let the declared-minimum cell be advisory. If the minimum fails, either fix the module or raise the constraint.

## Give Every Matrix Cell Its Own Root Harness

Provider selection happens for the whole root configuration. To test an exact provider version without changing the reusable module, create a small root harness that calls the local module and supplies a tighter root constraint:

```hcl
terraform {
  required_version = ">= 1.6.0, < 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 5.40.0"
    }
  }
}

module "under_test" {
  source = "../../.."

  name = "compatibility-example"
}
```

Use a different working directory for each matrix cell. Do not have parallel jobs rewrite the same `.terraform.lock.hcl` or share one `.terraform` directory. A clear layout is:

```text
testing/compat/
  tf-1.6-provider-min/
  tf-current-provider-pinned/
  tf-current-provider-latest/
```

Each harness must also contain version-compatible `.tftest.hcl` files, normally in its own `tests/` directory. `terraform test` searches the current root configuration and its test directory; it does not discover tests stored alongside the called child module.

Exact harness constraints make a cell auditable. Generated harnesses are also workable, but publish the generated `required_providers` block and selected lock file as diagnostic artifacts. Never edit the module's source constraint to manufacture a passing cell; that changes the thing being tested.

## Treat Lock Files Differently by Lane

For the consumer-baseline lane, use the committed lock file without allowing initialization to change it:

```bash
terraform init -input=false -lockfile=readonly
terraform validate
terraform test
```

For an upgrade lane, copy the harness into an isolated directory and intentionally ask Terraform to reconsider selections:

```bash
terraform init -input=false -upgrade
terraform providers
terraform validate
terraform test
```

Record the resulting `.terraform.lock.hcl` and `terraform version` output for review. `terraform init -upgrade` disregards existing lock selections while still honoring configured constraints. It also upgrades remote modules to the newest versions allowed by their constraints, so hold their selections constant when a cell is intended to vary only provider versions. It does not mean unconstrained latest.

For exact-version cells, check in separate harness lock files or regenerate them deterministically in separate jobs. The `terraform providers lock` command can pre-populate checksums for specified platforms and providers. This is useful when local development and CI run on different operating systems or architectures.

Do not copy a lock file from a different root merely because both roots use AWS. The lock file is a dependency decision for the complete root configuration, including constraints contributed by child modules.

## Pin Terraform Core Explicitly in CI

A compatibility job must install the version named by the matrix, verify it, and fail if the installation silently falls back. A GitHub Actions outline can make the dimension visible:

```yaml
jobs:
  compatibility:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        include:
          - terraform: 1.6.6
            harness: testing/compat/tf-1.6-provider-min
          - terraform: 1.15.0
            harness: testing/compat/tf-current-provider-pinned
    steps:
      - uses: actions/checkout@v7
      - uses: hashicorp/setup-terraform@v4
        with:
          terraform_version: ${{ matrix.terraform }}
      - name: Verify Terraform version
        run: terraform version | grep -Fx "Terraform v${{ matrix.terraform }}"
      - run: terraform init -input=false
        working-directory: ${{ matrix.harness }}
      - run: terraform validate
        working-directory: ${{ matrix.harness }}
      - run: terraform test
        working-directory: ${{ matrix.harness }}
```

Pin third-party actions according to the repository's supply-chain policy, often by full commit SHA. The tag-based references above keep the example readable, not a claim that mutable tags are the strongest production pin.

Terraform 1.x compatibility promises cover a large subset of valid Core language and workflow behavior, but not individual provider schemas and behavior, remote cloud APIs, or newer releases of external modules. Keep provider versions as an explicit dimension even when Core stays within the same major version.

## Use the Right Depth in Each Cell

Run cheap checks in every supported cell:

- `terraform init` to solve dependencies;
- `terraform validate` to catch syntax and schema compatibility;
- plan-based or mocked tests supported by that Core version;
- a representative plan of each major module mode.

Run real-cloud apply tests on fewer high-value cells. A common choice is the declared minimum and newest allowed provider on the organization's current Terraform version, plus a smoke test on the Core upgrade lane. Expand only where provider behavior, state upgrade, or apply semantics are the risk.

For an upgrade test, do more than create from empty state. Apply with the old supported pair, preserve the state and resources, initialize with the candidate pair, and plan again. Review whether the provider proposes an unexpected update or replacement. Only apply that upgrade in a dedicated test account with a tested cleanup path.

Do not run two provider versions against the same mutable state concurrently. State schema upgrades and refresh results belong to a serialized migration scenario.

## Diagnose Failures by Dimension

Retain these artifacts for a failed cell without leaking secrets:

- Terraform Core version;
- selected provider versions and lock-file diff;
- harness constraint files;
- sanitized test or plan diagnostics;
- whether failure occurred during init, validation, plan, apply, assertion, or destroy.

An init failure usually indicates incompatible constraints, unavailable packages, registry credentials, or checksum/platform issues. A validation failure often exposes Core language or provider schema incompatibility. A plan diff after an upgrade may reflect a provider default or state migration. An apply-only failure points toward remote API behavior, permissions, quota, or eventual consistency.

Do not publish raw plan JSON or state as a generic CI artifact. Terraform warns that machine-readable state and plan output can expose sensitive values in plaintext.

## Review and Retire the Matrix

The matrix is a statement of support, so version changes need review. When raising a minimum:

1. remove or update the minimum cell in the same change;
2. document the last module release supporting the old version;
3. test state and configuration upgrades for affected consumers;
4. update examples and generated documentation;
5. add the next upgrade edge before consumers reach it.

Track which cells consumers actually use. Retaining obsolete combinations indefinitely slows feedback and implies support the team may no longer provide.

## Official Documentation

- [Terraform provider requirements](https://developer.hashicorp.com/terraform/language/providers/requirements)
- [Terraform version constraints](https://developer.hashicorp.com/terraform/language/expressions/version-constraints)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform providers lock command](https://developer.hashicorp.com/terraform/cli/commands/providers/lock)
- [Terraform test language and version availability](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform provider mocking](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform v1.x compatibility promises](https://developer.hashicorp.com/terraform/language/v1-compatibility-promises)
- [HashiCorp setup-terraform action](https://github.com/hashicorp/setup-terraform)

## Conclusion

Test the versions your module promises and the upgrades your consumers will actually make. Keep Core versions, provider constraints, and lock selections distinct; isolate every matrix cell; and use exact harness constraints to make results reproducible. A focused matrix gives stronger compatibility evidence than either one accidental local version or an unmaintainable Cartesian product.
