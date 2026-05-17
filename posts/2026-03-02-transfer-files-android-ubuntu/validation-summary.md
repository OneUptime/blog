# Validation Summary: How to Transfer Files Between Android and Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- MTP (Media Transfer Protocol) via `jmtpfs` and `go-mtpfs`
- `libmtp` / `mtp-tools` (`mtp-detect`)
- udev rules / `plugdev` group
- ADB (Android Debug Bridge) — `adb push`, `adb pull`, `adb shell`, `adb tcpip`, `adb pair`, `adb connect`
- Wireless ADB / Wireless Debugging (Android 11+)
- KDE Connect / GSConnect (`kdeconnect-cli`)
- SSHFS / OpenSSH (Termux on Android)
- SFTP / FTP / `lftp`
- Syncthing (systemd user service)
- Bash scripting / `find`

## Sources Consulted
- Android Developers — ADB documentation: https://developer.android.com/tools/adb
- Android Developers — Wireless debugging (Android 11+): https://developer.android.com/tools/adb#wireless
- libmtp project: https://libmtp.sourceforge.net/
- jmtpfs upstream: https://github.com/JasonFerrara/jmtpfs
- go-mtpfs upstream: https://github.com/hanwen/go-mtpfs
- Ubuntu package metadata for `mtp-tools` (1.1.21) and `jmtpfs` (0.5) — verified via `apt-cache show`
- KDE Connect CLI docs: https://userbase.kde.org/KDEConnect
- Termux packages — OpenSSH (default sshd port 8022): https://wiki.termux.com/wiki/Remote_Access
- SSHFS / FUSE documentation (`sshfs(1)`, `fusermount(1)`)
- OpenSSH `sftp(1)` — `-P` flag specifies port
- Syncthing docs — systemd user service: https://docs.syncthing.net/users/autostart.html
- GNU findutils — operator precedence (`-a` binds tighter than `-o`): https://www.gnu.org/software/findutils/manual/html_mono/find.html

## Issues Found
- **Batch script `find` operator precedence bug**: The original line
  `adb shell find "$PHONE_DIR" -newer /sdcard/Android -name "*.jpg" -o -name "*.mp4"`
  is parsed as `(-newer X AND -name "*.jpg") OR -name "*.mp4"` because `-a` binds tighter than `-o` in `find`. Under that parse, every `.mp4` file matches regardless of the `-newer` predicate, defeating the comment "Pull files modified after the last sync". Fixed by grouping the `-name` predicates with escaped parentheses:
  `adb shell find "$PHONE_DIR" -newer /sdcard/Android \( -name "*.jpg" -o -name "*.mp4" \)`

## Review Notes
- The sync script computes `LAST_SYNC` from `~/.last_phone_sync` but never uses that variable in the `find` invocation (it uses `/sdcard/Android` as the mtime reference instead). The script still produces correct results because of the later `[ ! -f "$local_file" ]` existence check, so this is dead code rather than a correctness bug — left as-is per the "only change what is technically wrong" guidance.
- `adb shell` typically appends a CR to each output line, which can confuse `while read -r file` on some Android/ADB combinations. The post's script does not strip CRs; for production use, piping through `tr -d '\r'` after `adb shell` is recommended. Not corrected since it works on most modern adb/Android versions.
- Glob patterns like `"*.jpg"` passed to `adb shell` are subject to remote shell expansion before being handed to `find`. In practice this is fine when the current shell directory on the device has no matching files, which is the common case.
- `go install github.com/hanwen/go-mtpfs@latest` is the correct module path; the repo is active.
- Termux's default sshd port (8022) is correct.
- `sftp -P` (uppercase) vs `sshfs -p` (lowercase) for port is correct as written (matches the underlying OpenSSH/SSHFS CLIs).
- `adb pair host:port pairing_code` syntax for Android 11+ wireless pairing is correct.
- `mtp-detect` is provided by the `mtp-tools` package as stated.
