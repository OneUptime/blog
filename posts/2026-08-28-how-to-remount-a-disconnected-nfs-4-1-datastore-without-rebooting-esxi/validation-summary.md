# Validation Summary: How to Remount a Disconnected NFS 4.1 Datastore Without Rebooting ESXi

## Status

validated

## Post Type

Troubleshooting guide and operational runbook

## Technologies Covered

- VMware ESXi 7.0.x and 8.0.x
- VMware vSphere and vCenter Server
- NFS 4.1 datastores
- ESXCLI `storage nfs41` commands
- VMkernel networking, `vmkping`, TCP/IP stacks, and VMkernel port binding
- NFS 4.1 `AUTH_SYS`, Kerberos security modes, multipathing, and nConnect
- ESXi storage and boot logs

## Sources Consulted

- [Broadcom KB 344470: Troubleshoot and Remove Inaccessible NFS Datastores - VMware vSphere](https://knowledge.broadcom.com/external/article/344470)
- [Broadcom ESXCLI 7.0.2 storage command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/7.0.2/namespace/esxcli_storage.html)
- [Broadcom ESXCLI 8.0.2 storage command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/8.0.2/namespace/esxcli_storage.html)
- [Broadcom ESXCLI 8.0.3 storage command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/8.0.3/namespace/esxcli_storage.html)
- [Broadcom latest ESXCLI storage command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html)
- [Broadcom KB 416172: NFS 4.1 Datastore fails to remount after ESXi Host reboot on ESXi 8.x](https://knowledge.broadcom.com/external/article/416172)
- [Broadcom KB 380337: NFS 4.1 Datastores using Custom NFS TCP/IP Stack become inaccessible after upgrading to ESXi 8.0.2](https://knowledge.broadcom.com/external/article/380337)
- [Broadcom KB 397252: NFS shares do not automatically remount after a reboot or an upgrade](https://knowledge.broadcom.com/external/article/397252)
- [Broadcom KB 397522: One NFS datastore becomes inaccessible after ESXi upgrade to 7.0.3](https://knowledge.broadcom.com/external/article/397522)
- [Broadcom KB 370672: Support for nConnect feature added in ESXi's NFS41 client](https://knowledge.broadcom.com/external/article/370672)
- [Broadcom KB 311866: Connection sharing with NFS41 mounts](https://knowledge.broadcom.com/external/article/311866)
- [Broadcom KB 344313: Testing VMkernel network connectivity with the vmkping command](https://knowledge.broadcom.com/external/article/344313)
- [Broadcom KB 339587: NFS datastore inaccessible on ESXi host after network transition or migration](https://knowledge.broadcom.com/external/article/339587)
- [Broadcom KB 311779: Error "Device or resource busy" while attempting to unmount a datastore](https://knowledge.broadcom.com/external/article/311779)
- [Broadcom vSphere API: HostNasVolumeSpec](https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.host.NasVolume.Specification.html)

## Issues Found

- The post originally said consumers could simply be stopped or moved, but Broadcom requires VMs and templates to be unregistered before removal. It now distinguishes relocation from powering off and unregistering, states that powering off alone does not clear registration, and re-registers those objects only after the datastore identity is verified.
- The captured definition omitted the `Read-Only` field, and the basic add examples did not state that they use read/write access and the default connection count. The post now captures and verifies access mode, scopes the examples correctly, documents `-r` for a read-only mount, and directs non-default connection-count configurations to the applicable version-specific documentation.
- The `vmkping -I` example implicitly assumed the default TCP/IP stack. The post now states that assumption and instructs users of a non-default stack to add `-S <stack-name>`.
- The boot section referred generically to upgrading to a fixed release. Broadcom KB 416172 describes ESX 9.0's retry behavior as a workaround, not a fix for the underlying network initialization delay. The wording now preserves that distinction.
- The explanation of changing the datastore label referred imprecisely to an old datastore identity. It now describes the concrete effect: the label is the local datastore path/name, so changing it can leave configuration or inventory references pointing to the old name.
- The displayed title for Broadcom KB 344470 was stale. It was updated to the article's current official title without changing the URL.

## Review Notes

- The core `esxcli storage nfs41 list`, `remove -v`, and `add -H/-s/-v` commands are correct for ESXi 7.0.x and 8.0.x. The NFS 3 `storage nfs` namespace is correctly distinguished from `storage nfs41`.
- The `-I <server>:<vmk>` NFS 4.1 binding form and the ESXi 8.0 Update 3 minimum are correct. Versioned ESXCLI references show that NFS 4.1 `-I` is absent in 8.0.2 and present in 8.0.3.
- NFS 4.1 nConnect is an 8.0 Update 3-series feature; Broadcom KB 311866 gives 8.0 U3b as the conservative minimum. The post does not apply `-c` to older hosts and instead directs non-default connection-count cases to current documentation.
- KB 397252 is specifically about ESXi 7.0.3 hostname/FQDN mounts and DNS resolution. It is retained as a related official reference, not as support for the separate ESXi 8.x no-retry scenario in KB 416172.
- The post's decision to stop on an unexplained busy error and escalate rather than immediately use the legacy `esxcfg-nas -d` fallback is conservative and compatible with Broadcom's prerequisites.
