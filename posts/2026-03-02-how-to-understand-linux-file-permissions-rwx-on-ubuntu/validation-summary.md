# Validation Summary: How to Understand Linux File Permissions (rwx) on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux file permissions (DAC model)
- Ubuntu
- `chmod`, `ls -la`, `namei`, `test` commands
- Octal permission notation
- File type characters (regular, directory, symlink, block/char devices, FIFO, socket)

## Sources Consulted
- `chmod(1)` and `chmod(2)` manual pages
- `ls(1)` manual page
- `stat(2)` and `inode(7)` manual pages (for file mode bits and type codes)
- `namei(1)` manual page
- `path_resolution(7)` for permission check order
- `execve(2)` for behavior around executing scripts vs. binaries (script needs read; ELF binaries do not require read permission for the calling user)
- Verified the type of `/run/systemd/private` on a live Ubuntu system

## Issues Found
- **Incorrect file-type example**: The file-type examples section listed `ls -la /run/systemd/private  # d for directory`, but `/run/systemd/private` is a Unix domain socket (`srwx------`), not a directory. Replaced with `ls -la -d /etc/systemd  # d for directory`, which is reliably a directory on Ubuntu systems with systemd. Added `-d` so `ls` shows the directory entry itself rather than its contents.

## Review Notes
- The rwx tables, octal arithmetic (4/2/1), and all permission-mode examples (644, 755, 600, 700, 777, 000, 333, 111) are correct.
- The directory permission distinctions (`r` vs `x` semantics, `w` requiring `x` to create/delete) are accurate.
- The "owner permissions win even when more restrictive than group" example (`---rw-r--`) is a real and often-surprising POSIX behavior and is described correctly.
- The note that `--x` works for compiled binaries but not shell scripts is correct: the shell, running as the user, must `read(2)` script contents, whereas the kernel loads ELF binaries on the user's behalf via `execve(2)` without requiring the user to have read permission.
- `/dev/sda` may not exist on systems with only NVMe (`/dev/nvme0n1`) or virtio (`/dev/vda`) disks, but it is still a reasonable canonical example of a block device.
- The "root bypasses permission checks (mostly)" qualifier is appropriate — capabilities such as `CAP_DAC_OVERRIDE` can be dropped, and LSMs (AppArmor on Ubuntu, SELinux) or immutable attributes (`chattr +i`) can still restrict root.
