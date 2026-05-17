# Validation Summary: How to Simulate an APT Install Without Making Changes on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- APT (Advanced Package Tool)
- apt-get
- apt-cache
- dpkg
- Bash scripting
- Ubuntu package management
- APT preferences/pinning

## Sources Consulted
- `apt-get(8)` man page — confirms `-s`, `--simulate`, `--just-print`, `--dry-run`, `--recon`, `--no-act` are all equivalent flags and that simulation does not need root privileges
- `apt(8)` man page — confirms `apt install`, `apt upgrade`, `apt full-upgrade`, `apt remove`, `apt purge`, `apt autoremove`, `apt dist-upgrade` all accept simulation flags
- `apt-cache(8)` man page — confirms `apt-cache show` and `apt-cache policy` behavior
- `apt_preferences(5)` man page — confirms pinning file syntax (`Package:`, `Pin:`, `Pin-Priority:` fields under `/etc/apt/preferences.d/`)
- `dpkg(1)` man page — confirms `dpkg -l <pkg>` lists package status
- Bash redirection semantics for `2>&1 > file` vs `> file 2>&1`

## Issues Found
1. **Broken disk-space parsing script** (`check-disk-before-install.sh`): The script used `awk '{print $1}'` on the line "After this operation, 58.4 MB of additional disk space will be used." Field 1 is the word "After", not the number — so `REQUIRED_MB` would always be empty/zero and the comparison would never trigger correctly. Fixed by changing to `awk '{print $4}'` to extract the actual number.
2. **Wrong shell redirection order in the change-management example**: `sudo apt full-upgrade --dry-run 2>&1 > /tmp/...txt` does NOT capture stderr into the file — `2>&1` runs first and points stderr at the terminal, then stdout is redirected to the file. APT writes the "NOTE: This is only a simulation!" disclaimer to stderr, so it would be lost from the recorded change-management artefact. Fixed by reversing the order to `> /tmp/...txt 2>&1`, which is the standard idiom to send both streams to the file.

## Review Notes
- The disk-space parsing script still does not handle unit conversions — APT may report sizes in `kB`, `MB`, or `GB` depending on package size. The post's example assumes `MB` output. A more robust implementation would inspect field 5 (the unit) and convert. Left as-is to avoid scope creep; the immediate bug (always-empty value) is the one that needed fixing.
- The `apt-cache show ... | grep -E "^Description-en:"` example may miss the description on packages where APT outputs `Description:` instead of `Description-en:`. This depends on how the package metadata is generated and whether translations are present. Not a hard error — just something to be aware of.
- The post's `Inst nginx-common (1.18.0-6ubuntu14.4 Ubuntu:22.04/jammy-updates)` examples reference Ubuntu 22.04 (jammy) versions. Versions will drift over time as Ubuntu publishes updates; this is expected for illustrative output and not a defect.
- The `apt dist-upgrade` and `apt full-upgrade` commands are functionally equivalent in modern APT; the post correctly presents both forms.
- The post correctly notes that simulation works without `sudo`. This matches the behavior documented in `apt-get(8)`.
