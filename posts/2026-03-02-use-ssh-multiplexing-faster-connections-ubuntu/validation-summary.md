# Validation Summary: How to Use SSH Multiplexing for Faster Connections on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH client (`ssh`)
- `ssh_config` (5) — ControlMaster, ControlPath, ControlPersist
- SSH command-line flags: `-f`, `-N`, `-M`, `-S`, `-O` (check/exit/stop/forward/cancel)
- `rsync` and `scp` over multiplexed SSH
- Bash scripting (deploy script example)

## Sources Consulted
- `ssh_config(5)` man page (OpenSSH 9.6p1, Ubuntu 24.04)
  - ControlMaster, ControlPath (TOKENS: `%h`, `%p`, `%r`, `%C`), ControlPersist (`no`, `yes`/`0`, time values)
- `ssh(1)` man page (OpenSSH 9.6p1)
  - `-O ctl_cmd` documented commands: check, forward, cancel, exit, stop
  - `-f`, `-N`, `-M`, `-S` flag semantics
- OpenSSH source `mux.c` for actual debug log strings emitted when a slave connects vs. when the master fails to listen
- OpenSSH release notes / upstream docs at https://www.openssh.com/

## Issues Found

1. **Deploy script working-directory bug** (multiplexing-in-scripts example).
   - What was wrong: Each `ssh` invocation starts a fresh remote shell, so `cd /opt/myapp && git pull` in one call does not persist to the next call. The following line, `pip install -r requirements.txt`, would run from the user's home directory and fail because `requirements.txt` isn't there.
   - Fix applied: Changed that line to `cd /opt/myapp && pip install -r requirements.txt` so the working directory is set inline.

2. **Incorrect explanation of OpenSSH verbose output** (Verifying Multiplexing Is Working section).
   - What was wrong: The post claimed that `"ControlSocket ... already exists, disabling multiplexing"` "means it FOUND the socket and IS using mux", and that the actual mux usage shows `"Entering proxy mux mode"`. Both statements are inaccurate. The `ControlSocket ... already exists, disabling multiplexing` message is emitted from `muxserver_listen()` in OpenSSH when ssh tries to *become* the master but the socket file exists (often stale) — that attempt is being run *without* multiplexing, the opposite of the claim. `Entering proxy mux mode` is associated with the `-O proxy` command flow, not normal slave-attaches.
   - Fix applied: Replaced the misleading note with the correct slave-side messages (`auto-mux: Trying existing master at ...`, `mux_client_request_session: master session id: ...`) and a brief, accurate explanation of when the "already exists, disabling multiplexing" message does appear.

## Review Notes

- `ControlPersist` values `yes`, `no`, `0`, and time durations (`10m`, `1h`, etc.) are all documented and correct in the post.
- `ControlPath` tokens `%h`, `%p`, `%r` are the standard recommended set; `%C` (hash of `%l%h%p%r`) is also valid and useful when paths would otherwise exceed the Unix socket name length limit (~104 chars). The post's choice is fine and slightly more readable.
- `ssh -O stop` is documented (stops the master from accepting new multiplexing requests while letting existing sessions finish), distinct from `ssh -O exit` (terminates immediately, killing slaves) — the post describes both correctly.
- Tilde (`~`) expansion in `-o ControlPath=~/...` works because ssh expands tilde for `ControlPath` values per `ssh_config(5)` ("Arguments to ControlPath may use the tilde syntax to refer to a user's home directory"). The rsync example is therefore correct.
- The security caveat about same-user reuse of a control socket is accurate; the socket inode is created with mode `0600`-equivalent restricted permissions.
- The `ControlMaster auto` semantics described (use existing socket as slave, otherwise create master) match `ssh_config(5)`.
- Minor stylistic note (not changed): OpenSSH documentation has moved away from "master/slave" terminology in some places, but the man pages still use it, so the post's terminology is fine.
