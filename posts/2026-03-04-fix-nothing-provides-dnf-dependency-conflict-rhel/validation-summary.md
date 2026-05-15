# Validation Summary: How to Fix 'Nothing Provides' DNF Dependency Conflict on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package manager
- Red Hat subscription-manager repositories
- CodeReady Linux Builder / CRB repository
- EPEL repository
- DNF module streams

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat Enterprise Linux 9 documentation, "Considerations in adopting RHEL 9 - Repositories": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/ref_repositories_considerations-in-adopting-rhel-9
- Red Hat Enterprise Linux 9 Package Manifest, repositories and CodeReady Linux Builder: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/package_manifest/repositories#CodeReadyLinuxBuilder-repository
- DNF Command Reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- Fedora Packages, `epel-release` for EPEL 9: https://packages.fedoraproject.org/pkgs/epel-release/epel-release/epel-9.html

## Issues Found
- The post said `sudo dnf config-manager --set-enabled crb` was an alternative "on RHEL 9". On subscribed RHEL 9, Red Hat documents the repository ID as `codeready-builder-for-rhel-9-x86_64-rpms`; `crb` is commonly used by RHEL-compatible rebuilds. I changed the comment to make that distinction clear.
- The `dnf provides` examples searched for `libfoo.so.2` while the example error used the RPM capability `libfoo.so.2()(64bit)`. I updated the search commands to use the exact missing capability from the error message.

## Review Notes
- The remaining DNF commands and options are valid for RHEL 9/DNF usage, including `repolist`, `provides`, `--enablerepo`, `--best`, `--allowerasing`, `module list`, `module enable`, `--skip-broken`, `clean all`, and `makecache`.
- Red Hat documents BaseOS and AppStream as the two main required RHEL 9 repositories, with CodeReady Linux Builder available for additional developer packages. CodeReady Linux Builder packages are not covered like the main RHEL repositories, so production use should be evaluated carefully.
