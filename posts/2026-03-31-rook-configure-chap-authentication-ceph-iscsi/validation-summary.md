# Validation Summary: How to Configure CHAP Authentication for Ceph iSCSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph iSCSI Gateway (ceph-iscsi)
- gwcli (Ceph iSCSI gateway CLI)
- CHAP (Challenge-Handshake Authentication Protocol)
- Linux open-iscsi initiator (iscsiadm, iscsid.conf)
- Windows iSCSI Initiator (PowerShell Connect-IscsiTarget)
- Rook (tagged but not directly configured in the post)

## Sources Consulted
- Ceph iSCSI Gateway source code — `gwcli/utils.py` `valid_credentials()` function: https://github.com/ceph/ceph-iscsi/blob/main/gwcli/utils.py
- Ceph iSCSI Gateway source code — `gwcli/client.py` `ui_command_auth()` help text
- Ceph iSCSI Gateway API — `rbd-target-api.py` password validation (lines 1552-1553, 1627-1628, 1632-1633)
- RFC 7143 (iSCSI Protocol), Section 4.2.7.1 — CHAP secret length requirements: https://www.rfc-editor.org/rfc/rfc7143.html
- Microsoft PowerShell documentation for Connect-IscsiTarget: https://learn.microsoft.com/en-us/powershell/module/iscsi/connect-iscsitarget
- open-iscsi iscsiadm man page for node mode operations

## Issues Found
- **Incorrect CHAP password maximum length for mutual CHAP**: The post stated "Maximum 16 characters for CHAP, 96 for iSCSI mutual CHAP". The "96" is a confusion with RFC 7143's recommendation that CHAP secrets be at least 96 *bits* (which equals 12 characters — the minimum, not a maximum). In the ceph-iscsi implementation, both one-way CHAP and mutual CHAP enforce the same 12-16 character range. Fixed to: "Maximum 16 characters (applies to both CHAP and mutual CHAP)".

## Review Notes
- The gwcli interactive commands, iscsid.conf settings, iscsiadm per-node commands, and PowerShell Connect-IscsiTarget parameters are all correct and verified against official sources.
- The post tags include "Rook" but the content is specifically about the ceph-iscsi gateway (gwcli), which is the underlying iSCSI component that Rook can deploy. This is acceptable since Rook users would search for this topic.
- The example passwords (e.g., "SecurePass123" at 13 characters) correctly fall within the 12-16 character requirement.
- The `rbd-target-gw` systemd unit name used in the journalctl verification command is correct for the Ceph iSCSI gateway service.
