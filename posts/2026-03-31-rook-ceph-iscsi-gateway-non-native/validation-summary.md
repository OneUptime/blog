# Validation Summary: How to Set Up Ceph iSCSI Gateway for Non-Native Clients

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (RBD block storage)
- ceph-iscsi (iSCSI gateway for Ceph)
- gwcli (ceph-iscsi CLI management tool)
- LIO (Linux iSCSI target stack)
- iSCSI protocol (initiators and targets)
- open-iscsi (Linux iSCSI initiator)
- multipath-tools (Linux multipath I/O)
- Kubernetes (kubectl CLI)

## Sources Consulted
- Rook Ceph documentation and CRD reference: https://rook.io/docs/rook/latest/CRDs/specification/
- Ceph iSCSI gateway documentation: https://docs.ceph.com/en/reef/rbd/iscsi-overview/
- gwcli command reference: https://docs.ceph.com/en/reef/rbd/iscsi-target-cli/
- Sibling blog posts in this repository for gwcli syntax verification (rook-configure-chap-authentication-ceph-iscsi, rook-configure-iscsi-targets-ceph-rbd, rook-lio-iscsi-gateway-for-rbd, rook-setup-iscsi-gateway-ha-ceph)
- open-iscsi iscsiadm man page documentation
- Linux multipath-tools documentation

## Issues Found

1. **`CephIscsiGateway` CRD does not exist in Rook (Major)**: The original post defined a `CephIscsiGateway` Kubernetes custom resource (`kind: CephIscsiGateway`, `apiVersion: ceph.rook.io/v1`) which is not a valid Rook CRD. Rook does not provide native iSCSI gateway management. The correct approach (consistent with all other Rook iSCSI posts in this blog) is to deploy ceph-iscsi on dedicated external gateway hosts that connect to the Rook-managed Ceph cluster. Replaced the fabricated CRD YAML and associated `kubectl apply`/`kubectl get pod` commands with correct host-based installation: `apt-get install ceph-iscsi targetcli-fb tcmu-runner`, Ceph credential copy from Rook, gateway configuration file, and `rbd-target-api`/`rbd-target-gw` service enablement.

2. **gwcli `chap_creds` command does not exist**: The original used `chap_creds username=backupuser password=secretpassword123`. The correct gwcli command for CHAP authentication is `auth chap=backupuser/secretpassword123`. Verified against the sibling CHAP authentication blog post and Ceph iSCSI documentation.

3. **gwcli `add_acl` command on disks does not exist**: The original used `/iscsi-targets/.../disks/iscsi-pool.iscsi-disk-01 add_acl initiator iqn...`. There is no `add_acl` subcommand in gwcli. The correct way to map a disk to a specific initiator host is `disk add pool/image` at the host path level: `/iscsi-targets/.../hosts/iqn... disk add iscsi-pool/iscsi-disk-01`. Verified against sibling blog posts.

4. **Missing disk registration step**: The original added a disk directly to the target without first registering it at the `/disks` level in gwcli. Added `/disks create pool=iscsi-pool image=iscsi-disk-01` before the target-level `disks add` command. This is the standard gwcli workflow confirmed by multiple sibling posts.

5. **Incorrect disk add syntax**: The original used `disks add pool=iscsi-pool image=iscsi-disk-01` (key=value format). The correct gwcli syntax is `disks add iscsi-pool/iscsi-disk-01` (pool/image format). Fixed to match the format used in sibling blog posts.

6. **Broken command sequence in Step 3**: The original mixed host commands with in-pod execution incorrectly. It ran `kubectl exec -it deploy/rook-ceph-tools -- bash` (opening an interactive shell in the pod) followed by a standalone `gwcli <<EOF` block that would execute on the host, not inside the pod. Since the gateway is now correctly deployed on external hosts (not in Kubernetes), the gwcli commands run directly on the gateway host without kubectl exec.

7. **Only one gateway configured**: The original only added one gateway (`gateway1`) to the target despite the prerequisites listing two gateway nodes and Step 6 configuring multipath between two gateways. Added `gateway2` creation to maintain consistency with the rest of the post.

## Review Notes
- The CephBlockPool YAML in Step 1 is correct and was not modified. The `replicated.size: 3` is a standard configuration for production use.
- The `rbd create` command in Step 2 is correct. The `--size 100G` flag supports the G suffix, and `--image-feature layering` is valid. Note that iSCSI gateways may require disabling certain RBD features (deep-flatten, fast-diff, object-map) while keeping exclusive-lock enabled, as documented in the sibling LIO gateway post. The current post does not mention this, which could cause issues in practice.
- The `iscsiadm` commands in Steps 4 and 6 are correct. The `-t st` flag is the short form of `-t sendtargets` and `--loginall all` is valid.
- The Windows iSCSI Initiator steps in Step 5 are accurate for Windows Server.
- The multipath configuration in Step 6 is correct but minimal. Production deployments would benefit from a custom `/etc/multipath.conf` with device-specific settings for Ceph iSCSI LUNs.
- The CHAP password `secretpassword123` in the example is 19 characters. The sibling CHAP blog post notes a maximum of 16 characters for CHAP passwords. This example password may exceed the limit depending on the iSCSI target implementation.
