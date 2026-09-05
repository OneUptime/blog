# Validation Summary: How to Deploy CloudStack VMs with Custom CPU, vCPU, and Memory Through the API

## Status
validated

## Post Type
Technical guide and API tutorial.

## Technologies Covered
- Apache CloudStack 4.23 compute offerings, VM lifecycle APIs, resource allocation, and asynchronous jobs.
- Apache CloudMonkey (`cmk`).
- KVM, QEMU, libvirt, CPU models, CPU shares, and caps.
- Linux CPU and memory inspection utilities.
- Shell commands, Python parameter dictionaries, and signed HTTPS API requests.

## Sources Consulted
- [CloudStack service offerings administration guide](https://docs.cloudstack.apache.org/en/latest/adminguide/service_offerings.html).
- [CloudStack KVM installation and guest CPU configuration](https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html).
- [CloudStack programmer guide: API signing and asynchronous jobs](https://docs.cloudstack.apache.org/en/latest/developersguide/dev.html).
- CloudStack 4.23 API references: [createServiceOffering](https://cloudstack.apache.org/api/apidocs-4.23/apis/createServiceOffering.html), [listServiceOfferings](https://cloudstack.apache.org/api/apidocs-4.23/apis/listServiceOfferings.html), [deployVirtualMachine](https://cloudstack.apache.org/api/apidocs-4.23/apis/deployVirtualMachine.html), and [scaleVirtualMachine](https://cloudstack.apache.org/api/apidocs-4.23/apis/scaleVirtualMachine.html).
- CloudStack 4.23 preflight APIs: [listZones](https://cloudstack.apache.org/api/apidocs-4.23/apis/listZones.html), [listTemplates](https://cloudstack.apache.org/api/apidocs-4.23/apis/listTemplates.html), [listCapacity](https://cloudstack.apache.org/api/apidocs-4.23/apis/listCapacity.html), [listHosts](https://cloudstack.apache.org/api/apidocs-4.23/apis/listHosts.html), and [listNetworks](https://cloudstack.apache.org/api/apidocs-4.23/apis/listNetworks.html).
- CloudStack 4.23 verification APIs: [listVirtualMachines](https://cloudstack.apache.org/api/apidocs-4.23/apis/listVirtualMachines.html), [listVolumes](https://cloudstack.apache.org/api/apidocs-4.23/apis/listVolumes.html), and [listNics](https://cloudstack.apache.org/api/apidocs-4.23/apis/listNics.html).
- CloudStack 4.23 lifecycle APIs: [stopVirtualMachine](https://cloudstack.apache.org/api/apidocs-4.23/apis/stopVirtualMachine.html), [startVirtualMachine](https://cloudstack.apache.org/api/apidocs-4.23/apis/startVirtualMachine.html), [destroyVirtualMachine](https://cloudstack.apache.org/api/apidocs-4.23/apis/destroyVirtualMachine.html), and [queryAsyncJobResult](https://cloudstack.apache.org/api/apidocs-4.23/apis/queryAsyncJobResult.html).
- [CloudStack UserVmManagerImpl source](https://github.com/apache/cloudstack/blob/main/server/src/main/java/com/cloud/vm/UserVmManagerImpl.java): custom parameter validation, fixed-offering rejection, and stopped-VM scaling.
- CloudMonkey source: [configuration defaults](https://github.com/apache/cloudstack-cloudmonkey/blob/main/config/config.go), [help command](https://github.com/apache/cloudstack-cloudmonkey/blob/main/cmd/help.go), [API command parsing](https://github.com/apache/cloudstack-cloudmonkey/blob/main/cmd/api.go), and [request signing and async polling](https://github.com/apache/cloudstack-cloudmonkey/blob/main/cmd/network.go).
- [libvirt domain XML and CPU tuning](https://libvirt.org/formatdomain.html#cpu-tuning) and [virsh command reference](https://libvirt.org/manpages/virsh.html).
- [GNU Coreutils nproc](https://www.gnu.org/s/coreutils/manual/html_node/nproc-invocation.html), [lscpu manual](https://man7.org/linux/man-pages/man1/lscpu.1.html), [free manual](https://man7.org/linux/man-pages/man1/free.1.html), and [proc_meminfo manual](https://man7.org/linux/man-pages/man5/proc_meminfo.5.html).

## Issues Found
1. **Incorrect CloudMonkey help syntax.** Replaced `cmk help create serviceoffering` with `cmk create serviceoffering -h`. The help handler looks up a single API name, whereas the API handler supports the split verb/noun form and forwards `-h` correctly.
2. **Manual polling conflicted with CloudMonkey defaults.** Added `cmk set asyncblock false` before deployment examples. CloudMonkey defaults to blocking and polling asynchronous jobs internally, so the original instructions did not reliably expose the initial response expected by subsequent manual queries.
3. **Job creation was described unconditionally.** Clarified that accepted API requests return the initial resource/job identifiers, while validation failures can return immediate errors without creating a job. Both immediate errors and job results need inspection.
4. **Scaling sequence could advance while an earlier job was pending or failed.** Added an explicit instruction to repeat each query until success before proceeding and to halt on failure. A single query does not wait for completion.
5. **CPU bursting statement omitted caps.** Qualified bursting as applying when CPU caps are disabled and the VM has runnable work; idle VMs do not consume CPU and configured caps still apply when spare host capacity exists.
6. **Preflight permissions were implicit.** Clarified that host and capacity queries need an administrator role or explicit API permissions, so tenant readers may need administrator assistance.
7. **Contiguous capacity wording was misleading.** Replaced references to contiguous CPU/RAM with available resources together on an eligible host. Ordinary VM placement does not imply a physically contiguous CPU or memory allocation.

## Review Notes
- Confirmed the constrained offering creation fields, custom detail names and casing, units, bounds, fixed-offering rejection, and the `automigrate` scaling parameter against API documentation and implementation.
- Confirmed KVM CPU mode properties, migration compatibility caveats, relative shares, and the separation between vCPU count and instruction-set exposure.
- Confirmed lifecycle and inspection command parameters, async status handling, non-immediate expunge behavior, and guest inspection utility semantics.
- The post's four versioned API links returned HTTP 200 through direct retrieval. Browser-tool failures for these URLs were not treated as broken links.
- Documentation under `/en/latest/` and source under `main` can change. The API parameter review used the linked 4.23 reference; implementation checks supplement that reference and are not a guarantee for every older release.
- Validation was a documentation/source review plus local syntax checks. No CloudStack endpoint, credentials, KVM host, or guest was available, so deployments, migrations, scaling, and rollback were not executed. UUIDs and VM domain names remain intentional placeholders.
- The Python example is a logical parameter dictionary, not a complete authenticated client, as the surrounding text states.
