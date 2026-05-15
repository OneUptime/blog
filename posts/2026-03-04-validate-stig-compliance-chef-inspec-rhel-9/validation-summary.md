# Validation Summary: How to Validate STIG Compliance on RHEL with Chef InSpec

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DISA STIG
- Chef InSpec
- MITRE SAF RHEL 9 STIG InSpec profile
- MITRE SAF CLI
- OpenSCAP
- SSH
- YAML
- Bash
- Cron

## Sources Consulted
- Chef InSpec install documentation: https://docs.chef.io/inspec/6.8/install/install/
- Chef InSpec license documentation: https://docs.chef.io/inspec/6.8/install/license/
- Chef InSpec CLI reference: https://docs.chef.io/inspec/7.1/reference/cli/
- Chef InSpec reporters documentation: https://docs.chef.io/inspec/7.0/configure/reporters/
- Chef InSpec inputs documentation: https://docs.chef.io/inspec/7.0/profiles/inputs/
- Chef InSpec waivers documentation: https://docs.chef.io/inspec/7.0/configure/waivers/
- MITRE RHEL 9 STIG baseline profile: https://github.com/mitre/redhat-enterprise-linux-9-stig-baseline
- MITRE SAF CLI documentation: https://saf-cli.mitre.org/
- OpenSCAP SCAP components documentation: https://www.open-scap.org/features/scap-components/

## Issues Found
- The installation snippet used the older Omnitruck URL and only set `CHEF_LICENSE=accept`. Current Chef InSpec documentation uses the `chefdownload-commercial.chef.io` install script with a license ID, and Chef InSpec 6 and later require both EULA acceptance and a license key. Updated the install command and added `CHEF_LICENSE_KEY=<LICENSE_KEY>`.
- The profile commands pulled the `main` branch. MITRE documents `main` as a development branch and recommends released versions for formal or ongoing testing. Updated the clone and tarball examples to use the verified latest release tag, `v2.4.0`.

## Review Notes
The remaining InSpec CLI flags, reporter syntax, input file usage, waiver file structure, remote SSH options, exit code handling, and SAF CLI examples matched the consulted documentation. The example control is consistent with the MITRE profile's `SV-257985` control structure.
