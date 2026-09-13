# Validation Summary: Why sysfs Is Read-Only in Docker and How to Expose One Control

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Linux sysfs
- Docker Engine and Docker containers
- OCI Linux runtime configuration
- Linux mount namespaces and bind mounts
- Linux capabilities, device access controls, and user namespaces
- Docker Desktop

## Sources Consulted
- [Docker: Running containers](https://docs.docker.com/engine/containers/run/)
- [Docker CLI: `docker container run`](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker: Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)
- [Docker: Isolate containers with a user namespace](https://docs.docker.com/engine/security/userns-remap/)
- [Open Container Initiative: Linux Container Configuration](https://github.com/opencontainers/runtime-spec/blob/main/config-linux.md)
- [Open Container Initiative: Runtime and Lifecycle](https://github.com/opencontainers/runtime-spec/blob/main/runtime.md)
- [Linux kernel documentation: sysfs](https://docs.kernel.org/filesystems/sysfs.html)
- [Linux manual page: proc_pid_mountinfo(5)](https://man7.org/linux/man-pages/man5/proc_pid_mountinfo.5.html)
- [Linux manual page: findmnt(8)](https://man7.org/linux/man-pages/man8/findmnt.8.html)
- [GNU Coreutils manual: readlink](https://www.gnu.org/software/coreutils/manual/html_node/readlink-invocation.html)

## Issues Found
No technical issues found.

## Review Notes
The device path, image name, user ID, and group ID in the examples are explicitly illustrative placeholders. Writable sysfs behavior remains driver-, host-policy-, and runtime-specific, and the post correctly calls for validation on the actual deployment rather than promising that a writable bind mount alone is sufficient.
