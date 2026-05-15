# Validation Summary: How to Set Up Ceph Dashboard for Web-Based Cluster Monitoring on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Ceph Storage
- Ceph Dashboard
- Ceph Manager modules
- cephadm orchestrator
- Prometheus, Grafana, Alertmanager, and Node Exporter
- Ceph Object Gateway
- Ceph iSCSI Gateway
- firewalld

## Sources Consulted
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph Monitoring Services documentation: https://docs.ceph.com/en/latest/cephadm/services/monitoring/
- Red Hat Ceph Storage 9 Dashboard Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/9/html/dashboard_guide/

## Issues Found
- The admin user example attempted to run `ceph dashboard ac-user-create` before creating the password file. I removed the premature command and changed the password creation to use `echo -n`, matching Red Hat's documented pattern so the file contains only the password.
- The temporary password file was removed with plain `rm` even though it is created through `sudo tee`. I changed it to `sudo rm` so cleanup works when the file is owned by root.
- The RGW dashboard setup used direct access-key and secret-key commands. Current Ceph and Red Hat documentation describe `ceph dashboard set-rgw-credentials` for cephadm-managed RGW dashboard credentials, so I replaced the commands.
- The iSCSI section only disabled SSL verification and did not register an iSCSI gateway. I added the documented `ceph dashboard iscsi-gateway-add -i <file-containing-gateway-url> [<gateway_name>]` flow.

## Review Notes
The monitoring stack commands are valid for cephadm-managed clusters. Cephadm generally auto-configures Prometheus, Grafana, and Alertmanager for the dashboard; the manual URL commands remain useful when the dashboard needs explicit or externally reachable service URLs.
