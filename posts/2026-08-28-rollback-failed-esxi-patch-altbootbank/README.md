# How to Roll Back a Failed ESXi Patch by Recovering the Previous Image from `altbootbank`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VMware, ESXi, Patching, Upgrade, Rollback, altbootbank

Description: Confirm that a usable previous ESXi image remains, invoke supported recovery mode from the console, and verify the host before returning workloads.

---

ESXi normally retains one previous bootable image in the alternate bootbank after a supported patch, profile, VIB, Update Manager, or ISO update. If the new image fails, the supported rollback interface is the boot-time recovery prompt: press `Shift+R`, review the target build, and confirm the replacement.

Do not manually copy modules between `/bootbank` and `/altbootbank`, rewrite `boot.cfg`, or repoint bootbank symlinks. Those files form a coordinated image and state set. Manual surgery can turn a recoverable host into one that requires reinstallation.

## Know What Rollback Can and Cannot Do

The alternate bootbank holds only the immediately preceding state, not a history of arbitrary builds. Subsequent image changes discard the older `n-2` copy. A further reboot after another change can also leave both bootbanks at the same build, eliminating the desired rollback target.

Broadcom documents these boundaries:

- rollback applies to supported VIB installation or removal, profile operations, Update Manager updates, and ISO updates;
- the `tools-light` VIB version is not reverted by this process;
- an upgrade *to* ESXi 7.0 from an older layout cannot be reversed because the boot-device partitions changed;
- rollback among ESXi 7.x, 8.x, and 9.x is possible where no partition-layout transition prevents it;
- if recovery mode has no distinct previous image, reinstalling the intended image is the recovery path.

For a normal patch within the same ESXi release, the decisive question is whether `altbootbank` still contains the known-good build.

## Prepare Before the Reboot

If the host is still manageable:

1. Put it in maintenance mode and evacuate or shut down workloads using supported cluster procedures.
2. Confirm that vSAN, NSX, encryption, hardware-management, and other cluster products permit this target build.
3. Back up the ESXi host configuration using Broadcom's version-matched procedure.
4. Export a support bundle and record the failed image profile, OEM add-on, firmware, and failure symptoms.
5. Arrange physical, IPMI, iLO, iDRAC, or equivalent console access. The `Shift+R` prompt cannot be selected through SSH after boot.
6. Verify boot order and the exact boot device so the server does not start from an installer ISO or a stale mirrored device.

Keep the host in maintenance mode until the rolled-back image has passed storage, network, cluster, and hardware checks.

## Inspect Both Bootbank Builds

When the host can boot far enough for ESXi Shell, inspect—not edit—the boot configuration:

```bash
ls -ld /bootbank /altbootbank

grep -E '^(title|build|updated)=' /bootbank/boot.cfg
grep -E '^(title|build|updated)=' /altbootbank/boot.cfg
```

A useful rollback candidate has a different, known-good build in `/altbootbank`. Compare that value with the failed current build and your change record. Also capture the active software profile:

```bash
vmware -vl
esxcli software profile get
```

If both `boot.cfg` files report the same build, `Shift+R` cannot recover an older image. Broadcom explains that another installation or reboot-requiring VIB change can consume the one-generation rollback window.

If `/bootbank` or `/altbootbank` points to `/tmp`, is empty, cannot be read, or the boot device reports I/O errors, treat that as boot-media corruption. Do not populate it by copying the other directory. Preserve evidence and plan a supported reinstall on healthy media.

## Invoke Recovery Mode

From the server console:

1. Reboot the ESXi host.
2. Watch the earliest hypervisor boot sequence.
3. As the hypervisor progress bar begins loading, press `Shift+R`. Broadcom recommends pressing it repeatedly once **system is preparing to boot** appears because the window is short.
4. Read the displayed previous build. Confirm it is the intended rollback target.
5. At the warning that the current hypervisor will be permanently replaced with that build, press `Y`.
6. Press **Enter** to boot.

This operation swaps the active image state. It is not a temporary one-time boot. Confirming the wrong target can require another remediation or reinstall, so do not press `Y` until the displayed build matches the recovery plan.

## If the Failed Image Does Not Boot

The recovery prompt appears before the full management stack loads, so it can still work after a purple diagnostic screen, missing driver, or early module failure. Use remote-console video capture or photographs to preserve the original failure and the exact rollback prompt.

If no recovery option appears:

