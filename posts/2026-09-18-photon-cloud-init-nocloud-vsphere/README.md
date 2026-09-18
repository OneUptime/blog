# How to Configure Photon OS with cloud-init and a NoCloud Seed ISO on vSphere

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Cloud-init, VMware

Description: Provision Photon OS on vSphere with cloud-init NoCloud metadata, a seed ISO, SSH keys, and first-boot verification.

---

A NoCloud seed ISO supplies first-boot configuration without a metadata web service. It works well for a small vSphere deployment or a repeatable lab, provided that the guest already has cloud-init and that its datasource policy permits NoCloud. Attaching an ISO to a guest without those prerequisites will not configure it.

## Prepare a cloud-init-capable image

Photon documents NoCloud seed media in its [cloud-init overview](https://vmware.github.io/photon/docs-v5/administration-guide/cloud-init-on-photon-os/cloud-init-overview/). On the source VM, verify the package and installed services:

```bash
rpm -q cloud-init
cloud-init --version
systemctl list-unit-files 'cloud*'
```

If necessary, install `cloud-init` from the matching Photon repositories. Inspect `/etc/cloud/cloud.cfg` and its drop-in directory for datasource restrictions or disabled modules. Confirm the image's packaged services are enabled as intended; do not assume every custom minimal ISO or OVA has identical initialization settings.

This example leaves address assignment to the template's existing DHCP configuration. That avoids combining a user-provisioning test with a separate network-renderer change. Once the base flow works, add networking using the format supported by the installed Photon/cloud-init combination.

## Create per-VM metadata

On an administrative workstation with `genisoimage`, create an empty working directory and write `meta-data`:

```yaml
instance-id: photon-app-01-20260918
local-hostname: photon-app-01
```

Choose an instance ID unique to this deployment. It is not a reusable label for every clone. NoCloud uses instance metadata to decide whether initialization belongs to a new instance, as described in the [upstream datasource documentation](https://docs.cloud-init.io/en/24.2/reference/datasources/nocloud.html).

Create a separate file called `user-data`:

```yaml
#cloud-config
hostname: photon-app-01
manage_etc_hosts: true
users:
  - name: appoperator
    lock_passwd: true
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-ed25519 REPLACE_WITH_YOUR_PUBLIC_KEY appoperator
write_files:
  - path: /etc/provisioning-source
    owner: root:root
    permissions: '0644'
    content: |
      Provisioned with the app-01 NoCloud seed.
```

Replace the key with a complete public key before building the ISO. This account has key-based access and no administrative privileges assigned by this configuration. Configure privilege escalation separately if the operator needs it, using your established administration policy.

The marker file makes the test observable without installing packages or running application deployments. The [cloud-init module reference](https://docs.cloud-init.io/en/latest/reference/modules.html) documents user and file configuration. Quote permission values so YAML parsing does not reinterpret them unexpectedly.

## Build and attach the ISO

Run this from the directory containing both files:

```bash
genisoimage -output seed.iso -volid cidata \
  -joliet -rock user-data meta-data
```

The volume label identifies NoCloud media; filenames must remain exactly `user-data` and `meta-data`. The content is ordinary readable data, so keep secrets out of it. A public SSH key is appropriate; a private key or reusable administrator password is not.

Upload `seed.iso` to an approved datastore. Attach it to the VM's virtual CD/DVD device and enable connection at power-on. If the OS installer ISO is still connected, replace it after installation completes. Boot the guest with the seed available at the start of initialization.

For a cloned template, clean the template's prior cloud-init state using the installed version's supported cleanup procedure before its final shutdown. A template that already considers itself initialized may otherwise skip per-instance modules.

## Verify the datasource and result

At the guest console, check:

```bash
cloud-init status --long
hostnamectl
id appoperator
cat /etc/provisioning-source
journalctl -b -u cloud-init-local -u cloud-init -u cloud-config -u cloud-final
```

Inspect `/var/log/cloud-init.log` and `/var/log/cloud-init-output.log` when a module fails. Confirm the logs identify NoCloud and the intended instance ID, then test SSH from the actual management network. A finished cloud-init run does not prove the supplied public key was correct or that the firewall permits SSH.

If the marker is missing, verify media connection, volume label, YAML syntax, datasource selection, and previous instance state in that order. Replacing user-data while preserving an already processed instance ID does not guarantee modules will rerun. Test changes on a fresh disposable clone with a fresh instance ID.

Once provisioning is accepted, disconnect the seed if your lifecycle policy permits it and secure or remove the datastore copy. Retain the reviewed source configuration in version control, with private material managed separately, so the next VM is reproducible.
