# How to Automate Photon OS Security Patching with tdnf-automatic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Security, Package Management

Description: Configure tdnf-automatic security updates on Photon OS with a notification trial, controlled timers, and verifiable patch outcomes.

---

Photon OS includes `tdnf-automatic` for scheduled package maintenance. It can report available updates or install them through systemd timers. Reliable security patching requires more than enabling a timer: the repositories must provide usable advisory metadata, the schedule must match your maintenance policy, and someone must verify the result.

This procedure targets a standalone RPM-managed Photon host. Run these commands from a root shell; even `tdnf-automatic --notify` requires root. An OSTree installation or a product appliance may use a different update lifecycle.

## Inspect what the package actually installs

Start with the installed software and units:

```bash
rpm -q tdnf tdnf-automatic
command -v tdnf-automatic
systemctl list-unit-files 'tdnf-automatic*'
```

If missing, query and install the `tdnf-automatic` package from your matching Photon repositories. Inspect the packaged configuration before editing it:

```bash
cat /etc/tdnf/automatic.conf
systemctl cat tdnf-automatic.timer
systemctl cat tdnf-automatic.service
```

The [Photon automatic-update documentation](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/tdnf-automatic/) describes the generic timer and its notification-only and installation variants. The variants can override configuration behavior, so identify every enabled timer before choosing one.

## Begin with security reporting

Back up `/etc/tdnf/automatic.conf`. Merge the following settings into the existing sections; preserve any other required local configuration:

```ini
[commands]
upgrade_type = security
random_sleep = 0
network_online_timeout = 300
show_updates = yes
apply_updates = no

[emitter]
emit_to_stdio = yes
```

The section name is `emitter`, as shown in the [upstream configuration file](https://github.com/vmware/tdnf/blob/dev/etc/tdnf/automatic.conf). Avoid importing a `dnf-automatic` example wholesale, because similarly named tools do not necessarily accept the same options.

`upgrade_type=security` selects updates associated with security advisories for installation. The notification report uses `tdnf updateinfo info` without a security filter, so it can include other advisory types. It cannot identify every vulnerable package independently of repository metadata. An internal mirror that contains RPMs but omits advisory metadata may report no security updates even when newer packages exist.

Test notification behavior manually:

```bash
tdnf-automatic --notify
```

Compare the result with the updates and advisories expected for the approved repository snapshot. Establish that DNS, TLS, package signatures, and metadata access work before enabling unattended installation.

## Set a deliberate schedule

Use the generic timer so `show_updates` and `apply_updates` control reporting and installation. Inspect its current schedule and create a drop-in with `systemctl edit tdnf-automatic.timer`:

```ini
[Timer]
OnCalendar=
OnCalendar=Sun *-*-* 03:00:00
RandomizedDelaySec=15m
Persistent=false
```

The empty assignment clears an inherited calendar expression before setting the new one. This example uses the host's configured timezone and a random delay of up to fifteen minutes, plus the timer's `AccuracySec` tolerance (one minute by default). `Persistent=false` deliberately avoids catching up a missed maintenance window immediately after boot; your monitoring must therefore detect missed runs.

Systemd's [timer reference](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html) explains these scheduling behaviors. If your policy favors prompt catch-up instead, retain persistence and accept that installation might run outside the usual window.

Reload and enable the timer:

```bash
systemctl daemon-reload
systemctl enable --now tdnf-automatic.timer
systemctl list-timers --all 'tdnf-automatic*'
```

Stop and disable other automatic-update timers you previously enabled with `systemctl disable --now` followed by their unit names so that the notification-only or always-install variants do not compete with this policy. Disabling alone does not stop an active timer. Keep a single owner for scheduled package transactions.

## Promote one canary to installation

After reviewing successful reports, set both `show_updates=no` and `apply_updates=yes` on a disposable or low-risk canary. The [upstream implementation](https://github.com/vmware/tdnf/blob/dev/bin/tdnf-automatic.in) keeps the generic service in notification mode when `show_updates=yes`, even if `apply_updates=yes`. Run the associated service during an approved window:

```bash
systemctl start tdnf-automatic.service
systemctl status tdnf-automatic.service --no-pager
journalctl -u tdnf-automatic.service --since today
```

A oneshot service may be inactive after successful completion; inspect its result and logs instead of interpreting inactivity as failure. Record the changed RPM versions and test the application, network, and storage paths that depend on them.

Automatic package installation does not establish a safe reboot policy. Kernel fixes can require rebooting into the updated kernel, and running processes can retain old libraries. Coordinate restarts separately, especially on container hosts or systems without redundant capacity.

## Monitor the outcome

Alert on failed units, repository errors, missed successful runs, and excessive age since the last accepted patch cycle. A timer listed as active says only that scheduling is enabled. It does not prove that security updates were downloaded, installed, or activated.

Expand deployment in batches after the canary passes. Preserve the previous tested image and application recovery procedure. The useful operational record is the repository snapshot, installed versions, service health, and reboot status for each host.
