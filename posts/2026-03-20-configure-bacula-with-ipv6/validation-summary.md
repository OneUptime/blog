# Validation Summary: How to Configure Bacula with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Bacula
- IPv6
- Linux
- `ip6tables`
- Bacula Director (`bacula-dir`)
- Bacula Storage Daemon (`bacula-sd`)
- Bacula File Daemon (`bacula-fd`)
- `bconsole`

## Sources Consulted
- Bacula 15.0 Main Reference, Configuring the Director: https://www.bacula.org/15.0.x-manuals/en/main/Configuring_Director.html
- Bacula 15.0 Main Reference, Storage Daemon Configuration: https://www.bacula.org/15.0.x-manuals/en/main/Storage_Daemon_Configuratio.html
- Bacula 15.0 Main Reference, Client/File daemon Configuration: https://www.bacula.org/15.0.x-manuals/en/main/Client_File_daemon_Configur.html
- Bacula 15.0 Main Reference, Getting Started with Bacula: https://www.bacula.org/15.0.x-manuals/en/main/Getting_Started_with_Bacula.html
- Bacula Developer's Guide, Daemon Protocol: https://www.bacula.org/7.4.x-manuals/en/developers/Daemon_Protocol.html
- Bacula Console guide for `status` and `run` command syntax: https://www.bacula.org/7.0.x-manuals/en/console/Bacula_Console.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- The introduction and architecture diagram were technically misleading. Bacula's backup path centers on the Director, Storage Daemon, and File Daemon, but `9101` is the Director's console port rather than the port used for Director-to-daemon control traffic. I corrected the component naming and rewrote the diagram so the control flow, console access, and backup data path match Bacula's documented protocol.
- The Director example used `DirAddress`/`DIRport` instead of the documented `DirAddresses` form for explicit IPv6 binding. I replaced it with `DirAddresses { ipv6 = { ... } }` so the IPv6 listener example matches Bacula's documented address-binding syntax.
- The Storage Daemon example mixed `SDAddress`/`SDPort` with `SDAddresses`, omitted the required `Director` resource used to authorize the Director, and omitted the required `Media Type` in the `Device` resource. I removed the duplicate single-address directives and added the missing authorization and media-type fields.
- The File Daemon example mixed `FDAddress`/`FDPort` with `FDAddresses`. I reduced it to the documented `FDAddresses` IPv6 binding form.
- The job example used an inline explanatory comment on the `Client` directive. I moved that explanation to its own comment line so the config example stays unambiguous.
- The testing section incorrectly described `bacula-sd -t` as a connectivity test and piped `quit` into a syntax-check command. I corrected the command comments and added `yes` to the `bconsole run` example so it works non-interactively as documented.
- The firewall section implied the same rules apply identically everywhere and treated `/etc/ip6tables/rules.v6` as a generic save location. I kept the commands but clarified which host each port applies to and that the save path is for systems using `iptables-persistent`.

## Review Notes
- The post now correctly presents the configuration blocks as IPv6-related excerpts rather than complete Bacula configuration files. A full working deployment still needs the rest of the standard Bacula resources in the complete config files.
- `2001:db8::/32` is the correct documentation prefix for example IPv6 addresses, so those sample addresses were left in place.
- Bacula binaries are not installed in this environment, so validation was performed against official documentation rather than by running the daemons locally.
