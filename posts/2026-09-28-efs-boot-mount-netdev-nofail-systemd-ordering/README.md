# EFS Fails to Mount at Boot: Fix _netdev, nofail, and systemd Ordering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, Linux

Description: Fix EFS boot-time mounts by comparing manual and fstab options, ordering network readiness, and making application services require the mount.

When EFS mounts after login but fails during startup, compare the two execution environments. At boot the network may still be configuring, credentials may not be available through the same source, and the application can start before the mount is ready. A longer application retry loop can hide these ordering errors without fixing them.

This guide assumes a Linux EC2 instance using systemd and the EFS mount helper. Adapt unit names to the distribution's network manager and your application service.

## Make fstab match the known-good mount

Start with a successful manual command and preserve its filesystem ID, access point, TLS, and IAM choices in `/etc/fstab`:

```fstab
fs-0123456789abcdef0:/ /mnt/efs efs _netdev,nofail,tls,iam,accesspoint=fsap-0123456789abcdef0 0 0
```

Create `/mnt/efs` before testing. Keep the entry on one line and install `amazon-efs-utils` before the boot that needs it. AWS supports automatic mounting through the helper and documents `_netdev` for network-dependent filesystems. [Automatic EFS mounts](https://docs.aws.amazon.com/efs/latest/ug/mount-fs-auto-mount-onreboot.html)

`_netdev` identifies the mount as network-dependent and orders it after `network-online.target`. `nofail` makes the mount wanted rather than required by `remote-fs.target` and removes its ordering before that target, allowing boot to continue without waiting for the mount or requiring it to succeed. `nofail` is useful only if services that need EFS also handle the missing mount correctly. [systemd mount options](https://raw.githubusercontent.com/systemd/systemd/main/man/systemd.mount.xml)

## Test the fstab entry without rebooting first

On a maintenance instance, with application processes stopped and the path unmounted:

```bash
sudo systemctl daemon-reload
sudo mount /mnt/efs
findmnt --mountpoint /mnt/efs
```

Invoking `mount` with the target path makes it read the fstab entry. This catches an important class of mistake: the manually typed command succeeds while a different fstab option fails.

Do not blindly run `mount -a` on a shared machine; it attempts other configured mounts as well. Test the specific target and inspect helper output if it fails. If the known-good command depended on an interactive AWS profile, establish an appropriate boot-time credential source, such as the EC2 role, instead.

## Read the generated mount unit's timeline

For `/mnt/efs`, the systemd mount unit is `mnt-efs.mount`:

```bash
systemctl status mnt-efs.mount
systemctl show mnt-efs.mount -p After -p Wants -p Requires
journalctl -b -u mnt-efs.mount
systemd-analyze critical-chain mnt-efs.mount
```

Use `systemd-escape --path --suffix=mount /your/path` for a different mount path. Read the journal around the first failure, including network-manager messages and `/var/log/amazon/efs/mount.log`. A subsequent manual success does not erase an earlier DNS or credential error.

`network.target` is not proof that an interface has an address or DNS works. `network-online.target` coordinates startup readiness with the network manager's wait-online service. It is also a startup synchronization point, not continuous monitoring of later network health. [systemd network synchronization](https://systemd.io/NETWORK_ONLINE/)

Check whether your active stack uses `NetworkManager-wait-online.service` or `systemd-networkd-wait-online.service`, and whether its configuration waits for the needed interface. Enable or adjust the matching mechanism rather than installing a second network manager. Network-online readiness still cannot guarantee that an EFS security group or remote route is correct.

## Make the application require its data mount

If an application writes to `/mnt/efs` before EFS appears, it can create files on the instance's local disk. Those files become hidden after the mount succeeds. Prevent this by giving the service an explicit dependency:

```ini
# sudo systemctl edit reporting-app.service
[Unit]
RequiresMountsFor=/mnt/efs

[Service]
ExecStartPre=/usr/bin/mountpoint -q /mnt/efs
```

Confirm the location of `mountpoint` on your distribution. `RequiresMountsFor` adds required mount dependencies and ordering for the path. The explicit precheck makes a missing mount fail service startup visibly. [systemd unit dependencies](https://raw.githubusercontent.com/systemd/systemd/main/man/systemd.unit.xml)

This permits the host to boot with `nofail` while keeping the dependent application from running without its storage. Configure service retries or operational recovery according to your availability requirements; a dependency failure does not automatically invent an application restart policy.

## Investigate multiple-mount races only with matching evidence

AWS documents a sequential-mount workaround for certain systems where several EFS fstab entries fail with an NFS server-trunking error. Apply that workaround when the logs match the documented symptom. A generic extra boot service can obscure simpler DNS, policy, or option errors. [EFS startup troubleshooting](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html)

Finally, reboot a maintenance instance and verify the mount exists before the application becomes ready. In a controlled failure test, make EFS unavailable and confirm the host's chosen boot behavior and the application's refusal to write locally. Both the healthy and unavailable cases belong in the acceptance criteria.
