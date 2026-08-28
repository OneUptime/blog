# How to Fix an ESXi `vm-support` Bundle That Contains an Empty `/var/run/logs` Directory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, vm-support, Support Bundle, Syslog, Scratch, Troubleshooting

Description: Diagnose why an ESXi support bundle omits host logs, correct shared-datastore, NFS-permission, or inaccessible-boot-device causes, and verify a replacement bundle.

---

An ESXi support bundle can complete and still be unusable for root-cause analysis. One recognizable symptom is an empty **/var/run/logs** directory in the extracted archive even though hostd, VMkernel, and syslog files were expected.

Do not assume that rerunning **vm-support** will fix it. Broadcom documents several distinct causes with different remedies:

- several hosts write to one shared log directory while **Syslog.global.logDirUnique** is false;
- an NFS server forces the execute bit onto log files, so the collector excludes them as a security measure;
- scratch resides on an ESX-OSData boot device that became inaccessible; or
- the vSphere Client export was limited to the **Base** manifest, which intentionally omits several logs.

The live ESXi path is normally **/var/run/log** in current Broadcom documentation. Some bundle layouts and the relevant KB title use **/var/run/logs**. Check the exact path inside the archive instead of changing the host merely because of that singular/plural difference.

## Preserve the Failed Collection

Keep the original archive and its extraction directory unchanged. Record:

- host FQDN, hardware serial number, ESXi version, build, and uptime;
- the collection method and selected manifests;
- start and finish time;
- archive size and destination;
- whether the host was connected, not responding, or partially manageable; and
- storage, boot-device, and logging warnings visible at collection time.

Support bundles can contain sensitive configuration and encrypted diagnostic data. Store and upload them through the support case's approved workflow.

Do not reboot a host that may have an inaccessible boot device until current logs and hardware evidence have been preserved elsewhere. A reboot can remove ramdisk evidence and may not complete.

## Confirm the Bundle Is Actually Incomplete

On a separate administrative system, list the archive contents without modifying it:

~~~bash
tar -tzf vm-support-esxi01.tgz
~~~

Inspect **error.txt**, **errors-ignored.log**, or similarly named collection-error files. Also inspect command output related to scratch and datastores. Broadcom associates these messages with an inaccessible boot-device OSData location:

~~~text
No file found matching /var/tmp/current-store-1
Error: Unable to access device, please check your connection to the device.
~~~

If the export was initiated in the vSphere Client and offered a specific-log selection, determine whether only **Base** was selected. Broadcom says a Base-only export excludes files including hostd.log, vmkernel.log, vpxa.log, vmkwarning.log, vmksummary.log, and VM log files by design. Re-export with the default selections before diagnosing storage.

## Inspect the Live Host

If the host is responsive, use read-only checks first:

~~~bash
ls -lah /var/run/log
ls -lah /var/log
esxcli system syslog config get
vim-cmd hostsvc/advopt/view ScratchConfig.ConfiguredScratchLocation
vim-cmd hostsvc/advopt/view ScratchConfig.CurrentScratchLocation
esxcli storage filesystem list
~~~

Try reading a small current log:

~~~bash
tail -n 20 /var/run/log/hostd.log
~~~

Interpret the result:

- Logs exist and are readable live, but not in the archive: examine bundle manifests, NFS execute permissions, and collection errors.
- Reading returns **Device or resource busy**: investigate a shared-directory lock and **logDirUnique**.
- The path is empty or unavailable live: inspect scratch, syslog fallback, datastore, and boot-device health.
- The host is not responding and OSData is inaccessible: prioritize evacuation, hardware evidence, and boot-device recovery.

Also review the syslog daemon's private error file:

~~~bash
tail -n 100 /var/log/.vmsyslogd.err
~~~

Warnings such as **Logging to storage has failed**, failed writes, no space, or an invalid log directory point to the storage side of the problem, not the archive compressor.

## Cause 1: A Shared Log Directory Is Not Unique

