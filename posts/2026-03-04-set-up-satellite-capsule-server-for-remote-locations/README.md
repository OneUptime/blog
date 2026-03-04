# How to Set Up Satellite Capsule Server for Remote Locations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Satellite, Capsule, Infrastructure, Remote Management

Description: Deploy a Red Hat Satellite Capsule Server to serve content and manage RHEL hosts at remote locations, reducing bandwidth usage and improving local performance.

---

A Satellite Capsule Server acts as a local proxy for content delivery, provisioning, and host management at remote sites. It caches packages locally and communicates with the central Satellite Server, reducing WAN traffic.

## Prerequisites

The Capsule host needs:
- RHEL 8 or 9 with at least 20 GB RAM and 4 CPUs
- A valid Red Hat subscription with Satellite infrastructure
- DNS resolution between Satellite Server and Capsule
- Ports 443, 5647, 8000, 8140, 8443, and 9090 open between them

## Register the Capsule Host

```bash
# Register the Capsule host to the Satellite Server
sudo subscription-manager register --org="MyOrg" --activationkey="capsule-key"

# Enable required repositories
sudo subscription-manager repos --disable='*'
sudo subscription-manager repos \
    --enable=rhel-9-for-x86_64-baseos-rpms \
    --enable=rhel-9-for-x86_64-appstream-rpms \
    --enable=satellite-capsule-6.15-for-rhel-9-x86_64-rpms \
    --enable=satellite-maintenance-6.15-for-rhel-9-x86_64-rpms

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
hammer capsule content add-lifecycle-environment \
    --id 2 \
    --lifecycle-environment "Development" \
    --organization "MyOrg"

hammer capsule content add-lifecycle-environment \
    --id 2 \
    --lifecycle-environment "Production" \
    --organization "MyOrg"

# Synchronize content to the Capsule
hammer capsule content synchronize --id 2
```

## Configure Firewall on the Capsule

```bash
# Open required ports
sudo firewall-cmd --permanent --add-port={53/udp,53/tcp,67/udp,69/udp}
sudo firewall-cmd --permanent --add-port={80/tcp,443/tcp}
sudo firewall-cmd --permanent --add-port={5647/tcp,8000/tcp,8140/tcp,8443/tcp,9090/tcp}
sudo firewall-cmd --reload
```

## Register Hosts to the Capsule

On remote RHEL hosts, point them to the Capsule instead of the main Satellite:

```bash
# Install the Capsule's CA certificate
sudo curl -o /etc/pki/ca-trust/source/anchors/capsule-ca.pem \
    https://capsule.example.com/pub/katello-ca-consumer-latest.noarch.rpm
sudo rpm -ivh https://capsule.example.com/pub/katello-ca-consumer-latest.noarch.rpm

# Register through the Capsule
sudo subscription-manager register --org="MyOrg" \
    --activationkey="remote-site-key"
```

## Verify the Capsule

```bash
# Check Capsule status on the Satellite
hammer capsule info --id 2

# Verify content sync status
hammer capsule content lifecycle-environments --id 2
```

The Capsule Server keeps remote RHEL hosts patched and managed without depending on constant connectivity to the central Satellite.
