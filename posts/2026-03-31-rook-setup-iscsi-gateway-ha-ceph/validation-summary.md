# Validation Summary: How to Set Up iSCSI Gateway HA in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph iSCSI gateway (ceph-iscsi) HA with multiple gateways
- gwcli
- device-mapper multipath
- keepalived (VRRP)

## Sources Consulted
- Ceph "Configuring the iSCSI Target using the Command Line Interface" — https://docs.ceph.com/en/latest/rbd/iscsi-target-cli/ (verified `/iscsi-targets` root, target create, `gateways` `create <name> <ip>`, and that gateway configuration is shared/synced so each gateway presents the same targets)
- ceph-iscsi `iscsi-gateway.cfg_sample` — https://raw.githubusercontent.com/ceph/ceph-iscsi/main/iscsi-gateway.cfg_sample (verified [config] keys cluster_name, gateway_keyring, api_secure, api_user, api_password, api_port, trusted_ip_list and that the file must be identical on every gateway)
- Ceph iSCSI manual-install docs — https://docs.ceph.com/en/latest/rbd/iscsi-target-cli-manual-install/ (verified `rbd-target-api` and `rbd-target-gw` service names)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- The HA model described (two+ gateways sharing config persisted in a RADOS pool, both registered under one target, multipath failover on the initiator) matches the documented ceph-iscsi architecture.
- gwcli gateway-registration syntax `create <hostname> <ip>` is correct; the post uses resolvable gateway names (gw1.example.com) which the docs support.
- `curl http://<ip>:5000/api/_ping` and `/api/gateways/<iqn>` are valid ceph-iscsi REST API endpoints (rbd-target-api listens on api_port 5000). Left as-is.
- The keepalived VRRP block (state/interface/virtual_router_id/priority/authentication/virtual_ipaddress) is syntactically valid standard keepalived config; this is an optional add-on and not part of ceph-iscsi itself.
- multipath/iscsiadm/dd failover-test commands are standard Linux multipath tooling and are correct.
