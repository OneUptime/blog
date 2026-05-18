# Validation Summary: How to Use chroot Jails to Restrict User Access on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- chroot (Linux system call / `chroot(2)`)
- OpenSSH `sshd_config` (`ChrootDirectory`, `Match`, `ForceCommand internal-sftp`)
- Ubuntu user/group management (`useradd`, `groupadd`, `usermod`)
- `ldd` for shared library dependency resolution
- `mknod` for creating device nodes
- jailkit (`jk_init`, `jk_jailuser`)
- systemd (`systemctl`, `RootDirectory=`)

## Sources Consulted
- OpenSSH `sshd_config(5)` manual — https://man.openbsd.org/sshd_config
- Ubuntu `openssh-server` package documentation
- jailkit homepage and manpages — https://olivier.sessink.nl/jailkit/
- `apt-cache show jailkit` (confirmed package exists in Ubuntu universe repo, version 2.23-2)
- Local verification of `ldd /bin/bash` output (matches the example in the post)
- Local verification of device major/minor numbers via `ls -l /dev/null /dev/zero /dev/tty` (all numbers match)
- `systemctl list-unit-files | grep ssh` (confirmed `sshd.service` is a valid alias for `ssh.service` on Ubuntu)
- Linux `chroot(2)` manual — https://man7.org/linux/man-pages/man2/chroot.2.html
- `systemd.exec(5)` for `RootDirectory=` directive

## Issues Found

1. **Missing `mkdir` for architecture-specific library directory.** The earlier `mkdir -p $JAIL/{bin,lib,lib64,etc,home,dev,proc,usr/bin}` creates `$JAIL/lib` but not `$JAIL/lib/x86_64-linux-gnu`. The subsequent `sudo cp /lib/x86_64-linux-gnu/libtinfo.so.6 $JAIL/lib/x86_64-linux-gnu/` would fail with "No such file or directory" because the destination path doesn't exist. Added an explicit `sudo mkdir -p $JAIL/lib/x86_64-linux-gnu` step before the copy commands so the example works end-to-end.

## Review Notes
- The bash dependency list shown in the post (`linux-vdso.so.1`, `libtinfo.so.6`, `libc.so.6`, `ld-linux-x86-64.so.2`) matches current Ubuntu 22.04/24.04 output. On older systems bash also required `libdl.so.2`, but as of glibc 2.34 `libdl` was merged into `libc`, so the post is correct for modern Ubuntu.
- `systemctl restart sshd` works on Ubuntu because `sshd.service` is an alias for `ssh.service`; both forms are acceptable.
- The `cd ..` test description ("Should stay at /") is correct chroot behavior — at the jail root, the parent of `/` is `/` itself.
- The chroot security caveat (root processes can escape) is accurately stated. The post appropriately recommends combining chroot with AppArmor/seccomp and mentions systemd `RootDirectory=` / namespaces as stronger alternatives.
- Device major/minor numbers for `/dev/null` (1,3), `/dev/zero` (1,5), and `/dev/tty` (5,0) are correct.
- jailkit's `jk_init` sections (`basicshell`, `netutils`, `editors`) and the `jk_jailuser -m -j ... -s ...` flag usage are correct per jailkit 2.x documentation.
- The `copy_to_jail` helper function correctly uses `ldd` with a regex to extract library paths; this is a common idiom that works for dynamically-linked ELF binaries.
- Minor stylistic note (not changed): the `copy_to_jail` function places every binary in `$jail/bin/`, even when sourced from `/usr/bin/`. This is fine because the jail's `/bin` will be on PATH, but it diverges from the host's layout.
