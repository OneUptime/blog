# Validation Summary: How to Deploy Verdaccio Private npm Registry on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Node.js
- npm
- Verdaccio
- systemd
- journalctl
- YAML configuration

## Sources Consulted
- Verdaccio Installation documentation: https://www.verdaccio.org/docs/installation/
- Verdaccio Configuration File documentation: https://www.verdaccio.org/docs/configuration/
- Verdaccio Server Configuration documentation: https://www.verdaccio.org/docs/server-configuration/
- Red Hat Enterprise Linux 9 DNF module installation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- systemctl help output from the local system
- journalctl help output from the local system
- Verdaccio npm package metadata and packaged systemd unit from npm

## Issues Found
- The post used placeholder paths such as `/etc/<service>/config.conf`, which are not valid Verdaccio paths. Changed them to `/etc/verdaccio/config.yaml`.
- The post used placeholder service names such as `<service-name>`, so the systemd commands would not run. Changed them to the concrete `verdaccio` service name.
- The post did not include commands to install Node.js, install Verdaccio, create the Verdaccio user, create the data/configuration directories, or install the systemd unit. Added the minimal setup commands required for the service commands to work on RHEL 9.
- The post did not include a valid Verdaccio configuration snippet. Added a minimal `config.yaml` using supported Verdaccio keys for storage, htpasswd authentication, npmjs uplink, package access rules, audit middleware, logging, and `listen`.
- The troubleshooting package check used `rpm -qa | grep <package-name>`, which does not correctly verify a globally installed npm package. Replaced it with `node -v`, `npm -v`, and `npm list -g verdaccio`.

## Review Notes
The guide now uses Verdaccio's npm-installed systemd unit and patches its `ExecStart` path to match the actual `verdaccio` binary location, because global npm prefixes can vary by system.
