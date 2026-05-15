# Validation Summary: How to Configure Samba with SELinux and Firewalld on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Samba
- SELinux
- firewalld
- Linux audit tooling

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and using network file services, Samba share setup and firewall commands: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/assembly_using-samba-as-a-server_configuring-and-using-network-file-services
- Red Hat Enterprise Linux 9 documentation: Using SELinux, SELinux booleans and file-context discovery workflow: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Customer Portal: firewalld predefined services and `samba` service ports on RHEL 7/8/9: https://access.redhat.com/solutions/7045355
- firewalld service file manual: https://firewalld.org/documentation/man-pages/firewalld.service.html
- firewalld command manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat SELinux Samba booleans documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-managing_confined_services-samba-booleans
- Linux audit `ausearch(8)` manual: https://man7.org/linux/man-pages/man8/ausearch.8.html

## Issues Found
- The post said the firewalld `samba` service opens only `139/tcp` and `445/tcp`. On RHEL, `firewall-cmd --info-service=samba` lists `137/udp`, `138/udp`, `139/tcp`, and `445/tcp`, with the NetBIOS helper. Updated the text to list all included ports.
- The restricted-network example added `137/udp` and `138/udp` with broad `--add-port` rules after adding a source-limited rich rule. Because the `samba` service already includes those ports, this was redundant and could unintentionally expose NetBIOS traffic outside the intended subnet. Replaced those commands with a note that separate NetBIOS port rules are not needed.
- The restricted-network example did not remove the broad `samba` service rule from the default zone before adding the rich rule. Added `firewall-cmd --permanent --remove-service=samba` so the example actually restricts Samba to the specified source network when following the previous section.
- The SELinux boolean section labeled broad access booleans as essential and described `samba_run_unconfined` as allowing Samba to run scripts generally. Updated the heading and comments to describe these as common booleans, clarified that `samba_export_all_ro/rw` are for paths not labeled `samba_share_t`, and clarified that `samba_run_unconfined` applies to unconfined scripts under `/var/lib/samba/scripts/`.
- The common issues table suggested `samba_export_all_rw` as the standard fix for browse-but-not-write problems. For normally labeled shares, write access depends on Samba share settings and Linux permissions. Updated the fix to check `read only = no` and filesystem permissions.

## Review Notes
- The remaining commands and examples match documented RHEL/Samba/SELinux/firewalld workflows. The `public_content_rw_t` context may also require an appropriate SELinux boolean depending on the service and write scenario, so a future post could expand that table with boolean requirements.
