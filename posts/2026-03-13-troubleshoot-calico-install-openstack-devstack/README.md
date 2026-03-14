# How to Troubleshoot Installation Issues with Calico on OpenStack DevStack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Troubleshooting, Development

Description: A guide to diagnosing and resolving Calico installation failures in DevStack development environments.

---

## Introduction

DevStack with Calico can fail during installation for several reasons: networking-calico plugin version mismatches with the DevStack branch, etcd startup failures, Felix Python dependency conflicts, or networking issues with the DevStack VM's network configuration. Because DevStack installs everything from source, dependency conflicts are more common than with packaged production installations.

DevStack provides a `logs/` directory with detailed logs from each service's installation and startup, making it easier to diagnose failures than in production environments where logs are more scattered.

## Prerequisites

- DevStack installation attempted or partially completed
- Access to the DevStack VM
- `grep` and `less` for log analysis

## Step 1: Check DevStack Installation Logs

```bash
# Main DevStack log
less /opt/stack/logs/stack.sh.log | grep -iE "error|fail|calico"

# Calico-specific service logs
ls /opt/stack/logs/
cat /opt/stack/logs/calico-felix.log.txt | tail -50
```

## Step 2: Check for Python Dependency Conflicts

networking-calico has specific Python package dependencies that can conflict with other OpenStack services.

```bash
cd /opt/stack/networking-calico
pip3 install -e . 2>&1 | grep -iE "error|conflict"
```

If conflicts exist, check which networking-calico branch matches the DevStack branch:

```bash
# Ensure using matching branches
# In local.conf:
# enable_plugin networking-calico https://opendev.org/openstack/networking-calico.git stable/yoga
```

## Step 3: Check etcd Startup

```bash
sudo systemctl status devstack@calico-etcd
cat /opt/stack/logs/calico-etcd.log.txt | tail -30
```

If etcd fails to start, check port conflicts:

```bash
sudo ss -tlnp | grep 2379
```

## Step 4: Check Felix Startup

```bash
sudo systemctl status devstack@calico-felix
cat /opt/stack/logs/calico-felix.log.txt | tail -50
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
cat /etc/neutron/neutron.conf | grep core_plugin
cat /etc/neutron/plugins/ml2/ml2_conf.ini | grep -A5 "\[calico\]"
```

## Conclusion

Troubleshooting DevStack Calico installations primarily involves reading the detailed logs in `/opt/stack/logs/`, checking Python dependency compatibility between networking-calico and the DevStack branch, verifying etcd startup, and resolving port conflicts. The log files that DevStack generates during installation provide far more detail than is available in production deployments, making root cause identification faster in most cases.
