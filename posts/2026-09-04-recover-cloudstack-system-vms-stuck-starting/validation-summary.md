# Validation Summary: How to Recover CloudStack System VMs Stuck in the Starting State

## Status
validated

## Post Type
Technical troubleshooting guide with CloudMonkey API calls and Linux/KVM diagnostic commands.

## Technologies Covered
- Apache CloudStack Console Proxy VMs (CPVMs) and Secondary Storage VMs (SSVMs)
- CloudMonkey and the CloudStack administrative API
- KVM, QEMU, and libvirt
- Primary and secondary storage, NFS, and Ceph
- Linux bridges, VLANs, link-local networking, and SSH
- systemd journal and Linux command-line utilities

## Sources Consulted
- [CloudStack System VMs](https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html): roles, architectures, template seeding, memory, SSH, diagnostics, and recreation requirements.
- [CloudStack Storage Overview](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html): storage dependencies and maintenance.
- [CloudStack Host and Storage Tags](https://docs.cloudstack.apache.org/en/latest/adminguide/host_and_storage_tags.html): offering and placement constraints.
- [CloudStack System VMs and Virtual Routers During Upgrade](https://docs.cloudstack.apache.org/en/latest/upgrading/upgrade/_sysvm_restart.html): template upgrades, live patching, and memory requirements.
- [CloudStack KVM installation](https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html): host agent and network configuration.
- [CloudStack API index](https://cloudstack.apache.org/api/) and the 4.22 API references for [listSystemVms](https://cloudstack.apache.org/api/apidocs-4.22/apis/listSystemVms.html), [listEvents](https://cloudstack.apache.org/api/apidocs-4.22/apis/listEvents.html), [listAsyncJobs](https://cloudstack.apache.org/api/apidocs-4.22/apis/listAsyncJobs.html), [listHosts](https://cloudstack.apache.org/api/apidocs-4.22/apis/listHosts.html), [listCapacity](https://cloudstack.apache.org/api/apidocs-4.22/apis/listCapacity.html), [listServiceOfferings](https://cloudstack.apache.org/api/apidocs-4.22/apis/listServiceOfferings.html), [listStoragePools](https://cloudstack.apache.org/api/apidocs-4.22/apis/listStoragePools.html), [listTemplates](https://cloudstack.apache.org/api/apidocs-4.22/apis/listTemplates.html), and [listImageStores](https://cloudstack.apache.org/api/apidocs-4.22/apis/listImageStores.html).
- [CloudStack event constants](https://github.com/apache/cloudstack/blob/main/api/src/main/java/com/cloud/event/EventTypes.java): distinct CPVM and SSVM start events.
- [CloudStack VM state machine](https://github.com/apache/cloudstack/blob/main/api/src/main/java/com/cloud/vm/VirtualMachine.java): Starting and Running transitions.
- [CloudMonkey repository](https://github.com/apache/cloudstack-cloudmonkey), [usage wiki](https://github.com/apache/cloudstack-cloudmonkey/wiki/Usage), and [help implementation](https://github.com/apache/cloudstack-cloudmonkey/blob/main/cmd/help.go): API invocation and help lookup.
- [libvirt virsh manual](https://libvirt.org/manpages/virsh.html): connections, domain inspection, transient domains, and pool listing.
- Upstream command manuals hosted by man7: [journalctl](https://man7.org/linux/man-pages/man1/journalctl.1.html), [df](https://man7.org/linux/man-pages/man1/df.1.html), [tail](https://man7.org/linux/man-pages/man1/tail.1.html), [grep](https://man7.org/linux/man-pages/man1/grep.1.html), [findmnt](https://man7.org/linux/man-pages/man8/findmnt.8.html), [ip](https://man7.org/linux/man-pages/man8/ip.8.html), and [bridge](https://man7.org/linux/man-pages/man8/bridge.8.html).
- [OpenSSH manual](https://man.openbsd.org/ssh): identity file, port, and destination syntax.
- [Ceph cluster monitoring](https://docs.ceph.com/en/latest/rados/operations/monitoring/): storage health and monitor quorum.
- [Apache issue CLOUDSTACK-7416](https://issues.apache.org/jira/browse/CLOUDSTACK-7416): KVM System VM domain names and startup failure evidence.

## Issues Found
1. **Incorrect start-event filter.** `VM.START` identifies user VM starts. Replaced it with separate `PROXY.START` and `SSVM.START` queries, matching CloudStack's event constants.
2. **Incorrect CloudMonkey help syntax.** Replaced `cmk help list systemvms` with `cmk help listSystemVms`. The help handler looks up the API name as its first argument.
3. **Host query concealed relevant failures.** Filtering by `state=Up` excluded disconnected or down hosts even though the following instructions asked readers to find them. The query now lists routing hosts in the zone without a state filter, also excluding System VM agent host records.
4. **Overstated inference from absent domains.** An absent domain does not prove none was ever created. Updated the diagnostic branch to describe current absence and check logs for failed-start cleanup.
5. **Architecture support lacked its hypervisor boundary.** Qualified dual-architecture support as KVM-specific from CloudStack 4.20 onward; other documented hypervisors support x86_64 only.
6. **SSH execution location was implicit.** Explicitly instruct readers to run link-local SSH on the hypervisor hosting the System VM.
7. **Diagnostics actions were conflated.** Clarified that Run Diagnostics performs network tests and Get Diagnostics downloads the bundle.
8. **Continuous log commands could prevent subsequent commands from running.** Specified separate terminals and execution hosts, and clarified that the virsh list command needs to be rerun to refresh its output.
9. **Starting was incorrectly defined as an incomplete System VM handshake.** Replaced this with the VM lifecycle meaning and instructed readers to inspect agentstate separately. The API exposes VM state and agent state independently.

## Review Notes
- Reviewed all command blocks for syntax and documented options. The CloudMonkey inventory calls use supported API parameters; UUIDs, job IDs, domain names, and addresses remain intentional placeholders.
- Confirmed the main dependency-first workflow, storage checks, System VM roles, template validation, SSH settings, and functional recovery checks. No configuration file snippets or application code required testing.
- All five links in the post's Official Documentation section resolved to the intended resources. The rolling latest documentation identified itself as 4.23 during review; API parameter checks used the published 4.22 reference. Operators should use documentation and template artifacts matching their installed release.
- Automatic template seeding describes current documented behavior. Older deployments may require manual seeding. Template upgrades and boot-setting changes should follow the release-specific restart, recreation, or live-patching instructions.
- Commands target Linux KVM hosts with administrative access and a configured CloudMonkey profile. Service names and journal availability depend on host packaging; installations using modular libvirt daemons may need the relevant daemon unit instead of libvirtd.
- SSVM-dependent operations can fail or require retry after an interruption; recreation does not guarantee transparent continuation of every in-flight job.
- Validation was based on official documentation, upstream source, and command manuals. No live CloudStack deployment was available, so runtime recovery and environment-specific connectivity were not tested.
