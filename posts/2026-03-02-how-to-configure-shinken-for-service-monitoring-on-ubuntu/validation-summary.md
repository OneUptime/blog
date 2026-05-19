# Validation Summary: How to Configure Shinken for Service Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Shinken 2.4
- Nagios-compatible monitoring configuration
- Monitoring Plugins
- systemd
- Python packaging

## Sources Consulted
- Shinken 2.4 installation guide: https://shinken.readthedocs.io/en/latest/02_gettingstarted/installations/shinken-installation.html
- Shinken 2.4 basic configuration guide: https://shinken.readthedocs.io/en/latest/05_thebasics/configure-shinken.html
- Shinken 2.4 configuration verification guide: https://shinken.readthedocs.io/en/latest/04_runningshinken/verifyconfig.html
- Shinken 2.4 WebUI documentation: https://shinken.readthedocs.io/en/latest/11_integration/webui.html
- Shinken GitHub repository: https://github.com/shinken-solutions/shinken
- Monitoring Plugins check_http manual: https://www.monitoring-plugins.org/doc/man/check_http.html
- Monitoring Plugins check_ping manual: https://www.monitoring-plugins.org/doc/man/check_ping.html
- Monitoring Plugins check_ssh manual: https://www.monitoring-plugins.org/doc/man/check_ssh.html
- Monitoring Plugins check_disk manual: https://www.monitoring-plugins.org/doc/man/check_disk.html
- Monitoring Plugins check_load manual: https://www.monitoring-plugins.org/doc/man/check_load.html
- Ubuntu package metadata for monitoring-plugins, checked with `apt-cache show monitoring-plugins`
- PyPI package metadata for Shinken, checked with `python3 -m pip index versions Shinken`

## Issues Found
- The post said Shinken could be installed with Python 3 on modern Ubuntu. Shinken 2.4 is Python 2-era software and its PyPI package fails metadata generation under Python 3 syntax rules, so the prerequisites and pip/source commands were changed to Python 2 tooling with a modern-Ubuntu caveat.
- The post installed both `monitoring-plugins` and `nagios-plugins`. On Ubuntu package metadata, `monitoring-plugins` provides `nagios-plugins`; the duplicate/unavailable package name was removed.
- The source install used the old `naparuba/shinken` repository and `python3 setup.py install`. This was changed to the current `shinken-solutions/shinken` repository and Python 2 setup invocation.
- The configuration layout mixed daemon runtime files with daemon resource definition files. The arbiter example path was corrected to `/etc/shinken/arbiters/arbiter-master.cfg`, and the daemon runtime `.ini` files plus `/etc/shinken/shinken.cfg` were clarified.
- The systemd example passed resource definition files to daemon processes. It now maps the arbiter to `/etc/shinken/shinken.cfg` and the other daemons to their documented runtime `.ini` files.
- The configuration validation command pointed at an arbiter resource file. It now validates the global `/etc/shinken/shinken.cfg`, matching Shinken documentation.
- The HTTPS service check reused the plain HTTP command on port 443 without enabling SSL. A `check_https` command using `check_http -S` was added and the HTTPS service was updated to use it.
- The SSH check omitted the documented `-H` hostname option. The command definition was updated to use `check_ssh -H $HOSTADDRESS$`.
- The troubleshooting step used `which check_ping`, but Ubuntu monitoring plugins are normally installed under `/usr/lib/nagios/plugins`, which is not necessarily in `PATH`. The check was changed to inspect `/usr/lib/nagios/plugins/check_ping`.

## Review Notes
Shinken remains technically relevant as a Nagios-compatible monitoring framework, but it is legacy software. Future revisions should consider whether an Ubuntu 2026 audience would be better served by a maintained monitoring stack or by clearly scoping the tutorial to legacy/containerized Shinken deployments.
