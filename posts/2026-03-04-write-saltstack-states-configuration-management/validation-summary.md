# Validation Summary: How to Write SaltStack States for RHEL Configuration Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- SaltStack/Salt states
- Salt bootstrap installation
- firewalld
- systemd
- Apache HTTP Server/httpd

## Sources Consulted
- Salt Project installation guide, bootstrap installation: https://docs.saltproject.io/salt/install-guide/en/latest/topics/bootstrap.html
- Salt Project masterless quickstart: https://docs.saltproject.io/en/latest/topics/tutorials/quickstart.html
- Salt Project `pkg.installed` state documentation: https://docs.saltproject.io/en/latest/ref/states/all/salt.states.pkg.html
- Salt Project requisites documentation: https://docs.saltproject.io/salt/user-guide/en/latest/topics/requisites.html
- Salt Project `salt-call` CLI documentation: https://docs.saltproject.io/en/latest/ref/cli/salt-call.html
- Red Hat Enterprise Linux 8 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/using-and-configuring-firewalld_configuring-and-managing-networking
- systemd `systemctl` documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Local `top --help` and `pgrep --help` output

## Issues Found
- The performance monitoring command `top -p $(pidof httpd)` could fail when multiple `httpd` processes are running, because `pidof` returns space-separated PIDs and `top -p` expects a PID list argument. Changed it to `top -p "$(pgrep -d, httpd)"`, which produces a comma-separated PID list suitable for `top -p`.

## Review Notes
The Salt bootstrap command, masterless `file_client: local` configuration, `salt-call --local state.apply`, `pkg.installed`, `service.running`, requisites, and firewalld commands match current official documentation. The guide uses Salt 3006.25, which is shown in current Salt bootstrap documentation examples.
