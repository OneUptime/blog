# Validation Summary: Creating and Managing AppArmor Profiles on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux Security Modules
- AppArmor profiles and utilities
- Docker AppArmor integration
- Kubernetes AppArmor configuration
- Bash shell commands
- YAML manifests

## Sources Consulted
- Ubuntu Server AppArmor documentation: https://ubuntu.com/server/docs/how-to/security/apparmor/
- Ubuntu `apparmor.d` man page: https://manpages.ubuntu.com/manpages/trusty/man5/apparmor.d.5.html
- AppArmor profile quick reference: https://apparmor.net/reference/profiles-quick-reference/
- AppArmor Ubuntu distribution notes: https://apparmor.net/about/distros/Distro_ubuntu/
- Docker AppArmor security documentation: https://docs.docker.com/engine/security/apparmor/
- Kubernetes AppArmor tutorial and API guidance: https://kubernetes.io/docs/tutorials/security/apparmor/
- Local `apparmor_parser --help` and `apparmor_parser -Q -K` syntax checks

## Issues Found
- Corrected the AppArmor file permission descriptions for append and execute modes. Append mode conflicts with write mode and does not imply unrestricted write access; execute access is expressed through modes such as `ix`, `px`, `ux`, and `cx`.
- Changed log file examples that were described as append-only from `w` to `a`.
- Fixed the Node.js AppArmor profile header. AppArmor profile attachment is based on executable paths, not a Node script argument list, so the invalid `/usr/bin/node /opt/mywebapp/server.js` attachment was replaced with a valid `/usr/bin/node` attachment.
- Changed custom local includes to `include if exists` so new custom profiles do not fail to load when the matching file under `/etc/apparmor.d/local/` has not been created.
- Updated Docker `docker-default` guidance. Docker generates and loads the default profile, but it is not reliably available as `/etc/apparmor.d/docker-default` inside the host or a container.
- Updated Kubernetes AppArmor YAML from the deprecated pre-1.30 annotation format to the current `securityContext.appArmorProfile` field.
- Added installation of the `apparmor` package to the profile-loader DaemonSet example so `apparmor_parser` is available in the Ubuntu container image.
- Commented a profile path line in the tunables example so it is not interpreted as AppArmor policy syntax.
- Added the missing `/opt/apparmor-profiles/local` directory creation command before copying local profile overrides into it.
- Added missing `#include <tunables/global>` lines to advanced AppArmor snippets that include abstractions referencing AppArmor tunables.
- Reworded the `less` command comment because plain `less` does not provide syntax highlighting by itself.

## Review Notes
The main profile snippets were checked with `apparmor_parser -Q -K` where possible. The tunables example depends on the reader creating `/etc/apparmor.d/tunables/myapp` as instructed before loading the profile.
