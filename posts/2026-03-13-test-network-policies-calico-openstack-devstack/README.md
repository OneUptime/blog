# How to Test Network Policies with Calico on OpenStack DevStack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Network Policies, Development

Description: A guide to testing OpenStack Security Group policy enforcement by Calico in a DevStack development environment.

---

## Introduction

DevStack with Calico provides an excellent environment for testing Security Group policy enforcement before deploying changes to production. The single-node architecture means you can observe policy enforcement in real time, modify Felix's logging level to debug to see exactly how policies are being processed, and iterate quickly on configuration changes without risking production stability.

The key advantage of DevStack for policy testing is access to Felix's debug logging and the ability to reset the environment with `./unstack.sh` and `./stack.sh` between test runs.

## Prerequisites

- DevStack with Calico installed
- OpenStack CLI sourced with admin credentials

## Step 1: Create Test Security Groups

```bash
source /opt/stack/devstack/openrc admin admin

# Restrictive security group - only ICMP
openstack security group create restrict-sg
openstack security group rule create --protocol icmp restrict-sg

# Permissive security group - ICMP and HTTP
openstack security group create allow-sg
openstack security group rule create --protocol icmp allow-sg
openstack security group rule create --protocol tcp --dst-port 80 allow-sg
```

## Step 2: Create Test VMs

```bash
openstack server create --network devstack-calico-net \
  --security-group restrict-sg \
  --image cirros --flavor cirros256 restricted-vm
openstack server create --network devstack-calico-net \
  --security-group allow-sg \
  --image cirros --flavor cirros256 allowed-vm
```

## Step 3: Enable Felix Debug Logging

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"logSeverityScreen":"Debug"}}'
sudo journalctl -u devstack@calico-felix -f &
```

## Step 4: Test Security Group Enforcement

From one VM's console, try to connect to the other:

```bash
# From the allowed-vm console:
# ICMP should work from restricted-vm
ping -c3 <restricted-vm-ip>
# HTTP should fail to restricted-vm (no HTTP rule)
curl --max-time 5 http://<restricted-vm-ip> || echo "Blocked"
```

## Step 5: Observe Felix Debug Logs

In the Felix log stream you enabled in Step 3, look for policy evaluation messages:

```bash
sudo journalctl -u devstack@calico-felix | grep -iE "policy|security.*group|iptables" | tail -20
```

## Step 6: Modify Security Group and Observe Change Propagation

```bash
# Add HTTP to restricted-sg
openstack security group rule create --protocol tcp --dst-port 80 restrict-sg
# Wait for Felix to update iptables
sleep 3
# HTTP should now succeed
```

## Conclusion

Testing Security Group policies with Calico in DevStack allows you to observe policy enforcement in real time through Felix's debug logs, test policy changes with immediate feedback, and iterate quickly on configuration. The ability to watch Felix process Security Group changes in real time is a powerful diagnostic tool that is not easily available in production environments.
