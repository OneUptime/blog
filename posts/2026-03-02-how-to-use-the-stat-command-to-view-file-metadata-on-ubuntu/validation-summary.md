# Validation Summary: How to Use the stat Command to View File Metadata on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- GNU coreutils `stat` command
- Linux file metadata (inodes, hardlinks, timestamps)
- File system concepts (atime/mtime/ctime/btime, sparse files, blocks)
- Related utilities: `ls`, `find`, `readlink`, `dd`, `mount`
- `relatime` / `noatime` mount options
- Filesystems: ext4, XFS, Btrfs
- `statx()` syscall

## Sources Consulted
- `stat --help` output (GNU coreutils 9.4)
- `man stat` (GNU coreutils)
- Local verification: `stat` on a symlink (confirmed default does NOT dereference)
- Linux `statx(2)` man page: https://man7.org/linux/man-pages/man2/statx.2.html
- GNU coreutils manual: https://www.gnu.org/software/coreutils/manual/html_node/stat-invocation.html
- `find` man page (regarding `-newer` vs `-cnewer`)
- ext4 / XFS filesystem documentation for btime/crtime support

## Issues Found

1. **"Stat on Symlinks" section had default behavior inverted.** The post claimed `stat` follows symlinks by default and showed contradictory, confused examples (e.g., calling `-L` "default behavior" and suggesting `stat -f` for symlinks, which is actually the filesystem-info flag). Verified locally that `stat` does NOT dereference by default — it shows info about the link itself (type `symbolic link`, size = target path length). Rewrote the section to correctly describe the default lstat-like behavior and the `-L`/`--dereference` flag for following links. Also updated the example target to `python3.12` to match current Ubuntu (24.04).

2. **"XFS with reflink" was inaccurate for btime support.** XFS records creation time when using the v5 superblock format (default since ~2016), not specifically when reflink is enabled (reflink is a separate feature also gated by v5). Changed to "XFS with v5 superblock" and added the coreutils 8.31+ requirement, since both kernel `statx()` support and a recent enough `stat` binary are required to display btime.

3. **Misleading `find -newer` example in "Practical Uses".** The comment claimed the command finds files whose ctime is recent compared to mtime, but `-newer` compares mtime by default. Changed to `-cnewer` so the command's actual behavior matches the comment's intent (comparing ctime).

## Review Notes

- All `stat -c` format specifiers (`%n`, `%s`, `%b`, `%f`, `%a`, `%A`, `%u`, `%U`, `%g`, `%G`, `%i`, `%h`, `%x`, `%y`, `%z`, `%w`) verified against `stat --help` output for coreutils 9.4 — all correct.
- The `dd if=/dev/zero of=/tmp/sparse.dat bs=1 count=0 seek=1G` sparse-file example is valid and produces the described result.
- The directory link-count explanation (2 + number of subdirectories) is correct.
- The Device hex/decimal pairing (`801h/2049d`) is arithmetically consistent.
- The `relatime` description as Ubuntu's default mount option is accurate.
- Sample timestamps and inode numbers are illustrative and clearly representative rather than reproduced literally.
