# Validation Summary: How to Create NFS Volumes in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker volumes
- Docker Compose
- NFS
- Linux NFS client/server tooling

## Sources Consulted
- Portainer Docs: https://docs.portainer.io/user/docker/volumes/add
- Docker Docs, `docker volume create`: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Docs, Volumes: https://docs.docker.com/engine/storage/volumes/
- Docker Docs, Compose file `volumes`: https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs, Compose file `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Ubuntu Server documentation, NFS: https://documentation.ubuntu.com/server/how-to/networking/install-nfs/
- Red Hat documentation, configuring and using NFS: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_using_network_file_services/deploying-an-nfs-server
- Linux `nfs(5)` manual page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux `showmount(8)` manual page: https://man7.org/linux/man-pages/man8/showmount.8.html
- Linux `mountd(8)` manual page: https://man7.org/linux/man-pages/man8/mountd.8.html

## Issues Found
- The Portainer walkthrough described adding raw Docker driver options in the UI. Current Portainer documentation uses the dedicated `Use NFS volume` toggle and `NFS Settings` fields, so the instructions were updated to match the current workflow.
- The Compose example used the top-level `version: "3.8"` field. Docker now treats the top-level `version` element as obsolete, so it was removed to avoid a warning and keep the example current.
- The manual mount examples mounted `/mnt/test` without creating it first. `mkdir -p /mnt/test` was added before the test mounts so the commands work as written.
- The CentOS/RHEL package installation example used `yum`. Current Red Hat documentation uses `dnf install nfs-utils`, so the command was updated.
- The NFS option explanations included `intr` and `noatime` guidance that is not accurate on current Linux NFS clients. `intr` was removed because it is ignored on modern kernels, and `noatime` was removed because it has no effect on NFS mounts.
- The `retrans` and `soft` option descriptions were tightened to match the Linux `nfs(5)` semantics more closely.
- The text labeled a mount-option example as "For high availability". Those client mount options improve retry behavior but do not provide NFS high availability on their own, so the wording was corrected.
- The firewall note implied NFS simply uses ports `111` and `2049`. This was corrected to note that NFSv4 typically uses `2049`, while `showmount` and NFSv3 can also depend on rpcbind/mountd configuration.
- The performance example included `noatime`, which has no effect on Linux NFS mounts, so it was removed.

## Review Notes
- The post is technically relevant and salvageable; after the corrections above, it is suitable to keep as a validated technical guide.
- The export example uses permissive settings such as `chmod 777` and `no_root_squash`. These can work for a lab or quick-start setup, but they are not ideal defaults for production hardening.
- `showmount -e` is acceptable for the Linux server setup shown in the post, but it is less reliable as a generic validation step against NFSv4-only servers because it depends on the MOUNT protocol service.
