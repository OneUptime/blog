# Validation Summary: How to Troubleshoot Ceph Connectivity Issues Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step troubleshooting guide

## Technologies Covered
- Ceph (MON, OSD, MGR daemons)
- Rook (Kubernetes Ceph operator)
- Linux networking tools (ping, mtr, nc, ip)
- firewalld and ufw firewalls
- Kubernetes CSI (csi-rbdplugin)

## Sources Consulted
- Ceph official documentation: Network Configuration Reference (https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/)
- Ceph official documentation: Ceph Dashboard (https://docs.ceph.com/en/latest/mgr/dashboard/)
- Ceph official documentation: Messenger v2 protocol (https://docs.ceph.com/en/latest/rados/configuration/msgr2/)
- Rook documentation: Ceph CSI Drivers (https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/)
- Linux man pages for ping, mtr, nc, ip, firewall-cmd, ufw

## Issues Found
1. **MGR dashboard port was incorrect**: The post listed port 7000 for the MGR dashboard. The Ceph Dashboard defaults to port **8443** (SSL). Changed `nc -zv ceph-mgr-1 7000` to `nc -zv ceph-mgr-1 8443` and updated the comment to clarify it is the default SSL port.

## Review Notes
- The MON ports (3300 for msgr2/v2, 6789 for msgr1/v1) are correct per Ceph documentation.
- The OSD port range 6800-7300 is correct.
- The Prometheus metrics port 9283 for the MGR prometheus module is correct.
- The MTU test using `ping -M do -s 8972` is correctly calculated for a 9000-byte MTU (9000 - 20 IP header - 8 ICMP header = 8972).
- The `ceph config get/set` commands use correct syntax for the centralized config store.
- The Rook CSI plugin label `app=csi-rbdplugin` and container name are correct for standard Rook deployments.
