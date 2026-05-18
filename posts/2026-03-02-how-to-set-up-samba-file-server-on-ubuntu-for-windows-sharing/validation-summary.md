# Validation Summary: How to Set Up Samba File Server on Ubuntu for Windows Sharing

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Samba (smbd, nmbd, smbclient, smbpasswd, pdbedit, smbcontrol, smbstatus, testparm)
- SMB / CIFS protocol
- Ubuntu (apt, systemd, useradd, usermod, groupadd, chmod with setgid)
- UFW firewall
- cifs-utils (mount.cifs)
- Windows file sharing (net use, UNC paths)

## Sources Consulted
- Samba official documentation: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- smbpasswd(8) manpage: https://www.samba.org/samba/docs/current/man-html/smbpasswd.8.html
- smbcontrol(1) manpage: https://www.samba.org/samba/docs/current/man-html/smbcontrol.1.html
- smbstatus(1) manpage: https://www.samba.org/samba/docs/4.15/man-html/smbstatus.1.html
- Ubuntu Server Samba tutorial: https://ubuntu.com/tutorials/install-and-configure-samba
- Ubuntu Server firewall (UFW) docs: https://ubuntu.com/server/docs/how-to/security/firewalls/
- Samba community guidance on `socket options` (deprecated in modern Samba 4.x)

## Issues Found
1. **`samba --version` for version check** — On a default Ubuntu Samba install (without the AD-DC role) the `samba` binary is not present; `smbd --version` is the canonical version check. Replaced the redundant `samba --version` line with `smbclient --version` so the user gets a useful second sanity check.
2. **"Enable the Samba account (it starts disabled)"** — With the `tdbsam` backend (the default on Ubuntu), `smbpasswd -a` creates the account in an **enabled** state. The separate `smbpasswd -e` step was unnecessary and the comment was misleading. Removed the redundant enable commands and clarified the behavior in a comment. `-e` is only needed if an account was previously disabled with `-d`.
3. **"Prevent 'print$' and 'homes' shares from being auto-created"** — The `load printers = no` / `printing = bsd` / `printcap name = /dev/null` / `disable spoolss = yes` directives only disable the auto-generated `[printers]` and `[print$]` shares. The `[homes]` auto-share is controlled exclusively by the presence of the `[homes]` section. Corrected the comment to mention only printer shares.
4. **`socket options = TCP_NODELAY IPTOS_LOWDELAY`** — This setting is discouraged in modern Samba 4.x; the manpage recommends leaving `socket options` unset because modern kernels auto-tune TCP. Removed the directive (and the surrounding "performance tuning" comment).
5. **`sudo testparm` / `sudo testparm -v`** — Bare `testparm` prompts "Press enter to see a dump of your service definitions" when stdin is a TTY, which breaks the workflow as written. Changed to `testparm -s` / `testparm -sv` for non-interactive output.
6. **`sudo ufw allow samba`** — The UFW application profile shipped by Ubuntu is named `Samba` (capitalized) in `/etc/ufw/applications.d/samba`. Lowercase may work on some UFW versions but the canonical, documented form is `Samba`. Updated to the canonical name.

## Review Notes
- The rest of the configuration, share definitions (`[Public]`, `[TeamShare]`, `[homes]`), permission setup (including the `2775` setgid bit), `smbcontrol smbd reload-config`, `smbstatus -S`, the listed UFW ports (139/tcp, 445/tcp, 137/udp, 138/udp), and the `mount -t cifs` example are all technically correct.
- The post passes a plaintext password as a `mount` option, which is fine for a quick local test but is generally discouraged on shared systems because it ends up in shell history and `ps`. A credentials file (`credentials=/path/to/creds`) is the standard alternative — worth a future revision but not factually wrong.
- The `\\ubuntu-server.local` UNC path depends on mDNS (Avahi) being available on the network, which is not always the case on Windows; the IP-based fallback shown alongside is the safer default.
- `printing = bsd` is harmless given printing is fully disabled, but `printing = none` would also work and be slightly more explicit.
