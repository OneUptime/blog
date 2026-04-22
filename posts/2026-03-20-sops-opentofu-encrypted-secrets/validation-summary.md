# Validation Summary: How to Use SOPS with OpenTofu for Encrypted Secrets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- SOPS
- age and age-keygen
- AWS KMS
- carlpett/sops OpenTofu/Terraform provider
- GitHub Actions

## Sources Consulted
- SOPS official repository and README: https://github.com/getsops/sops
- SOPS official releases: https://github.com/getsops/sops/releases
- age official repository and README: https://github.com/FiloSottile/age
- OpenTofu input variable and `-var-file` documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu sensitive data in state documentation: https://opentofu.org/docs/language/state/sensitive-data/
- carlpett/sops provider data source documentation: https://registry.terraform.io/providers/carlpett/sops/latest/docs/data-sources/file
- carlpett/sops provider repository documentation: https://github.com/carlpett/terraform-provider-sops
- OpenTofu registry provider metadata for `carlpett/sops`: https://registry.opentofu.org/v1/providers/carlpett/sops/versions

## Issues Found

1. **Outdated SOPS project reference and broken Linux download URL**: Updated the description and introduction from "Mozilla SOPS" to "SOPS" because the official project is now under `getsops/sops`. Changed the Linux download from the old `mozilla/sops` `latest/download` URL for `v3.9.0`, which resolves to a missing asset, to the official `getsops/sops` `v3.12.2` release URL.

2. **Missing age installation for `age-keygen`**: Added `age` to the Homebrew install command, added a Debian/Ubuntu package install example, and added `age-keygen --version` so the command used later in the tutorial is actually available.

3. **Age key path setup was incomplete**: Added `mkdir -p ~/.config/sops/age` before writing the key file, and added `SOPS_AGE_KEY_FILE` so SOPS can find the generated key consistently across platforms.

4. **OpenTofu `-var-file` example used YAML incorrectly**: OpenTofu variable definition files are `.tfvars` or `.tfvars.json`, not YAML. Changed the secret file, SOPS rules, encrypted file, decrypt command, and wrapper script to use `secrets/db.enc.tfvars.json` and `/tmp/secrets.tfvars.json`.

5. **Provider example referenced a missing secret key**: The provider example used `db_username`, but the original secret file did not define it. Added `db_username` to the JSON secret example.

6. **Wrapper script could lose JSON var-file parsing**: The original `mktemp` file had no `.json` suffix, so OpenTofu could parse decrypted JSON as HCL. Changed the script to use a temporary directory with a `secrets.tfvars.json` file inside it.

7. **Provider/state security claim was too strong**: The post said provider-based decryption avoids plaintext landing on disk. The provider avoids creating a separate plaintext secrets file, but decrypted resource values can still be stored in OpenTofu state. Added state sensitivity caveats in the provider section and conclusion.

8. **CI snippet omitted initialization**: Added `tofu init` before `tofu apply -auto-approve`, because provider installation and initialization are required in a fresh CI workspace.

## Review Notes
- The `carlpett/sops` provider source, `sops_file` data source, and `data["key"]` access pattern are valid.
- The `SOPS_AGE_KEY` GitHub Actions environment variable is valid for providing an age private key in CI.
- Local `tofu`, `sops`, and `age-keygen` binaries were not installed in the workspace, so CLI behavior was validated against official documentation and release/provider metadata rather than local command help.
