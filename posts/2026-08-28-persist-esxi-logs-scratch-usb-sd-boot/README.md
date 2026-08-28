# How to Persist ESXi Logs and Scratch Data on Hosts That Boot from USB or SD Card

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, USB, SD Card, Persistent Logging, Scratch, ESX-OSData

Description: Move ESXi scratch and system logs from volatile storage to a unique persistent location, verify the change after reboot, and avoid unsupported vSAN-backed layouts.

---

An ESXi host that boots from USB or SD media may put scratch on a ramdisk when it cannot create or find suitable persistent system storage. Logs then disappear at reboot, support bundles lose historical evidence, and a coredump alarm may appear at the same time. Redirecting only remote syslog helps preserve events, but it does not make the host's other scratch data persistent.

The durable design is persistent boot and ESX-OSData storage on supported SSD, NVMe, HDD, or other media approved for the server and ESXi release. A persistent datastore-backed scratch directory is a remediation for existing hosts; it is not a reason to deploy new USB- or SD-only installations.

This article covers ESXi 7.x and 8.x. It distinguishes two settings that are often confused:

- **ScratchConfig.ConfiguredScratchLocation** selects the directory ESXi will use for scratch after the next boot.
- **Syslog.global.logDir** selects where vmsyslogd writes local log files.

By default, syslog normally writes below **/scratch/log**. In that default case, making scratch persistent also makes local logs persistent. If **Syslog.global.logDir** points somewhere else, changing scratch alone does not move those logs.

## Confirm That the Current Location Is Volatile

Inventory the host before changing it:

~~~bash
vmware -vl
esxcli storage filesystem list
esxcli system syslog config get
vim-cmd hostsvc/advopt/view ScratchConfig.ConfiguredScratchLocation
vim-cmd hostsvc/advopt/view ScratchConfig.CurrentScratchLocation
readlink -f /scratch
~~~

The configured value is the next-boot target; the current value is the directory in use now. A path below **/tmp** or **/tmp/scratch** is a ramdisk and is not persistent. A datastore path under **/vmfs/volumes** can be persistent, but only if that datastore is supported, mounted, writable, and available early enough during boot.

In the vSphere Client, select the host and open **Configure > System > Advanced System Settings**. Review:

- **ScratchConfig.ConfiguredScratchLocation**;
- **ScratchConfig.CurrentScratchLocation**;
- **Syslog.global.logDir**; and
- **Syslog.global.logDirUnique**.

Also review the host Summary and Skyline Health warnings. The messages **System logs are stored on non-persistent storage**, **No persistent storage available for system logs and data**, and **No coredump target has been configured** are related symptoms, but they are separate controls and should be verified separately.

## Select a Supported Persistent Target

Prefer persistent local storage that is independent of the removable boot medium. If shared VMFS or NFS must be used, create a directory unique to each host and ensure it is available whenever the host boots.

Do not use a vSAN datastore for scratch or local system logs. Broadcom documents that this configuration is unsupported and can make an ESXi host unresponsive when vSAN cannot complete the logger's I/O.

Check all of the following:

- the datastore is not the USB or SD boot device;
- sufficient space and monitoring exist for logs and temporary support data;
- the target will remain mounted for the life of the host;
- each ESXi host has a unique directory;
- storage permissions allow the ESXi host to create and update files; and
- the datastore is not scheduled for decommissioning.

Using a datastore UUID in the scratch path avoids breakage if the friendly name changes. Find the UUID and mount path with:

~~~bash
esxcli storage filesystem list
~~~

For a host named **esxi01**, a suitable example is:

~~~text
/vmfs/volumes/5f000000-11111111-2222-333333333333/.locker-esxi01
~~~

Do not point several hosts at one **.locker** directory. Shared scratch and log files can be locked by the wrong host, leading to missing logs, **Device or resource busy** errors, and incomplete support bundles.

## Prepare for the Required Reboot

Changing the configured scratch location takes effect only during host startup. Evacuate or cleanly shut down VMs, place the host in maintenance mode, and ensure out-of-band console access is available.

