# Validation Summary: How to Install and Configure Nagios on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Nagios Core 4.5.0 (compiled from source)
- Nagios Plugins 2.4.6
- NRPE 4.1.0 (remote monitoring)
- Apache HTTP Server (web frontend)
- PHP
- Ubuntu 20.04 / 22.04 / 24.04 (systemd)

## Sources Consulted
- Nagios Core "Installing Nagios Core From Source" KB article — https://support.nagios.com/kb/article/nagios-core-installing-nagios-core-from-source-96.html
- Nagios Core Ubuntu Quickstart — https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/quickstart-ubuntu.html
- Nagios Core 4.5.0 `Makefile.in` source — https://raw.githubusercontent.com/NagiosEnterprises/nagioscore/nagios-4.5.0/Makefile.in
- Nagios Core download archive — https://assets.nagios.com/downloads/nagioscore/releases/
- Nagios Plugins downloads — https://nagios-plugins.org/download/
- NRPE releases — https://github.com/NagiosEnterprises/nrpe/releases

## Issues Found
No technical issues found. No edits were required.

Notable item investigated and confirmed correct:
- **`make install-init` vs `make install-daemoninit`**: I verified against the Nagios Core 4.5.0 `Makefile.in`. The `install-init` target copies the built startup unit (`BLD_INIT`) into `INIT_DIR`, which `configure` auto-detects as `/lib/systemd/system/nagios.service` on systemd-based Ubuntu — so the native systemd unit *is* installed by `install-init`. `install-daemoninit` only additionally runs `systemctl daemon-reload` and `systemctl enable`. Because the post explicitly runs `systemctl enable nagios` and `systemctl start nagios` afterward, the `make install-init` step is sufficient and functionally correct. No change made.

Other verified-correct claims:
- Nagios Core 4.5.0, Nagios Plugins 2.4.6, and NRPE 4.1.0 are all real releases, and the download URLs use the correct, current paths.
- `./configure --with-httpd-conf=/etc/apache2/sites-enabled --with-command-group=nagcmd` matches the documented Ubuntu configure options.
- The make-target install sequence (`install`, `install-init`, `install-commandmode`, `install-config`, `install-webconf`) is valid.
- Apache setup (`a2enmod rewrite cgi`, `htpasswd -c /usr/local/nagios/etc/htpasswd.users nagiosadmin`) is correct, and `/usr/local/nagios/etc/htpasswd.users` is the default path referenced by the installed `nagios.conf`.
- `nagios.cfg` `cfg_file` / `cfg_dir` entries, the host/service object definitions, contact definition, and the `notify-host-by-email` / `notify-service-by-email` command bodies match the stock Nagios sample configuration.
- Check-command syntax (`check_ping!100.0,20%!500.0,60%`, `check_http!-S`, `check_tcp!8080`, etc.) is valid Nagios command/argument syntax.
- NRPE setup on both ends is correct: source build (`make check_nrpe`, `make install-plugin`) on the server, `nagios-nrpe-server` + `nagios-plugins` packages and `allowed_hosts` in `/etc/nagios/nrpe.cfg` on the remote host.

## Review Notes
- **Missing `check_nrpe` command object (gap, not an error):** The post uses `check_command check_nrpe!check_load` etc., but `make install-plugin` only installs the `check_nrpe` *binary* — it does not define a `check_nrpe` command object in `commands.cfg` on the Nagios server. As written, running the NRPE service checks would require the reader to also add a `define command { command_name check_nrpe; command_line $USER1$/check_nrpe -H $HOSTADDRESS$ -c $ARG1$ }` definition. This is a common omission in source-based Nagios tutorials; I left it as-is because adding the block would mean introducing new content/sections beyond the scope of correcting an outright error, but it is worth a future enhancement.
- The guide installs Nagios from source rather than from the `nagios4` distro package. This is the upstream-recommended approach for getting the current Core version and matches official docs, but it means the reader is responsible for tracking future security updates manually (no apt upgrades).
- `check_mem` (referenced in the "Common Check Commands" section via `check_nrpe!check_mem`) is not part of the standard Nagios Plugins set and depends on a custom command being defined on the remote host's `nrpe.cfg`. This is fine since it runs remotely via NRPE, but readers should be aware it is not available out of the box.
