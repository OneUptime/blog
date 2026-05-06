# Validation Summary: How to Configure Bareos with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Bareos
- IPv6
- Linux
- PostgreSQL
- `systemd`
- `bconsole`
- `ip6tables`

## Sources Consulted
- Bareos, Installing the Bareos Server: https://docs.bareos.org/IntroductionAndTutorial/InstallingBareos.html
- Bareos, Installing a Bareos Client: https://docs.bareos.org/IntroductionAndTutorial/InstallingBareosClient.html
- Bareos, Director Configuration: https://docs.bareos.org/master/Configuration/Director.html
- Bareos, Storage Daemon Configuration: https://docs.bareos.org/Configuration/StorageDaemon.html
- Bareos, Client/File Daemon Configuration: https://docs.bareos.org/Configuration/FileDaemon.html
- Bareos, Console Configuration: https://docs.bareos.org/Configuration/Console.html
- Bareos, Bareos Console: https://docs.bareos.org/master/TasksAndConcepts/BareosConsole.html
- Bareos, Volume Management: https://docs.bareos.org/TasksAndConcepts/VolumeManagement.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- The installation section used `bareos-dbinit`, which is not the current Bareos catalog setup flow in the official docs. I replaced it with the documented PostgreSQL catalog initialization scripts and clarified that Debian/Ubuntu can create the catalog during package installation via `dbconfig-common`.
- The package installation examples did not reflect the current documented split between the server install and the client install. I changed the server examples to use `bareos` with `bareos-database-postgresql`, and I added `bareos-filedaemon` for remote clients.
- The Director section only bound the Director to an IPv6 address, but it did not define the Director-side `Storage` resource needed for `Storage = File` jobs to contact the Storage Daemon over IPv6. I added the matching `Storage` resource with the IPv6 address, port, password, device, and media type.
- The Storage Daemon section did not include the `Director` resource required to authorize the Director, and the `Device` resource omitted `Media Type = File`, which Bareos requires to match the Director-side storage definition. I added both.
- The Director password example could break the later `bconsole` checks if the console configuration is not updated to match. I added a note making that dependency explicit.
- The `Plugin Directory = /usr/lib/bareos/plugins` lines were platform-specific and not required for IPv6 configuration. I removed them to avoid implying a single path that is not valid on all supported Linux distributions.
- The service startup commands used Debian service names only. I corrected the section to show the documented `bareos-director`/`bareos-storage`/`bareos-filedaemon` names on Debian-family systems and `bareos-dir`/`bareos-sd`/`bareos-fd` on RPM-based systems.
- The verification commands were too generic for the described goal. I changed the socket check to use IPv6-only `ss` output and replaced the generic `status` call with `status storage=File`, which directly verifies the Director-to-Storage Daemon connection.
- The firewall persistence command used a Debian-specific save path without saying so. I scoped that line to Debian/Ubuntu systems using `iptables-persistent`.

## Review Notes
- The example IPv6 addresses use `2001:db8::/32`, which is the RFC 3849 documentation prefix. That is correct for a blog example, but readers need to replace those addresses with real production IPv6 addresses.
- `Signature = MD5` is still supported by Bareos, but Bareos documents that MD5 can fail on FIPS-enabled systems. `SHA256` is a safer choice if the target environment enforces FIPS.
- The job example still assumes existing `Schedule`, `Pool`, and `Messages` resources such as `WeeklyCycle`, `Incremental`, and `Standard`, which is consistent with many default Bareos installs but may need adjustment in minimal or heavily customized deployments.
