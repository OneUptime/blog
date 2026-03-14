# How to Configure Calico on OpenStack DevStack for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Configuration, Development

Description: A guide to configuring Calico settings in a DevStack-based OpenStack development environment.

---

## Introduction

After DevStack installs Calico, the default configuration works for basic development and testing, but you may want to customize IP pools, BGP settings, or Felix configuration for specific test scenarios. DevStack's Calico configuration is managed through the same `calicoctl` and etcd-backed CRDs as production deployments, making it a realistic environment for testing configuration changes before applying them to production.

Understanding which configuration changes persist across DevStack re-runs (those stored in etcd) versus which are reset by `./stack.sh` (those in local.conf) is important for DevStack workflow management.

## Prerequisites

- DevStack with Calico installed
- `calicoctl` installed (DevStack installs this automatically with the Calico plugin)

## Step 1: Check Default DevStack Calico Configuration

```bash
calicoctl get ippool -o wide
calicoctl get felixconfiguration default -o yaml
calicoctl get bgpconfiguration default -o yaml
```

## Step 2: Modify the IP Pool for Your Test Scenario

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"cidr":"10.65.0.0/16","blockSize":26}}'
```

## Step 3: Configure Felix for Test Scenarios

For testing policy change propagation:

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Debug",
    "iptablesRefreshInterval": "5s"
  }}'
```

For production-like settings:

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Warning",
    "iptablesRefreshInterval": "60s"
  }}'
```

## Step 4: Add Configuration to local.conf for Persistence

Configuration added via `calicoctl` is stored in etcd and does not persist across DevStack re-runs. Add important configuration to `local.conf` to ensure it is applied on each `stack.sh` run.

```bash
cat <<EOF >> /opt/stack/devstack/local.conf

[[post-config|$NEUTRON_CONF]]
[calico]
etcd_host = 127.0.0.1
etcd_port = 2379
EOF
```

## Step 5: Configure BGP for External Router Testing

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 64512
EOF
```

## Step 6: Verify Configuration

```bash
calicoctl get ippool default-ipv4-ippool -o yaml
calicoctl get felixconfiguration default -o yaml
source /opt/stack/devstack/openrc admin admin
openstack network create test-net
openstack subnet create --network test-net --subnet-range 10.65.0.0/24 test-subnet
```

## Conclusion

Configuring Calico in a DevStack environment uses the same `calicoctl` commands as production. The key DevStack-specific consideration is that etcd-stored configuration (Felix settings, IP pools) persists independently of DevStack, while the Calico service configuration (plugin selection, etcd endpoint) is managed through `local.conf`. Understanding this separation helps you manage configuration across multiple DevStack re-runs effectively.
