# How to Stop a Cloned Photon OS VM from Reusing Its DHCP Identity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Networking, VMware

Description: Prevent cloned Photon OS VMs from sharing DHCP identity by preparing machine-id correctly and checking explicit network identifiers.

---

Two cloned VMs can have different virtual MAC addresses yet send the same DHCP identity. Photon documents that its machine ID participates in generating the DHCP unique identifier, so copying a fully initialized disk can copy more network identity than expected. The fix belongs in template preparation, followed by verification on independently booted clones.

## Confirm an identity collision

From each VM's console, collect:

```bash
cat /etc/machine-id
ip -br link
ip -br address
networkctl status eth0
```

Compare the MAC addresses with vSphere's adapter settings and compare the machine IDs between guests. Ask the DHCP administrator to inspect the client identifier or DUID attached to each lease, not merely the hostname shown in a lease-management screen.

A shared IP address alone does not prove a machine-ID problem. Static addresses copied into the template, a reservation bound to the wrong identifier, or duplicate manually assigned MAC addresses can produce similar symptoms. Preserve the current network files before changing them.

Check for explicitly configured identifiers:

```bash
grep -R -E 'DUID|IAID|ClientIdentifier|Address=' \
  /etc/systemd/network /etc/systemd/networkd.conf \
  /etc/systemd/networkd.conf.d 2>/dev/null
```

Some listed paths may not exist. An explicit `DUIDRawData` or equivalent override can keep clones identical even after machine IDs differ. Also inspect configuration delivered by cloud-init or another template-customization process.

## Prepare the powered-off template

Photon's [cloning guidance](https://vmware.github.io/photon/docs-v5/administration-guide/managing-network-configuration/clearing-the-machine-id-of-a-cloned-instance-for-dhcp/) recommends clearing `/etc/machine-id` so the next boot generates a new value. Perform this only as the final identity-preparation step on a template that will immediately shut down:

```bash
# Run as root in the source template before its final shutdown.
: > /etc/machine-id
poweroff
```

The empty file matters. Do not replace it with a literal string such as `null`, a newline containing an old identifier, or a hard-coded value shared by every clone.

Before this final step, inspect `/var/lib/dbus/machine-id`. The [systemd machine-id documentation](https://www.freedesktop.org/software/systemd/man/latest/machine-id.html) describes other sources systemd can use when initializing identity. If the D-Bus path is a separate regular file containing the old ID, it can undermine your preparation. In a template designed for systemd, make it reference the intended `/etc/machine-id` or clear the stale regular-file content according to your image policy. Do not delete unrelated D-Bus state.

Do not boot the prepared template again before cloning it. Booting initializes identity again, so subsequent clones would inherit the newly populated value. If you must patch or inspect the template later, repeat the final preparation and shutdown sequence afterward.

## Treat cloud-init identity separately

The machine ID and cloud-init's instance ID serve different purposes. Clearing one does not guarantee that the other will rerun its per-instance modules. A NoCloud seed, for example, must use a unique instance ID for each new VM. Cloud-init's [NoCloud reference](https://docs.cloud-init.io/en/24.2/reference/datasources/nocloud.html) explains how metadata identifies the instance.

If your template uses cloud-init, complete its supported cleanup process before shutdown and supply fresh instance metadata during cloning. Review the installed `cloud-init clean --help` before choosing cleanup flags; options vary between packaged versions. Avoid repeatedly cleaning production VMs, because provisioning modules can have effects beyond networking.

Also include host SSH keys in the template's identity policy. Machine-ID cleanup alone does not regenerate those keys. Use your provisioning mechanism to generate them per instance and verify their fingerprints through a trusted channel.

## Repair an existing clone safely

For an already deployed clone, schedule a reboot, preserve console access, and first remove any deliberately copied static identifier from the configuration owner. Apply the same machine-ID preparation to the affected clone and reboot it. Expect monitoring, DHCP reservations, and software that keys off machine identity to notice the change.

After startup, verify that its new machine ID differs from the source and other clones. Check the DHCP server's lease entry and the client's route and resolver state. If an old lease remains visible, distinguish stale server bookkeeping from an active collision before deleting reservations.

Finally create two fresh test clones from the prepared template and boot them independently. Unique MAC addresses, distinct machine IDs, distinct DHCP client identities, and correct leases provide a reproducible acceptance test for the template pipeline.
