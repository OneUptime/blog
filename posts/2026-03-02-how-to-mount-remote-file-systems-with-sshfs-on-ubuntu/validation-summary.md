# Validation Summary: How to Mount Remote File Systems with sshfs on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- sshfs (SSH Filesystem, libfuse-based)
- FUSE / libfuse3 (fusermount3)
- OpenSSH (ssh, ssh-keygen, ssh-copy-id, SSH config)
- /etc/fstab persistent mounts
- systemd .mount units
- autofs (auto.master, auto.sshfs)
- SSH connection multiplexing (ControlMaster, ControlPath, ControlPersist)
- Ubuntu apt package management
- dd / rsync benchmarking

## Sources Consulted
- sshfs upstream project: https://github.com/libfuse/sshfs
- libfuse documentation: https://github.com/libfuse/libfuse
- Ubuntu package metadata for `sshfs` (`apt-cache show sshfs` → 3.7.3, depends on libfuse3-3, fuse3, openssh-client)
- `man umount` / `umount --help` (util-linux) for `-l` (lazy) vs `-f` (force) flag semantics
- `man ssh_config` / `man sshd_config` for SSH options (ServerAliveInterval, ServerAliveCountMax, Ciphers, Compression, ControlMaster, ControlPath, ControlPersist, StrictHostKeyChecking, IdentityFile, Port)
- `man systemd.mount` for systemd mount unit naming and option syntax (e.g. `mnt-remote-app.mount` for `/mnt/remote-app`, `Type=fuse.sshfs`)
- `man autofs` / `man auto.master` for autofs map syntax
- POSIX/bash manual on backslash line continuation (a backslash continues a line only when it is immediately followed by a newline)
- Behaviorally verified the bash inline-comment-after-backslash issue locally (the inline `# ...` after `\` terminates the command rather than continuing it)

## Issues Found

1. **Broken bash line continuation with inline comments — "Common Mount Options" block.**
   The original block placed `# ...` comments after each `\` on the same line:
   ```
   -o StrictHostKeyChecking=no \      # skip host key prompt (use with caution)
   ```
   In bash, `\` only continues a line when it is *immediately* followed by a newline. Here `\` is followed by spaces and then a `#`, so the backslash escapes a single space, the `#` then starts a comment that consumes the rest of the line, and the unescaped newline at end-of-line terminates the command. The subsequent `-o ...` line is then executed as a separate command (verified by running `bash -c` locally — got `bash: line N: -o: command not found`-style failures).
   **Fix:** removed the inline comments and added an "Options explained" comment block immediately after the command. The sshfs invocation now actually runs as a single multi-line command.

2. **Same broken line-continuation pattern — "Performance Tuning" block.**
   Identical issue with the performance-tuning sshfs invocation. Applied the same fix (removed inline comments after `\`, added an "Options explained" block).

3. **Mislabelled unmount command.**
   The original wrote:
   ```
   # Force unmount (not recommended)
   sudo umount -l ~/remote
   ```
   Per `umount --help` / `man umount`, `-l, --lazy` performs a *lazy* unmount ("detach the filesystem now, clean up things later"). The *force* flag is `-f, --force`. The comment was therefore incorrect — `umount -l` is the lazy variant (and is in fact the usual workaround for stuck FUSE mounts; `umount -f` is rarely effective against FUSE).
   **Fix:** changed the comment to "Lazy unmount via umount (alternative to fusermount3 -uz)" so the description matches the flag.

## Review Notes

- **Tilde expansion in `-o IdentityFile=~/.ssh/...`**: bash performs tilde expansion at the start of a word and after an unquoted `:`/`=` only in *variable assignment* words, not in arbitrary command arguments. `-o IdentityFile=~/...` is not an assignment, so tilde expansion may or may not occur depending on the shell. In practice this often works for ssh-related tooling but is brittle; using `$HOME/.ssh/...` or an absolute path is safer. Left as-is since it is the conventional shorthand used widely in the sshfs/ssh community and is not a definitive error.
- **fstab legacy syntax `sshfs#user@host:/path  …  fuse  …`** is still supported, but the more modern equivalent is `user@host:/path  …  fuse.sshfs  …` (mirroring the systemd `Type=fuse.sshfs` shown later). Either works on current Ubuntu; left as-is.
- **autofs map colon escaping**: in autofs map entries the colon inside `user@host:/path` is sometimes written as `\:` to avoid being parsed as a host/path separator. Behavior here can depend on autofs version and the leading `:` literal-location indicator; the post's syntax (`:user@host:/path`) is the form most commonly shown in current sshfs/autofs how-tos and typically works. Left as-is.
- **systemd mount unit naming**: the file `/etc/systemd/system/mnt-remote-app.mount` correctly matches the mount point `/mnt/remote-app` per `systemd.mount(5)` (slashes replaced with dashes). Correct as written.
- **`fusermount3` vs `fusermount`**: Ubuntu's current `sshfs` package depends on `libfuse3-3`/`fuse3`, which provides `fusermount3`. The post correctly recommends `fusermount3` and mentions `fusermount` as the older alternative.
- **Performance options**: all listed options (`Ciphers`, `Compression`, `cache`, `kernel_cache`, `auto_cache`, `cache_timeout`, `attr_timeout`, `entry_timeout`, `max_readahead`, `large_read`) are valid sshfs/FUSE/SSH options on current versions.
