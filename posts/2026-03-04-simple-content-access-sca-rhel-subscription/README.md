# How to Use Simple Content Access (SCA) for RHEL Subscription Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SCA, Subscription Management, Red Hat, Linux

Description: A comprehensive guide to using Simple Content Access (SCA) to streamline RHEL subscription management, covering how it works, its benefits, and how to manage your fleet with it.

---

Simple Content Access, commonly known as SCA, fundamentally changes how RHEL systems consume subscriptions. Instead of the old model where each system needs a specific subscription attached, SCA gives registered systems automatic access to content. If you have been managing RHEL subscriptions for a while, SCA removes a lot of the friction you are used to dealing with. This guide covers how to work with SCA day-to-day and get the most out of it.

## The Problem SCA Solves

Traditional RHEL subscription management worked like this: register the system, find the right subscription pool, attach it, then enable repos. If you had a mix of subscriptions (Server, Workstation, Developer, etc.), picking the right pool was a manual decision. Multiply that by hundreds of systems, add in subscription renewals and expirations, and you had a management headache.

SCA eliminates the attachment step entirely. Register, and you are done.

```mermaid
flowchart LR
    subgraph Before SCA
        A1[Register] --> A2[List Available Pools]
        A2 --> A3[Attach Pool]
        A3 --> A4[Enable Repos]
        A4 --> A5[Install Packages]
    end
    subgraph With SCA
        B1[Register] --> B2[Enable Repos]
        B2 --> B3[Install Packages]
    end
```

## How SCA Works Under the Hood

When SCA is enabled, the `subscription-manager` client uses a content access certificate rather than per-subscription entitlement certificates tied to attached pools. This certificate grants access to the Red Hat content covered by your active subscriptions without specifying which subscription covers which system.

```bash
# View the content access certificate

sudo ls -la /etc/pki/entitlement/

# With SCA, entitlement certificates are not tied to individual attached subscriptions
```

The certificate is refreshed automatically by `subscription-manager` during regular check-ins. The default check-in interval is every 4 hours, controlled by the `rhsmcertd` daemon:

```bash
# Check the certificate daemon status
sudo systemctl status rhsmcertd

# View the check-in configuration
sudo grep -E "certcheckinterval|autoattachinterval" /etc/rhsm/rhsm.conf
```

## Day-to-Day Operations with SCA

Most of your daily workflow does not change with SCA. You still register systems, enable repos, and install packages the same way.

### Registering a New System

```bash
# Register - no attach step needed
sudo subscription-manager register --username=your_username --password=your_password
```

### Managing Repositories

```bash
# List enabled repos
sudo subscription-manager repos --list-enabled

# Enable a specific repo
sudo subscription-manager repos --enable=codeready-builder-for-rhel-9-x86_64-rpms

# Disable a repo
sudo subscription-manager repos --disable=rhel-9-for-x86_64-supplementary-rpms
```

### Installing Packages

```bash
# Install packages as usual
sudo dnf install -y httpd postgresql

# Update the system
sudo dnf update -y
```

## Checking SCA Status

Verify that SCA is active on your system:

```bash
# Check subscription status
sudo subscription-manager status
```

With SCA active, you will see:

```bash
Overall Status: Disabled
Content Access Mode is set to Simple Content Access.
```

The "Disabled" status is expected. It means traditional entitlement compliance checking is turned off.

## SCA and Subscription Tracking

A common concern with SCA is: "If we are not attaching specific subscriptions, how do we know if we are compliant?"

Red Hat tracks subscription usage at the account level. You can view this in the Red Hat Hybrid Cloud Console:

1. Log in to console.redhat.com
2. Go to Subscriptions and Spend
3. View your subscription usage and utilization

The subscriptions service shows account-wide subscription usage and utilization so you can self-govern your subscription profile.

```mermaid
flowchart TD
    A[Red Hat Hybrid Cloud Console] --> B[Subscriptions Service]
    B --> C[Subscription Quantities]
    B --> D[Reported Usage]
    B --> E[Utilization Trends]
```

