# Validation Summary: How to Set Up NFS Shared Storage for Portainer Swarm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NFS (Network File System), NFSv4
- Docker Swarm
- Portainer
- Docker volumes (local driver with NFS options)
- Docker Compose (v3.8 stack file)
- Ubuntu/Debian package management (apt)
- Cloud-init / Ansible (referenced for automation)
- Monitoring tools: `nfsstat`, `iostat`, `netstat`

## Sources Consulted
- Docker docs — Use a volume driver / NFS volume options: https://docs.docker.com/engine/storage/volumes/#use-a-volume-driver
- Docker Compose external volumes: https://docs.docker.com/reference/compose-file/volumes/
- Ubuntu Server Guide — Network File System (NFS): https://ubuntu.com/server/docs/service-nfs
- Linux `exports(5)` man page (export options: rw, sync, no_subtree_check, no_root_squash)
- `exportfs(8)` man page (`-a`, `-r`, `-v` flags)
- `mount.nfs(8)` man page
- IANA service registry / NFS uses TCP/UDP port 2049
- Portainer documentation — Stacks (Swarm) and external volumes

## Issues Found
No technical issues found.

All commands, package names, NFS export syntax, Docker NFS volume options, and Compose stack syntax verified against official documentation:
- Package names `nfs-kernel-server` and `nfs-common` are correct for Ubuntu/Debian.
- `/etc/exports` line format and options (`rw,sync,no_subtree_check,no_root_squash`) are valid.
- `exportfs -arv` and `showmount -e` usage is correct.
- Docker `volume create` with `--driver local --opt type=nfs --opt o=addr=...,rw,nfsvers=4 --opt device=:/path` matches Docker's documented NFS volume pattern.
- The `external: true` volume reference in the Swarm stack correctly requires the volume to be pre-created on every node, as the post notes.
- NFS uses port 2049 (correct for the `netstat` example).

## Review Notes
- `version: "3.8"` in Compose files is still accepted but is considered legacy in the Compose Specification (the top-level `version` key is now optional/ignored). Not incorrect, just dated.
- `chmod 777` on the export directory is functional for the tutorial but is overly permissive for production; pairing it with `no_root_squash` further weakens the security posture. The post is a getting-started tutorial, so this is acceptable, but readers should tighten permissions and consider `root_squash` for production.
- `iostat` is provided by the `sysstat` package on Debian/Ubuntu and may need to be installed separately; the post does not call this out.
- The post correctly emphasizes the Swarm-specific quirk that a Docker NFS volume must be created on each node before the stack is deployed (since the `local` driver does not propagate volumes across the swarm).
