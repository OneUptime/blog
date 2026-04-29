# Validation Summary: How to Handle Merge Conflicts in OpenTofu Configurations

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- OpenTofu CLI
- HCL (HashiCorp Configuration Language)
- Git merge and rebase workflows
- OpenTofu dependency lock files (`.terraform.lock.hcl`)
- OpenTofu state management and state locking
- pre-commit with `pre-commit-terraform`

## Sources Consulted
- OpenTofu `fmt` command: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu dependency lock file documentation: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu `providers lock` command: https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu `refresh` command: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu state locking: https://opentofu.org/docs/language/state/locking/
- OpenTofu `state rm` command: https://opentofu.org/docs/cli/commands/state/rm/
- OpenTofu CLI import command: https://opentofu.org/docs/v1.10/cli/commands/import/
- OpenTofu import usage: https://opentofu.org/docs/v1.9/cli/import/usage/
- OpenTofu import language documentation: https://opentofu.org/docs/language/import/
- Git `checkout` documentation (`--ours` / `--theirs` behavior during rebase): https://git-scm.com/docs/git-checkout/2.54.0.html
- Git `rebase` documentation: https://git-scm.com/docs/git-rebase/2.53.0.html
- `pre-commit-terraform` hook documentation: https://github.com/antonbabenko/pre-commit-terraform

## Issues Found
- The "Preventing HCL Conflicts" example mixed Bash commands and YAML in a single `bash` code block. I split it into separate `bash` and `yaml` blocks so both snippets are syntactically correct when copied.
- The lock-file conflict section used `git checkout --ours` / `--theirs` without noting that Git reverses those meanings during a rebase. I added that clarification because the post's workflow ends with `git rebase --continue`.
- The HCL conflict example showed an invalid conflict-marker layout that did not reflect how Git would mark a single-line conflict inside the block. I corrected the example so the unresolved conflict is represented accurately.
- The post recommended `tofu refresh`, but OpenTofu documents that command as deprecated and recommends `tofu apply -refresh-only` instead. I replaced the command with the current recommended workflow.
- The `tofu import` example omitted the requirement that a matching `resource` block must exist before import. I added that prerequisite to keep the example operationally correct.
- The "Team Workflow" example mixed Git commands and HCL in a single `bash` code block. I split it into separate `bash` and `hcl` blocks so the examples match their actual syntax.

## Review Notes
- Regenerating `.terraform.lock.hcl` with `tofu init` is valid, but when no prior lock selection exists OpenTofu will choose the newest provider version that satisfies the configured constraints. Review the regenerated lock-file diff before committing it.
- State locking is backend-dependent. OpenTofu enables it automatically for write operations only when the selected backend supports locking.
- `tofu import` remains valid, but OpenTofu also supports configuration-driven `import` blocks, which are better suited to reviewable CI/CD workflows.
