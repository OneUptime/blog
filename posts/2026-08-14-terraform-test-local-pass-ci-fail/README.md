# Why Terraform Tests Pass Locally but Fail in CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Infrastructure Testing, CI/CD, Debugging, Credential, Cloud Quotas

Description: Diagnose local and CI differences systematically across Terraform versions, lock files, identity, region, network access, concurrency, and cleanup.

---

When `terraform test` or Terratest passes locally but fails in CI, the cloud is not behaving randomly by default. The two runs almost always differ in executable versions, dependency selections, working directory, credentials, account, region, network path, concurrency, retained state, or time budget.

Capture those dimensions before adding retries. A reproducibility manifest turns a vague environment discrepancy into a small comparison.

## Classify the Failing Stage First

The stage narrows the search dramatically:

| Stage | Likely differences |
| --- | --- |
| `terraform init` | Core version, source credentials, network, lock checksums, platform package |
| validation or test parsing | Core language or test-framework version, working directory, generated files |
| plan | provider version, credentials, account, region, variables, refresh, existing state |
| apply | IAM, service enablement, quota, names, API behavior, concurrency |
| assertion | observation point, DNS, eventual convergence, test data, proxy |
| destroy | permissions, dependencies, retention, state loss, runner timeout |

Do not rerun the entire workflow until it turns green. Preserve the first safe failure diagnostics, identify the stage, and compare only the inputs relevant to it.

## Compare Terraform Core and Test Features

Print `terraform version` in both environments. Native Terraform tests are available from Terraform 1.6, provider mocking from 1.7, and newer test language features have their own version boundaries. A local version manager may select a different binary from the CI setup action.

Declare a `required_version` that matches the module's real runtime requirement and pin the CI matrix explicitly. Then verify the installed version rather than trusting an installer step:

```bash
set -euo pipefail

terraform version
terraform init -input=false
terraform validate
terraform test
```

If the module supports an older Terraform runtime than its test files require, document and separate those constraints. Otherwise CI may correctly reject syntax that a newer local test runner accepts.

Check CLI arguments and environment overrides such as `TF_CLI_ARGS`, `TF_CLI_ARGS_plan`, `TF_DATA_DIR`, `TF_WORKSPACE`, and `TF_CLI_CONFIG_FILE`. Print only whether sensitive settings are present and which non-secret paths or flags are selected; never dump the full environment.

## Compare Provider Selections and Platforms

Commit `.terraform.lock.hcl` for root test harnesses. Terraform considers configured constraints and recorded lock selections during `init`; `init -upgrade` intentionally disregards existing selections and picks the newest matching versions. If a developer ran upgrade locally but did not commit the lock change, local and CI can test different schemas and defaults.

Collect `terraform providers` and a hash or reviewed diff of the lock file. Do not cache and restore an arbitrary `.terraform` directory between jobs. Provider binaries differ by operating system and architecture, and the lock file must contain checksums that validate the packages CI installs.

Terraform's `providers lock` command can pre-populate checksums for selected platforms. This matters when developers use macOS on Arm and CI uses Linux on x86-64, especially with filesystem or network mirrors.

Also compare remote module versions. The dependency lock file currently tracks providers, not remote modules. A loose registry module constraint or moving Git ref can resolve differently even when provider locks match.

## Verify the Working Directory and Files

`terraform test` should run from the main configuration directory. Terraform searches its default `tests` directory relative to that root, and paths in test files are interpreted relative to the main configuration directory as documented.

Common CI-only errors include:

- running one directory above or below the module;
- a case-sensitive Linux filesystem rejecting a path that worked on a case-insensitive laptop;
- generated `.tf` or variable files missing because a local build step was implicit;
- ignored files present locally but absent from the checkout;
- Git submodules or large-file artifacts not fetched;
- relative module paths broken by copying only part of the repository;
- parallel jobs writing the same temporary directory.

Print a narrow, non-secret file manifest for the module and test directories. Use `terraform fmt -check` and repository generation checks before initialization so a missing generated file fails with a clear cause.

## Prove Which Identity and Account CI Uses

Credential presence is not identity. Ask the cloud's official identity endpoint for the caller account, principal, tenant, or project, and log only the non-secret identifiers approved for CI output. Verify region and subscription explicitly.

Local credentials often have broader permissions, established service-linked roles, more regions enabled, and access to private networks. CI should use a dedicated short-lived role with the permissions the test actually needs. A test that passes only with administrator credentials is not ready.

Check credential precedence. Environment variables, workload identity, shared configuration, provider arguments, and assumed roles can select different identities. For HCP Terraform private registry access, the hostname-specific `TF_TOKEN_` variable is separate from cloud-provider credentials.

