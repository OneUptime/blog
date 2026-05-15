# How to Install and Configure StrongSwan IPsec VPN on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VPN, Linux

Description: Step-by-step guide on install and configure strongswan ipsec vpn using Red Hat Enterprise Linux 9.

---

StrongSwan IPsec VPN can be installed and configured on RHEL from the EPEL repository to provide robust functionality for your infrastructure. Red Hat supports Libreswan as the built-in RHEL IPsec VPN implementation, so use StrongSwan only when you specifically need it and can support the EPEL package. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Peer VPN gateway details, including public IP addresses, local and remote subnets, and authentication method

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Enable CodeReady Builder and EPEL on RHEL 9
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# Install StrongSwan
sudo dnf install -y strongswan
```

On CentOS Stream 9, enable CRB and install the EPEL release packages before installing StrongSwan:

```bash
sudo dnf config-manager --set-enabled crb
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel{,-next}-release-latest-9.noarch.rpm
sudo dnf install -y strongswan
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/strongswan/swanctl/swanctl.conf
```

Adjust the settings according to your requirements. The example below shows a basic IKEv2 site-to-site tunnel using a pre-shared key. Replace the example IP addresses, subnets, identities, and secret with your own values.

```text
connections {
    site-to-site {
        version = 2
        local_addrs = 203.0.113.10
        remote_addrs = 198.51.100.20

        local {
            auth = psk
            id = rhel-gateway
        }
        remote {
            auth = psk
            id = remote-gateway
        }
        children {
            net {
                local_ts = 10.0.1.0/24
                remote_ts = 10.0.2.0/24
                start_action = start
            }
        }
    }
}

secrets {
    ike-site-to-site {
        id-1 = rhel-gateway
        id-2 = remote-gateway
        secret = "replace-with-a-long-random-pre-shared-key"
    }
}
```

Open IKE and NAT-T traffic if `firewalld` is running:

```bash
sudo firewall-cmd --permanent --add-service=ipsec
sudo firewall-cmd --reload
```

After saving the file, start the service and load the configuration.

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable strongswan

# Start the service
sudo systemctl start strongswan

# Load the configuration
sudo swanctl --load-all

# Check the status
sudo systemctl status strongswan
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status strongswan

# List loaded connections and active security associations
sudo swanctl --list-conns
sudo swanctl --list-sas

# Review recent logs
sudo journalctl -u strongswan --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `sudo journalctl -u strongswan -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep strongswan`.
- Reload the StrongSwan configuration after changes with `sudo swanctl --load-all`.
- If the tunnel does not establish, verify that UDP ports 500 and 4500 are allowed between both VPN peers.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
