# Validation Summary: Why You Should Commit the Lock File in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu dependency lock files (`.terraform.lock.hcl`)
- Git and GitHub Actions
- HCL / OpenTofu configuration files
- Infrastructure as Code (IaC)

## Sources Consulted
- OpenTofu Dependency Lock File: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu Command: init: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu Command: providers lock: https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu CLI Configuration File: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu Environment Variables: https://opentofu.org/docs/cli/config/environment-variables/
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu
- `actions/checkout` action README: https://github.com/actions/checkout

## Issues Found
- The post described `.terraform.lock.hcl` too broadly. I corrected the wording so it reflects OpenTofu's documented behavior: the lock file tracks provider selections, not remote module versions, so it improves provider reproducibility rather than acting as a general dependency lock for everything.
- The “problem without a committed lock file” example said CI/CD would get a different provider version during `tofu apply`. Provider selection happens during `tofu init`, so I corrected that example to use `tofu init`.
- The `.gitignore` snippet included `.terraformrc`, which is a backward-compatibility CLI config filename rather than a workspace-local artifact to ignore in this context. I removed it and corrected the accompanying comment.
- The `tofu providers lock` example used `-platform=linux/amd64` style values. OpenTofu expects `OS_ARCH` values such as `linux_amd64`, so I corrected the platform arguments.
- The GitHub Actions example used older action majors and a less reliable lock-file enforcement pattern. I updated it to `actions/checkout@v6`, `opentofu/setup-opentofu@v2`, a maintained OpenTofu version line (`1.11.x`), and `tofu init -lockfile=readonly`, which is the documented way to prevent CI from rewriting the committed lock file.
- The monorepo section said each module has its own lock file. OpenTofu documents that the lock file belongs to the root configuration working directory, not each child module, so I corrected the example tree and explanation.
- I also tightened the `.gitignore` verification command so it checks for the exact lock filename instead of any line containing `lock`.

## Review Notes
- `.terraform.lock.hcl` improves provider reproducibility, but it does not pin remote module versions. Exact module version constraints are still required if you want fully repeatable module selection.
