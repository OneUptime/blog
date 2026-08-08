# ESXi Purple Screen of Death: Evidence to Capture Before Rebooting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, PSOD, VMkernel, Core Dump, Support Bundle, Incident Response

Description: Preserve the ESXi purple-screen message, core dump, hardware telemetry, and incident timeline before a reboot removes the best diagnostic evidence.

---

An ESXi purple diagnostic screen means the VMkernel stopped after a severe software or hardware condition. The failed host is no longer scheduling its VMs, although vSphere HA may restart eligible VMs elsewhere. The screen, core dump, and hardware-controller logs are the best evidence of why it stopped.

Do not immediately power-cycle the server. Photograph the entire console, allow the configured core-dump attempt to finish or reach the documented timeout, capture out-of-band hardware state, and record the exact time. Reboot only after evidence is preserved and the service-restoration decision is clear.

## Confirm the Incident and Protect Workloads

From vCenter or another management system, establish:

- exact host and hardware serial number;
- time monitoring detected failure;
- VMs that were running on it;
- VMs restarted by HA and their destination hosts;
- storage and network alarms around the same time; and
- any host still shown as connected despite the console fault.

Do not manually power on a second copy of an inaccessible VM until HA and storage lock ownership are known. If the failed host is isolated rather than fully stopped, fence it according to the cluster design.

Preserve the workload outage timeline separately from the root-cause investigation. Restoring applications can proceed on healthy hosts while the failed server remains frozen for evidence collection.

## Photograph the Entire Purple Screen

Use the server's remote management controller screenshot function when available, plus a phone photo as a fallback. Capture the screen at readable resolution and include:

- first panic or exception line;
- physical CPU and world information;
- ESXi version and build if displayed;
- VMkernel uptime;
- register values;
- complete backtrace and loaded module names;
- core-dump progress, completion, or failure message; and
- any hardware machine-check or NMI text.

Do not crop the screenshot to one driver-like word. Backtrace context, build, and uptime help distinguish a known software defect, firmware interaction, or hardware instability.

Transcribe the first error line exactly into the incident record. Search the Broadcom Support Portal for that exact message and the distinctive backtrace function after evidence collection. Similar-looking PSODs can have different causes.

## Wait for Core-Dump Completion

After a PSOD, ESXi attempts to write VMkernel state to one or more configured coredump targets. Broadcom explicitly advises allowing enough time for the dump to reach persistent storage before rebooting. Watch for `Disk Dump Successful` or an explicit failure. If neither appears, allow more time—Broadcom notes that a dump may take up to an hour—and follow the environment's documented timeout.

Do not reset the server while the dump is in progress unless the documented timeout has expired and the service-restoration decision authorizes it. A partial or absent dump can prevent root-cause analysis, especially when logs were stored on a ramdisk or the boot device also failed.

The coredump target should have been verified before incidents. On healthy hosts, inspect file and partition configuration with:

```bash
esxcli system coredump file list
esxcli system coredump partition get
```

These commands cannot be run on the frozen PSOD console. Use them after reboot and proactively on peer hosts. ESXi 7 and later normally configure a dump file in the ESX-OSData system volume during installation or upgrade, but configuration can still become inactive or inaccessible.

Do not disable a local coredump target just to clear an alarm. Broadcom notes that dumps contain working memory and system state needed for troubleshooting. If a local target is unsuitable, configure and verify a supported network dump collector before disabling the local target.

## Capture Out-of-Band Hardware Evidence

Before reset, export the management-controller system event log and storage, CPU, memory, power, thermal, and PCIe health. Record:

- corrected and uncorrected ECC errors;
- machine-check events;
- CPU or memory sparing;
- PCIe bus, AER, or link errors;
- storage-controller and disk faults;
- NIC or HBA firmware alerts;
- temperature and power events; and
- watchdog or NMI source.

Take a support collection from iLO, iDRAC, XClarity, or the server vendor's equivalent if available. Do not clear hardware logs before the vendor reviews them.

Record current BIOS, BMC, NIC, HBA, storage-controller, and device firmware. Later compare exact driver-firmware pairs with the Broadcom Compatibility Guide and hardware-vendor support matrix.

## Preserve the Change and Pattern Timeline

Document the last known good state and every relevant change:

- ESXi patch or major upgrade;
- driver, firmware, BIOS, or microcode update;
- new hardware or replaced adapter;
- storage path or network change;
- backup, snapshot, vMotion, or high-I/O job;
- workload deployment; and
- earlier correctable hardware errors.

