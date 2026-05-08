# Validation Summary: How to Create a Quadlet Volume Unit File

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Quadlet
- systemd
- Podman volumes
- Container storage

## Sources Consulted
- Podman official documentation: podman-volume.unit, https://docs.podman.io/en/latest/markdown/podman-volume.unit.5.html
- Podman official documentation: podman-systemd.unit, https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman official documentation: podman-volume-create, https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html

## Issues Found
- The post implied that `pgdata.volume` creates a Podman volume named `pgdata` by default. Podman Quadlet creates `systemd-pgdata` unless `VolumeName=pgdata` is set. I added a note about the default naming behavior and added `VolumeName=pgdata` to the PostgreSQL example so the later `podman volume inspect pgdata` and `podman volume rm pgdata` commands are accurate.
- The container example comment said to reference the volume by unit name without the `.volume` extension, but the example correctly used `pgdata.volume`. I updated the comment to say the volume is referenced by its Quadlet unit file name.
- The NFS volume example placed `type` and `device` inside `Options=`, but Quadlet maps these to separate `Type=` and `Device=` keys. I split the example into `Type=nfs`, `Device=:/exports/data`, and `Options=addr=nfs-server.example.com,rw`.

## Review Notes
The examples use user-level Quadlet paths and `systemctl --user`, which match Podman's documented rootless Quadlet search path. Volumes created by Quadlet persist independently of container lifecycle unless manually removed.