This is the direct cause in Broadcom KB 433331. It applies when:

- **Syslog.global.logDir** points to a datastore used by multiple hosts; and
- **Syslog.global.logDirUnique** is false.

The hosts can contend for the same filenames, and **vm-support** cannot reliably map the shared files back into the affected host's bundle.

Place the affected host in maintenance mode as Broadcom instructs. In the vSphere Client:

1. Select the host.
2. Open **Configure > System > Advanced System Settings**.
3. Click **Edit**.
4. Find **Syslog.global.logDirUnique**.
5. Change it to **true** and save.

The equivalent documented syslog option is:

~~~bash
esxcli system syslog config set --logdir-unique=true
esxcli system syslog reload
esxcli system syslog config get
~~~

Generate a marker:

~~~bash
esxcli system syslog mark --message="VM-SUPPORT-LOGDIR-VERIFY-esxi01-20260828T140000Z"
~~~

Enabling the unique option creates a host-specific subdirectory for new logging. Preserve the old shared files because they may contain the incident evidence; do not delete them merely to clear a lock.

If **Device or resource busy** continues, identify the lock owner against the exact log file:

~~~bash
vmkfstools -D /vmfs/volumes/PersistentDatastore/systemlogs/hostd.log
~~~

Broadcom's KB describes mapping the lock owner's MAC address to the physical adapters of the other hosts. For a more complete lock investigation, use **vmfsfilelockinfo** with the exact path and vCenter details. Do not kill a process or break a file lock until the owning host and impact are understood.

## Cause 2: NFS Forces Execute Permission on Logs

Broadcom documents an NFS-specific case in which the archive directory is empty or contains only **vit.conf.backup**. The NFS server applies an ACL or export policy that marks ordinary log files executable. **vm-support** deliberately skips executable files so it does not collect a potentially malicious binary as a log.

Check the live target:

~~~bash
ls -lah /vmfs/volumes/NFSLogs/esxi01
~~~

If ordinary **.log** or rotated **.gz** files show an execute bit, involve the NFS administrator. Correct the server-side ACL or export policy so newly created files receive read/write permission without execute permission. An ESXi-side **chmod** is not a durable fix when the NFS server reapplies the attribute.

If the NFS behavior cannot be corrected promptly, move **Syslog.global.logDir** to a supported VMFS-backed directory:

~~~bash
mkdir -p /vmfs/volumes/VMFSLogs/systemlogs
esxcli system syslog config set --logdir='[VMFSLogs]/systemlogs' --logdir-unique=true
esxcli system syslog reload
~~~

If scratch itself is on NFS, moving only **Syslog.global.logDir** fixes the log target but does not relocate the rest of scratch. Change **ScratchConfig.ConfiguredScratchLocation** to a unique supported directory and reboot by following Broadcom's persistent-scratch procedure.

## Cause 3: Boot-Device OSData Is Inaccessible

Broadcom KB 416273 covers ESXi 8.x hosts whose scratch resides on the ESX-OSData partition of the boot device. When the device becomes inaccessible while the host is not responding, **vm-support** cannot retrieve the logs.

Correlating evidence includes:

- errors for **/var/tmp/current-store-1** in the bundle;
- an unable-to-access-device result in the collected scratch filesystem command;
- bootbank, OSData, or controller errors;
- **ScratchConfig.CurrentScratchLocation** on the affected boot device; and
- host or out-of-band hardware alarms.

Do not treat a new bundle as the primary fix. Preserve what remains through remote syslog, vCenter events, hardware-controller logs, screenshots, and datastore-resident logs. Evacuate or shut down workloads according to the storage risk. Then configure scratch on reliable persistent storage, investigate and remediate the boot-device access failure, and replace or reinstall the boot device only if hardware or media failure is confirmed.

If the device is physically failing, logs that were never written to another target may not be recoverable. State that gap explicitly in the incident record instead of substituting post-reboot logs.

## Cause 4: The Export Manifest Was Too Narrow

