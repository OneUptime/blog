# How to Attach and Remove Subscriptions on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Subscription, Red Hat, Management, Linux

Description: Learn how to attach, list, and remove subscriptions on RHEL using subscription-manager, including managing multiple subscriptions and pool IDs.

---

After registering a RHEL system in an entitlement-based Red Hat Subscription Management environment, you can attach subscriptions to access software repositories. You can attach subscriptions automatically or by specific pool ID. If your organization uses Simple Content Access, subscription attachment is no longer required and attach commands may be ignored.

## Auto-Attach Subscriptions

```bash
# Automatically attach the best available subscription in entitlement-based mode

sudo subscription-manager attach --auto

# Check what was attached
sudo subscription-manager list --consumed
```

## List Available Subscriptions

```bash
# Show all subscriptions available to your account
sudo subscription-manager list --available

# Filter for a specific product
sudo subscription-manager list --available --matches="Red Hat Enterprise Linux"

# Show only subscriptions with available quantity
sudo subscription-manager list --available --matches="*RHEL*" | grep -E "Pool ID|Subscription Name|Available"
```

## Attach a Specific Subscription by Pool ID

```bash
# Attach a specific subscription using its pool ID
sudo subscription-manager attach --pool=8a85f99876543210abcdef0123456789

# Verify the attachment
sudo subscription-manager list --consumed
```

## Remove Subscriptions

```bash
# List consumed subscriptions and their serial numbers
sudo subscription-manager list --consumed

# Remove a specific subscription by serial number
sudo subscription-manager remove --serial=1234567890

# Remove all subscriptions from the system
sudo subscription-manager remove --all
```

## Check Subscription Status

```bash
# Overall system subscription status
sudo subscription-manager status

# Detailed identity information
sudo subscription-manager identity

# Check which repos are enabled by the current subscription
sudo subscription-manager repos --list-enabled
```

## Refreshing Subscription Data

If your subscription was renewed or modified in the portal:

```bash
# Refresh the local subscription data
sudo subscription-manager refresh

# Verify changes
sudo subscription-manager list --consumed
```

## Unregister a System

```bash
# Completely unregister and remove all subscriptions
sudo subscription-manager unregister

# This frees up the subscription for use on another system
```

After attaching subscriptions in entitlement-based mode, the system can pull packages from the Red Hat CDN. If you are migrating a system or decommissioning it, always unregister to remove the system from Red Hat hosted services and release any attached subscription entitlement.
