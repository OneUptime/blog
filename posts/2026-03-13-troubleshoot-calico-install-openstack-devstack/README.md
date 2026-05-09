# How to Troubleshoot Installation Issues with Calico on OpenStack DevStack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Troubleshooting, Development

Description: A guide to diagnosing and resolving Calico installation failures in DevStack development environments.

---

## Introduction

DevStack with Calico can fail during installation for several reasons: networking-calico plugin version mismatches with the DevStack branch, etcd startup failures, Felix Python dependency conflicts, or networking issues with the DevStack VM's network configuration. Because DevStack installs everything from source, dependency conflicts are more common than with packaged production installations.

DevStack can write the `stack.sh` output to a log file when `LOGFILE` is configured, and service logs are available through either `journalctl` on systemd-based DevStack installs or screen log files on older/non-systemd DevStack runs. That makes it easier to diagnose failures than in production environments where logs are more scattered.

## Prerequisites

- DevStack installation attempted or partially completed
- Access to the DevStack VM
- `grep` and `less` for log analysis

## Step 1: Check DevStack Installation Logs

```bash
# Main DevStack log, if LOGFILE was configured
ls /opt/stack/logs/stack.sh.log*
grep -iE "error|fail|calico" /opt/stack/logs/stack.sh.log*

# Service logs on systemd-based DevStack installs
sudo journalctl --unit 'devstack@*' --grep='calico|etcd|fail|error' -n 200

# Legacy screen logs, if the Calico plugin disabled systemd
ls /opt/stack/logs/
tail -50 /opt/stack/logs/screen-calico-dhcp.log 2>/dev/null
tail -50 /var/log/calico/felix.log 2>/dev/null
```

## Step 2: Check for Python Dependency Conflicts

networking-calico has specific Python package dependencies that can conflict with other OpenStack services.

```bash
cd /opt/stack/networking-calico
pip3 install -e . 2>&1 | grep -iE "error|conflict"
```

If conflicts exist, check which networking-calico branch matches the DevStack branch:

```bash
# Check the plugin reference documented for the DevStack/Calico combination
# In local.conf:
# enable_plugin networking-calico https://github.com/projectcalico/networking-calico
```

## Step 3: Check etcd Startup

```bash
sudo systemctl status devstack@etcd3
sudo journalctl --unit devstack@etcd3 -n 50
tail -30 /opt/stack/logs/screen-etcd3.log 2>/dev/null
```

If etcd fails to start, check port conflicts:

```bash
sudo ss -tlnp | grep 2379
```

## Step 4: Check Felix Startup

```bash
sudo systemctl status calico-felix
tail -50 /var/log/calico/felix.log
```

Common Felix startup errors in DevStack:
- `Cannot connect to etcd` - etcd is not running yet
- `Failed to load module` - Python dependency missing

## Step 5: Re-run DevStack with Debug

```bash
cd /opt/stack/devstack
./unstack.sh
DEBUG=True ./stack.sh 2>&1 | tee /tmp/devstack-debug.log
```

## Step 6: Check Neutron Plugin Configuration

```bash
grep -E "^(core_plugin|service_plugins)" /etc/neutron/neutron.conf
grep -A10 "^\[calico\]" /etc/neutron/neutron.conf
grep -A5 "^\[ml2\]" /etc/neutron/plugins/ml2/ml2_conf.ini
```

## Conclusion

Troubleshooting DevStack Calico installations primarily involves reading the DevStack installation log and service logs, checking Python dependency compatibility between networking-calico and the DevStack branch, verifying etcd startup, and resolving port conflicts. The logs that DevStack generates during installation provide far more detail than is available in production deployments, making root cause identification faster in most cases.