Fork pull-request workflows normally do not receive ordinary repository secrets. Treat that as a security boundary, not a flaky secret store. Run untrusted plan or mock checks without privileged credentials and move live tests to an approved trusted context.

## Compare Region, Zones, and Service Enablement

Regions are functional inputs, not interchangeable labels. A resource type, instance class, availability-zone count, API feature, or default quota can differ. An availability-zone name can also map differently across accounts for some providers.

Log the chosen account and region, then query only the capabilities the test requires. Keep test variables explicit:

```hcl
variable "test_region" {
  type = string
}

provider "aws" {
  region = var.test_region
}
```

Do not let CI inherit a runner's default region while local runs use a profile default. Ensure required APIs or resource providers are enabled in the test account baseline rather than relying on a developer having enabled them once.

## Compare Network and DNS Paths

A laptop on a corporate VPN can resolve private DNS and reach internal APIs that a hosted CI runner cannot. Conversely, CI may use a proxy or VPC runner unavailable locally.

For network-dependent failures, record:

- the runner class and source network;
- resolver used and sanitized DNS answer;
- proxy presence, without printing credentials;
- endpoint hostname and TLS server name;
- whether the source host can route to private addresses;
- per-attempt connect and overall deadlines.

Run private behavior probes from a self-hosted or ephemeral runner placed in the intended test network, or create a probe workload inside that network. Do not open a production firewall to make hosted CI resemble a VPN-connected laptop.

## Check Quotas, Names, and Parallelism

One local test rarely collides with itself. CI can run many branches and matrix cells simultaneously. Shared names, state keys, CIDRs, DNS records, test data, and account quotas then become race conditions.

Give each run unique, traceable ownership and an expiry. Separate Terraform state and working directories. Set CI concurrency from the tightest cloud quota, not runner CPU count. Remember that Terraform's `-parallelism` limits graph operations within one command and does not coordinate separate CI jobs.

Inspect quota usage before apply and after destroy. CI may run in a newer account with lower quotas or inherit orphaned resources from canceled jobs. Reserve capacity for cleanup so a suite that reaches a limit can still destroy what it created.

## Replace Sleeps With Bounded Convergence

Local runs can appear reliable because a human pauses between commands. CI executes immediately. If a cloud service documents asynchronous convergence, poll the specific ready condition with a monotonic overall deadline, a bounded per-attempt timeout, and jitter.

Do not blindly retry authorization errors, invalid configuration, or name collisions. Retry an authorization error or name collision only when the service documents that exact condition as transient, such as after an access-policy change or resource deletion; otherwise fail fast. Log the last observed state and error class. A fixed sleep makes fast runs slow and still fails when convergence takes longer than the guess.

For Go-based infrastructure tests, disable successful test-result caching for the live suite when appropriate, for example with `-count=1`. Terratest's official guidance warns that cached success does not retest current infrastructure.

## Reproduce CI Deliberately

Once the manifest shows the difference, reproduce the smallest relevant CI environment locally or in a disposable debug job:

- exact Terraform and Go versions;
- the committed lock file;
- the same operating system and architecture where relevant;
- a fresh checkout without ignored local files;
- the same test account, role class, and region;
- equivalent network placement;
- the same concurrency and timeouts.

Do not copy CI secrets to a laptop casually. Prefer a short-lived debug role with the same policy and dedicated test scope. Remove one difference at a time and retain the failing stage.

## Publish a Safe Reproducibility Manifest

A useful CI header contains:

```text
terraform_core: 1.x.y
provider_lock_hash: sha256:...
module_commit: ...
os_arch: linux/amd64
test_root: testing/integration
cloud_account: test-account-alias
region: eu-west-2
credential_source: workload-identity
runner_network: test-vpc
concurrency_group: module-pr-123
```

Do not include tokens, environment dumps, plan JSON, state, private keys, or raw provider debug logs. HashiCorp warns that machine-readable plan and state output can expose sensitive values. Enable `TF_LOG` only in controlled diagnostics and review the log before sharing it.

## Official Documentation

- [Terraform test command](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform test language and feature versions](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform providers lock command](https://developer.hashicorp.com/terraform/cli/commands/providers/lock)
- [Terraform CLI environment variables](https://developer.hashicorp.com/terraform/cli/config/environment-variables)
- [Terraform provider requirements](https://developer.hashicorp.com/terraform/language/providers/requirements)
- [Terratest guidance on Go test caching](https://terratest.gruntwork.io/docs/testing-best-practices/avoid-test-caching/)
- [GitHub Actions security for OpenID Connect](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect)

## Conclusion

A local and CI discrepancy is an input comparison problem. Classify the failing stage, then compare Core, providers, files, identity, account, region, network, concurrency, state, and deadlines. Pin what should be identical and make intentional differences visible. Add retries only after proving the service state is genuinely asynchronous and retryable.
