# How to Attach and Remove Subscriptions on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Subscription Management

Description: Step-by-step guide on attach and remove subscriptions on rhel 9 with practical examples and commands.

---

Managing subscriptions on RHEL 9 involves attaching, removing, and monitoring subscription entitlements to ensure compliance.

## List Current Subscriptions

```bash
sudo subscription-manager list --consumed
```

## List Available Subscriptions

```bash
sudo subscription-manager list --available
```

## Attach a Subscription by Pool ID

```bash
sudo subscription-manager attach --pool=8a85f99c7eb0c1b0017eb0c5f2eb1234
```

## Auto-Attach the Best Subscription

```bash
sudo subscription-manager attach --auto
```

## Remove a Specific Subscription

```bash
# List serial numbers
sudo subscription-manager list --consumed

# Remove by serial
sudo subscription-manager remove --serial=1234567890
```

## Remove All Subscriptions

```bash
sudo subscription-manager remove --all
```

## Check Subscription Status

```bash
sudo subscription-manager status
```

## View Subscription Details

```bash
sudo subscription-manager list --consumed --pool-only
```

## Refresh Subscription Data

```bash
sudo subscription-manager refresh
```

## Use Simple Content Access

Red Hat Simple Content Access simplifies subscription management:

```bash
# Check if SCA is enabled
sudo subscription-manager status

# With SCA, systems only need to be registered
# No need to attach individual subscriptions
sudo subscription-manager register --org=<org-id> --activationkey=<key>
```

## Monitor Subscription Compliance

```bash
# Check overall compliance
sudo subscription-manager status

# View system purpose
sudo subscription-manager syspurpose show
```

## Conclusion

Proper subscription management keeps your RHEL 9 systems compliant and ensures access to updates. Simple Content Access reduces the complexity of managing individual subscription attachments.

