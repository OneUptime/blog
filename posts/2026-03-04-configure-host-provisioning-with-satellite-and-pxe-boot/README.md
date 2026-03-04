# How to Configure Host Provisioning with Satellite and PXE Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Satellite, PXE Boot, Provisioning, Automation

Description: Set up automated RHEL host provisioning through Red Hat Satellite using PXE boot, enabling zero-touch deployment of bare-metal and virtual servers.

---

Satellite can provision RHEL hosts automatically using PXE boot. A new server boots from the network, receives its configuration from Satellite, and installs RHEL with the correct packages, configuration, and registration without manual intervention.

## Prerequisites

- Satellite Server or Capsule with DHCP, DNS, and TFTP services enabled
- A subnet configured in Satellite
- An activation key for host registration
- A synced RHEL installation media

## Enable Provisioning Services

```bash
# Enable DHCP, DNS, and TFTP on Satellite or Capsule
satellite-installer \
    --foreman-proxy-dhcp true \
    --foreman-proxy-dhcp-interface enp1s0 \
    --foreman-proxy-dhcp-range "192.168.1.100 192.168.1.200" \
    --foreman-proxy-dhcp-gateway 192.168.1.1 \
    --foreman-proxy-dhcp-nameservers 192.168.1.10 \
    --foreman-proxy-dns true \
    --foreman-proxy-dns-interface enp1s0 \
    --foreman-proxy-dns-zone example.com \
    --foreman-proxy-dns-reverse 1.168.192.in-addr.arpa \
    --foreman-proxy-tftp true \
    --foreman-proxy-tftp-servername 192.168.1.10
```

## Create a Subnet

```bash
# Create the provisioning subnet
hammer subnet create \
    --name "Provisioning-Net" \
    --network 192.168.1.0 \
    --mask 255.255.255.0 \
    --gateway 192.168.1.1 \
    --dns-primary 192.168.1.10 \
    --boot-mode DHCP \
    --domains "example.com" \
    --tftp-id 1 \
    --dhcp-id 1 \
    --dns-id 1 \
    --organizations "MyOrg" \
    --locations "Default Location"
```

## Create an Operating System Entry

```bash
# Create the OS entry
hammer os create \
    --name "RedHat" \
    --major 9 \
    --minor 3 \
    --family Redhat \
    --architectures x86_64 \
    --partition-tables "Kickstart default" \
    --media "Red Hat Enterprise Linux 9"
```

## Create a Provisioning Template

```bash
# List available provisioning templates
hammer template list --search "Kickstart"

# Associate the kickstart template with the OS
hammer os set-default-template \
    --id 1 \
    --provisioning-template "Kickstart default" \
    --template-kind provision
```

## Create a Host Group

Host groups bundle together common settings:

```bash
# Create a host group for web servers
hammer hostgroup create \
    --name "WebServers" \
    --architecture "x86_64" \
    --domain "example.com" \
    --subnet "Provisioning-Net" \
    --operatingsystem "RedHat 9.3" \
    --medium "Red Hat Enterprise Linux 9" \
    --partition-table "Kickstart default" \
    --root-password "ChangeMe123!" \
    --content-view "RHEL9-Base" \
    --lifecycle-environment "Production" \
    --organization "MyOrg" \
    --location "Default Location"
```

## Provision a Host

```bash
# Create and provision a new host
hammer host create \
    --name "webserver5" \
    --hostgroup "WebServers" \
    --mac "aa:bb:cc:dd:ee:ff" \
    --build true \
    --organization "MyOrg" \
    --location "Default Location"
```

Now power on the bare-metal server or VM. It will PXE boot, contact Satellite, download the kickstart, and install RHEL automatically.

## Verify Provisioning

```bash
# Check the host build status
hammer host info --name "webserver5.example.com"

# View provisioning logs
hammer host reports list --search "host = webserver5.example.com"
```

PXE-based provisioning through Satellite eliminates manual RHEL installations and ensures consistent configuration across your infrastructure.
