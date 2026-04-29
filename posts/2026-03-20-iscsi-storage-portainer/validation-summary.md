# Validation Summary: How to Set Up iSCSI Storage with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- iSCSI
- `targetcli-fb`
- `open-iscsi` (`iscsiadm`, `iscsid`)
- Docker volumes and bind mounts
- Docker Compose / Portainer stacks
- PostgreSQL container image
- Linux `ext4`

## Sources Consulted
- `targetcli(8)` man page: https://manpages.debian.org/experimental/targetcli/targetcli.8.en.html
- Red Hat documentation, configuring an iSCSI target: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_storage_devices/configuring-an-iscsi-target
- `iscsiadm(8)` man page: https://manpages.debian.org/experimental/open-iscsi/iscsiadm.8.en.html
- Open-iSCSI upstream documentation: https://github.com/open-iscsi/open-iscsi
- Docker Compose secrets documentation: https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Compose service reference: https://docs.docker.com/reference/compose-file/services/
- Docker `volume create` reference: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Docker Compose application model: https://docs.docker.com/compose/intro/compose-application-model/
- Portainer stack deployment documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer stack migration documentation: https://docs.portainer.io/user/docker/stacks/migrate
- Linux kernel ext4 multiple-mount protection documentation: https://docs.kernel.org/filesystems/ext4/mmp.html

## Issues Found

1. **Backing-file path was incomplete**: The post created a file-backed LUN at `/var/lib/iscsi-store/portainer.img` without first creating `/var/lib/iscsi-store`. Added `sudo mkdir -p /var/lib/iscsi-store` so the `fileio create` command works as written.

2. **Initiator IQN change might not be applied**: The post overwrote `/etc/iscsi/initiatorname.iscsi` and then ran `systemctl enable --now iscsid`. Because `iscsid` reads the initiator name at startup, this does not reliably reload an already running daemon. Changed the command to `systemctl restart iscsid` so the new IQN is actually used.

3. **Boot-time reconnect was missing**: The post added an `_netdev` `fstab` entry but did not configure the discovered iSCSI node for automatic login on reboot. Added `iscsiadm ... --op update -n node.startup -v automatic` so the session is restored at startup.

4. **Compose secret was defined but never mounted into the service**: The example used `POSTGRES_PASSWORD_FILE=/run/secrets/db_password` but omitted `secrets:` under the `postgres` service. Added `secrets: - db_password` so the file exists inside the container.

5. **Named-volume wording overstated portability**: A local Docker volume created with `type=none,o=bind,device=/mnt/iscsi-portainer/myapp` still depends on a specific host path. Reworded “For a more portable configuration” to “For a cleaner stack definition”.

6. **Bind-backed named volume example omitted the source directory**: Added `sudo mkdir -p /mnt/iscsi-portainer/myapp` before `docker volume create` so the bind-backed volume has a real host path to mount.

7. **Multi-host wording was too broad**: The intro and summary implied the same ext4-formatted iSCSI disk could simply appear as a local disk on each Docker host and be used in any Portainer stack. Adjusted the wording to reflect the single-host mount model used by the post and to avoid implying safe multi-host read/write use of the same ext4 filesystem.

8. **Performance claim was too absolute**: “Near-local disk I/O performance” was softened to note that performance depends on the network and storage backend.

## Review Notes
- The `iscsiadm -m discovery -t sendtargets -p ...` command remains valid, but current upstream examples more commonly show `discoverydb --discover`.
- The post uses an `ext4` filesystem on the iSCSI LUN. That is appropriate for a single host, but not for sharing the same filesystem read/write across multiple hosts without a cluster-aware filesystem.
- Red Hat’s current `targetcli` guidance recommends `write_back=false` for `fileio` backstores to reduce data-loss risk. The blog’s command is valid as written, but that tuning may be worth mentioning in a future revision.
