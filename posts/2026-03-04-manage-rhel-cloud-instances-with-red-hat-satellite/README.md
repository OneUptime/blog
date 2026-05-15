# How to Manage RHEL Cloud Instances with Red Hat Satellite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Satellite, Cloud, Management, Patching

Description: Register RHEL cloud instances with Red Hat Satellite to centralize patching, content management, and compliance across your cloud fleet.

---

Red Hat Satellite provides centralized management for RHEL systems, including cloud instances running on AWS, Azure, or GCP. By registering cloud instances with Satellite, you get content management, patching, and compliance reporting in one place.

## Prerequisites

You need a running Satellite server (version 6.x) with the appropriate content views and activation keys configured. The cloud instances must be able to reach the Satellite server over HTTPS (port 443). If your registration workflow uses Capsule registration or HTTP callbacks, open the additional ports required for your Satellite topology.

## Register a Cloud Instance with Satellite

First, make sure the RHEL cloud instance trusts the Satellite CA certificate:

```bash
# Copy the Satellite CA certificate to the system trust store
sudo cp My_SSL_CA_file.pem /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

## Register Using an Activation Key

Generate a global registration command from Hosts > Register Host in the Satellite UI, or generate it from the Satellite server with Hammer:

```bash
# Generate the registration command with an activation key
hammer host-registration generate-command \
  --organization "My_Organization" \
  --activation-keys "cloud-rhel9-key" \
  --setup-remote-execution true

# Run the generated curl or wget command as root on the RHEL cloud instance

# Verify registration
sudo subscription-manager identity
```

## Install and Configure the Satellite Client

```bash
# Enable the Satellite client repo
sudo subscription-manager repos --enable=satellite-client-6-for-rhel-9-x86_64-rpms

# Install host tools
sudo dnf install -y katello-host-tools katello-host-tools-tracer

# Remote execution SSH keys can be deployed during global registration
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

# Apply selected errata to a host by using remote execution
hammer job-invocation create \
  --feature katello_errata_install \
  --inputs errata=RHSA-2025:1234 \
  --search-query "name = cloud-instance.example.com"
```

This approach works identically whether the host is on-premises or in any cloud provider, giving you a unified management plane.
