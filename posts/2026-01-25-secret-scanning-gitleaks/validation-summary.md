# Validation Summary: How to Implement Secret Scanning with gitleaks

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- gitleaks CLI
- gitleaks TOML configuration
- pre-commit hooks
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- Docker
- BFG Repo-Cleaner
- jq and Python JSON parsing

## Sources Consulted
- gitleaks official README and CLI documentation: https://github.com/gitleaks/gitleaks
- gitleaks default configuration examples: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml
- gitleaks v8.30.1 release page: https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1
- gitleaks-action official README: https://github.com/gitleaks/gitleaks-action
- actions/checkout official README and release notes: https://github.com/actions/checkout
- GitHub Docs on removing sensitive data from a repository: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- BFG Repo-Cleaner official site: https://rtyley.github.io/bfg-repo-cleaner/

## Issues Found
- The post used gitleaks `detect` and `protect` throughout. These commands are hidden/deprecated in current gitleaks releases, so examples were updated to the current `gitleaks git` syntax.
- The installation examples pinned gitleaks v8.18.0. Updated them to v8.30.1, the current release verified during review.
- The Docker examples used the older Docker Hub image and deprecated command form. Updated examples to use `ghcr.io/gitleaks/gitleaks:latest` with the current command syntax.
- The "View the built-in rules" section implied `--verbose` displays the built-in rules. Corrected the wording because verbose output shows scan details and triggered rules, not a full rules listing.
- The TOML config mixed legacy `[allowlist]` / `[[rules.allowlist]]` syntax with current `[[allowlists]]` syntax. Updated all allowlist examples to the current plural form.
- The custom rules did not set `secretGroup`; the database URL rule would extract the protocol as the secret. Added `secretGroup = 1` and adjusted the regex so findings report the actual credential value.
- The pre-commit example pinned v8.18.0. Updated it to v8.30.1.
- The GitHub Actions example used `actions/checkout@v4` and `gitleaks/gitleaks-action@v2`. Updated to `actions/checkout@v6` and `gitleaks/gitleaks-action@v3`, and added the organization license variable required by gitleaks-action for organization repositories.
- The GitLab CI image example did not override the gitleaks container entrypoint, which can prevent normal shell script execution in GitLab CI. Added `entrypoint: [""]` and updated the command syntax.

## Review Notes
Validated the extracted `.gitleaks.toml` example against the current `ghcr.io/gitleaks/gitleaks:latest` image, which reported `v8.30.1`, and confirmed the custom rules load and detect sample secrets. The BFG remediation flow is technically plausible, but teams should still coordinate history rewrites carefully and rotate/revoke credentials before cleanup.
