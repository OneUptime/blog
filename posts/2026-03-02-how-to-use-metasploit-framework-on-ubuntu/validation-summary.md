# Validation Summary: How to Use Metasploit Framework on Ubuntu

## Status
validated

## Post Type
Tutorial / Hands-on guide for authorized penetration testing

## Technologies Covered
- Metasploit Framework 6 (msfconsole, msfdb, msfvenom)
- Meterpreter payload and post modules
- Rapid7 omnibus installer / `apt.metasploit.com` package repository
- PostgreSQL (used by `msfdb`)
- Auxiliary scanners (SMB, SSH, HTTP, FTP, credential testing)
- `db_nmap` (Metasploit's nmap wrapper)
- Resource scripts (`.rc` files)
- Ubuntu (apt / keyring handling)

## Sources Consulted
- Metasploit Framework official docs — Nightly Installers: https://docs.metasploit.com/docs/using-metasploit/getting-started/nightly-installers.html
- Rapid7 metasploit-omnibus repo: https://github.com/rapid7/metasploit-omnibus
- `apt.metasploit.com` package repository (confirmed: only the `xenial` suite is published for Ubuntu)
- `rapid7/metasploit-framework` source — `msfupdate` script (confirmed it is a shell script, not a console command)
- `rapid7/metasploit-framework` source — `modules/post/multi/manage/autoroute.rb` (confirmed it is the correct module for setting up pivot routes through a Meterpreter session)
- Debian wiki — third-party repository key handling: https://wiki.debian.org/DebianRepository/UseThirdParty (confirms `apt-key add` is deprecated; modern method uses `/etc/apt/keyrings/` + `signed-by=`)

## Issues Found
1. **`msfupdate` shown as an msfconsole command.** The post had `msf6 > msfupdate`, but `msfupdate` is a standalone shell script (`/opt/metasploit-framework/bin/msfupdate`) and is not a valid msfconsole built-in. Removed the in-console invocation and clarified that it must be run from the shell.
2. **Deprecated `apt-key add` usage.** Method 2 of the install instructions used `apt-key add -`, which is deprecated and removed/disabled on current Ubuntu LTS releases. Rewrote the snippet to download the key to `/etc/apt/keyrings/metasploit.gpg` via `gpg --dearmor` and reference it with `signed-by=` in the sources list — the current Debian/Ubuntu-recommended approach. Also added a note that the `apt.metasploit.com` repository only ships the `xenial` suite (regardless of host Ubuntu version), since that is non-obvious and would otherwise look like a typo.
3. **Misplaced `shell_to_meterpreter` in the pivoting example.** The original line `meterpreter > run post/multi/manage/shell_to_meterpreter` is a no-op when run from an existing Meterpreter session (that module upgrades a *shell* session to Meterpreter, it does not set up routes). Replaced with the correct pivoting module, `post/multi/manage/autoroute` with `SUBNET` and `NETMASK` options, and reframed the subsequent manual `route add` as an alternative.

## Review Notes
- The "Resource Scripts for Automation" line lacks a leading `##`, so it renders as a paragraph instead of a section heading. Left as-is per the "do not make stylistic changes" rule, but worth fixing in a future pass.
- The post uses the `ms17_010_eternalblue`, `vsftpd_234_backdoor`, and `multi/handler` modules — all module paths, prompts, default payload (`cmd/unix/interact` for vsftpd), and options (`RHOSTS`/`RPORT`/`LHOST`/`LPORT`) verified as current.
- `msfvenom` payload identifiers (`linux/x64/meterpreter/reverse_tcp`, `windows/x64/meterpreter/reverse_tcp`, `python/meterpreter/reverse_tcp`) and flags (`-p`, `-f`, `-o`, `-l payloads`, `--list formats`) are correct for current Metasploit 6.
- `db_nmap -sV -sC -O` and database commands (`hosts`, `services`, `vulns`, `creds`, `loot`, `workspace -a`, `-o file.csv`) match current msfconsole behavior.
- `route add 10.0.0.0 255.255.255.0 1` uses the legacy mask form; the equivalent CIDR form `route add 10.0.0.0/24 1` also works in current versions. Left the legacy form since it's still supported and matches the author's style.
- The post correctly and prominently emphasizes authorization, written scope, and responsible disclosure — appropriate framing for a dual-use security tool tutorial.
