# Validation Summary: How to Use Chef InSpec for Compliance Auditing on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- DNF package management
- Chef InSpec 7
- Chef InSpec profiles and controls
- SSH-based remote audits

## Sources Consulted
- Chef InSpec install guide: https://docs.chef.io/inspec/7.1/install/
- Chef InSpec profile documentation: https://docs.chef.io/inspec/7.0/profiles/
- Chef InSpec CLI reference: https://docs.chef.io/inspec/6.8/reference/cli/
- Chef InSpec license documentation: https://docs.chef.io/inspec/7.0/install/license/
- Chef InSpec package resource documentation: https://docs.chef.io/inspec/6.8/resources/core/package/
- Chef InSpec service resource documentation: https://docs.chef.io/inspec/6.8/resources/core/service/
- Chef InSpec file resource documentation: https://docs.chef.io/inspec/7.0/resources/core/file/
- Red Hat DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_software_with_the_dnf_tool/index
- Red Hat EPEL guidance: https://access.redhat.com/solutions/3358

## Issues Found
- The original post used generic placeholders such as `<package-name>` and `<service>` instead of Chef InSpec commands. Replaced them with the official RPM-based Chef InSpec installation flow, `inspec version`, `inspec init profile`, `inspec check`, and `inspec exec`.
- The original post treated Chef InSpec as a systemd service with firewall rules, logs, and performance tuning commands. Chef InSpec is a CLI audit tool, so those sections were corrected to profile creation, local execution, SSH-based remote scans, and report generation.
- The original dependency instructions installed EPEL and Development Tools, which are not required by the official Chef InSpec RPM installation steps. Replaced them with `curl`, which is used to download the RPM installer.
- The original security and troubleshooting guidance focused on daemon management. Updated it to cover Chef license acceptance, least-privilege audit execution, SSH keys, report protection, and sudo-related permission issues.

## Review Notes
The article is now technically aligned with Chef InSpec's current documented workflow. The example controls are intentionally small and should be adapted to the organization's actual compliance baseline before production use.
