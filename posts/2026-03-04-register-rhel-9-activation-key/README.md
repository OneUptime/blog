# How to Register a RHEL System Using an Activation Key

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Activation Key, Registration, Red Hat, Linux

Description: Learn how to create and use activation keys to register RHEL systems without exposing credentials, ideal for automated and large-scale deployments.

---

If you manage more than a handful of RHEL systems, typing in your Red Hat username and password on each one gets old fast. Activation keys solve this problem. They let you register systems without exposing credentials, and you can bundle subscription settings, system purpose, and repository choices into a single key. This guide covers creating activation keys and using them to register RHEL systems.

## What Is an Activation Key?

An activation key is a pre-configured token created in the Red Hat Customer Portal (or Satellite Server). When you register a system with an activation key, the key automatically associates the system with your organization, attaches subscriptions, and can set system purpose attributes. No username or password is needed on the target system.

## When to Use Activation Keys

- Automated provisioning with Kickstart, Ansible, or cloud-init
- Registering systems without sharing credentials with other admins
- Enforcing consistent subscription settings across a fleet
- Deploying in environments where interactive login is not practical

## Creating an Activation Key in the Customer Portal

Log in to the Red Hat Customer Portal at access.redhat.com, then navigate to Subscriptions, then Activation Keys. Click "New" to create one.

You will need to provide:
- A name for the key (something descriptive, like `rhel9-webservers`)
- The service level (Premium, Standard, or Self-Support)
- Optionally, auto-attach behavior and subscriptions to associate

```mermaid
flowchart LR
    A[Red Hat Customer Portal] --> B[Subscriptions Section]
    B --> C[Activation Keys]
    C --> D[Create New Key]
    D --> E[Name + Service Level + Subscriptions]
    E --> F[Key Ready to Use]
```

## Finding Your Organization ID

To register with an activation key, you also need your organization ID. Find it in the Customer Portal under Subscriptions, or run this on an already-registered system:

```bash
# Display the organization ID from an already registered system
sudo subscription-manager identity | grep "org ID"
```

You can also find it using the Red Hat API or on the activation key page itself.

## Registering with an Activation Key

On your RHEL system, run:

```bash
# Register using an activation key and organization ID
sudo subscription-manager register --activationkey=rhel9-webservers --org=12345678
```

Replace `rhel9-webservers` with your key name and `12345678` with your actual organization ID.

The system will authenticate using the activation key, register with Red Hat, and apply whatever subscriptions and settings you configured in the key.

## Using Multiple Activation Keys

You can stack multiple activation keys during registration. This is useful when you have a base key for all systems and a specialized key for specific roles:

```bash
# Register with two activation keys combined
sudo subscription-manager register --activationkey=rhel9-base,rhel9-database --org=12345678
```

The settings from all specified keys are merged. If there are conflicts, the last key takes precedence for most settings.

## Activation Keys in Kickstart Deployments

For automated installs using Kickstart, add the registration command to your Kickstart file's `%post` section:

```bash
# Kickstart %post section for registration
%post --log=/root/ks-post.log
subscription-manager register --activationkey=rhel9-webservers --org=12345678
%end
```

This registers the system automatically during the installation process, so it comes up fully registered and ready for updates.

## Activation Keys with Cloud-Init

If you deploy RHEL in a cloud environment, you can register during first boot using cloud-init. Add the following to your user-data:

```yaml
# cloud-init user-data for RHEL registration
runcmd:
  - subscription-manager register --activationkey=rhel9-cloud --org=12345678
```

## Activation Keys with Ansible

For Ansible-managed environments, use the `community.general.redhat_subscription` module:

```yaml
# Ansible task to register with an activation key
- name: Register RHEL system with activation key
  community.general.redhat_subscription:
    activationkey: rhel9-webservers
    org_id: "12345678"
    state: present
```

This is idempotent, so running it multiple times will not cause duplicate registrations.

## Verifying the Registration

After registering, confirm everything looks right:

```bash
# Check the system identity
sudo subscription-manager identity

# Verify subscription status
sudo subscription-manager status

# List enabled repositories
sudo subscription-manager repos --list-enabled
```

If using Simple Content Access (SCA), the status will show "Content Access Mode" rather than individual subscription details.

## Troubleshooting Activation Key Issues

**Invalid activation key**: Double-check the key name. It is case-sensitive. Copy it exactly from the Customer Portal.

**Organization ID mismatch**: The org ID must match the account that owns the activation key. Verify your org ID in the portal.

**No subscriptions attached**: If the activation key does not have auto-attach enabled and no subscriptions are directly associated, the system will register but may not have content access. Either update the key in the portal or run:

```bash
# Manually auto-attach after registration
sudo subscription-manager attach --auto
```

**Network issues**: Ensure the system can reach `subscription.rhsm.redhat.com` on port 443. Test connectivity:

```bash
# Test network connectivity to Red Hat CDN
curl -v https://subscription.rhsm.redhat.com/subscription 2>&1 | head -20
```

## Security Benefits of Activation Keys

Activation keys are more secure than username/password registration for several reasons:

- No credentials are stored on the target system or in scripts
- Keys can be revoked or rotated without changing account passwords
- You can create purpose-specific keys with limited scope
- Keys do not grant portal login access, only registration capability

## Managing Activation Keys

You can list, modify, or delete activation keys in the Customer Portal at any time. If a key is compromised, delete it immediately and create a new one. Existing systems registered with the old key remain registered, but no new systems can use the deleted key.

## Summary

Activation keys are the preferred way to register RHEL systems at scale. They remove the need for interactive credential entry, keep passwords out of scripts and automation playbooks, and let you standardize subscription and system purpose settings across your infrastructure. Whether you are deploying via Kickstart, cloud-init, or Ansible, activation keys make registration clean and repeatable.
