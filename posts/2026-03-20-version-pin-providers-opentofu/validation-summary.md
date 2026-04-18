# Validation Summary: How to Version Pin Providers in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (tofu CLI)
- HCL (HashiCorp Configuration Language)
- Terraform-compatible provider version constraints
- Dependency lock file (`.terraform.lock.hcl`)
- AWS, Google, AzureRM, and Random providers (as examples)

## Sources Consulted
- OpenTofu Version Constraints documentation: https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu `required_providers` documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Dependency Lock File documentation: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu `tofu init` CLI reference: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `tofu providers lock` CLI reference: https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu `tofu providers` CLI reference: https://opentofu.org/docs/cli/commands/providers/
- OpenTofu `tofu version` CLI reference: https://opentofu.org/docs/cli/commands/version/

## Issues Found

1. **Incorrect pessimistic constraint example in the strategy table.**
   - Original: `~> 5.40` (allows 5.40.x only).
   - Problem: `~> 5.40` expands to `>= 5.40, < 6.0`, which allows 5.40.x, 5.41.x, 5.42.x, and so on — not just 5.40.x. To lock to 5.40.x only, the third component is required.
   - Fix: Changed the example to `~> 5.40.0`, which correctly expands to `>= 5.40.0, < 5.41.0` (i.e. 5.40.x only).

2. **Misleading command labeled "Upgrade a specific provider".**
   - Original: `tofu init -upgrade -lock-timeout=60s` with the comment "Upgrade a specific provider".
   - Problem: The `-lock-timeout` flag controls how long `tofu init` waits for the state lock; it has nothing to do with scoping an upgrade to a single provider. `tofu init -upgrade` always attempts to upgrade every provider allowed by the constraints. There is no built-in flag on `tofu init` to upgrade a single named provider.
   - Fix: Replaced with an accurate, related example using `tofu providers lock`, which does accept a provider source address as a positional argument to scope the operation: `tofu providers lock registry.opentofu.org/hashicorp/aws`, together with a corrected comment ("Refresh lock entries for a specific provider (after changing its constraint)").

## Review Notes
- The other constraint examples (`~> 5.0` → `>= 5.0.0, < 6.0.0` and `~> 3.6` → `>= 3.6.0, < 4.0.0`) are correct.
- The lock file path (`.terraform.lock.hcl`), registry hostname (`registry.opentofu.org`), and hash prefixes (`h1:`, `zh:`) shown in the example are accurate for OpenTofu.
- `tofu init -lockfile=readonly` is correct and is the recommended way to fail CI when the lock file is out of sync.
- `tofu providers lock -platform=linux_amd64 -platform=darwin_arm64 -platform=darwin_amd64` is the correct way to add cross-platform hashes to the lock file; the post could optionally also include `windows_amd64` since the surrounding prose mentions Windows, but omitting it is not technically wrong.
- The table characterization of `~>` as the "pessimistic constraint operator" matches OpenTofu documentation.
- Minor style note (not corrected): the top-level block that declares `required_providers` is still named `terraform { ... }` in OpenTofu configurations for backward compatibility, which matches what the post shows.