If the host has faulted before, compare screenshots. Broadcom's interpretation guidance says identical error and stack patterns can suggest a repeatable software path, while widely varying failures can suggest hardware, although neither pattern alone is conclusive.

Do not label the component named at the top of the stack as defective without the dump and version-specific analysis. A driver can appear in a stack because it handled an interrupt triggered by underlying firmware or hardware.

## Decide When to Reboot

After the screen and hardware evidence are saved and the coredump has completed successfully, explicitly failed, or reached the environment's documented timeout, choose a controlled reboot through the out-of-band controller. Preserve the displayed result or unresolved status. Ensure:

- HA restarts have settled;
- storage presents no ongoing APD or PDL risk;
- sufficient cluster capacity exists;
- no duplicate VM starts are pending;
- vendor support does not need the server frozen longer; and
- console access remains available if boot fails.

Do not automatically return the host to production. Keep it in maintenance mode or isolated placement until logs, hardware health, and the suspected fix are reviewed.

## Collect ESXi Evidence Immediately After Boot

Generate a support bundle before logs rotate or new workload obscures the failure:

```bash
vm-support -w /vmfs/volumes/HealthyDatastore
```

Use a healthy persistent destination with enough space. Support bundles can contain sensitive configuration and encrypted diagnostic content, so handle them through the case-management process.

Collect or preserve:

- `/var/run/log/vmkernel.log` and rotated predecessors;
- `/var/run/log/vobd.log`;
- `/var/run/log/hostd.log`;
- boot and jumpstart logs;
- the VMkernel core or zdump referenced by the host; and
- vCenter events and `/var/run/log/fdm.log` from the primary and relevant secondary FDM hosts for the same interval.

Confirm that the configured coredump target is still active. If the dump failed because its target was missing, fix target configuration before the host returns to service, but preserve the failure evidence first.

## Correlate Before Remediation

Use the exact ESXi build, panic line, backtrace, hardware model, driver, and firmware to check current Broadcom KBs and release notes. Examples of root-cause classes include:

- a fixed ESXi defect;
- incompatible or outdated NIC, HBA, NVMe, or storage firmware and driver;
- CPU or memory hardware failure;
- PCIe or device timeout;
- storage boot-device loss; and
- NMI initiated by a hardware management controller.

Apply only the remediation that matches the evidence. A generic firmware update can introduce a new unsupported pair, and a generic ESXi patch can remove an OEM async driver.

For hardware indications, run offline diagnostics under the server vendor's direction. For a repeatable software backtrace, provide the core and support bundle to Broadcom. Preserve at least one failing host from fleet-wide remediation until the root cause is credible.

## Prevent an Evidence-Free Recurrence

On every host:

- keep an active, adequately sized coredump target;
- configure persistent syslog outside volatile ramdisk storage;
- synchronize NTP across ESXi, vCenter, BMCs, switches, and arrays;
- retain remote-console screenshot capability;
- test support-bundle collection;
- alert on hardware corrected errors and coredump configuration; and
- maintain driver-firmware inventory against the Compatibility Guide.

Run a tabletop PSOD exercise so operators know how long to preserve the screen, who approves reboot, and where to upload diagnostic data.

## Official Documentation

- [ESXi host stops and displays a purple diagnostic screen](https://knowledge.broadcom.com/external/article/337182/esxesxi-host-stops-responding-and-displa.html)
- [Interpreting a host purple diagnostic screen](https://knowledge.broadcom.com/external/article/343033/interpreting-a-host-purple-diagnostic-sc.html)
- [Host issue with purple-screen text](https://knowledge.broadcom.com/external/article/406537/host-issue-with-purple-screen-text.html)
- [Configuring a diagnostic coredump partition](https://knowledge.broadcom.com/external/article/319492/configuring-a-diagnostic-coredump-partit.html)
- [Configuring ESXi coredump to a file](https://knowledge.broadcom.com/external/article/314320/configuring-esxi-coredump-to-file-instea.html)
- [Using vm-support to collect ESXi diagnostics](https://knowledge.broadcom.com/external/article/313542)

## Conclusion

The first PSOD response is evidence preservation: full-screen image, completed core dump or captured failure/timeout status, hardware logs, and synchronized timeline. Reboot only after those artifacts and workload ownership are safe. Then collect the ESXi support bundle, correlate the exact stack with the exact build and hardware, and apply a version-specific fix before returning the host to service.