When exporting system logs from the vSphere Client, leave the default component selection intact unless Broadcom Support requests a specific subset. Selecting only **Base** omits important host and VM logs by design.

Alternatively, collect directly from the host. The portable command is:

~~~bash
vm-support
~~~

To write the archive to a known healthy VMFS datastore with enough space:

~~~bash
vm-support -w /vmfs/volumes/HealthyDatastore
~~~

Broadcom notes that options vary between ESXi releases. Use the host's own help output before adding flags:

~~~bash
vm-support -h
~~~

Do not use an unhealthy boot or scratch device as the output target. The destination controls where the archive is written; it does not make missing source logs reappear.

## Generate and Validate the Replacement Bundle

After correcting the verified cause:

1. Reload syslog if its configuration or storage was changed.
2. Generate a unique marker.
3. Confirm the marker exists in the live log target.
4. Run a fresh, full **vm-support** collection to healthy storage.
5. Copy the archive off the host.
6. List and extract it on a separate system.
7. Confirm expected files under the bundle's log path.
8. Review collection error files for remaining omissions.

A useful acceptance test includes at least:

- hostd.log and any recent rotated hostd files that exist on the live host;
- vmkernel.log and vmkwarning.log;
- vpxa.log on a vCenter-managed host;
- the unique syslog marker;
- scratch and filesystem command output; and
- no unexplained permission, busy-device, or inaccessible-device error for the log tree.

Do not discard the first failed archive. Its collection errors and partial command output can prove what was inaccessible at the time of the incident.

## Rollback and Recovery Cautions

If a new log target causes failures, restore the recorded previous **Syslog.global.logDir** only when that path is still healthy and unique, then reload syslog. Never roll back to a shared non-unique directory.

A scratch-location rollback requires a reboot. Configure another safe directory, reboot, and verify **ScratchConfig.CurrentScratchLocation** before removing or unmounting the failed target.

Do not:

- delete another host's logs to break contention;
- force-remove VMFS locks without identifying the owner;
- weaken NFS security broadly when a precise ACL correction is possible;
- reboot a host with an unassessed failing boot device; or
- claim that a successful archive contains pre-failure logs that were already lost.

## Limitations and Version Scope

- The shared-directory condition is documented for supported ESXi releases, while the inaccessible-OSData case is specifically documented for ESXi 8.x.
- The NFS execute-bit exclusion case is documented for ESXi 8.x, and the behavior depends on the NFS server's ACL and export implementation.
- **vm-support** options vary by ESXi version; verify them with **vm-support -h**.
- A bundle records diagnostic state but does not replace a VMkernel coredump, remote syslog, vCenter events, or hardware telemetry.
- Bundle directory names can differ; validate content and collection errors rather than relying on one literal archive path.

## Official Documentation

- [Exported ESXi system log bundle contains an empty /var/run/logs directory](https://knowledge.broadcom.com/external/article/433331)
- [NFS-backed /var/run/log in an ESXi support bundle is empty](https://knowledge.broadcom.com/external/article/439289)
- [ESXi logs missing from a support bundle when the boot device is inaccessible](https://knowledge.broadcom.com/external/article/416273)
- [ESXi support bundle fails to collect NFS logs with execute permissions](https://knowledge.broadcom.com/external/article/437245)
- [Specific log files are missing from a Base-only vSphere Client export](https://knowledge.broadcom.com/external/article/434167)
- [Collecting ESXi diagnostic information with vm-support](https://knowledge.broadcom.com/external/article/313542)
- [Location and contents of ESXi log files](https://knowledge.broadcom.com/external/article/306962)
- [Creating a persistent scratch location for ESXi](https://knowledge.broadcom.com/external/article/317689)

## Conclusion

An empty log directory in **vm-support** is a symptom, not a diagnosis. Check the export manifest, live log path, syslog configuration, scratch target, storage permissions, and collection errors. Fix the verified cause, preserve the failed archive, and accept the repair only after a new marker appears both live and inside a fresh full bundle.
