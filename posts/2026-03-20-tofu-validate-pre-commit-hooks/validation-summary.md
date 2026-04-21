# Validation Summary: How to Use tofu validate in Pre-Commit Hooks

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- OpenTofu CLI
- `tofu validate`
- `tofu init`
- pre-commit hooks
- Bash
- GitHub Actions
- antonbabenko/pre-commit-terraform

## Sources Consulted
- OpenTofu `validate` command documentation: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu `init` command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu custom conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- pre-commit hook argument documentation: https://pre-commit.com/#arguments-pattern-in-hooks
- pre-commit local hooks documentation: https://pre-commit.com/#repository-local-hooks
- antonbabenko/pre-commit-terraform OpenTofu binary and `terraform_validate` documentation: https://github.com/antonbabenko/pre-commit-terraform
- opentofu/setup-opentofu GitHub Action documentation: https://github.com/opentofu/setup-opentofu

## Issues Found
- The `-no-color` example described the output as "compact"; changed it to say it disables color output, matching OpenTofu CLI documentation.
- The undefined variable example also referenced an undeclared `data.aws_ami.ubuntu`; changed the AMI to a literal value so the example isolates the undeclared input variable error.
- The type mismatch example declared an unused variable named `count` and showed an input-variable error for the `count` meta-argument; changed it to demonstrate `count = "three"` as an incorrect value type.
- The changed-files Bash hook used `bash -c` without a dummy `$0`, which would drop the first filename from `$@`; added `_` as `$0` and adjusted the loop to read all filenames safely.
- The local hook directory discovery used word-splitting over command substitution; changed it to a `find ... -exec dirname` pipeline with `read -r` to avoid path splitting problems.
- The `antonbabenko/pre-commit-terraform` example claimed to override Terraform with OpenTofu but did not set the documented `--tf-path`; added `--hook-config=--tf-path=tofu`.
- The variable handling notes overstated that `validate` does not execute variable validation conditions; updated the wording to reflect that unset ordinary variables can remain unknown, while values may be needed for module sources or validation checks.

## Review Notes
- The post now matches current OpenTofu documentation for `tofu validate`, including initialization requirements, `-json`, `-no-color`, and `-var-file` support.
- The examples focus on `.tf` files. OpenTofu also supports `.tofu` files, so a future enhancement could broaden the hook patterns if the repository uses native OpenTofu extensions.
