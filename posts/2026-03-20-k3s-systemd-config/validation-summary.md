# Validation Summary: How to Configure K3s with Systemd

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- systemd
- Linux service management
- Kubernetes node and service configuration
- NetworkManager and systemd-networkd wait-online services

## Sources Consulted
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Environment Variables: https://docs.k3s.io/reference/env-variables
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Agent CLI Reference: https://docs.k3s.io/cli/agent
- Official K3s install script: https://get.k3s.io
- systemd.service(5): https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.special(7): https://www.freedesktop.org/software/systemd/man/latest/systemd.special.html
- systemd.resource-control(5): https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- systemd-networkd-wait-online.service(8): https://www.freedesktop.org/software/systemd/man/latest/systemd-networkd-wait-online.service.html
- NetworkManager-wait-online.service: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager-wait-online.service.html

## Issues Found
- The sample `k3s.service` unit was stale. I removed the obsolete `nm-cloud-setup` `ExecStartPre`, added the current `User=root` line, corrected the generated environment-file path, and aligned the `ExecStart` example with the current installer output from `https://get.k3s.io`.
- The post used `MemoryLimit=` in systemd examples. That directive is deprecated in current systemd, so I replaced it with `MemoryMax=` in the server override and resource-limit examples.
- The network-wait example used `ping 8.8.8.8`, which tests external reachability rather than a specific local interface and does not reflect how `network-online.target` is intended to work. I replaced it with guidance to enable the appropriate wait-online service for `systemd-networkd` or NetworkManager.
- The agent example implied that restarting `k3s-agent` with new `--node-label` flags would update labels. K3s applies `--node-label` only at node registration time, so I added a note directing readers to `kubectl label node` for existing nodes.
- The I/O control example used `IOWeight=100`, which is the systemd default and does not lower I/O priority. I changed the example to `IOWeight=50` so it actually demonstrates a lower relative weight.
- I tightened a couple of broad statements so they accurately describe default install-script behavior rather than all possible K3s installation modes.

## Review Notes
- The reviewed paths and unit names are the defaults created by the K3s install script. They can differ if `INSTALL_K3S_NAME` or `INSTALL_K3S_SYSTEMD_DIR` is set during installation.
- For long-lived cluster configuration, K3s also supports `/etc/rancher/k3s/config.yaml`; the post's systemd examples are still valid for service-level overrides.
