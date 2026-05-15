# Validation Summary: How to Remove Unnecessary Packages to Reduce the Attack Surface on RHEL

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package management
- RPM package queries
- systemd service/network listener auditing with ss
- DNF configuration
- Shell scripting and cron

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Installing the minimum amount of packages required": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/index
- Red Hat Enterprise Linux 9 Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- DNF Command Reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF Configuration Reference: https://dnf.readthedocs.io/en/latest/conf_ref.html
- RPM query format documentation: https://rpm.org/docs/4.19.x/manual/queryformat.html
- Local ss(8) help/man output for listener flags such as -t, -u, -l, -n, and -p.

## Issues Found
- The post described `dnf repoquery --installed --extras` as showing packages installed as weak dependencies. DNF documentation defines `--extras` as packages that are not present in any available repository. I changed the section to cover extra and unneeded packages, added `dnf repoquery --unneeded`, and corrected the explanation.
- The listener audit comment said the `ss -tlnp | awk ...` command found packages that own listening services. The command identifies listening TCP sockets and process information, while ownership still requires the follow-up RPM lookup. I updated the comment to match the actual output.
- The DNF configuration example referred to `installonlypkgs` while using `installonly_limit=3`. I changed the wording to `installonly_limit`, which is the documented option that limits the number of install-only package versions kept.

## Review Notes
The package removal examples are valid as examples, but they are environment-dependent and should be reviewed before use because DNF removal can also remove dependent packages. The approximate package counts for minimal and GUI installations can vary by RHEL minor release, architecture, repositories, and selected add-ons.
