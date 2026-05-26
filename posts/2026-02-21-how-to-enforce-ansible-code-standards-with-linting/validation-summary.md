# Validation Summary: How to Enforce Ansible Code Standards with Linting

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible-lint
- yamllint
- pre-commit
- GitHub Actions
- SARIF/code scanning
- Python custom ansible-lint rules

## Sources Consulted
- Ansible Lint configuration documentation: https://docs.ansible.com/projects/lint/configuring/
- Ansible Lint custom rules documentation: https://docs.ansible.com/projects/lint/custom-rules/
- Ansible Lint profiles documentation: https://docs.ansible.com/projects/lint/profiles/
- Ansible Lint usage documentation for SARIF output: https://docs.ansible.com/projects/lint/usage/
- yamllint documentation: https://yamllint.readthedocs.io/en/stable/
- yamllint configuration documentation: https://yamllint.readthedocs.io/en/stable/configuration.html
- yamllint rules documentation: https://yamllint.readthedocs.io/en/stable/rules.html
- pre-commit documentation: https://pre-commit.com/
- pre-commit-hooks documentation: https://github.com/pre-commit/pre-commit-hooks
- GitHub documentation for uploading SARIF files: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- PyPI package indexes checked with `pip index versions` for ansible-lint, yamllint, and pre-commit-hooks.

## Issues Found
- The pre-commit ansible-lint hook used `additional_dependencies` for Galaxy collection names (`ansible.posix` and `community.general`). pre-commit installs Python package dependencies there, so this would not install those collections. Changed the dependency to the Python `ansible` package.
- The ansible-lint custom rules did not set `version_changed`, which current ansible-lint reports as an invalid empty version field. Added `version_changed = "1.0.0"` to both custom rule classes.
- The file-permissions custom rule checked only FQCN module names through `__ansible_module__`, but ansible-lint normalizes that key to short module names while preserving the original name in `__ansible_module_original__`. Updated the rule to inspect the original module name when available and to accept both short and FQCN names.
- The custom rules were referenced with `profile: safety` but not enabled. Current ansible-lint requires custom rule IDs to be enabled in this profile-based configuration. Added the custom rule IDs to `enable_list`.
- The post used `progressive: true`, which is not a supported ansible-lint configuration option in current official configuration documentation or CLI help. Replaced it with a supported baseline workflow using `ansible-lint --generate-ignore` and `.ansible-lint-ignore`.
- The GitHub SARIF upload job did not declare `security-events: write`, which GitHub documents as required for SARIF uploads from Actions. Added job permissions and updated `github/codeql-action/upload-sarif` to the current major version.
- The pre-commit hook revisions were outdated. Updated `pre-commit-hooks`, `yamllint`, and `ansible-lint` example revisions to current releases available at review time.

## Review Notes
The CI example still installs collections only when `collections/requirements.yml` exists, which is appropriate for reproducible CI. Teams with private Galaxy servers or non-default collection sources may need to add authentication and server configuration outside the scope of this post.
