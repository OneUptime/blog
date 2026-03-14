# How to Install Calico on OpenStack DevStack Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Installation, Development

Description: A step-by-step guide to installing Calico as the networking backend for a DevStack-based OpenStack development environment.

---

## Introduction

DevStack is OpenStack's all-in-one development environment, designed for testing and development rather than production use. Installing Calico with DevStack lets developers test Calico's OpenStack integration without setting up a full multi-node deployment. DevStack's plugin architecture supports Calico through the `networking-calico` plugin, which automates the configuration steps that must be done manually in production deployments.

The DevStack approach is ideal for feature testing, development, and learning Calico's OpenStack integration. It deploys all OpenStack services and Calico components on a single machine, making it accessible for anyone with a Ubuntu VM and 8GB of RAM.

## Prerequisites

- Ubuntu 22.04 or 20.04 (or a VM with these specs)
- At least 8GB RAM and 40GB disk
- Python 3.8+ installed
- A non-root user with sudo access (DevStack should not be run as root)

## Step 1: Create the DevStack User

```bash
sudo useradd -s /bin/bash -d /opt/stack -m stack
echo "stack ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/stack
sudo -u stack -i
```

## Step 2: Clone DevStack

```bash
git clone https://opendev.org/openstack/devstack.git /opt/stack/devstack
cd /opt/stack/devstack
git checkout stable/yoga  # Use a stable branch
```

## Step 3: Configure DevStack with Calico

Create the DevStack configuration file:

```bash
cat <<EOF > /opt/stack/devstack/local.conf
[[local|localrc]]
HOST_IP=$(hostname -I | awk '{print $1}')
ADMIN_PASSWORD=secret
DATABASE_PASSWORD=secret
RABBIT_PASSWORD=secret
SERVICE_PASSWORD=secret

# Use Calico instead of OVS
Q_PLUGIN=calico
enable_plugin networking-calico https://opendev.org/openstack/networking-calico.git stable/yoga

# Basic services
enable_service key,n-api,n-cond,n-sch,n-crt
enable_service g-api,g-reg
enable_service c-api,c-vol,c-sch
enable_service neutron,q-svc,q-dhcp,q-meta

# Calico services
enable_service calico-etcd
enable_service calico-felix
enable_service calico-bird
EOF
```

## Step 4: Run stack.sh

```bash
cd /opt/stack/devstack
./stack.sh
```

DevStack will install all dependencies, clone OpenStack projects, configure the services, and start them. This takes 10-30 minutes.

## Step 5: Verify the Installation

```bash
source /opt/stack/devstack/openrc admin admin
openstack network list
openstack server list
calicoctl node status
```

## Step 6: Create a Test Network and VM

```bash
openstack network create calico-test-net
openstack subnet create --network calico-test-net \
  --subnet-range 10.65.1.0/24 test-subnet
openstack server create --network calico-test-net \
  --image cirros --flavor cirros256 test-vm
openstack server list
```

## Conclusion

Installing Calico with DevStack takes a single `local.conf` configuration file and one `./stack.sh` execution. The `networking-calico` DevStack plugin automates all the configuration that would require multiple manual steps in a production deployment. DevStack with Calico is the fastest way to get a working Calico-OpenStack environment for development and testing purposes.
