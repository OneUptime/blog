# How to Set Up Satellite Capsule Server for Remote Locations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Satellite, Capsule, Infrastructure, Remote Management

Description: Deploy a Red Hat Satellite Capsule Server to serve content and manage RHEL hosts at remote locations, reducing bandwidth usage and improving local performance.

---

A Satellite Capsule Server acts as a local proxy for content delivery, provisioning, and host management at remote sites. It caches packages locally and communicates with the central Satellite Server, reducing WAN traffic.

## Prerequisites

The Capsule host needs:
- The latest supported RHEL 8 release with at least 12 GB RAM, 4 GB swap, and a 4-core 2.0 GHz CPU
- A valid Red Hat subscription with Satellite infrastructure
- DNS resolution between Satellite Server and Capsule
- Required Capsule ports open for your services, including 443 and 9090 from Satellite to the Capsule and 80, 443, 8000, and 9090 from clients

## Register the Capsule Host

```bash
# Generate the host registration command on the Satellite Server
hammer host-registration generate-command \
    --activation-keys "capsule-key"

# Run the generated curl command on the Capsule host as root

# Enable required repositories
sudo subscription-manager repos --disable='*'
sudo subscription-manager repos \
    --enable=rhel-8-for-x86_64-baseos-rpms \
    --enable=rhel-8-for-x86_64-appstream-rpms \
    --enable=satellite-capsule-6.15-for-rhel-8-x86_64-rpms \
    --enable=satellite-maintenance-6.15-for-rhel-8-x86_64-rpms

# Enable the Capsule module
sudo dnf module enable -y satellite-capsule:el8

# Update installed packages
sudo dnf upgrade -y

# Install the Capsule packages
sudo dnf install -y satellite-capsule
```

## Generate Certificates on the Satellite Server

On the main Satellite Server, generate certificates for the Capsule:

```bash
# Generate Capsule certificates
capsule-certs-generate \
    --foreman-proxy-fqdn capsule.example.com \
    --certs-tar /root/capsule.example.com-certs.tar

# Copy the tar file to the Capsule host
scp /root/capsule.example.com-certs.tar root@capsule.example.com:/root/
```

## Install the Capsule

On the Capsule host, run the installer with the certs:

```bash
# Run the Capsule installer
satellite-installer --scenario capsule \
    --certs-tar-file /root/capsule.example.com-certs.tar \
    --foreman-proxy-register-in-foreman true \
    --foreman-proxy-foreman-base-url https://satellite.example.com \
    --foreman-proxy-oauth-consumer-key "OAUTH_KEY_FROM_SATELLITE" \
    --foreman-proxy-oauth-consumer-secret "OAUTH_SECRET_FROM_SATELLITE" \
    --foreman-proxy-trusted-hosts satellite.example.com \
    --foreman-proxy-trusted-hosts capsule.example.com \
    --enable-foreman-proxy-plugin-remote-execution-script
```

## Assign Lifecycle Environments to the Capsule

On the Satellite Server, assign content to the Capsule:

```bash
# Add lifecycle environments to the Capsule
hammer capsule content available-lifecycle-environments \
    --id 2

hammer capsule content add-lifecycle-environment \
    --id 2 \
    --lifecycle-environment-id 3 \
    --organization "MyOrg"

hammer capsule content add-lifecycle-environment \
    --id 2 \
    --lifecycle-environment-id 4 \
    --organization "MyOrg"

# Synchronize content to the Capsule
hammer capsule content synchronize --id 2
```

## Configure Firewall on the Capsule

```bash
# Open required ports and services
sudo firewall-cmd \
    --add-port="8000/tcp" \
    --add-port="9090/tcp"
sudo firewall-cmd \
    --add-service=dns \
    --add-service=dhcp \
    --add-service=tftp \
    --add-service=http \
    --add-service=https \
    --add-service=puppetmaster
sudo firewall-cmd --runtime-to-permanent
```

## Register Hosts to the Capsule

On remote RHEL hosts, point them to the Capsule instead of the main Satellite:

```bash
# Generate the host registration command on the Satellite Server
hammer host-registration generate-command \
    --activation-keys "remote-site-key" \
    --smart-proxy-id 2

# Run the generated curl command on each remote RHEL host as root
```

## Verify the Capsule

```bash
# Check Capsule status on the Satellite
hammer capsule info --id 2

# Verify content sync status
hammer capsule content lifecycle-environments --id 2
```

The Capsule Server keeps remote RHEL hosts patched and managed without depending on constant connectivity to the central Satellite.
