# Validation Summary: How to Set Up a Honeypot with Cowrie on Ubuntu

## Status
validated

## Post Type
Tutorial / step-by-step deployment guide

## Technologies Covered
- Cowrie SSH/Telnet honeypot
- Ubuntu / Debian
- Python 3, virtualenv, pip
- systemd
- iptables (NAT PREROUTING / REDIRECT)
- authbind
- Twisted (twistd)
- VirusTotal API v3

## Sources Consulted
- Cowrie official install docs (`INSTALL.rst` in the upstream repo): https://github.com/cowrie/cowrie/blob/master/INSTALL.rst
- Cowrie official systemd unit: https://github.com/cowrie/cowrie/blob/master/docs/systemd/etc/systemd/system/cowrie.service
- Cowrie `cowrie.cfg.dist` default config: https://github.com/cowrie/cowrie/blob/master/etc/cowrie.cfg.dist
- Cowrie `userdb.example`: https://github.com/cowrie/cowrie/blob/master/etc/userdb.example
- Cowrie `pyproject.toml` (entry points): https://github.com/cowrie/cowrie/blob/master/pyproject.toml
- Cowrie `createfs` source: https://github.com/cowrie/cowrie/blob/master/src/cowrie/scripts/createfs.py
- VirusTotal API v3 files endpoint docs: https://docs.virustotal.com/reference/files-scan
- Verified by cloning current `cowrie/cowrie` master and inspecting the actual files

## Issues Found

1. **`pip install -r requirements.txt` is insufficient.** Current Cowrie installs as a Python package via `pyproject.toml`; without `pip install -e .` the `cowrie` and `createfs` entry-point commands are never registered. Replaced with `pip install -e .` (which also pulls in dependencies). Matches official `INSTALL.rst` step 4.

2. **`bin/cowrie start` / `bin/cowrie status` no longer exists.** The current Cowrie repo has no `bin/cowrie` wrapper; the official docs invoke `cowrie start` (the entry point installed by `pip install -e .`). Replaced both occurrences.

3. **`bin/cowrie start-systemd` is not a real subcommand.** There is no `start-systemd` in any current or historical Cowrie wrapper. The official systemd unit invokes `twistd --nodaemon` directly so that systemd can supervise it as a `Type=simple` (default) service. Replaced `ExecStart` with the upstream pattern (`twistd --umask 0022 --nodaemon --pidfile= -l - cowrie`) and added `Environment=PYTHONPATH=/home/cowrie/cowrie/src` to match the upstream unit. Removed `ExecStop` because the foreground `twistd` is killed by signal — no separate stop command is needed.

4. **`python3 bin/createfs -o ...` path is wrong.** In current Cowrie `createfs` lives at `src/cowrie/scripts/createfs.py` and is exposed as a `createfs` entry point (registered by `pip install -e .`). The `-o` flag is correct. Updated invocation to plain `createfs -o share/cowrie/fs.pickle`.

5. **`auth_class_parameters = etc/userdb.txt` is invalid for `auth_class = UserDB`.** The `UserDB` class hard-codes the userdb path to `{etc_path}/userdb.txt` and never reads `auth_class_parameters`; that setting is only consumed by `AuthRandom` (numeric tuple like `2, 5, 10`). Setting it to a file path is a silent no-op that misleads readers. Removed the line and updated the surrounding comment to make the actual behavior clear.

## Review Notes

- The `git clone http://github.com/cowrie/cowrie` URL uses plain `http://`. This matches what the official `INSTALL.rst` shows verbatim, so it was left as-is — GitHub transparently redirects to HTTPS. A reader who prefers `https://` from the start would be equally fine.
- The `userdb.txt` example in the post uses numeric UIDs (`0`, `1000`) in field #2 while the official example uses the literal `x`. Cowrie's parser ignores the value of field #2 (treated as "currently unused" per `userdb.example`), so both forms function identically. Left as-is to preserve the author's voice; readers should know either works.
- `data_path = share/cowrie` is a non-default value (upstream default is `src/cowrie/data`). It is still a valid `[honeypot]` option name and is internally consistent with the post's explicit `filesystem = share/cowrie/fs.pickle` and `createfs -o share/cowrie/fs.pickle` lines, so the reader's filesystem image will land where the config expects.
- The `authbind` setup steps (touching `/etc/authbind/byport/22` and `/byport/23`) are not strictly necessary given the post then uses `iptables` PREROUTING REDIRECT to forward 22→2222 and 23→2323 (the unprivileged ports the cowrie user already binds). The two approaches are alternatives in the upstream docs ("Step 7" lists iptables, authbind, and setcap as three independent options). Not a technical error, just slight redundancy in the workflow.
- The VirusTotal submission script uses API v3 (`https://www.virustotal.com/api/v3/files` with the `x-apikey` header), which is the current public API. Correct.
- The JSON log analysis snippets reference `cowrie.command.input` and `cowrie.login.success` `eventid` values, both of which match Cowrie's actual emitted event IDs.
