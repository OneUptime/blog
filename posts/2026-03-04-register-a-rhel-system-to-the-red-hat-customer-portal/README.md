# How to Register a RHEL System to the Red Hat Customer Portal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Subscription, Registration, Red Hat, Linux

Description: Register your RHEL system with the Red Hat Customer Portal using subscription-manager to access repositories, updates, and support.

---

Registering your RHEL system with the Red Hat Customer Portal is the first step after installation. Registration connects your system to Red Hat repositories and enables software updates and support.

## Register with Username and Password

```bash
# Register the system

sudo subscription-manager register --username=your-rh-username --password=your-rh-password

# The system is now registered but may not have a subscription attached
```

## Auto-Attach a Subscription

For organizations that do not use Simple Content Access (SCA), attach a subscription after registration:

```bash
# Automatically attach the best matching subscription
sudo subscription-manager attach --auto

# Verify the attached subscription
sudo subscription-manager list --consumed
```

If SCA is enabled for your organization, you do not need to attach a subscription. Register the system and enable the required repositories.

## Register with an Activation Key

For automated deployments, use an activation key (created in the Red Hat Hybrid Cloud Console):

```bash
# Register with an activation key (no password needed)
sudo subscription-manager register \
  --org="12345678" \
  --activationkey="my-rhel-key"
```

## Verify Registration

```bash
# Check the registration identity
sudo subscription-manager identity

# Example output:
# system identity: 12345678-abcd-4ef0-8abc-123456789012
# name: myhost.example.com
# org name: My Organization
# org ID: 12345678

# List available repositories
sudo subscription-manager repos --list-enabled

# Check system status
sudo subscription-manager status
```

## Enable Specific Repositories

After registration, you may need to enable additional repos:

```bash
# List all available repos
sudo subscription-manager repos --list | grep "Repo ID"

# Enable a specific repo
sudo subscription-manager repos --enable=codeready-builder-for-rhel-9-x86_64-rpms

# Disable a repo
sudo subscription-manager repos --disable=codeready-builder-for-rhel-9-x86_64-rpms
```

## Troubleshooting

```bash
# Clear local subscription data and re-register
sudo subscription-manager clean
sudo subscription-manager register --username=your-rh-username --password=your-rh-password
sudo subscription-manager attach --auto

# Check the rhsm log for errors
sudo tail -50 /var/log/rhsm/rhsm.log
```

Once registered, you can install and update packages with `dnf` from the Red Hat CDN.
