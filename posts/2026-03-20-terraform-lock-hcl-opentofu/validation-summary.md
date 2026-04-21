# Validation Summary: How to Manage the .terraform.lock.hcl File with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu dependency lock file (`.terraform.lock.hcl`)
- OpenTofu provider version constraints
- OpenTofu CLI commands (`tofu init`, `tofu providers lock`, `tofu plan`)
- HCL provider requirements
- GitHub Actions CI
- Git working tree status checks

## Sources Consulted
- OpenTofu official documentation: Dependency Lock File — https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu official documentation: `tofu init` command — https://opentofu.org/docs/cli/commands/init/
- OpenTofu official documentation: `tofu providers lock` command — https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu official documentation: Provider Requirements — https://opentofu.org/docs/language/providers/requirements/
- OpenTofu official documentation: Version Constraints — https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu setup action repository — https://github.com/opentofu/setup-opentofu
- Git official documentation: `git status` — https://git-scm.com/docs/git-status.html

## Issues Found
1. **Invalid `-platform` argument syntax**: The post used slash-separated platforms such as `linux/amd64`. OpenTofu documents `tofu providers lock -platform` values as `OS_ARCH`, such as `linux_amd64`. **Fix:** Replaced all slash-separated platform values with underscore-separated values.
2. **Incorrect provider upgrade command descriptions**: The post described `tofu init -upgrade` as upgrading a specific provider and `tofu providers lock` as upgrading all providers. OpenTofu documents `tofu init -upgrade` as upgrading all previously selected plugins within constraints, while `tofu providers lock` writes or refreshes dependency lock information and checksums. **Fix:** Updated the comments to describe the commands accurately.
3. **Pessimistic version constraint did not match the stated 5.40.x target**: The post used `~> 5.40` while the surrounding text and commit message said `5.40.x`. OpenTofu's `~>` operator allows only the rightmost specified component to increment, so `~> 5.40.0` is the correct patch-series constraint. **Fix:** Changed the example to `~> 5.40.0`.
4. **Checksum comment mislabeled `zh:` hashes**: The example called a `zh:` hash a "Source zip hash". OpenTofu documents `zh:` as a zip hash for official provider distribution packages, not a source archive hash. **Fix:** Updated the comment to "Provider package zip hash" and clarified that the example hashes are truncated provider package checksums.
5. **Outdated OpenTofu setup action major version**: The CI example used `opentofu/setup-opentofu@v1`, while the current official action documentation uses `@v2`. **Fix:** Updated the workflow example to `opentofu/setup-opentofu@v2`.
6. **CI lock-file verification missed untracked lock files**: The `git diff --quiet .terraform.lock.hcl` check detects modifications to tracked files but can miss a newly created untracked lock file. **Fix:** Replaced it with `git status --porcelain -- .terraform.lock.hcl`, which reports modified and untracked lock-file states, and kept `git diff` for readable tracked-file diffs.
7. **Overstated cross-platform checksum wording**: The post said pre-populating platforms prevents "hash mismatch" errors. OpenTofu's documentation more specifically describes avoiding later platform-specific checksum additions and supporting selected platforms. **Fix:** Reworded the claim to "avoids platform-specific checksum drift."

## Review Notes
- The post is technically relevant and contains CLI commands, HCL snippets, GitHub Actions configuration, and implementation guidance.
- The lock file name `.terraform.lock.hcl`, the use of `terraform { required_providers { ... } }` in OpenTofu configuration, and the recommendation to commit the lock file are accurate.
- Local `tofu` was not installed in the review environment, so CLI behavior was verified against current official OpenTofu documentation rather than local `tofu --help` output.