## SCA with Different Registration Methods

SCA works with the supported `subscription-manager` registration methods:

**Username/Password**:

```bash
sudo subscription-manager register --username=user --password=pass
```

**Activation Key**:

```bash
sudo subscription-manager register --activation-key=my-key --organization=my-org
```

Token-based registration with `subscription-manager register --token` is deprecated and is no longer supported by the default Red Hat entitlement server. Use username/password or an activation key instead.

In both supported cases, the system gets content access immediately after registration.

## SCA with Satellite Server

If you use Red Hat Satellite, the SCA workflow depends on your Satellite version:

1. Satellite 6.16 and later versions support only the SCA workflow
2. For supported Satellite 6.15 and earlier environments, follow the current Red Hat SCA guidance for your manifest or organization setting
3. In Satellite, use Content, then Subscriptions, then "Manage Manifest" to import or refresh the manifest as needed

Systems registered to Satellite will automatically use SCA. Content views and lifecycle environments still control what content is available, but subscription attachment is not needed.

## SCA and System Purpose

System purpose attributes (role, SLA, usage) are still valuable with SCA. While they no longer drive auto-attach decisions, they help with:

- Reporting on system usage across your organization
- Planning subscription renewals
- Understanding your infrastructure composition

```bash
# Set system purpose even with SCA
sudo subscription-manager syspurpose role --set="Red Hat Enterprise Linux Server"
sudo subscription-manager syspurpose service-level --set="Premium"
sudo subscription-manager syspurpose usage --set="Production"
```

## Migrating from Traditional Entitlements to SCA

When you enable SCA on an account that previously used traditional entitlements:

1. Existing registered systems will transition when their subscription data is refreshed
2. Per-subscription entitlement certificates are replaced by content access certificates
3. No system re-registration is required
4. No downtime or service interruption occurs

Refresh subscription data on a specific system:

```bash
# Refresh local subscription data
sudo subscription-manager refresh
```

## Handling Mixed Environments

If your organization has multiple Red Hat accounts, some with SCA and some without, each system follows the setting of the account it is registered to. There is no system-level SCA toggle.

## Troubleshooting SCA

**Content access certificate not refreshing**: Restart the certificate daemon:

```bash
# Restart the certificate management daemon
sudo systemctl restart rhsmcertd
```

**System shows "Invalid" status with SCA**: This should not happen with SCA. If it does, refresh and check:

```bash
sudo subscription-manager refresh
sudo subscription-manager status
```

**Cannot access repos after enabling SCA**: Clean the dnf cache:

```bash
sudo dnf clean all
sudo subscription-manager refresh
sudo dnf repolist
```

## Automation Best Practices with SCA

With SCA, your automation scripts become simpler. Here is an Ansible example:

```yaml
# Minimal registration playbook with SCA
- name: Register and configure RHEL systems
  hosts: all
  become: true
  tasks:
    - name: Register system
      community.general.redhat_subscription:
        activationkey: rhel9-prod
        org_id: my-org
        state: present

    - name: Enable required repositories
      community.general.rhsm_repository:
        name:
          - rhel-9-for-x86_64-baseos-rpms
          - rhel-9-for-x86_64-appstream-rpms
          - codeready-builder-for-rhel-9-x86_64-rpms
        state: enabled

    - name: Update all packages
      dnf:
        name: "*"
        state: latest
```

No attach step, no pool ID lookups, no subscription matching. Just register and go.

## Summary

SCA is the current standard for RHEL subscription management, and for good reason. It removes the most tedious parts of subscription management while maintaining compliance tracking at the account level. If your organization has not enabled SCA yet, there is little reason to stay with traditional entitlements unless you have very specific compliance requirements that need per-system tracking. The switch is non-disruptive, and the simplification in day-to-day operations and automation makes it well worth the change.