Record the old configured and current paths. Confirm the target datastore is healthy from this host and that no storage maintenance is in progress. If this is a vSAN node, use non-vSAN persistent storage for the target.

Create the host-specific directory:

~~~bash
mkdir -p /vmfs/volumes/5f000000-11111111-2222-333333333333/.locker-esxi01
~~~

Verify that the path resolves to the intended datastore before writing the setting:

~~~bash
ls -ld /vmfs/volumes/5f000000-11111111-2222-333333333333/.locker-esxi01
~~~

## Configure Persistent Scratch

The UI is the clearest supported method:

1. Select the ESXi host in the vSphere Client.
2. Open **Configure > System > Advanced System Settings** and click **Edit**.
3. Find **ScratchConfig.ConfiguredScratchLocation**.
4. Enter the complete unique UUID-based path.
5. Save the setting.
6. Reopen the setting and confirm the value was stored.

Do not attempt to edit **ScratchConfig.CurrentScratchLocation**. It reports the active path and is not the setting to change.

The equivalent Tech Support Mode command documented by Broadcom is:

~~~bash
vim-cmd hostsvc/advopt/update ScratchConfig.ConfiguredScratchLocation string "/vmfs/volumes/5f000000-11111111-2222-333333333333/.locker-esxi01"
~~~

Reboot the host through the normal maintenance workflow. A syslog reload is not a substitute for this reboot; scratch is activated during startup.

## Verify Scratch After the Reboot

Before returning workloads, check both values again:

~~~bash
vim-cmd hostsvc/advopt/view ScratchConfig.ConfiguredScratchLocation
vim-cmd hostsvc/advopt/view ScratchConfig.CurrentScratchLocation
readlink -f /scratch
ls -la /scratch
~~~

The current path should resolve to the intended host-specific persistent directory. If it fell back to **/tmp**, preserve the boot and jumpstart logs and investigate datastore availability during startup. Shared storage that mounts too late can cause ESXi to reject the configured path and choose a fallback.

Confirm that normal scratch subdirectories and files are being created. Do not infer persistence only because the configured value looks correct; the **Current** value after a reboot is the acceptance check.

## Make Local System Logs Persistent

Inspect the running syslog configuration:

~~~bash
esxcli system syslog config get
~~~

If the log directory is blank or points to **[]/scratch/log**, logs follow the scratch location. After the successful reboot above, generate a marker and confirm that it is written below the persistent scratch directory:

~~~bash
esxcli system syslog mark --message="PERSISTENT-SCRATCH-VERIFY-esxi01-20260828T130000Z"
~~~

If logs should use a separate directory, create that directory first. ESXi 6.7 and later reject a **Syslog.global.logDir** whose directory does not already exist:

~~~bash
mkdir -p /vmfs/volumes/5f000000-11111111-2222-333333333333/systemlogs
esxcli system syslog config set --logdir='[PersistentDatastore]/systemlogs' --logdir-unique=true
esxcli system syslog reload
esxcli system syslog config get
~~~

The datastore-path syntax for syslog is **[DatastoreName]/directory**. When several hosts use the same parent directory, **--logdir-unique=true** makes vmsyslogd create a host-specific subdirectory. Use either that behavior or explicitly separate host directories; never let hosts share the same log files.

Generate another unique marker and locate it in the new log target:

~~~bash
esxcli system syslog mark --message="PERSISTENT-LOGDIR-VERIFY-esxi01-20260828T131500Z"
~~~

Review **/var/log/.vmsyslogd.err** for fallback, permission, no-space, or failed-write messages. A clean configuration display is not proof that the datastore remains writable.

## Verify Persistence Across a Controlled Reboot

For a high-confidence acceptance test:

1. Record a unique marker and the current scratch path.
2. Perform a controlled maintenance-mode reboot.
3. Confirm **ScratchConfig.CurrentScratchLocation** still matches the target.
4. Confirm pre-reboot rotated log content remains on the datastore.
5. Generate a post-reboot marker and confirm it reaches the same persistent target.
6. Verify the host no longer raises the non-persistent-logging warning.

