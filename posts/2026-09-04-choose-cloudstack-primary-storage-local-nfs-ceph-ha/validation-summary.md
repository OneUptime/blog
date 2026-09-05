# Validation Summary: How to Choose Local, NFS, or Ceph Primary Storage for CloudStack VM High Availability

## Status
validated

## Post Type
Technical architecture and operational validation guide with CLI examples.

## Technologies Covered
- Apache CloudStack 4.23 APIs, VM HA, host maintenance, primary storage, and storage placement
- Apache CloudMonkey (`cmk`)
- KVM, QEMU, and libvirt
- Linux local storage and NFS
- Ceph RBD, CephX, OSDs, CRUSH, and erasure coding
- Linux diagnostic utilities and shell pipelines

## Sources Consulted
- CloudStack storage administration: https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html
- CloudStack HA and reliability: https://docs.cloudstack.apache.org/en/latest/adminguide/reliability.html
- CloudStack instance administration: https://docs.cloudstack.apache.org/en/latest/adminguide/virtual_machines.html
- CloudStack offerings and tags: https://docs.cloudstack.apache.org/en/latest/adminguide/service_offerings.html
- CloudStack 4.23 createStoragePool: https://cloudstack.apache.org/api/apidocs-4.23/apis/createStoragePool.html
- CloudStack 4.23 API reference: https://cloudstack.apache.org/api/apidocs-4.23/ — checked listZones, listPods, listClusters, listHosts, listStorageProviders, listStoragePools, listStoragePoolsMetrics, listVolumes, listVirtualMachines, listSnapshots, listStoragePoolObjects, and listAsyncJobs parameter definitions. Cross-checked corresponding 4.22 references where useful.
- CloudMonkey usage and implementation: https://github.com/apache/cloudstack-cloudmonkey/wiki/Usage and https://github.com/apache/cloudstack-cloudmonkey/tree/main/cmd
- Ceph RBD overview: https://docs.ceph.com/en/latest/rbd/
- Ceph CloudStack integration: https://docs.ceph.com/en/latest/rbd/rbd-cloudstack/
- Ceph monitoring: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph user capabilities: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph erasure coding: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- RBD command reference: https://docs.ceph.com/en/latest/man/8/rbd/
- RBD pool statistics implementation: https://github.com/ceph/ceph/blob/main/src/tools/rbd/action/Pool.cc
- libvirt storage and virsh: https://libvirt.org/storage.html and https://libvirt.org/manpages/virsh.html
- Upstream utility manuals rendered by man7: https://man7.org/linux/man-pages/man8/showmount.8.html, https://man7.org/linux/man-pages/man8/nfsstat.8.html, https://man7.org/linux/man-pages/man8/findmnt.8.html, https://man7.org/linux/man-pages/man1/getent.1.html, and https://man7.org/linux/man-pages/man1/journalctl.1.html

## Issues Found
1. **HA prerequisites were overstated and incomplete.** Replaced the blanket requirement for healthy system VMs with explicit management-server/database availability and distinguished service-specific system-VM dependencies from restart prerequisites.
2. **Local paths were incorrectly required to be globally unique.** Clarified that local directory names may repeat on different hosts while pool UUIDs remain unique and each host's paths remain stable.
3. **Local-data-volume maintenance behavior was misleading.** Changed the claim that maintenance stops these VMs to the documented requirement to stop them before entering host maintenance. Preserved the documented restriction on migrating local data volumes between hosts.
4. **NFSv4 diagnostic caveat was missing.** Annotated showmount because NFSv4-only servers may not expose the MNT service it queries; failure does not establish that NFS storage is unavailable.
5. **Erasure-coded RBD storage lacked necessary qualifications.** Added the replicated metadata-pool requirement and the need for overwrite support and a compatible CloudStack image-creation workflow.
6. **Ceph diagnostic authentication assumptions were incomplete.** Separated monitoring credentials from the CloudStack RBD identity and explained that CLI configuration/keyrings are needed independently of libvirt secrets. Restricted application credentials may not authorize cluster-level diagnostic commands.
7. **Rollback commands could not establish that a pool was unused.** Added pool-specific primary snapshot filtering and object browsing, and required pagination, project-resource queries, system-VM volume inspection, job correlation, and cached-object/dependency review. The article no longer treats three generic lists as proof that deletion is safe.
8. **Compute placement terminology was inaccurate.** Replaced “contiguous compute capacity” with enough CPU and RAM on a compatible destination host.
9. **The HA documentation link targeted VM lifecycle documentation.** Changed it to the actual HA-enabled instances section of the reliability guide.

## Review Notes
- This was a documentation and source review, not an integration test against a running CloudStack, NFS, or Ceph deployment. Failure recovery times, fencing, migration compatibility, and backup restoration still require the disposable-workload tests described in the post.
- Checked the shell syntax of every Bash code block using bash -n. UUIDs, hostnames, paths, provider names, and Ceph client names are intentional placeholders. Commands require installed tools and configured authentication; administrative storage queries require appropriate CloudStack privileges.
- The 4.23 createStoragePool URL is valid. The browser initially failed to retrieve it, but direct HTTPS retrieval succeeded and confirmed the documented parameters. No downgrade of the article's API link was necessary.
- The RBD manual omits pool stats, but the upstream Pool.cc implementation explicitly registers that command and accepts a pool argument. The example was retained.
- NFS vers/nconnect support and first-mount behavior match CloudStack documentation. That feature requires compatible libvirt and Linux versions; the docs specify libvirt 5.1 or later and nconnect availability in Linux 5.3 or later.
- Shared storage enables cross-host disk access but does not by itself guarantee HA or migration. The article correctly retains requirements for fencing, capacity, compatible host configuration, and failure-domain testing.
- Replication, snapshots, and independent backups have different recovery roles. The post correctly requires restoration checks and independent failure and credential domains.
- Ceph latest documentation identifies itself as development documentation. Production operators should match the deployed release and provider capabilities rather than assume every upstream feature is supported.
