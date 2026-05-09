# Validation Summary: How to Troubleshoot Installation Issues with Calico on OpenStack DevStack

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- OpenStack DevStack
- networking-calico
- Neutron
- etcd
- systemd/journald
- Linux networking tools
- Python/pip

## Sources Consulted
- DevStack logging configuration: https://docs.openstack.org/devstack/latest/configuration.html
- DevStack systemd and journalctl documentation: https://docs.openstack.org/devstack/latest/systemd.html
- DevStack plugin syntax: https://files.openstack.org/docs/devstack/latest/plugins.html
- Calico DevStack installation documentation: https://docs.tigera.io/calico/latest/getting-started/openstack/installation/devstack
- Calico OpenStack configuration documentation: https://docs.tigera.io/calico/latest/networking/openstack/configuration
- networking-calico documentation: https://static.opendev.org/docs/networking-calico/latest/
- networking-calico DevStack plugin source history: https://opendev.org/openstack/networking-calico
- pip install help output from the local environment
- ss help output from the local environment

## Issues Found
- The post claimed DevStack provides per-service log files under `/opt/stack/logs/` by default. Current DevStack documentation says `stack.sh` output is only logged to a file when `LOGFILE` is configured, and systemd service logs are read with `journalctl`. Updated the logging guidance to include `stack.sh.log*`, `journalctl`, legacy screen logs, and Felix's `/var/log/calico/felix.log`.
- The Calico branch example used `stable/yoga`, but that branch is not present in the current public `networking-calico` repositories checked during review. Replaced it with the documented DevStack plugin line that omits a non-existent branch ref.
- The etcd commands referenced `devstack@calico-etcd`, but the networking-calico DevStack plugin enables DevStack's `etcd3` service. Updated the commands to check `devstack@etcd3` and the corresponding journal/screen logs.
- The Felix commands referenced `devstack@calico-felix`, but the plugin sets `Q_AGENT=calico-felix` to avoid DevStack's built-in agent handling and installs Felix as a Calico package. Updated the check to use the `calico-felix` service and `/var/log/calico/felix.log`.
- The Neutron configuration check looked for a `[calico]` section in `ml2_conf.ini`. Official Calico OpenStack documentation places Calico's etcd settings in the `[calico]` section of `/etc/neutron/neutron.conf`; `ml2_conf.ini` uses `[ml2]` keys such as `mechanism_drivers` when Calico is configured as an ML2 driver. Updated the commands accordingly.

## Review Notes
- The Calico OpenStack DevStack documentation and the public repository state are somewhat inconsistent: current Calico docs still reference `github.com/projectcalico/networking-calico`, while that repository currently states that source has moved. The post now avoids pinning a specific non-existent stable branch and tells readers to use the plugin reference documented for their tested DevStack/Calico combination.
