# Validation Summary: How to Route NFS 4.1 Traffic Through a Dedicated VMkernel Adapter on ESXi 8.0 U3+

## Status
validated

## Post Type
Technical tutorial and operational guide

## Technologies Covered

- VMware ESXi and vSphere 8.0 Update 3 or later
- NFS 4.1 datastores, sessions, connection sharing, and session trunking
- VMkernel adapters and VMkernel port binding
- Default TCP/IP stack, VMkernel routing, VLANs, MTU, ACLs, and uplink teaming
- ESXCLI, `vmkping`, and ESXi VMkernel logging
- NFS `AUTH_SYS`, Kerberos security modes, and `nConnect`

## Sources Consulted

- [Broadcom ESXCLI 8.0 U3 storage command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/8.0.3/namespace/esxcli_storage.html)
- [Broadcom ESXCLI 8.0 U2 storage command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/8.0.2/namespace/esxcli_storage.html)
- [Broadcom ESXCLI 8.0 U3 network command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/8.0.3/namespace/esxcli_network.html)
- [Broadcom KB 380337: NFS 4.1 Datastores using Custom NFS TCP/IP Stack become inaccessible after upgrading to ESXi 8.0.2](https://knowledge.broadcom.com/external/article/380337)
- [Broadcom KB 419497: Unable to mount NFS4.1 datastores with error "Permission denied"](https://knowledge.broadcom.com/external/article/419497)
- [Broadcom KB 370672: Support for nConnect feature added in ESXi's NFS41 client](https://knowledge.broadcom.com/external/article/370672)
- [Broadcom KB 370665: NFS Support in VMware vSphere 8.0 and Beyond](https://knowledge.broadcom.com/external/article/370665)
- [Broadcom KB 413049: vMotion failure after upgrading a custom-NFS-stack environment to vSphere 8 U3](https://knowledge.broadcom.com/external/article/413049)
- [Broadcom KB 313941: NFS fails when using custom TCP/IP stack](https://knowledge.broadcom.com/external/article/313941)
- [Broadcom KB 344470: Troubleshoot and Remove Inaccessible NFS Datastores](https://knowledge.broadcom.com/external/article/344470)
- [Broadcom KB 311866: Connection sharing with NFS41 mounts](https://knowledge.broadcom.com/external/article/311866)
- [Broadcom KB 318546: Multihoming on ESXi](https://knowledge.broadcom.com/external/article/318546)
- [Broadcom KB 407935: Per-VMkernel gateway configuration](https://knowledge.broadcom.com/external/article/407935)
- [Broadcom KB 308786: Configuring static routes for VMkernel ports on an ESXi host](https://knowledge.broadcom.com/external/article/308786)
- [RFC 8881: Network File System Version 4 Minor Version 1 Protocol](https://www.rfc-editor.org/rfc/rfc8881.html)

## Issues Found

- The routed-network instructions placed gateway work outside ESXi and did not explicitly require a valid ESXi-side forward path for the bound VMkernel adapter. The networking steps now require a supported `vmk2` forward path, using a per-adapter gateway override or destination-specific static route when needed, while preserving the Default TCP/IP stack's existing management gateway and checking the return route.
- The VMkernel creation steps did not warn against same-stack, same-subnet VMkernel multihoming, which Broadcom documents as unsupported outside specific exceptions that do not include NFS. The post now tells readers not to reuse a subnet already assigned to another VMkernel adapter on the Default TCP/IP stack.
- The connection-list wording could imply that a TCP socket always belongs uniquely to the target datastore, and merely finding one expected source could overlook other unexpected connections. Broadcom documents that NFS 4.1 datastores from the same server instance can share a session and TCP connection. The post now describes the socket list as endpoint-level evidence, requires it to be interpreted together with the datastore's `Vmknics` value, and treats mixed or ambiguous source attribution as unverified.
- The rollback example showed only one prior VMkernel mapping even though a datastore can have several. The rollback guidance now requires every recorded mapping to be restored by repeating `-I` in one `param set` command.
- The removal warning was limited to an accessible datastore, even though an inaccessible mount must also be free of registered VMs, templates, swap files, scripts, and other consumers before removal. The warning now applies regardless of accessibility.
- The label for Broadcom article 413049 did not describe the article's current subject/title. The label was updated; the URL itself was valid and relevant.

All `esxcli` and `vmkping` command names, subcommands, flags, argument formats, repeatable `-I` mappings, output-field names, and rollback forms were otherwise correct.

## Review Notes

- Comparing the versioned ESXCLI references confirmed that NFS 4.1 `-I <server>:<vmknic>` support is present in ESXi 8.0 U3 and absent in 8.0 U2.
- Broadcom KB 370672 describes NFS 4.1 `nConnect` as available from U3, while KB 311866 says U3b. The post does not configure `-c` or claim a precise `nConnect` introduction build, so this documentation discrepancy does not affect its procedure.
- The commands were validated against Broadcom's versioned references and knowledge base, but were not executed against a live ESXi host or storage array during this review.
