# Test Private Terraform Modules in CI Without Leaking Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Private Modules, CI/CD, Credential, GitHub Action, Supply Chain Security

Description: Authenticate CI to private Terraform modules with narrow short-lived access, deterministic source selection, and logging practices that minimize exposure of download secrets.

---

Testing a private Terraform module usually needs two unrelated permissions. Terraform must download the module source, and an apply-based test may also need cloud credentials to create infrastructure. Treat those as separate trust boundaries. A token that can read module source should not automatically be able to administer a cloud account, publish a module version, or read every repository in the organization.

The safest design starts with a private registry or source host that supports narrow machine identities, injects the credential only into the trusted initialization job, and never includes it in a module URL. Plan and mock tests for untrusted pull requests should run without production-capable secrets.

## Choose a Deterministic Source Version

A private registry gives Terraform a first-class module address and a `version` argument:

```hcl
module "network" {
  source  = "app.terraform.io/example-corp/network/aws"
  version = "4.2.1"

  name = "ci-example"
}
```

The hostname is part of the source address and must match the hostname used for credentials. Registry sources support version constraints; exact versions make module version selection deterministic for a release verification job. Terraform's dependency lock file currently records provider selections and checksums, not remote module versions or content checksums, so do not assume `.terraform.lock.hcl` pins a loose module constraint or verifies module content.

Terraform can also download modules from Git:

```hcl
module "network" {
  source = "git::ssh://git@github.com/example-corp/terraform-network.git?ref=4a8c1f0c9d7e6b4a8f2c9e1d0b7a5f3c8e6d4b2a"

  name = "ci-example"
}
```

Pin an immutable commit for a reproducible consumer test, or a protected release tag when the source host guarantees its governance. Do not use a moving default branch in a test that claims to verify a released dependency. Git sources use the Git client's authentication mechanisms, which are different from Terraform registry tokens.

## Use a Narrow Registry Identity

For HCP Terraform or Terraform Enterprise private registry access, Terraform accepts a user or team token for CLI operations; organization tokens cannot be used for that purpose. CI should normally use a team or service identity limited to the organizations and registries it needs, not a developer's personal token. Within HCP Terraform, team-token registry read access is organization-level rather than module-level: it includes the team's organization registry and registries shared with that organization.

Terraform 1.2 and later can read a host-specific environment variable. Dots in the hostname become underscores. The following `jobs` fragment assumes the surrounding workflow runs only trusted code:

```yaml
jobs:
  private-module-test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    env:
      TF_IN_AUTOMATION: "true"
      TF_INPUT: "false"
    steps:
      - uses: actions/checkout@v7
      - uses: hashicorp/setup-terraform@v4
      - run: terraform init -input=false
        env:
          TF_TOKEN_app_terraform_io: ${{ secrets.TF_REGISTRY_READ_TOKEN }}
      - run: terraform test
```

The `terraform test` command requires Terraform 1.6 or later, and provider mocks require 1.7 or later. The setup action installs the latest Terraform release when `terraform_version` is omitted; pin a tested CLI version if the workflow itself must be reproducible.

Store the secret in the CI platform or an external secret manager, mask it, and expose it only to the initialization step that needs it. The readable action tags keep this example concise; production workflows should pin actions according to the organization's supply-chain policy, often by full commit SHA.

Rotate the token and test revocation. Prefer an access mechanism that can issue short-lived credentials for the registry. When the registry supports only a longer-lived token, reduce scope, protect the secret environment, and make rotation automatic. OIDC-based cloud credentials do not automatically authenticate Terraform to a private module registry; configure each service independently.

## Never Put a Token in the Source URL

This pattern is dangerous:

```hcl
module "bad_example" {
  source = "git::https://user:token@example.invalid/org/module.git?ref=v1.0.0"
}
```

Credentials embedded in URLs can appear in configuration, shell history, Terraform diagnostics, process inspection, proxy logs, Git configuration, and `.terraform/modules/modules.json`. CI masking is not a guarantee because transformed or URL-encoded values may evade a redactor.

For registry sources, use `TF_TOKEN_<hostname>`, a CLI credentials file supplied at runtime, or a configured credentials helper. For Git sources, use a dedicated SSH deploy key, GitHub App installation token, or Git credential helper with repository-read scope. Do not globally rewrite every `https://github.com/` URL to include a powerful token on a shared runner.

If an ephemeral CLI configuration file is necessary, create it in a private temporary directory, set `TF_CLI_CONFIG_FILE`, limit file permissions, and delete it when the job ends. By default, Terraform's interactive `terraform login` stores a token in a local credentials file and is not designed for unattended CI.

## Keep Source Access Separate From Cloud Access

Split the pipeline by capability:

1. **Untrusted checks:** formatting, validation where dependencies are public or vendored safely, static policy, and tests using provider mocks. No cloud or broad source secret.
2. **Trusted source check:** initialize private modules with read-only source credentials after the commit is in a trusted context.
3. **Trusted live test:** obtain short-lived credentials for a cloud role restricted to a dedicated test account, then run the small apply-based suite.
4. **Publish:** use a distinct identity that can release a module version. Test jobs do not receive it.

By default, `pull_request` workflows from forks receive no Actions secrets other than a read-only `GITHUB_TOKEN`; private-repository fork policies can override these defaults. Do not work around that safeguard by using `pull_request_target` to check out and execute untrusted pull-request code with secrets. Review the event semantics and keep any privileged workflow on trusted code.

For cloud access from GitHub Actions, OIDC lets a cloud trust policy restrict tokens by repository, branch, pull-request context, or GitHub environment. Grant only the operations and account needed by the integration test. A module-download credential should not be reused as a Terraform backend credential unless its identity and permissions were deliberately designed for both.

## Prevent Credential Exfiltration Through Terraform Inputs

Do not pass source or cloud tokens as normal Terraform variables. Variables can flow into plans and state, and `sensitive = true` redacts selected CLI presentation but does not encrypt those artifacts. Providers should consume credentials through their documented environment, workload identity, or credential chain whenever possible.

Before running third-party or newly changed module code with a secret, remember that Terraform modules execute with the privileges of the Terraform process. A malicious configuration can reference external data sources, provisioners, or provider behavior to exfiltrate accessible values. Policy can prohibit some constructs, but the primary control is not exposing powerful credentials to untrusted code.

Use separate runners or hardened ephemeral jobs for privileged tests. Clear credentials before packaging artifacts, and never archive the full working directory. The `.terraform` directory contains downloaded private source and metadata that may be proprietary even when it contains no token.

## Make Initialization Deterministic

Run initialization non-interactively and make network dependencies explicit:

```bash
set -euo pipefail

terraform version
terraform init -input=false
terraform providers
terraform validate
terraform test
```

Commit provider constraints and an appropriate dependency lock file for root test harnesses. Pin private registry module versions or Git commits. If CI uses a provider mirror, configure it through Terraform's documented provider installation settings rather than replacing source addresses ad hoc.

Restrict egress from the runner to the registry, source host, provider distribution endpoints or mirror, backend, and test APIs that the workflow actually needs. This both reduces exfiltration paths and makes an undocumented download dependency fail visibly.

## Debug Authentication Without Publishing Secrets

Classify an initialization failure before turning on trace logs:

- `401` or `403` from a registry suggests a missing, expired, wrong-host, or insufficient token;
- a module-not-found response may be intentionally indistinguishable from a permission denial;
- Git SSH errors point to host-key, deploy-key, agent, or repository access;
- provider download errors are separate from module download errors;
- a successful download followed by cloud `AccessDenied` is a provider credential problem, not registry authentication.

Print the Terraform version, sanitized source hostname, selected module version, and failing stage. Do not print environment variables, Git credential configuration, HTTP authorization headers, CLI credentials files, plans, or state.

`TF_LOG=trace` can include request details and values that are unsafe for a public CI log. Reproduce in an access-controlled job, retain the smallest necessary log for the shortest time, and review it before sharing. Masking a known token does not remove every related secret or private module URL.

## Test the Security Boundary Itself

Add safe, periodic checks that prove:

- the read identity can download the intended module version into a fresh Terraform data directory;
- it cannot publish or delete a version;
- it cannot read an unrelated private registry or repository;
- revoking the identity causes initialization with a fresh Terraform data directory to fail;
- fork or untrusted workflows receive no private source or cloud credential;
- live-test cloud credentials expire and cannot access production;
- CI artifacts contain neither the token nor the private module working tree.

Avoid running deliberate secret-printing tests in normal CI. Inspect workflow configuration and use controlled canary credentials in an isolated security test if runtime verification is required.

## Official Documentation

- [Terraform module block and source types](https://developer.hashicorp.com/terraform/language/block/module)
- [Use artifacts from the HCP Terraform private registry](https://developer.hashicorp.com/terraform/cloud-docs/registry/using)
- [Terraform CLI configuration and credentials](https://developer.hashicorp.com/terraform/cli/config/config-file)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform automation guidance](https://developer.hashicorp.com/terraform/tutorials/automation/automate-terraform)
- [GitHub Actions secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
- [GitHub Actions OpenID Connect reference](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub Actions token permissions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)

## Conclusion

Private module testing does not require putting a broadly privileged token into Terraform code. Pin a registry version or Git commit, give a trusted CI job read-only source access through the host's supported credential mechanism, and obtain separate short-lived cloud credentials only for live tests. Keep secrets away from untrusted pull requests, module URLs, plans, working-directory artifacts, and verbose logs.
