# How to Troubleshoot Subscription Manager Certificate Errors on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Subscription Manager, Certificates, Troubleshooting, Linux

Description: Diagnose and fix common subscription-manager certificate errors on RHEL, including expired certificates, missing entitlements, and SSL issues.

---

Subscription Manager uses SSL certificates to authenticate with the Red Hat CDN. Certificate errors can prevent you from installing or updating packages. Here is how to diagnose and fix common issues.

## Common Error: Expired Certificate

```
Unable to verify server's identity: [SSL: CERTIFICATE_VERIFY_FAILED]
```

Check the certificate dates:

```bash
# List entitlement certificates and their expiry dates
sudo ls -la /etc/pki/entitlement/
sudo openssl x509 -in /etc/pki/entitlement/*.pem -noout -dates 2>/dev/null | head -10

# Check the identity certificate
sudo openssl x509 -in /etc/pki/consumer/cert.pem -noout -dates
```

## Fix: Refresh Certificates

```bash
# Refresh subscription data and regenerate certificates
sudo subscription-manager refresh

# If that does not work, remove and re-attach
sudo subscription-manager remove --all
sudo subscription-manager attach --auto
```

## Common Error: Missing Entitlement Certificates

```
This system is not receiving updates. You can use subscription-manager to assign subscriptions.
```

```bash
# Check if any subscriptions are attached
sudo subscription-manager list --consumed

# If empty, attach subscriptions
sudo subscription-manager attach --auto

# Verify repos are available
sudo subscription-manager repos --list-enabled
```

## Common Error: Identity Certificate Missing

```
Error: consumer certificate not found
```

```bash
# Check if the consumer certificate exists
ls -la /etc/pki/consumer/

# If missing, re-register the system
sudo subscription-manager clean
sudo subscription-manager register --username=your-rh-username --password=your-rh-password
sudo subscription-manager attach --auto
```

## Fix SSL CA Trust Issues

```bash
# Reinstall the CA certificates
sudo dnf reinstall -y ca-certificates

# Update the CA trust
sudo update-ca-trust

# If using a Satellite server, reinstall its CA cert
sudo rpm -e katello-ca-consumer-satellite.example.com
sudo rpm -ivh https://satellite.example.com/pub/katello-ca-consumer-latest.noarch.rpm
```

## Check the RHSM Configuration

```bash
# View the current RHSM configuration
sudo subscription-manager config --list

# Verify the server hostname is correct
sudo grep -E "hostname|baseurl" /etc/rhsm/rhsm.conf

# For CDN (default):
# hostname = subscription.rhsm.redhat.com
# For Satellite:
# hostname = satellite.example.com
```

## Nuclear Option: Full Reset

If nothing else works:

```bash
# Remove all subscription data
sudo subscription-manager unregister
sudo subscription-manager clean

# Remove leftover certificates
sudo rm -rf /etc/pki/entitlement/*
sudo rm -rf /etc/pki/consumer/*

# Re-register from scratch
sudo subscription-manager register --username=your-rh-username --password=your-rh-password
sudo subscription-manager attach --auto
```

Always check `/var/log/rhsm/rhsm.log` for detailed error messages when troubleshooting certificate issues.
