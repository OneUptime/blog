# Validation Summary: How to Set Up LIO iSCSI Gateway for RBD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RBD / RADOS Block Device)
- Rook-Ceph (Kubernetes operator)
- LIO iSCSI target (Linux kernel)
- tcmu-runner (userspace RBD handler)
- ceph-iscsi / gwcli (gateway configuration tool)
- open-iscsi (Linux iSCSI initiator)

## Sources Consulted
- Ceph official documentation: iSCSI Gateway overview (https://docs.ceph.com/en/latest/rbd/iscsi-overview/)
- Ceph official documentation: iSCSI Target CLI (gwcli) (https://docs.ceph.com/en/latest/rbd/iscsi-target-cli/)
- Ceph official documentation: iSCSI Gateway requirements (https://docs.ceph.com/en/latest/rbd/iscsi-requirements/)
- ceph-iscsi GitHub repository source code (gateway.py, storage.py, client.py, gwcli.py, settings.py, lun.py)

## Issues Found

### 1. `exclusive-lock` RBD feature incorrectly disabled (Critical)
**What was wrong:** The `rbd feature disable` command included `exclusive-lock` in the list of features to disable. The iSCSI gateway *requires* `exclusive-lock` to be enabled — the ceph-iscsi source code explicitly lists `RBD_FEATURE_EXCLUSIVE_LOCK` as a required feature. Disabling it would break the gateway.
**What was changed:** Removed `exclusive-lock` from the disable command and added a note explaining that it must remain enabled.

### 2. gwcli tree path uses `portals` instead of `gateways`
**What was wrong:** The gwcli session showed `cd portals` and `/portals>` prompts. The correct gwcli tree node is `gateways`, not `portals`.
**What was changed:** Replaced `portals` with `gateways` throughout the gwcli session.

### 3. Gateway creation missing hostname parameter
**What was wrong:** `create 192.168.1.20` — the gwcli `create` command under `gateways` requires both a gateway name and an IP address.
**What was changed:** Changed to `create gw1 192.168.1.20`.

### 4. Disk attach command used incorrect three-part path
**What was wrong:** `attach rbd/iscsipool/lun-01` used a fabricated `rbd/` prefix. In gwcli, the disk attach syntax is `attach pool/image`.
**What was changed:** Changed to `attach iscsipool/lun-01`.

### 5. Disk add to host used hyphen instead of slash
**What was wrong:** `disk add iscsipool-lun-01` used a hyphen separator. The gwcli `disk add` command requires `pool/image` format with a slash, and the source code explicitly splits on `/`.
**What was changed:** Changed to `disk add iscsipool/lun-01`.

### 6. `gwcli --config` flag does not exist
**What was wrong:** `gwcli --config /etc/ceph/iscsi-gateway.cfg` is not a valid command. The `iscsi-gateway.cfg` file is read automatically by the `rbd-target-api` service from its hardcoded path at `/etc/ceph/iscsi-gateway.cfg`.
**What was changed:** Replaced with `systemctl restart rbd-target-api` and `systemctl restart rbd-target-gw` to apply the configuration.

### 7. `gwcli status` is not a valid command
**What was wrong:** `gwcli status` does not exist as a gwcli command. The correct command to view the gateway configuration tree is `gwcli ls`.
**What was changed:** Replaced `gwcli status` with `gwcli ls`.

## Review Notes
- The post does not show creating a `/etc/ceph/ceph.conf` on the gateway host, which would also be needed for the gateway to connect to the Ceph cluster. The mon-endpoints extraction step saves to a non-standard file (`mon-endpoints.txt`). A complete guide would generate a proper `ceph.conf` with monitor addresses.
- The Ceph iSCSI gateway (ceph-iscsi) has been deprecated upstream in favor of newer approaches. Users should check current Ceph release notes for the status of iSCSI gateway support.
- The `api_password = admin` in the configuration example is insecure and should be changed in production deployments.
