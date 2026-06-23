# Validation Summary: How to Configure Multipath I/O on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Linux device-mapper multipath (multipath-tools / multipathd)
- `/etc/multipath.conf` configuration
- iSCSI (open-iscsi / iscsiadm) and Fibre Channel storage
- SCSI utilities (sg3-utils, lsscsi, rescan-scsi-bus.sh, scsi_id)
- LVM on multipath devices
- Ubuntu 20.04 / 22.04 / 24.04 LTS
- systemd service management

## Sources Consulted
- multipath.conf(5) man page (multipath-tools project) — parameter semantics for `user_friendly_names`, `find_multipaths`, `no_path_retry`, `flush_on_last_del`, `path_grouping_policy`, `path_selector`, `path_checker`, `prio`, `features`, `hardware_handler`
- multipath(8) and multipathd(8) man pages — CLI flags and interactive commands
- multipath-tools source / documentation for blacklist regex matching (POSIX extended regular expressions via regcomp)
- Vendor multipath configuration references (NetApp ONTAP, Pure Storage, HPE 3PAR, Dell EMC, IBM SVC/Storwize) for vendor/product strings and ALUA settings
- Ubuntu package documentation for multipath-tools, multipath-tools-boot, open-iscsi, sg3-utils, lsscsi

## Issues Found
1. **Incorrect `user_friendly_names` description.** The comment claimed it "Enable[s] multipath functionality (yes/no)" and that "no" would "disable multipath globally". This is false — `user_friendly_names` only controls whether the device alias is taken from the bindings file (mpath0, mpath1, ...) or the raw WWID. Replaced the comment with an accurate description.

2. **Misleading `find_multipaths` description.** The comment described it as discovering "all available paths" vs "only use configured paths", which is not what the parameter does. It governs the condition under which a device is treated as a multipath device (with `yes`, a device is multipathed only when 2+ paths share a WWID or it was already multipathed). Corrected the comment.

3. **Duplicate `no_path_retry` in the `defaults` block.** The block set `no_path_retry 5` (under "Timeout and Retry Settings") and again `no_path_retry queue` (under "Queue Settings"); the second silently overrides the first, making the configuration contradictory. The first occurrence also carried an incorrect comment ("Number of failed path checks before marking path as failed" — that is the path checker's role, not `no_path_retry`). Removed the duplicated/wrongly-commented first occurrence, keeping the correctly described `no_path_retry queue`.

4. **Incorrect `flush_on_last_del` description.** The comment said it flushes "multipath device maps on daemon shutdown". The parameter actually disables queueing when the last path to a device is deleted. Corrected the comment.

5. **Invalid regex in blacklist `product "*"`.** Two `device {}` blacklist entries (USB and ATA) used `product "*"`, which is not a valid POSIX extended regular expression (a `*` quantifier with no preceding atom). Changed both to `product ".*"`, matching the correct form already used elsewhere in the post.

## Review Notes
- The vendor/product strings for the example arrays (DellEMC/PowerStore, NETAPP/LUN.*, 3PARdata/VV, PURE/FlashArray, IBM/2145, LIO-ORG) and their ALUA settings (`hardware_handler "1 alua"`, `prio alua`, `group_by_prio`) are consistent with vendor recommendations. Readers should still confirm exact values against their storage vendor's current host-attach guide, as recommended no_path_retry / timeout values are occasionally revised.
- The `features` strings (`"3 queue_if_no_path pg_init_retries 50"`, `"1 queue_if_no_path"`, `"0"`) use the correct `<count> <args...>` format.
- `multipathd show paths format "%w %d %t %s %c ..."` wildcards, `multipath -ll/-r/-a/-f/-F/-t`, and the systemd reload/restart flow are all valid.
- `vendor "USB"` will not match most USB sticks (which report the manufacturer string, not "USB"); blacklisting by device node or WWID is generally more reliable. Left as-is since it is illustrative and not technically invalid.
- `multipath -t` is used to dump the effective (parsed) configuration; it serves as a practical syntax check, though `-T` is the more explicit "show config" variant. Acceptable as written.
