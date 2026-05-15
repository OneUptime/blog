# Validation Summary: How to Set Up NFS Firewall Rules on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NFSv3 and NFSv4
- firewalld and firewall-cmd
- /etc/nfs.conf
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and using network file services": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_network_file_services/configuring_and_using_network_file_services
- Red Hat Enterprise Linux 9 documentation, "Securing network services": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/securing-network-services_securing-networks
- firewalld rich language manual: https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- firewalld service file format manual: https://firewalld.org/documentation/man-pages/firewalld.service.html
- firewalld upstream service definitions for nfs, mountd, and rpc-bind: https://github.com/firewalld/firewalld/tree/main/config/services
- nfs-utils nfs.conf(5) manual: https://man7.org/linux/man-pages/man5/nfs.conf.5%40%40nfs-utils.html

## Issues Found
- The post configured `mountd` to use port `892`, but then opened the predefined firewalld `mountd` service. firewalld's upstream `mountd` service definition opens TCP/UDP port `20048`, so the configured daemon port and firewall rule did not match. Changed the `/etc/nfs.conf` example and port summary from `892` to `20048`.
- The source restriction examples added rich allow rules but did not remove the previously added unrestricted `nfs` service rule. Added `--remove-service=nfs` before the rich rules so the examples actually restrict NFS to the listed source networks.
- The dedicated zone example could still leave NFS-related services open in the default zone if the earlier setup commands had been followed. Added removal commands for `nfs`, `mountd`, and `rpc-bind` from the default zone before adding them to the source-restricted zone.

## Review Notes
The post focuses on host firewalling for common NFS server setups. RHEL documentation also covers additional NFSv4-only hardening steps, such as masking `rpc-statd` and `rpcbind` and adjusting `rpc.mountd`, but the existing "Dropping NFSv3 Entirely" section is directionally correct for firewall simplification.
