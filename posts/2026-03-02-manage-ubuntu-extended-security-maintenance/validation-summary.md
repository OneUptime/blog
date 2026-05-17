# Validation Summary: How to Manage Ubuntu Extended Security Maintenance (ESM)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (LTS, 16.04 Xenial, 18.04 Bionic)
- Ubuntu Pro (formerly Ubuntu Advantage)
- ESM-Infra (Extended Security Maintenance — Infrastructure)
- ESM-Apps (Extended Security Maintenance — Applications)
- `pro` CLI (ubuntu-pro-client / ubuntu-advantage-tools)
- `apt` / `apt-get`
- `unattended-upgrades`
- `apt-cache`
- Cloud Ubuntu Pro images (AWS, Azure, GCP)

## Sources Consulted
- Canonical Ubuntu Pro Client documentation (https://canonical-ubuntu-pro-client.readthedocs-hosted.com/)
- Ubuntu Pro product documentation (https://ubuntu.com/pro)
- Ubuntu Security Maintenance and ESM pages (https://ubuntu.com/security/esm)
- `pro security-status` JSON schema (ubuntu-pro-client `uaclient/security_status.py`)
- `pro` CLI help output / man pages (`pro status`, `pro security-status`, `pro fix`, `pro enable`, `pro disable`, `pro attach`)
- Ubuntu release lifecycle (https://ubuntu.com/about/release-cycle) for EOL dates (16.04 — April 2021 standard EOL, ESM through 2026; 18.04 — May/June 2023 standard EOL, ESM through 2028)
- `unattended-upgrades` Allowed-Origins format documented in `/etc/apt/apt.conf.d/50unattended-upgrades` and Canonical ESM docs (`UbuntuESMApps:${distro_codename}-apps-security` and `UbuntuESM:${distro_codename}-infra-security`)

## Issues Found

1. **`pro security-status --format json` "end-of-life" status value (Identifying Packages Without Security Coverage section).** The Python script filtered for `pkg.get('status') == 'end-of-life'`, but the JSON schema for `pro security-status` does not emit `end-of-life` as a status value. Packages without security coverage have status `unavailable`. The script also referenced a non-existent `description` field. Fixed to filter on `status == 'unavailable'` and print the `origin` field instead, both of which are part of the documented schema.

2. **Monitoring script used non-existent summary keys.** The fleet-monitoring script read `summary.get('esm_infra_enabled', False)` and `summary.get('esm_apps_enabled', False)`, but those keys are not exposed directly on the `summary` object — enablement state lives under `summary.ua.enabled_services` as a list. As written the script would always report both services as disabled. Fixed to derive enablement by checking membership in `summary.ua.enabled_services`.

3. **Status-name categorization was inaccurate.** The "Checking Your Current ESM Status" section described JSON status values as `supported` / `esm-apps` / `esm-infra` / `end-of-life`. The actual values emitted by `pro security-status --format json` are `active` / `active+esm-infra` / `esm-infra` / `esm-apps` / `third-party` / `unknown` / `unavailable`. Updated the list to reflect the real status names and added `third-party` and `unknown`.

## Review Notes
- `ubuntu-support-status` (referenced in the "ESM for Older Ubuntu Releases" section) is a legacy command from `update-manager-core`. It still ships on older Ubuntu releases (16.04, 18.04, 20.04) but on 22.04+ it is largely superseded by `pro security-status` / `pro status`. The post does already recommend `pro status` as the alternative, which is appropriate.
- The two-form characterization of ESM (Infra + Apps) matches Canonical's current model for 18.04 and later. For 16.04 Xenial the original ESM product predated the Infra/Apps split — origins for that release used the single `UbuntuESM:xenial-infra-security` pocket. The `unattended-upgrades` Allowed-Origins example in this post targets 18.04+ correctly; readers on 16.04 may need to omit the `UbuntuESMApps` line.
- ESM-Apps' "23,000+ Universe packages" figure is consistent with Canonical's published numbers (often cited as ~25,000 in newer marketing); the post's phrasing is conservative and accurate.
- The example `pro fix` output references `apt install libssl3` to remediate. In real `pro fix` runs, `pro` will execute the upgrade itself when run without `--dry-run`, but the human-readable advice line shown in the example is accurate to the tool's output.
- Note that `pro` is the current command name; older tutorials may show `ua` (ubuntu-advantage), which still works as an alias on most supported releases but is deprecated.
- The `Allowed-Origins` block uses C++-style `//` comments inside what is an APT configuration file. APT's config parser accepts both `//` and `#` comments inside braced blocks, so this is valid.
