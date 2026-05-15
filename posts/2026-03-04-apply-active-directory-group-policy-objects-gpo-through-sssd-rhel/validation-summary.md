# Validation Summary: How to Apply Active Directory Group Policy Objects (GPO) Through SSSD on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux
- SSSD
- Active Directory
- Group Policy Objects
- realmd
- PAM service mapping

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Applying Group Policy Object access control in RHEL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/integrating_rhel_systems_directly_with_windows_active_directory/managing-direct-connections-to-ad_integrating-rhel-systems-directly-with-active-directory
- Red Hat Enterprise Linux 10 documentation, "Applying Group Policy Object access control in RHEL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/integrating_rhel_systems_directly_with_windows_active_directory/index
- `sssd-ad(5)` manual page on the local system
- SSSD `sssctl` design/reference page: https://sssd.io/design-pages/sssctl.html

## Issues Found
- The configuration mapped `ftp` with `ad_gpo_map_service`. In `sssd-ad(5)`, FTP is part of the default network logon mapping, while `ad_gpo_map_service` corresponds to "Allow log on as a service" and has no default services. I changed the example to `ad_gpo_map_network = +ftp`.
- The access mode description said enforcing would "deny if not permitted." With SSSD's default `ad_gpo_implicit_deny = False`, missing allow and deny rules allow access, so that wording was too broad. I changed it to say that enforcing evaluates and enforces GPO rules.
- The verification section used `sssctl gpo-show --domain=example.com`, but I could not verify `gpo-show` as a documented `sssctl` subcommand. I replaced it with a `find` command that lists cached `GptTmpl.inf` GPO policy files under `/var/lib/sss/gpo_cache/`, which matches SSSD's documented GPO cache behavior.

## Review Notes
SSSD GPO defaults vary by RHEL major version: RHEL 8 and later default `ad_gpo_access_control` to `enforcing`, while RHEL 7 used `permissive`. The post's explicit `ad_gpo_access_control = enforcing` setting is valid, but administrators should test in `permissive` mode before enforcing policies on production systems.
