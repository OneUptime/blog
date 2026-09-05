# How to Register an ISO or Template That Never Becomes Ready in CloudStack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, ISO, Storage, HTTP, Troubleshooting

Description: Diagnose CloudStack ISO and template registrations stuck before Ready by validating metadata, source URLs, checksums, Secondary Storage VM access, and KVM direct-download behavior.

---

Registering an image creates metadata immediately, but a conventional CloudStack ISO or template is not deployable until its bytes are downloaded to secondary storage and its record reports `Ready`. KVM direct-download templates are different: they bypass secondary storage and are fetched to primary storage when a VM is deployed. Mixing those two workflows leads to misleading expectations.

Do not repeatedly register the same URL. Preserve one failed record and its download details long enough to identify whether the fault is metadata, source HTTP, the Secondary Storage VM (SSVM), storage, or checksum validation.

## Identify the Exact Workflow

Record the image UUID, type, zone, format, hypervisor, architecture, URL, direct-download flag, checksum, `isready`, status, and `downloaddetails`:

```bash
cmk list isos id=IMAGE_UUID isofilter=all listall=true
cmk list templates id=IMAGE_UUID templatefilter=all listall=true
cmk list imagestores zoneid=ZONE_UUID
```

Use only the relevant list command. The `all` filters require administrator access; image owners can use `self` instead. Important distinctions:

- ISOs are read-only optical images and are not hypervisor-specific, though architecture and OS metadata still matter.
- Templates are hypervisor-specific and require the correct format, such as QCOW2 or RAW for the intended KVM workflow.
- Conventional downloads are performed through the SSVM and secondary storage.
- KVM `directdownload=true` fetches the template from the registered source to primary storage during deployment.

An image can look registered while the wrong zone, architecture, or hypervisor makes it unusable for the intended VM.

## Validate the Source Outside CloudStack

From a controlled client, verify DNS, TLS, redirects, object size, and checksum:

```bash
curl -fL --proto '=https' --tlsv1.2 \
  -o /tmp/image.bin https://images.example.net/cloud/base.qcow2
sha256sum /tmp/image.bin
file /tmp/image.bin
qemu-img info /tmp/image.bin
```

For an ISO, use `file` plus the publisher's signed checksum instead of `qemu-img`. Run `qemu-img info` and `qemu-img check` on untrusted images only inside a sandbox; image parsers have a history of vulnerabilities.

Prefer HTTPS and a digest published through a separate trusted channel. CloudStack checksum values support an algorithm prefix such as `{SHA-256}` followed by the hex digest. A plain unprefixed hexadecimal checksum may be interpreted as MD5 by supported APIs, so be explicit.

Do not use expiring, cookie-gated, browser-authenticated, or client-IP-bound URLs. The fetcher is an SSVM or KVM host, not your browser. Confirm any redirect target is reachable from that component.

## Reproduce from the Actual Fetcher

For a conventional image, use **Get Diagnostics** on the zone's SSVM and inspect `cloud.log`, routes, DNS, and storage state. On KVM/XenServer, the official SSH path is from the hosting hypervisor to the System VM's link-local address on port 3922:

```bash
sudo ssh -i /root/.ssh/id_rsa.cloud \
  -p 3922 root@SSVM_LINK_LOCAL_IP
```

Inside the SSVM, make a header-only or small-range diagnostic request if the source permits it:

```bash
getent ahosts images.example.net
curl -fLsvI https://images.example.net/cloud/base.qcow2
ip route
df -h
```

Do not download a multi-gigabyte test file into the SSVM root filesystem. Inspect `/var/log/cloud.log` for the authoritative transfer error.

For KVM direct download, reproduce name resolution and TLS from the candidate KVM host instead. Private/self-signed HTTPS sources require the direct-download certificate workflow documented by CloudStack; disabling TLS verification is not an acceptable repair.

## Verify the SSVM and Secondary Storage

```bash
cmk list systemvms systemvmtype=secondarystoragevm zoneid=ZONE_UUID
cmk list imagestores zoneid=ZONE_UUID
```

