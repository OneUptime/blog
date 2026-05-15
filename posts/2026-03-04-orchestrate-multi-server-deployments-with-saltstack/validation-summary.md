# Validation Summary: How to Orchestrate Multi-Server Deployments with SaltStack on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- SaltStack / Salt Project
- Salt master and minion services
- Salt orchestration SLS files
- systemd
- firewalld

## Sources Consulted
- Salt Project install guide: Linux RPM installation: https://docs.saltproject.io/salt/install-guide/en/latest/topics/install-by-operating-system/linux-rpm.html
- Salt Project install guide: configure the Salt master and minions: https://docs.saltproject.io/salt/install-guide/en/latest/topics/configure-master-minion.html
- Salt Project install guide: accept minion keys: https://docs.saltproject.io/salt/install-guide/en/latest/topics/accept-keys.html
- Salt Project install guide: verify a Salt install: https://docs.saltproject.io/salt/install-guide/en/latest/topics/verify-install.html
- Salt Project install guide: network ports: https://docs.saltproject.io/salt/install-guide/en/latest/topics/before-you-start/check-network-ports.html
- Salt Project user guide: runners and orchestration: https://docs.saltproject.io/salt/user-guide/en/latest/topics/runners-orchestration.html
- Salt Project documentation: Orchestrate Runner: https://docs.saltproject.io/en/master/topics/orchestrate/orchestrate_runner.html
- firewalld documentation: firewall-cmd utility: https://firewalld.org/documentation/utilities/firewall-cmd

## Issues Found
- The original installation section used generic placeholders such as `<package-name>` instead of Salt packages. Replaced them with the official Salt repository setup and `salt-master` / `salt-minion` package installation commands.
- The original configuration section used a placeholder `/etc/<service>/config.conf` path. Replaced it with Salt minion configuration under `/etc/salt/minion.d/master.conf` and an orchestration file under `/srv/salt/orch/deploy_web.sls`.
- The post did not include a valid Salt orchestration example. Added a minimal orchestration SLS using `salt.state`, `highstate: True`, targets, and a requisite to order work between minion groups.
- The original service management commands used `<service>`. Replaced them with `salt-master` and `salt-minion` systemd commands.
- The original verification command used `sudo <service> --test`, which is not a Salt verification workflow. Replaced it with `salt-key`, `salt-key -a`, `salt '*' test.version`, and `salt-run state.orchestrate orch.deploy_web`.
- The original firewall command used `--add-service=<service>`, but Salt does not provide a generic firewalld service name in the post. Replaced it with the Salt master TCP ports `4505` and `4506`.
- The original performance and troubleshooting examples used placeholder service names. Replaced them with Salt service names.
- The original security guidance referred generically to non-root service users and TLS/SSL. Replaced it with Salt-appropriate guidance to limit master access, accept only trusted minion keys, and restrict Salt master ports.

## Review Notes
The post is now technically valid as a basic Salt master/minion orchestration guide. Future improvements could clarify whether the environment is RHEL 8, RHEL 9, or a RHEL-compatible distribution.
