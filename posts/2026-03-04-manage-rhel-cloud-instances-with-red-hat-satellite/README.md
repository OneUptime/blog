# How to Manage RHEL Cloud Instances with Red Hat Satellite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Satellite, Cloud, Management, Patching

Description: Register RHEL cloud instances with Red Hat Satellite to centralize patching, content management, and compliance across your cloud fleet.

---

Red Hat Satellite provides centralized management for RHEL systems, including cloud instances running on AWS, Azure, or GCP. By registering cloud instances with Satellite, you get content management, patching, and compliance reporting in one place.

## Prerequisites

You need a running Satellite server (version 6.x) with the appropriate content views and activation keys configured. The cloud instances must be able to reach the Satellite server over HTTPS (port 443) and port 8443.

## Register a Cloud Instance with Satellite

First, install the Satellite CA certificate on the RHEL cloud instance:

```bash
# Download and install the Satellite CA certificate
sudo curl -o /etc/pki/ca-trust/source/anchors/katello-server-ca.pem \
  https://satellite.example.com/pub/katello-server-ca.pem
sudo update-ca-trust

# Install the consumer RPM from Satellite
sudo dnf install -y \
  https://satellite.example.com/pub/katello-ca-consumer-latest.noarch.rpm
```

## Register Using an Activation Key

```bash
# Register the system with an activation key
sudo subscription-manager register \
  --org="My_Organization" \
  --activationkey="cloud-rhel9-key" \
  --serverurl=https://satellite.example.com/rhsm

# Verify registration
sudo subscription-manager identity
```

## Install and Configure the Satellite Client

```bash
# Enable the Satellite client repo
sudo subscription-manager repos --enable=satellite-client-6-for-rhel-9-x86_64-rpms

# Install the katello agent and host tools
sudo dnf install -y katello-host-tools katello-host-tools-tracer

# Enable remote execution via SSH (for running jobs from Satellite)
# Satellite needs SSH access to the host on port 22
```

## Verify in the Satellite UI

After registration, the host appears in the Satellite web interface under Hosts > All Hosts. From there you can:

- Apply errata and security patches
- Assign the host to a host group
- Run remote jobs
- View compliance reports

## Using the Hammer CLI

```bash
# List all registered hosts from the Satellite server
hammer host list --organization "My_Organization"

# Apply all available errata to a host
hammer host errata apply \
  --host "cloud-instance.example.com" \
  --errata-ids "RHSA-2025:1234"
```

This approach works identically whether the host is on-premises or in any cloud provider, giving you a unified management plane.
