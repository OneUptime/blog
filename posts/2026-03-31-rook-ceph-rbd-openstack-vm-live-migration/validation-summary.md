# Validation Summary: How to Set Up Ceph RBD for OpenStack VM Live Migration

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- OpenStack Nova (compute service)
- libvirt / libvirtd
- QEMU live migration
- firewall-cmd (firewalld)
- OpenStack CLI (openstackclient)

## Sources Consulted
- OpenStack Nova documentation: Configure live migrations — https://docs.openstack.org/nova/latest/admin/configuring-migrations.html
- OpenStack Nova documentation: Secure live migration with QEMU-native TLS — https://docs.openstack.org/nova/latest/admin/secure-live-migration-with-qemu-native-tls.html
- OpenStack Nova documentation: Live-migrate instances — https://docs.openstack.org/nova/latest/admin/live-migration-usage.html
- Nova Newton release notes (removal of live_migration_flag) — https://docs.openstack.org/releasenotes/nova/newton.html
- Nova Stein release notes (removal of live_migration_progress_timeout) — https://docs.openstack.org/releasenotes/nova/stein.html
- Nova configuration reference — https://docs.openstack.org/nova/latest/configuration/config.html
- libvirt daemon documentation — https://libvirt.org/daemons.html
- libvirt remote support documentation — https://libvirt.org/remote.html
- RHEL 9 virtualization considerations — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_virtualization_considerations-in-adopting-rhel-9

## Issues Found

### 1. Deprecated `live_migration_flag` config option (Step 1)
**What was wrong:** The post used `live_migration_flag = "VIR_MIGRATE_UNDEFINE_SOURCE,VIR_MIGRATE_PEER2PEER,VIR_MIGRATE_LIVE,VIR_MIGRATE_PERSIST_DEST,VIR_MIGRATE_TUNNELLED"` which was deprecated in Mitaka (2016) and removed in Newton (2016). This option does not exist in any modern OpenStack release.
**What was changed:** Replaced with the modern equivalents: `live_migration_scheme = tcp` and `live_migration_tunnelled = false`. Nova now handles the individual migration flags (PEER2PEER, UNDEFINE_SOURCE, PERSIST_DEST, LIVE) internally.

### 2. Deprecated `live_migration_progress_timeout` config option (Step 1)
**What was wrong:** `live_migration_progress_timeout` was deprecated in Ocata (2017) and removed in Stein (2019). The progress-based timeout detection was found to be unreliable.
**What was changed:** Replaced with `live_migration_timeout_action = abort`, which is the modern equivalent that controls what Nova does when `live_migration_completion_timeout` is reached.

### 3. Tunnelled/non-tunnelled migration inconsistency (Step 1 vs Steps 2-3)
**What was wrong:** The original `live_migration_flag` included `VIR_MIGRATE_TUNNELLED`, which tunnels migration data through libvirtd. But Steps 2-3 configure a non-tunnelled TCP setup (opening QEMU direct migration ports 49152-49261). These approaches are contradictory — tunnelled migration does not use QEMU direct ports.
**What was changed:** Fixed by setting `live_migration_tunnelled = false`, which is consistent with the TCP libvirtd setup and QEMU port opening in subsequent steps.

### 4. Deprecated libvirtd `--listen` flag and `listen_tcp` settings (Step 2)
**What was wrong:** The post used `listen_tcp = 1`, `listen_tls = 0` in libvirtd.conf and `LIBVIRTD_ARGS="--listen"`. Since libvirt 5.6+ (2019), libvirt uses systemd socket activation and the `--listen` flag is forbidden by default when socket units are active. The `listen_tcp`/`listen_tls` directives in libvirtd.conf are not honored under socket activation.
**What was changed:** Replaced with `systemctl enable --now libvirtd-tcp.socket` which is the modern socket activation approach. The `auth_tcp` setting in libvirtd.conf was kept as it is still used for authentication configuration.

### 5. Incorrect migration abort command (Troubleshooting)
**What was wrong:** `openstack server migrate --abort my-instance` is not a valid command. There is no `--abort` flag on `openstack server migrate`.
**What was changed:** Replaced with the correct two-step process: `openstack server migration list my-instance` to get the migration ID, then `openstack server migration abort my-instance <migration-id>` to abort it.

### 6. Summary text referenced removed config option
**What was wrong:** The summary mentioned "the correct nova.conf live_migration_flag settings" which referenced the removed option.
**What was changed:** Updated to "the correct nova.conf live migration settings".

## Review Notes
- The `auth_tcp = "none"` setting disables authentication for TCP connections, which is insecure for production environments. The OpenStack documentation recommends using SASL authentication (`auth_tcp = "sasl"`) or, preferably, native TLS migration via `live_migration_with_native_tls = true` with `live_migration_scheme = tls`. This is not an error per se (it works for testing/lab environments), but production deployments should use TLS.
- Modern libvirt deployments on RHEL 9+ and Fedora 35+ default to modular daemons (`virtqemud`, `virtproxyd`) instead of the monolithic `libvirtd`. The monolithic daemon is still supported but the modular architecture is the recommended path forward. For modular daemons, the equivalent socket would be `virtproxyd-tcp.socket`.
- The QEMU migration port range 49152-49261 (110 ports) is wider than the typical default of 49152-49215 (64 ports). This is not harmful but opens more ports than usually necessary.
