# How to Create a Reusable CloudStack Template from a VM Root Volume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, Virtual Machine, Storage, KVM, Security

Description: Prepare and stop a CloudStack source VM, create a private reusable template from its root volume, and validate identity, boot, networking, and access on a clean clone.

---

CloudStack's standard private-template workflow is simple: customize a VM, stop it, and convert its volume into a template. The difficult part is making the disk safe to clone. A running root filesystem may be inconsistent, and a fully configured server may contain unique machine identity, SSH host keys, cloud-init state, logs, credentials, or application data that must not appear in every future VM.

Build templates from a dedicated image-builder VM, not a production server. Keep the resulting template private until a fresh deployment passes security and lifecycle tests.

## Decide What the Template Should Contain

Write down the intended OS type, CPU architecture, firmware/boot mode, partition layout, guest agents, package baseline, and CloudStack features:

- `passwordenabled` is true only if the image includes and enables the CloudStack password reset integration.
- `sshkeyenabled` is true only if the image consumes injected SSH keys correctly.
- `isdynamicallyscalable` must reflect actual guest tooling and hypervisor support.
- `requireshvm`, architecture, and OS type must match the image.

Incorrect flags do not add capabilities; they tell users and CloudStack to expect capabilities the guest may not have.

Record the source before generalizing it:

```bash
cmk list virtualmachines id=SOURCE_VM_UUID
cmk list volumes virtualmachineid=SOURCE_VM_UUID type=ROOT
cmk list ostypes
```

## Prepare the Builder Guest

Inside the VM, fully patch it and validate boot-critical services. Remove only data that should be regenerated. The precise commands are distribution- and application-specific, but a cloud-init image commonly uses:

```bash
sudo cloud-init status --long
sudo cloud-init clean --logs --machine-id
sudo sync
```

`cloud-init clean` makes the next boot look like first boot and can regenerate machine identity when the datasource and distribution are configured for it. Test this behavior before publishing. Do not run it on a production VM you expect to continue using without understanding the consequences.

Review, rather than blindly delete:

- SSH host-key regeneration policy;
- `/etc/machine-id` and DHCP client identity;
- cloud-init instance data and datasource cache;
- persistent network rules tied to a MAC address;
- shell history, logs, crash dumps, and temporary files;
- application secrets, API tokens, private keys, and data;
- user accounts and authorized keys; and
- filesystem trim behavior for sparse images.

Create an application-consistent backup of anything valuable before cleanup. If a database or application must be baked in, stop it cleanly and document first-boot initialization.

## Stop the VM Through CloudStack

CloudStack's `createTemplate` API requires a VM to be stopped when creating from its volume. CloudMonkey waits for asynchronous jobs by default; disable that behavior for the manual polling examples below. Shut the guest down through CloudStack and wait for `Stopped`:

```bash
cmk set asyncblock false
cmk stop virtualmachine id=SOURCE_VM_UUID
cmk query asyncjobresult jobid=STOP_JOB_UUID
cmk list virtualmachines id=SOURCE_VM_UUID
cmk list volumes virtualmachineid=SOURCE_VM_UUID type=ROOT
```

Do not pause the VM or power it off with `virsh`; CloudStack must observe the lifecycle transition. Verify the root volume is `Ready` and note its UUID.

## Create the Private Template

Use explicit metadata and the root volume UUID:

```bash
cmk help create template
cmk create template \
  name=linux-base-2026-09 \
  displaytext='Linux base 2026-09' \
  ostypeid=OS_TYPE_UUID \
  volumeid=ROOT_VOLUME_UUID \
  bits=64 \
  arch=x86_64 \
  ispublic=false \
  isfeatured=false \
  passwordenabled=false \
  sshkeyenabled=true \
  requireshvm=true
```

Confirm supported parameters with the local 4.23 API help. `createTemplate` is asynchronous. Poll the returned job and then the template record:

```bash
cmk query asyncjobresult jobid=TEMPLATE_JOB_UUID
cmk list templates id=TEMPLATE_UUID templatefilter=self
```

Wait for `isready=true` and inspect status, format, physical/virtual size, architecture, hypervisor, zone, and download details. Template creation copies data to secondary storage; ensure the SSVM and image store have adequate space before starting.

A snapshot-based path is useful when preserving a stopped source volume, and the API accepts either `snapshotid` or `volumeid`. Do not provide both. A snapshot is still not a substitute for in-guest application quiescence.

## Deploy a Clean Validation VM

Do not restart the source first. Deploy a new VM from the template with a small supported offering and a test network:

```bash
cmk deploy virtualmachine \
  zoneid=ZONE_UUID \
  serviceofferingid=OFFERING_UUID \
  templateid=TEMPLATE_UUID \
  networkids=TEST_NETWORK_UUID \
  keypair=VALIDATION_KEYPAIR \
  name=template-validation-01
cmk query asyncjobresult jobid=DEPLOY_JOB_UUID
```

Validate from the console and network:

```bash
cat /etc/machine-id
ip -br address
ip route
cloud-init status --long
systemctl --failed
ss -ltnp
```

Compare the clone and builder. Machine ID, instance ID, and SSH host keys must be unique per VM; MAC and IP addresses must not collide within their network scope. Verify that injected credentials match the deployment request and that no builder secrets remain. An injected SSH public key may intentionally be reused across VMs. Verify package repositories, time sync, DNS, graceful shutdown/reboot, console, and SSH-key injection. Search the clone for builder-specific hostnames, IPs, secrets, and application data.

Deploy a second clone to catch identity collisions. If migration and HA matter, migrate a disposable clone between compatible hosts and reboot it.

## Publish in Stages

Leave the template private while testing. Apply CloudStack template permissions only after review, and share with specific accounts in your own domain or projects you belong to rather than enabling public visibility when possible. Project-owned templates cannot be shared outside their project. Preserve a versioned name and immutable build record with source package versions, builder commit, test results, and digest.

Do not overwrite a widely used template in place. Publish a new version, deploy canaries, and deprecate the old version after workloads migrate.

## Roll Back Safely

If validation fails, keep the source VM stopped until evidence is collected. Delete the disposable clones through CloudStack. Delete the candidate template through CloudStack only after confirming no VM or derivative depends on it; never remove its backing secondary-storage files manually.

If guest cleanup removed something required, restore the builder from its pre-generalization backup or rebuild it. Restarting the original source after `cloud-init clean` may itself invoke first-boot behavior, so treat that as a planned recovery, not a harmless undo.

## Conclusion

Template creation is both a storage operation and an identity-security process. Generalize a dedicated builder, stop it through CloudStack, create a private template from the `Ready` root volume, and deploy at least two clean clones. Publish only after unique identity, access injection, networking, boot, and lifecycle behavior all pass.

## Official Documentation

- [Apache CloudStack: Working with Templates](https://docs.cloudstack.apache.org/en/latest/adminguide/templates.html)
- [Apache CloudStack: createTemplate API](https://cloudstack.apache.org/api/apidocs-4.23/apis/createTemplate.html)
- [Apache CloudStack: Storage Overview](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html)
- [cloud-init: clean Command](https://docs.cloud-init.io/en/latest/reference/cli.html#clean)
- [cloud-init: First Boot Determination](https://docs.cloud-init.io/en/latest/explanation/first_boot.html)
