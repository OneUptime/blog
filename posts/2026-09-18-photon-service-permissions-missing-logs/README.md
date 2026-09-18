# How to Diagnose File Permission and Missing Log Problems in Photon OS Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Troubleshooting, System Administration

Description: Diagnose Photon service permission failures and missing logs by checking effective systemd identity, directory access, sandboxing, and journal persistence.

---

A service that works in a root shell can fail under systemd because it runs with another identity, working directory, umask, or filesystem sandbox. Missing log files can compound the confusion: the application may be writing to the journal, unable to create its file, or using a relative path somewhere unexpected.

Start with the service's actual execution environment, not a broad `chmod` change.

## Read the effective unit and current failure

For an example service named `myapp`, collect:

```bash
systemctl status myapp --no-pager
systemctl cat myapp
systemctl show myapp -p User -p Group -p WorkingDirectory \
  -p UMask -p StandardOutput -p StandardError
journalctl -b -u myapp --no-pager
```

`systemctl cat` shows the main unit and drop-ins. Check whether the application runs as an explicit user, a dynamic user, or root. Compare its executable path and arguments with the command you tested interactively.

Photon's [service troubleshooting guidance](https://vmware.github.io/photon/docs-v5/troubleshooting-guide/kernel-problems-and-boot-and-login-errors/investigating-unexpected-behavior/) recommends service status and journal inspection as starting points. Capture the first meaningful error, since repeated restart failures can bury it under subsequent noise.

## Check the entire path

For a configuration file such as `/etc/myapp/config.yaml`, the service needs access through every parent directory as well as permission on the file itself:

```bash
ls -ld /etc /etc/myapp
ls -l /etc/myapp/config.yaml
id myapp
```

If installed, `namei -l /etc/myapp/config.yaml` makes parent-directory permissions easier to inspect. Check ACLs with `getfacl` where ACLs are used. A readable file inside an inaccessible directory is still inaccessible.

Inspect bind mounts, symlinks, and the ownership of mounted storage. A directory that was correctly owned in the root filesystem may be hidden after a different filesystem mounts over it.

Photon documents restrictive defaults in its [permissions and umask guide](https://vmware.github.io/photon/docs-v5/administration-guide/security-policy/default-permissions-and-umask/). However, a shell's umask is not proof of the service's umask. Read the effective systemd property and application behavior instead of changing global defaults to solve one service failure.

## Make the narrow ownership correction

Suppose `myapp` runs as user and group `myapp`, needs read-only configuration, and writes state under `/var/lib/myapp`. A possible deliberate layout is:

```bash
chown root:myapp /etc/myapp
chmod 0750 /etc/myapp
chown root:myapp /etc/myapp/config.yaml
chmod 0640 /etc/myapp/config.yaml
```

Apply this only after confirming the required identity and access policy. Do not recursively grant write access to executable or configuration trees merely because the application needs a writable state directory.

For a custom service, systemd can create a correctly owned state directory. Merge an appropriate drop-in using `systemctl edit myapp`:

```ini
[Service]
StateDirectory=myapp
StateDirectoryMode=0750
UMask=0027
StandardOutput=journal
StandardError=journal
```

These settings are documented in the upstream [systemd execution manual](https://github.com/systemd/systemd/blob/v252/man/systemd.exec.xml). They do not change the application's configured data path automatically; configure it to use `/var/lib/myapp`.

Review existing sandbox settings such as `ProtectSystem`, `ReadWritePaths`, `PrivateTmp`, and `RootDirectory`. Ordinary filesystem permissions can be correct while the service's private view still blocks access. Preserve the intended sandbox and authorize only the necessary paths.

## Find where logs actually go

Inspect the application's logging configuration and the unit's standard-output settings. If it writes to stdout/stderr with journal output enabled, absence of `/var/log/myapp.log` is normal.

Check the current and previous boots:

```bash
journalctl -u myapp -b
journalctl --list-boots
journalctl -u myapp -b -1
journalctl --disk-usage
```

If the previous boot is unavailable, inspect journald storage and retention settings. The [journald configuration manual](https://github.com/systemd/systemd/blob/v252/man/journald.conf.xml) distinguishes volatile from persistent storage. Persistent storage must be configured and available; it cannot recover logs already lost from a prior volatile boot.

For file logging, check the configured absolute path, available blocks and inodes, rotation ownership, and whether the application still holds an old file open after rotation. Avoid creating an empty file as root and assuming the service can then write it.

## Validate the repair

Reload systemd after unit changes, restart during the allowed maintenance window, and trigger one real application operation. Verify both the expected result and its log event. Confirm sensitive configuration remains protected from unrelated users.

Then repeat after reboot or log rotation, whichever originally triggered the problem. Record the effective identity, writable paths, and logging destination in the deployment configuration so the correction survives package upgrades and host rebuilds.
