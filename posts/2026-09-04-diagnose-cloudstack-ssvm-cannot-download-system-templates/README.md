# How to Diagnose a Secondary Storage VM That Cannot Download System Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, Storage, Networking, NFS, Troubleshooting

Description: Trace CloudStack System VM template seeding across the management server, Secondary Storage VM, source repository, and secondary storage, including the safe bootstrap path when no SSVM works yet.

---

CloudStack needs a System VM template before it can create a working Secondary Storage VM (SSVM), yet the SSVM normally performs template and ISO transfers. Current CloudStack resolves this bootstrap problem by automatically registering and seeding required System VM templates during zone deployment and upgrade. If that automation fails, diagnose who is supposed to fetch the template before troubleshooting an SSVM that may not exist yet.

The current System VM guide defines two recovery paths:

- If an SSVM is running, register or retry the template through the UI/API so the normal transfer workflow can operate.
- If no SSVM is available, mount the secondary store and use the supported `cloud-install-sys-tmplt` helper to seed it manually.

Never copy and rename a QCOW2 file directly inside CloudStack's secondary-storage layout. The helper creates the metadata and structure CloudStack expects.

## Inventory the Zone and Failure

Record the CloudStack release, zone UUID, hypervisor, CPU architecture, image store UUID/URL, SSVM UUID/state, and the System VM template record:

```bash
cmk list zones id=ZONE_UUID
cmk list hypervisors zoneid=ZONE_UUID
cmk list systemvms systemvmtype=secondarystoragevm zoneid=ZONE_UUID
cmk list imagestores zoneid=ZONE_UUID
cmk list templates templatefilter=all listall=true zoneid=ZONE_UUID
```

For the required template, inspect `hypervisor`, `arch`, `templatetype`, `isready`, `status`, URL, and download details. A ready x86_64 KVM template does not satisfy an aarch64 KVM host, and a USER template is not automatically the zone's System VM template.

Search by template/SSVM UUID and the first failed job:

```bash
sudo grep -nE 'TEMPLATE_UUID|SSVM_UUID|JOB_UUID' \
  /var/log/cloudstack/management/management-server.log | tail -n 300
```

## Determine the Active Bootstrap Path

Current CloudStack downloads missing System VM templates from the repository configured by `system.vm.templates.download.repository` in `/etc/cloudstack/management/server.properties`, or the official default if no custom repository is set. Inspect the effective configuration on every management server:

```bash
sudo grep -n '^system.vm.templates.download.repository' \
  /etc/cloudstack/management/server.properties
```

If the management server is performing automatic seeding, test DNS and HTTPS from that server using normal certificate verification:

```bash
getent ahosts download.cloudstack.org
curl -fLsS -o /dev/null https://download.cloudstack.org/
# For an internal CA:
curl -fLsS --cacert /path/to/internal-ca.pem \
  -o /dev/null https://systemvm-repo.internal.example/
```

Check proxy environment, egress policy, clock, and Java trust if `curl` succeeds but the JVM fails. Do not disable TLS verification or replace the trust store globally to accommodate one repository.

## Diagnose a Running SSVM

Use the UI's **Get Diagnostics** action first. The documented System VM bundle includes interface/route/firewall state, `agent.properties`, `cloud.log`, patch logs, and daemon logs.

For KVM, connect from the host running the SSVM to its link-local address on port 3922:

```bash
sudo ssh -i /root/.ssh/id_rsa.cloud \
  -p 3922 root@SSVM_LINK_LOCAL_IP
```

Inside the SSVM, inspect:

```bash
ip -br address
ip route
cat /etc/resolv.conf
df -h
df -i
ss -ltnp
tail -n 250 /var/log/cloud.log
```

Then test only a header or tiny range against the exact template URL, with the appropriate trusted CA:

```bash
curl -fLsS --range 0-1023 \
  -o /tmp/systemvm-head.bin \
  https://TRUSTED_REPOSITORY/EXACT_RELEASE_TEMPLATE
wc -c /tmp/systemvm-head.bin
rm /tmp/systemvm-head.bin
```

Do not fill the SSVM root disk with a multi-gigabyte diagnostic download. A successful browser request is irrelevant if DNS, routes, proxy, or CA trust differ inside the SSVM.

## Verify Secondary Storage Independently

The SSVM must mount and write the secondary store. Check the NFS server and the infrastructure path:

```bash
sudo exportfs -v
df -h /export/secondary
df -i /export/secondary
sudo journalctl -u nfs-server -n 200 --no-pager
```

From an authorized infrastructure host, verify the export with the same NFS version/mount options used by CloudStack. Use a temporary test location, not CloudStack's managed object directories:

