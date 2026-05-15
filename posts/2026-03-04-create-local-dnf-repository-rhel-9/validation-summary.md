# Validation Summary: How to Create a Local DNF Repository on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF repository configuration
- RPM repository metadata with createrepo_c
- reposync
- Apache httpd
- firewalld
- SELinux file contexts
- RHEL installation ISO repositories
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing custom software repositories": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_managing-custom-software-repositories_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 documentation, "Configuring RHEL image builder repositories" for createrepo_c and repository/GPG examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/composing_a_customized_rhel_system_image/managing-repositories_composing-a-customized-rhel-system-image
- Red Hat Enterprise Linux 9 documentation, "Using SELinux" for httpd_sys_content_t and restorecon behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- DNF reposync plugin documentation from dnf-plugins-core: https://dnf-plugins-core.readthedocs.io/en/latest/reposync.html
- Red Hat Ansible Automation Platform RPM installation documentation, "Synchronizing RPM repositories by using reposync" for RHEL 9 reposync package/prerequisite examples: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5/html/rpm_installation/proc-synchronizing-rpm-repositories-by-using-reposync_disconnected-installation

## Issues Found
- The post said to install `dnf-utils` for `reposync`. Red Hat's RHEL 9 examples install `yum-utils`, so the prerequisite was changed to `sudo dnf install -y yum-utils`.
- The SELinux section used `semanage` but did not list the package that provides it. Added `sudo dnf install -y policycoreutils-python-utils` as a prerequisite for the later SELinux file context commands.
- The `reposync` examples used `--downloaddir`, which is not the documented DNF reposync option. Updated the examples to use `--download-path`.
- The `reposync` examples synced into paths that the later `baseurl` and `createrepo_c` commands treat as the repository root. DNF reposync normally adds a repository-ID subdirectory under the download path, so `--norepopath` was added to keep the documented paths accurate.
- The cron example used the same incorrect reposync destination option and path behavior. Updated it to use `--download-path` and `--norepopath`.

## Review Notes
- The guide disables `gpgcheck` for the custom local repository example, then recommends enabling it for production. That is technically valid, but future improvements could include a package-signing example and repository metadata signature checks with `repo_gpgcheck`.
- The RHEL repository IDs shown are correct for standard x86_64 RHEL 9 CDN repositories, but environments using RHUI, EUS, Satellite, or a different architecture will need different repo IDs.
