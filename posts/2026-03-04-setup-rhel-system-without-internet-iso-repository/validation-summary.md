# Validation Summary: How to Set Up a RHEL System Without Internet Using an ISO Repository

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF/YUM repository configuration
- ISO9660 loop mounts and `/etc/fstab`
- Red Hat Subscription Manager
- Apache HTTP Server on RHEL
- SELinux file contexts

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Distribution of content in RHEL 9, BaseOS and AppStream repositories: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/distribution
- Red Hat Enterprise Linux 9 documentation: Managing custom software repositories with DNF: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux 9 documentation: Creating an installation source using HTTP or HTTPS: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat documentation: Apache HTTP Server on RHEL 9 and SELinux content contexts: https://docs.redhat.com/en/documentation/red_hat_jboss_core_services/2.4.51/html/apache_http_server_installation_guide/rhel_appstream
- Red Hat Customer Portal: Configure Local DVD Repository for RHEL 8 and later: https://access.redhat.com/solutions/6913101
- Red Hat Customer Portal: Enabling or disabling a repository using Red Hat Subscription Management: https://access.redhat.com/solutions/265523
- DNF config-manager plugin documentation: https://dnf-plugins-core.readthedocs.io/en/latest/config_manager.html

## Issues Found
- The HTTP sharing example used a symbolic link from `/var/www/html/rhel9-repo` to `/mnt/rhel9-iso`. This can fail with the default Apache and SELinux model because Apache serves content from `/var/www/html` with web-readable SELinux contexts, while `/mnt` is a non-standard content location. I changed the example to copy the mounted ISO contents into `/var/www/html/rhel9-repo` and run `restorecon -R`, matching Red Hat's documented approach for serving extracted ISO contents over HTTP.

## Review Notes
The local ISO repository configuration is technically sound for RHEL 9 installation DVD media. The ISO repository remains a static package snapshot, so it is suitable for offline installs and package additions but not as a substitute for ongoing errata management through Satellite, disconnected sync, or another approved update process.
