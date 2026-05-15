# Validation Summary: How to Secure iSCSI Connections with CHAP Authentication on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- iSCSI
- CHAP authentication
- targetcli
- iscsiadm and iscsid
- Open-iSCSI configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring an iSCSI target": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-an-iscsi-target_managing-storage-devices
- Red Hat Enterprise Linux 9 documentation, "Configuring an iSCSI initiator": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-an-iscsi-initiator_managing-storage-devices
- targetcli(8) man page: https://manpages.debian.org/experimental/targetcli/targetcli.8.en.html
- iscsiadm(8) man page: https://www.mankier.com/8/iscsiadm
- RFC 7143, Internet Small Computer System Interface (iSCSI) Protocol: https://www.rfc-editor.org/rfc/rfc7143
- Open-iSCSI sample iscsid.conf: https://fossies.org/linux/open-iscsi/etc/iscsid.conf

## Issues Found
- The introduction overstated default iSCSI target access as accepting any initiator that knows the target IQN. Updated it to explain that, without CHAP, access still depends on normal ACL and network controls but lacks username/password authentication.
- The post stated that CHAP passwords must be 12-16 characters. RFC 7143 requires at least 96 bits unless IPsec protects the connection, and common iSCSI stacks support 12-16 character ASCII secrets for compatibility. Updated the wording to say secrets should be at least 12 bytes and that 12-16 ASCII characters works broadly.
- The mutual CHAP target example configured credentials but did not enable authentication on the TPG. Added `set attribute authentication=1` to the mutual CHAP target steps.
- The discovery authentication example ran `set discovery_auth` from the TPG path. targetcli documents discovery authentication under the top-level `/iscsi` configuration node, so the command path was corrected to `cd /iscsi`.
- The verification command used `iscsiadm -m session -P 3 | grep -A 5 "CHAP"`, but session output does not reliably include a `CHAP` string. Replaced it with a node-record print that verifies the CHAP auth fields configured for the target.
- The troubleshooting checklist repeated the overly strict 12-16 character password wording. Updated it to require CHAP secrets of at least 12 bytes.

## Review Notes
The examples assume the target, ACL, LUN, portal, and initiator IQN already exist. That is reasonable for a CHAP-focused article, but a future revision could mention those prerequisites explicitly.
