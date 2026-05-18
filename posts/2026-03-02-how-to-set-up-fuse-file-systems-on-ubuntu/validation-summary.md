# Validation Summary: How to Set Up FUSE File Systems on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- FUSE (Filesystem in Userspace) / libfuse3
- fusermount3
- sshfs
- encfs
- s3fs
- goofys
- rclone
- fusepy (Python FUSE bindings)
- Ubuntu (22.04 / 24.04)

## Sources Consulted
- [libfuse FAQ and source](https://github.com/libfuse/libfuse/wiki/FAQ)
- [Linux Kernel VFS documentation](https://docs.kernel.org/filesystems/vfs.html)
- [fusermount3(1) manpage](https://man7.org/linux/man-pages/man1/fusermount3.1.html)
- [sshfs(1) manpage](https://www.man7.org/linux/man-pages/man1/sshfs.1.html)
- [Ubuntu noble sshfs package](https://packages.ubuntu.com/noble/sshfs)
- [Ubuntu noble python3-fuse package](https://packages.ubuntu.com/noble/python3-fuse)
- [fusepy on GitHub](https://github.com/fusepy/fusepy)
- [fuse-python (libfuse) on GitHub](https://github.com/libfuse/python-fuse)
- [s3fs-fuse README](https://github.com/s3fs-fuse/s3fs-fuse)
- [goofys on GitHub](https://github.com/kahing/goofys)
- [rclone install docs](https://rclone.org/install/)

## Issues Found

1. **Incorrect claim about default FUSE mount permissions.** The original text said "By default, only root can mount FUSE filesystems" and then directed users to enable `user_allow_other` and join the `fuse` group. This conflates two separate things. Per libfuse documentation, `fusermount3` is installed setuid root, so any user can mount FUSE filesystems by default. The `user_allow_other` option in `/etc/fuse.conf` specifically controls whether non-root users may pass the `-o allow_other` (or `-o allow_root`) option, which lets *other* users access their mount. Additionally, the legacy `fuse` group is not required on modern Ubuntu (22.04/24.04). Rewrote the section to accurately describe what `user_allow_other` does and removed the obsolete `usermod -aG fuse` step.

2. **Conflicting Python FUSE binding install.** The "Writing a Simple FUSE Filesystem in Python" section ran both `sudo apt install python3-fuse` and `pip3 install fusepy`. These are two different libraries (`fuse-python` vs `fusepy`) that both register a top-level `fuse` module and conflict with each other. The example code uses the fusepy API (`from fuse import FUSE, FuseOSError, Operations` and `class HelloFS(Operations)`), so only `fusepy` is needed. Removed the `python3-fuse` install and added a brief note warning against installing it.

3. **Obsolete `large_read` sshfs option.** The performance-tuning sshfs example included `-o large_read`. Per the sshfs/FUSE manpage, this option only has an effect on Linux 2.4-era kernels and is essentially a no-op on modern kernels. Removed it from the example.

## Review Notes

- The `goofys` install step (`go install github.com/kahing/goofys@latest`) is plausible but the project's last tagged release is v0.24.0 (April 2020) and the recommended install path per its README is now a pre-built binary; some users hit build failures with newer Go versions due to old Azure SDK deps. Left as-is since the command is still listed in the upstream README, but readers should be aware goofys is effectively in maintenance mode.
- `encfs` has long-known security weaknesses documented in its own audit; the post does not address this. Not a technical inaccuracy per se, so left untouched.
- `pip3 install fusepy` on Ubuntu 23.04+ may require `--break-system-packages` or a virtual environment due to PEP 668. Not a correctness issue, just an environmental caveat.
- The VFS expansion ("Virtual Filesystem Switch") is one of two officially recognized forms in the kernel docs (the other being "Virtual File System"). Left as-is.
- The post uses `fusermount3` for unmounting throughout. On Ubuntu 22.04 and 24.04, both `sshfs` and `fuse3` link against `libfuse3-3`, so `fusermount3 -u` is the correct unmount command. Verified.