```bash
showmount -e NFS_SERVER
sudo mkdir -p /mnt/secondary-check
sudo mount -t nfs -o ro NFS_SERVER:/export/secondary /mnt/secondary-check
findmnt /mnt/secondary-check
sudo umount /mnt/secondary-check
```

For a write problem, inspect export CIDRs, root-squash expectations, UID/GID, SELinux/AppArmor denials, NFS locking, free space, and stale handles. Do not broaden the export to `*` as a quick fix.

## Prefer the CloudStack 4.23 Setup Workflow

CloudStack 4.23 can download selected System VM templates on demand through the management-server setup utility. This is preferable to constructing a helper command by hand because the packaged workflow selects the installed CloudStack conventions. On one management server in a controlled maintenance window, inspect the locally installed options first:

```bash
sudo cloudstack-setup-management --help
```

For an x86_64 KVM zone, the documented 4.23 selector is:

```bash
sudo cloudstack-setup-management --systemvm-templates=kvm-x86_64
```

Use the matching documented selector for aarch64 rather than reusing this value. If an approved internal mirror is required, supply `--systemvm-templates-repository` exactly as shown by the installed 4.23 help. Treat this as a management-server change: capture the current configuration, do not run it concurrently on multiple nodes, watch its exit status and management log, and verify that the management service returns healthy afterward.

## Seed Manually Only When the Setup Path Cannot Work

If no usable SSVM exists, obtain the exact template URL for the installed CloudStack release, hypervisor, and architecture from the current official documentation. Verify the Apache-published checksum/signature before seeding.

Mount the correct secondary store on the management server or a controlled helper host:

```bash
sudo mkdir -p /mnt/cloudstack-secondary
sudo mount -t nfs \
  NFS_SERVER:/export/secondary /mnt/cloudstack-secondary
findmnt /mnt/cloudstack-secondary
```

Use the packaged helper. This example intentionally uses placeholders so an operator cannot seed a mismatched release accidentally:

```bash
sudo /usr/share/cloudstack-common/scripts/storage/secondary/cloud-install-sys-tmplt \
  -m /mnt/cloudstack-secondary \
  -u https://download.cloudstack.org/systemvm/RELEASE/EXACT_TEMPLATE_FILE \
  -h kvm \
  -F
```

If database encryption is configured with the web method, the official guide requires the management-server secret through the helper's documented option. Handle it outside shared shell history. Unmount after successful completion:

```bash
sudo umount /mnt/cloudstack-secondary
```

Use the helper only when the packaged 4.23 setup path cannot reach or mount the required store. Do not seed while another management server or SSVM is actively writing the same template. Coordinate the maintenance window and watch logs.

## Read the Error by Category

Common first causes are:

| Error | Validate |
| --- | --- |
| DNS/connection timeout | SSVM or management route, egress ACL, proxy |
| Certificate/PKIX failure | hostname, clock, chain, component trust store |
| HTTP 403/404 | exact release URL, mirror permissions, redirect target |
| Checksum/decompression failure | complete object, official digest, free space |
| NFS permission/stale handle | export CIDR/options, mount, server health |
| No matching template | hypervisor and `x86_64`/`aarch64` alignment |
| Template seeded but SSVM still fails | primary storage, system/public network, host capacity |

System VM creation also needs primary storage and an eligible host. A successful secondary-storage seed is necessary but not sufficient.

## Verify Recovery and Roll Back

Wait for the System VM template to report `Ready`, then let CloudStack create a new SSVM. Require the SSVM to remain `Running` and connected, and register a small checksum-pinned private test template or ISO through the normal workflow. Confirm it reaches `Ready` and can be used.

If a custom repository change caused the failure, restore the previous repository property on all management servers and restart them in the documented rolling manner. If a manually seeded template is wrong, do not delete its files. Remove or replace the tracked template through CloudStack after confirming no System VM uses it.

## Conclusion

First identify whether automatic management-server seeding or a running SSVM owns the transfer. Validate the exact release, hypervisor, architecture, source URL, TLS path, and secondary-storage write path. On 4.23, prefer the packaged `cloudstack-setup-management` template selector. Use `cloud-install-sys-tmplt` only when that setup path cannot work in the supported no-SSVM bootstrap case, then prove recovery with a newly created SSVM and a normal image transfer.

## Official Documentation

- [Apache CloudStack: System VM Templates](https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html)
- [Apache CloudStack: Management Server and System VM Template Setup](https://docs.cloudstack.apache.org/en/latest/installguide/management-server/)
- [Apache CloudStack: Secondary Storage](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html#secondary-storage)
- [Apache CloudStack: Configuring Secondary Storage](https://docs.cloudstack.apache.org/en/latest/installguide/configuration.html#add-secondary-storage)
- [Apache CloudStack: Downloads](https://cloudstack.apache.org/downloads.html)
