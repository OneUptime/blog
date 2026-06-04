# Validation Summary: How to Set Up Docker Volumes with CIFS/SMB Shares

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Docker Engine volumes and the local volume driver
- Docker Compose named volumes and `driver_opts`
- CIFS/SMB network shares
- Linux CIFS mount options
- SMB protocol versions and encryption

## Sources Consulted
- Docker Docs: Volumes, including "Create CIFS/Samba volumes" and local driver mount behavior: https://docs.docker.com/engine/storage/volumes/
- Docker CLI reference: `docker volume create` driver-specific options: https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Compose file reference: top-level volumes and `driver_opts`: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose file reference: top-level `version` element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose interpolation reference: https://docs.docker.com/reference/compose-file/interpolation/
- Linux `mount.cifs(8)` manual page: https://www.man7.org/linux/man-pages/man8/mount.cifs.8.html
- Linux Kernel CIFS client usage documentation: https://docs.kernel.org/admin-guide/cifs/usage.html
- Samba `mount.cifs` manual page: https://www.samba.org/samba/docs/3.5/man-html/mount.cifs.8.html
- Microsoft Learn: SMB security enhancements and SMB encryption requirements: https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-security
- Microsoft Learn: SMB feature descriptions by dialect/version: https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-feature-descriptions

## Issues Found
- The post claimed Docker CIFS volumes could use `credentials=/etc/docker-cifs-credentials` directly and that this would keep credentials out of Docker inspect output and process listings. Docker documents that the local driver forwards options to the Linux mount operation, while Linux CIFS documentation says `credentials=` is processed by the `mount.cifs` helper. Updated the section to explain that direct Docker local CIFS volumes need credentials in mount options, that Docker stores the resolved options, and that credentials files require a host mount plus Docker bind mount strategy.
- Updated Docker Compose CIFS examples and later `docker volume create` examples to use `username` and `password` mount options instead of `credentials=`.
- Removed the obsolete top-level `version: "3.8"` key from the Compose example. Current Compose treats `version` as informative only and warns that it is obsolete.
- Corrected the SMB 3.1.1 example from "Windows Server 2022+" to "Windows Server 2016+" because SMB 3.1.1 was introduced before Windows Server 2022.
- Narrowed the SMB version security statement. SMB 1.0 is obsolete, while SMB 2.x lacks SMB 3.x encryption features; the original wording overstated "known security vulnerabilities" for both SMB 1.0 and 2.0.
- Tightened the "host is down" troubleshooting note from a definitive protocol-version diagnosis to one possible cause after host reachability is checked.
- Added `ro` to the guest share example so the mount is actually read-only, not just displayed with read-only default mode bits.
- Updated the summary to say "handle credentials carefully" instead of recommending credentials files for direct Docker local CIFS volumes.

## Review Notes
The remaining examples match Docker's documented local volume option pattern for CIFS/Samba mounts. The `cache=loose` example is technically valid, but it trades cache coherency for performance and should be used carefully when multiple clients may read and write the same files.