Remote syslog is still recommended as a second copy. Use **esxcli system syslog mark** and verify the marker on the remote collector as well; ESXi cannot guarantee the collector's retention policy.

## Check Coredump Configuration Separately

Persistent scratch does not automatically prove that VMkernel coredumps have a valid target. Inspect all applicable coredump types:

~~~bash
esxcli system coredump partition get
esxcli system coredump file get
esxcli system coredump network get
~~~

If no target is active, configure one with the release-specific Broadcom procedure and verify it before clearing the alarm. Do not place coredump files on vSAN just because scratch was previously there, and do not assume a support bundle can replace a VMkernel core dump.

For ESXi 8.x hosts that now have suitable persistent local storage, Broadcom's non-persistent-storage KB includes **esxcli system coredump file set --smart --enable true** to re-register a smart-selected dump file. Confirm the selected target and capacity in the exact build before relying on it.

## Roll Back or Move the Datastore

If the selected datastore proves unreliable, choose another supported persistent target, update **ScratchConfig.ConfiguredScratchLocation**, and reboot again. Verify the new current path before unmounting or deleting the old datastore.

Changing **Syslog.global.logDir** takes effect after a syslog reload, but changing scratch does not release the old datastore until the next boot. This is why datastore unmount can report **Device or resource busy** even after logs were redirected elsewhere.

An emergency rollback to **/tmp** restores a ramdisk scratch location but sacrifices persistence:

~~~text
/tmp
~~~

Use it only as a temporary recovery choice with a remote collector and a plan to restore persistent system storage. Never delete the old scratch directory while a host still reports it as the current location.

## Prefer a Persistent Boot Design

USB and SD media have limited endurance and do not satisfy the intended all-in-one system-storage design for current ESXi. Broadcom's revised boot guidance recommends planning a move to persistent media. For ESXi 8.x, current guidance lists 32 GB as the minimum persistent boot-device size and recommends 128 GB.

Before reinstalling:

- protect or evacuate all VMs;
- export the host configuration;
- record the exact ESXi and OEM image build;
- verify server, controller, device, firmware, and driver compatibility; and
- understand which installer option preserves or overwrites any existing VMFS datastore.

A scratch relocation protects evidence during the transition. It does not repair a failing USB or SD device or make an unsupported boot layout durable.

## Limitations and Version Scope

- The scratch procedure cited here covers ESXi 7.x and 8.x; verify ESX 9.x storage-layout guidance separately.
- A scratch change requires a reboot; a syslog log-directory change requires only a syslog reload.
- NFS can be used for supported datastore logging, but NFS ACL or export behavior can interfere with support-bundle collection.
- vSAN is not a supported scratch or local system-log target.
- Persistent logs, remote syslog, and coredump targets are complementary controls, not interchangeable ones.

## Official Documentation

- [Creating a persistent scratch location for ESXi 8.x and 7.x](https://knowledge.broadcom.com/external/article/317689)
- [System logs are stored on non-persistent storage](https://knowledge.broadcom.com/external/article/317690)
- [Determining whether an ESXi host has persistent logging](https://knowledge.broadcom.com/external/article/302451)
- [Configuring syslog on ESXi](https://knowledge.broadcom.com/external/article/318939)
- [Redirecting system logs to a vSAN object can lock up an ESXi host](https://knowledge.broadcom.com/external/article/326522)
- [ESXi datastore unmount fails because of persistent scratch](https://knowledge.broadcom.com/external/article/435145)
- [SD card and USB boot-device revised guidance](https://knowledge.broadcom.com/external/article/317631)

## Conclusion

Persistent ESXi evidence depends on the active path after boot, not merely an advanced-setting value. Give every host a unique non-vSAN persistent scratch directory, reboot, verify the current path, then confirm that syslog writes and survives another controlled reboot. Keep remote logging and a verified coredump target as independent safeguards while planning a move away from removable boot media.