- verify that the console keyboard is sending an uppercase `R` with Shift at the right boot phase;
- confirm the server booted from the expected ESXi device;
- check whether the previous image was lost, both bootbanks are identical, or the boot device is unhealthy;
- use the correct vendor-customized ISO and Broadcom's reinstall workflow when no valid alternate image remains.

When reinstalling, **Install ESXi, preserve VMFS datastore** can preserve eligible local VMFS data, but it does not preserve all host configuration and has product-specific storage caveats. Backups, vSAN/Nutanix architecture, encryption, partition layout, and OEM image requirements must be reviewed before selecting it.

## Verify the Rolled-Back Host

After ESXi starts, leave the host isolated or in maintenance mode and capture the active version:

```bash
vmware -vl
esxcli software profile get

grep -E '^(title|build|updated)=' /bootbank/boot.cfg
grep -E '^(title|build|updated)=' /altbootbank/boot.cfg
```

Then verify:

- management, vMotion, vSAN, storage, and other VMkernel adapters;
- physical NICs, HBAs, NVMe devices, datastores, paths, and multipathing policy;
- NTP, DNS, certificates, lockdown mode, firewall, syslog, and scratch;
- vCenter connectivity and host certificate state;
- cluster HA/DRS/vSAN/NSX health and build compatibility;
- hardware sensors and boot-device health;
- VM inventory and any inventory warnings Broadcom notes can appear after rollback.

Review `/var/run/log/vmkernel.log`, `/var/run/log/hostd.log`, `/var/run/log/vpxa.log`, and `/var/run/log/vmksummary.log` for new errors. A host reaching DCUI is not sufficient validation.

## Control the Return to Service

Before leaving maintenance mode:

1. Document why the failed patch was rolled back.
2. Confirm the older build still meets security and product-support requirements.
3. Reconcile the host with vSphere Lifecycle Manager; it will correctly report noncompliance with the newer desired image.
4. Decide whether to pause remediation for sibling hosts.
5. Test one low-risk workload and its network and storage paths.
6. Monitor the host through at least one controlled reboot if the recovery plan requires proof of persistence.

Do not immediately reapply the same patch. Resolve the original cause—wrong OEM image, incompatible driver, firmware, acceptance level, boot-media failure, or product dependency—and rebuild the desired image from supported components.

## Protect the Next Rollback Window

For future updates:

- validate `/bootbank` and `/altbootbank` health before remediation;
- use supported SSD, NVMe, or other boot media for the ESXi release;
- stage the vendor-supported image and firmware combination;
- keep the host in maintenance mode through the first validation;
- avoid unrelated VIB changes and extra reboots until rollback is no longer needed;
- keep a current host-configuration backup and installation media outside the host.

Broadcom documents a vSphere HA edge case during a 7-to-8 upgrade: installing the release-specific FDM VIB after leaving maintenance mode can consume the older alternate state. Plan HA and maintenance-mode sequencing with the version-specific guidance.

## Official Documentation

- [Broadcom KB 316592: reverting to a previous version of ESXi](https://knowledge.broadcom.com/external/article/316592/reverting-to-a-previous-version-of-esxi.html)
- [Broadcom KB 376175: rollback unavailable when bootbank and altbootbank have the same build](https://knowledge.broadcom.com/external/article/376175/unable-to-rollback-esxi-version-as-bootb.html)
- [Broadcom KB 418630: recover from an incorrect host update](https://knowledge.broadcom.com/external/article/418630/roll-back-incorrect-host-updates.html)
- [Broadcom KB 386377: 7.x-to-8.x rollback window and the HA FDM VIB](https://knowledge.broadcom.com/external/article/386377)
- [Broadcom KB 418807: persistent rollback caused by unhealthy SD-card boot media](https://knowledge.broadcom.com/external/article/418807/esxi-host-rolls-back-to-previous-version.html)
- [Broadcom KB 445039: use the alternate bootbank or reinstall after boot-state corruption](https://knowledge.broadcom.com/external/article/445039/esxi-failed-to-boot-up-with-error-fatal.html)

## Conclusion

`altbootbank` is a one-generation recovery mechanism, not an archive. Confirm that it contains the intended build, preserve console and configuration access, and use the supported `Shift+R` recovery prompt. Keep the host in maintenance mode until the rolled-back image, boot media, storage, networking, and cluster integrations are all proven healthy.
