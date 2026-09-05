# Validation Summary: How to Fix `InsufficientServerCapacity` When Deploying from a Custom CloudStack Template

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- Apache CloudStack 4.23 deployment planning, templates, offerings, capacity, allocation tags, affinity, and networking.
- Apache CloudMonkey (`cmk`) and CloudStack APIs.
- KVM, libvirt, CPU compatibility, and Linux host diagnostics.
- Primary storage, NFS, Ceph/RBD, and local storage.
- Linux shell commands and systemd service inspection.

## Sources Consulted
- CloudStack troubleshooting and internal job identifiers: https://docs.cloudstack.apache.org/en/latest/adminguide/troubleshooting.html
- CloudStack template metadata, visibility, architecture, and KVM direct download: https://docs.cloudstack.apache.org/en/latest/adminguide/templates.html
- CloudStack ordinary, strict, flexible, and implicit allocation tags: https://docs.cloudstack.apache.org/en/latest/adminguide/host_and_storage_tags.html
- CloudStack compute and disk offerings: https://docs.cloudstack.apache.org/en/latest/adminguide/service_offerings.html
- CloudStack primary storage scope, access, maintenance, and locality: https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html
- CloudStack host capacity and per-cluster overprovisioning: https://docs.cloudstack.apache.org/en/latest/adminguide/hosts.html#over-provisioning-and-service-offering-limits
- CloudStack KVM host requirements, CPU configuration, libvirtd, and network bridges: https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html
- CloudStack 4.23 API reference: https://cloudstack.apache.org/api/apidocs-4.23/
- API command pages checked for request parameters: https://cloudstack.apache.org/api/apidocs-4.23/apis/queryAsyncJobResult.html ; https://cloudstack.apache.org/api/apidocs-4.23/apis/listTemplates.html ; https://cloudstack.apache.org/api/apidocs-4.23/apis/listCapacity.html ; https://cloudstack.apache.org/api/apidocs-4.23/apis/listHosts.html ; https://cloudstack.apache.org/api/apidocs-4.23/apis/listClusters.html ; https://cloudstack.apache.org/api/apidocs-4.23/apis/listServiceOfferings.html
- Tag APIs and their response fields: https://cloudstack.apache.org/api/apidocs-4.23/apis/listHostTags.html ; https://cloudstack.apache.org/api/apidocs-4.23/apis/listStorageTags.html
- Storage and affinity API parameters: https://cloudstack.apache.org/api/apidocs-4.23/apis/listStoragePools.html ; https://cloudstack.apache.org/api/apidocs-4.23/apis/listStoragePoolsMetrics.html ; https://cloudstack.apache.org/api/apidocs-4.23/apis/listVolumes.html ; https://cloudstack.apache.org/api/apidocs-4.23/apis/listAffinityGroups.html
- Network API parameters: https://cloudstack.apache.org/api/apidocs-4.23/apis/listNetworks.html ; https://cloudstack.apache.org/api/apidocs-4.23/apis/listPhysicalNetworks.html ; https://cloudstack.apache.org/api/apidocs-4.23/apis/listTrafficTypes.html
- Deployment parameters, including startvm and cluster selection: https://cloudstack.apache.org/api/apidocs-4.23/apis/deployVirtualMachine.html
- CloudStack implementation confirming that startvm=false bypasses the start path: https://github.com/apache/cloudstack/blob/main/server/src/main/java/com/cloud/vm/UserVmManagerImpl.java
- Official CloudMonkey repository: https://github.com/apache/cloudstack-cloudmonkey
- libvirt virsh command reference: https://libvirt.org/manpages/virsh.html
- libvirt host-passthrough migration requirements: https://libvirt.org/formatdomain.html#cpu-model-and-topology
- Linux lscpu and free manuals: https://man7.org/linux/man-pages/man1/lscpu.1.html ; https://man7.org/linux/man-pages/man1/free.1.html
- Upstream systemctl manual source: https://raw.githubusercontent.com/systemd/systemd/main/man/systemctl.xml

## Issues Found
1. **Stopped deployment did not test the failure path.** Replaced the instruction to test stopped deployments with actual start attempts followed by stopping the disposable VMs. CloudStack skips its start path when startvm=false, so a successful stopped record is insufficient evidence of placement or template download success.
2. **Overprovisioning was attributed to the offering.** Changed the capacity check to the cluster’s CPU and memory overprovisioning ratios, matching the documented configuration scope.
3. **API UUIDs and log identifiers were conflated.** Retained the initial UUID search, but explained that management logs commonly use internal numeric job-N identifiers. Added correlation through request time and instance name when UUID searches return nothing.
4. **Tag matching guidance was too absolute.** Clarified that ordinary candidates may have extra tags and that flexible rules require rule evaluation. Qualified host-tag enforcement because explicit host selection can bypass ordinary checks unless strict tags apply. Updated the primary-storage eligibility sentence consistently.
5. **CPU model listing could be mistaken for host support.** Explained that cpu-models lists libvirt’s known models and directed readers to domcapabilities for hypervisor capabilities. Expanded host-passthrough migration compatibility beyond CPUs to hardware, QEMU, microcode, and configuration.
6. **Removing optional affinity was presented as isolating dedication too.** Corrected the matrix row to state that dedication remains in force.
7. **Migration was an unconditional success criterion.** Limited migration/HA checks to supported and required behavior, keeping the conclusion consistent with workloads that legitimately use local storage or do not require migration.
8. **Administrative CLI prerequisites were implicit.** Stated that the examples use a configured administrator CloudMonkey profile and require substitution of UUID placeholders. The templatefilter=all option is administrator-only, and infrastructure inventory calls also require appropriate privileges.

## Review Notes
- The post is technically relevant and contains executable diagnostic commands; neither exclusion status applies.
- Checked every CloudMonkey example against the corresponding 4.23 API request schema. No command-name or parameter corrections were needed. In particular, listHostTags/listStorageTags have no host/pool request filter and return hostid/poolid respectively. listCapacity type=4 denotes virtual-network public IP capacity, not every kind of IP capacity.
- The five documentation links in the post resolve to the intended official resources. The reviewed latest documentation identifies itself as 4.23.0.0; deployments on other versions should consult their matching documentation and API discovery cache.
- Template readiness/direct-download behavior, storage scope and reachability, maintenance impact, KVM cluster homogeneity, bridge/VLAN checks, and aggregate-versus-per-host capacity reasoning are supported by the consulted documentation.
- For project-owned resources, supply the appropriate projectid when needed; listall does not itself include every project. Paginated inventory results must be complete before concluding that a matching resource is absent.
- Error causes remain deployment-specific. Some invalid metadata or network failures surface as other API errors rather than InsufficientServerCapacity; management and agent logs determine the actual failure path.
- This was a documentation and source review, not a live CloudStack deployment test. No infrastructure changes or guest deployments were performed. Shell blocks were checked for syntax; runtime results require the intended Linux/KVM hosts, installed tools, credentials, and actual resource identifiers.
