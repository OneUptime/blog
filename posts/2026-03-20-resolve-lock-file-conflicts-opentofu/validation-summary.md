# Validation Summary: How to Resolve Lock File Conflicts in OpenTofu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu
- OpenTofu dependency lock files
- OpenTofu provider version constraints
- Git merge and rebase conflict resolution
- Git attributes
- GitHub Actions

## Sources Consulted
- OpenTofu Dependency Lock File documentation: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu `tofu init` command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `tofu providers lock` command documentation: https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu `tofu validate` command documentation: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu Version Constraints documentation: https://opentofu.org/docs/language/expressions/version-constraints/
- Git `gitattributes` documentation: https://git-scm.com/docs/gitattributes
- Git `checkout` documentation: https://git-scm.com/docs/git-checkout
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu
- `actions/checkout` action README: https://github.com/actions/checkout

## Issues Found
- The `tofu providers lock -platform` examples used slash-separated platform names such as `linux/amd64`. OpenTofu documents the argument as `OS_ARCH`, such as `linux_amd64`, so all examples were updated to underscore-separated platform names.
- The conflict-resolution workflow used `tofu init -upgrade` as the default regeneration command. OpenTofu documents `-upgrade` as ignoring existing lock selections and selecting the newest acceptable versions, so the conflict-resolution examples now use `tofu init` by default and mention `tofu init -upgrade` only for intentional upgrades.
- The post described `tofu validate` as validating the lock file. OpenTofu documents `tofu validate` as configuration validation, so that step was corrected to say it verifies the configuration.
- The `.gitattributes` example used `merge=ours`, but Git does not provide `ours` as a built-in low-level merge driver for attributes unless a custom driver is configured. The example now uses the built-in `merge=binary` driver and keeps `binary` as the alternative.
- The `git checkout --ours/--theirs` comments did not account for rebase behavior. Git documents that these sides may appear swapped during rebase, so the example now explains the merge and rebase meanings.
- The provider-version disagreement example implied selecting an exact higher version from a `~>` constraint. The wording now refers to choosing the desired constraint, because OpenTofu resolves constraints to an acceptable provider version.
- The CI conflict-marker check searched for six `<` characters. Git conflict markers use seven characters, so the check now searches for `<<<<<<<`.
- The CI example used older action major versions. Current upstream READMEs show `actions/checkout@v6` and `opentofu/setup-opentofu@v2`, so the workflow was updated.
- The introduction overstated that manual checksum merging always produces invalid files. The wording now states the precise risk: leaving conflict markers or combining provider versions with checksums from another selection produces invalid files.

## Review Notes
OpenTofu was not installed in the local environment, so CLI syntax and behavior were validated against official OpenTofu documentation rather than by executing `tofu` locally.