The SSVM must be `Running` and connected. Secondary storage must be online, writable, and have enough data and inode capacity. For NFS-backed secondary storage, on its NFS server and relevant infrastructure path, verify:

```bash
df -h /export/secondary
df -i /export/secondary
sudo exportfs -v
```

Check NFS reachability and permissions using the documented storage design. Do not rename partial objects, change template properties, or delete directories manually. CloudStack tracks image objects and may be actively retrying or referencing them.

## Register with Explicit, Correct Metadata

For a bootable ISO:

```bash
cmk help registerIso
cmk register iso \
  name=linux-installer-2026-09 \
  url=https://images.example.net/linux-installer.iso \
  zoneid=ZONE_UUID \
  bootable=true \
  ostypeid=OS_TYPE_UUID \
  arch=x86_64 \
  checksum='{SHA-256}HEX_DIGEST'
```

For a conventional KVM template:

```bash
cmk help registerTemplate
cmk register template \
  name=linux-base-2026-09 \
  displaytext='Linux base 2026-09' \
  url=https://images.example.net/cloud/base.qcow2 \
  zoneid=ZONE_UUID \
  hypervisor=KVM \
  format=QCOW2 \
  arch=x86_64 \
  ostypeid=OS_TYPE_UUID \
  checksum='{SHA-256}HEX_DIGEST' \
  ispublic=false
```

Confirm parameter spelling with the local 4.23 API/CloudMonkey help. Keep images private until they pass boot, guest-agent, update, and security tests. Set password/SSH-key capabilities only when the image actually includes and configures the required guest integration, such as cloud-init or the CloudStack scripts.

For direct download, add `directdownload=true` only for a supported KVM image (the 4.23 `registerIso` API also exposes this option) and understand that registration readiness does not prove a host can fetch it. Test deployment on each storage/host class.

## Follow Progress and the Async Error

Poll deliberately rather than re-registering. Registration APIs return synchronously while the image transfer continues in the background; inspect `status`, `downloaddetails`, and logs for transfer failures. For an asynchronous operation that returns a job ID, use `cmk query asyncjobresult jobid=JOB_UUID`:

```bash
cmk list templates id=IMAGE_UUID templatefilter=all listall=true
cmk list isos id=IMAGE_UUID isofilter=all listall=true
sudo grep -n 'IMAGE_UUID' \
  /var/log/cloudstack/management/management-server.log | tail -n 200
```

Common signatures include DNS failure, certificate trust/hostname mismatch, HTTP 401/403/404, redirect to an unreachable host, checksum mismatch, wrong format, no secondary store, SSVM disconnection, NFS permission error, and no space left.

## Retry and Roll Back Safely

Fix the source or infrastructure first. If your CloudStack version offers a retry action for the existing record, use it and monitor the transfer. The template/ISO Download action exports the image; it does not retry a failed source download. Otherwise delete only the failed, unused image record through CloudStack and register it once with corrected metadata. Confirm no VM, snapshot, zone copy, or derivative references it before deletion.

After `Ready`, deploy a disposable VM with `startvm=false` if supported, then start it and verify boot, NIC, console, SSH-key/password integration, shutdown, and a second deployment. For direct download, verify the image lands on primary storage and its checksum is accepted.

Rollback means deleting the unused test VM and failed image through CloudStack. Never remove an image's backing files directly from secondary or primary storage.

## Conclusion

A conventional image reaches `Ready` after its secondary-storage download completes; a direct-download image can be ready at registration before any host fetches its bytes. Validate exact metadata and checksum, test the URL from the real SSVM or KVM fetcher, prove secondary or primary storage health, and register once with explicit parameters. A successful boot from a fresh deployment is the final validation, not the existence of an image record.

## Official Documentation

- [Apache CloudStack: Working with Templates and ISOs](https://docs.cloudstack.apache.org/en/latest/adminguide/templates.html)
- [Apache CloudStack: System VMs and Secondary Storage VM](https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html)
- [Apache CloudStack: Storage Overview](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html)
- [Apache CloudStack: API Reference](https://cloudstack.apache.org/api/)
- [QEMU: Disk Image Utility](https://www.qemu.org/docs/master/tools/qemu-img.html)
