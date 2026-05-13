# How to Configure Calico on OpenStack DevStack for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Configuration, Development

Description: A guide to configuring Calico settings in a DevStack-based OpenStack development environment.

---

## Introduction

After DevStack installs Calico, the default configuration works for basic development and testing, but you may want to customize OpenStack subnets, BGP settings, or Felix configuration for specific test scenarios. DevStack's Calico configuration is managed through Neutron configuration and the same `calicoctl` resources stored in etcd as production OpenStack deployments, making it a realistic environment for testing configuration changes before applying them to production.

Understanding which configuration changes are stored in etcd versus which are regenerated from `local.conf` by `./stack.sh` is important for DevStack workflow management.

## Prerequisites

- DevStack with Calico installed
- `calicoctl` installed and configured to connect to the DevStack Calico etcd datastore

## Step 1: Check Default DevStack Calico Configuration

```bash
source /opt/stack/devstack/openrc admin admin
openstack subnet list
calicoctl get felixconfiguration default -o yaml
calicoctl get bgpconfiguration default -o yaml
```

## Step 2: Create a Subnet for Your Test Scenario

```bash
source /opt/stack/devstack/openrc admin admin
openstack network create --share --provider-network-type local calico-test-net
openstack subnet create --network calico-test-net \
  --subnet-range 10.65.0.0/24 \
  --gateway 10.65.0.1 \
  --dhcp \
  --ip-version 4 \
  calico-test-subnet
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

Configuration added via `calicoctl` is stored in etcd and can persist across DevStack service restarts while the etcd data directory is retained. DevStack service configuration is regenerated from `local.conf` on each `stack.sh` run, so add important service settings there.

```bash
cat <<'EOF' >> /opt/stack/devstack/local.conf

[[post-config|$NEUTRON_CONF]]
[calico]
etcd_host = 127.0.0.1
etcd_port = 2379
EOF
```

## Step 5: Configure BGP Defaults for Testing

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
calicoctl get felixconfiguration default -o yaml
calicoctl get bgpconfiguration default -o yaml
source /opt/stack/devstack/openrc admin admin
openstack network show calico-test-net
openstack subnet show calico-test-subnet
```

## Conclusion

Configuring Calico in a DevStack environment uses the same `calicoctl` commands as production OpenStack deployments. The key DevStack-specific consideration is that etcd-stored configuration, such as Felix and BGP settings, is separate from the Calico service configuration that DevStack regenerates from `local.conf`, such as plugin selection and the etcd endpoint. Understanding this separation helps you manage configuration across multiple DevStack re-runs effectively.
