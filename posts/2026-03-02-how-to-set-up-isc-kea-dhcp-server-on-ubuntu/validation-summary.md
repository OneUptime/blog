# Validation Summary: How to Set Up ISC Kea DHCP Server on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- ISC Kea DHCP server (DHCPv4)
- Ubuntu
- Kea Control Agent (REST API)
- MySQL (as Kea lease database backend)
- systemd
- ufw firewall

## Sources Consulted
- Kea ARM (Administrator Reference Manual): https://kea.readthedocs.io/en/latest/arm/install.html
- Kea DHCPv4 server reference: https://kea.readthedocs.io/en/latest/arm/dhcp4-srv.html
- Kea Control Agent: https://kea.readthedocs.io/en/latest/arm/agent.html
- Kea database administration: https://kea.readthedocs.io/en/latest/arm/admin.html
- Kea logging: https://kea.readthedocs.io/en/latest/arm/logging.html
- Kea lease expiration: https://kea.readthedocs.io/en/kea-2.4.2/arm/lease-expiration.html
- Kea management API: https://kea.readthedocs.io/en/kea-2.4.1/arm/ctrl-channel.html
- ISC Kea Packages KB: https://kb.isc.org/docs/isc-kea-packages
- ISC Cloudsmith Kea 2.4 setup: https://cloudsmith.io/~isc/repos/kea-2-4/setup/

## Issues Found
1. **Incorrect ISC Cloudsmith package name** (`isc-kea-dhcp4-server`): The current ISC Cloudsmith package for the DHCPv4 server is `isc-kea-dhcp4`. The `isc-kea-dhcp4-server` form was only a short-lived transitional package in 2.3.3. Changed to `isc-kea-dhcp4` in the ISC-repo install command.
2. **Inconsistent control-agent package vs. service name**: The post installed `isc-kea-ctrl-agent` (ISC-repo naming) but then used `systemctl start kea-ctrl-agent` (Ubuntu-repo naming) — these would not match on the same system. Changed the install command to `kea-ctrl-agent` to be consistent with the surrounding systemd commands that all use the Ubuntu-repo naming.
3. **MySQL section installed redundant Kea packages with mismatched naming**: The MySQL section ran `apt install -y isc-kea-dhcp4-server isc-kea-admin mysql-server`, which (a) used the wrong ISC package name, (b) mixed ISC naming with the Ubuntu-naming used elsewhere, and (c) redundantly reinstalled packages already installed earlier. Simplified to install only `mysql-server`, since the MySQL backend is bundled with the Kea packages on Ubuntu and a separate connector package is not required.

## Review Notes
- The post references `kea-2-4` on Cloudsmith. Kea 2.4 reached end-of-life in mid-2025; the URL still resolves and the install still works, but readers may want to use a current LTS (e.g. `kea-2-6` or `kea-3-0`) for new deployments. Left the version reference as-is since changing it goes beyond fixing technical errors.
- The post uses `output_options` (underscored) in the loggers configuration. As of Kea 2.7.4 this is deprecated in favor of `output-options` (hyphenated). Both are still accepted by current parsers, so this is not a functional error.
- The systemd unit naming differs between ISC-repo and Ubuntu-repo installs (`isc-kea-*` vs `kea-*`). The post now consistently uses the Ubuntu-repo naming for systemctl commands. Readers who chose the ISC-repo path will need to substitute `isc-kea-dhcp4-server` and `isc-kea-ctrl-agent` for the service names.
- `kea-admin db-init mysql -u kea -p keapassword -n kea` is correct; `-u`/`-p`/`-n` map to user, password, and database name as documented.
- REST API `service` field as a JSON array of strings (e.g. `["dhcp4"]`) is correct per the Kea management API documentation.
- `dhcp-socket-type: "raw"` is correct (and is in fact the default); `udp` is the alternative.
- Default Kea Control Agent port (8000) is correct.
