# How to Install Calico on OpenStack DevStack Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, DevStack, Networking, Installation, Development

Description: A step-by-step guide to installing Calico as the networking backend for a DevStack-based OpenStack development environment.

---

## Introduction

DevStack is OpenStack's all-in-one development environment, designed for testing and development rather than production use. Installing Calico with DevStack lets developers test Calico's OpenStack integration without setting up a full multi-node deployment. DevStack's plugin architecture supports Calico through the `networking-calico` plugin, which automates the configuration steps that must be done manually in production deployments.

The DevStack approach is ideal for feature testing, development, and learning Calico's OpenStack integration. It deploys all OpenStack services and Calico components on a single machine, making it accessible for anyone with a Ubuntu VM and 8GB of RAM.

## Prerequisites

- Ubuntu 24.04 or 22.04 (or a VM with these specs)
- At least 8GB RAM and 40GB disk
- Python 3.8+ installed
- A non-root user with sudo access (DevStack should not be run as root)

## Step 1: Create the DevStack User

```bash
sudo useradd -s /bin/bash -d /opt/stack -m stack
sudo chmod +x /opt/stack
echo "stack ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/stack
sudo -u stack -i
```

## Step 2: Clone DevStack

```bash
git clone https://opendev.org/openstack/devstack.git /opt/stack/devstack
cd /opt/stack/devstack
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

# Use Calico instead of the default Neutron agents
enable_plugin calico https://github.com/projectcalico/calico master
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
ip route
```

## Step 6: Create a Test Network and VM

```bash
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1

openstack network create --share --provider-network-type local calico-test-net
openstack subnet create --network calico-test-net --gateway 10.65.0.1 \
  --dhcp --ip-version 4 --subnet-range 10.65.0.0/24 test-subnet

IMAGE_ID=$(openstack image list -f value -c ID -c Name | awk '/cirros/ {print $1; exit}')
FLAVOR_ID=$(openstack flavor list -f value -c ID -c Name | awk '$2 == "m1.tiny" {print $1; exit}')
openstack server create --network calico-test-net \
  --image "$IMAGE_ID" --flavor "$FLAVOR_ID" test-vm
openstack server list
```

## Conclusion

Installing Calico with DevStack takes a single `local.conf` configuration file and one `./stack.sh` execution. The `networking-calico` DevStack plugin automates all the configuration that would require multiple manual steps in a production deployment. DevStack with Calico is the fastest way to get a working Calico-OpenStack environment for development and testing purposes.
