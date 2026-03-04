# How to Register a RHEL 9 System to the Red Hat Customer Portal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Subscription Management

Description: Step-by-step guide on register a rhel 9 system to the red hat customer portal with practical examples and commands.

---

Registering your RHEL 9 system with the Red Hat Customer Portal gives you access to software repositories, updates, and support.

## Register with Subscription Manager

```bash
sudo subscription-manager register --username=your_username --password=your_password
```

## Auto-Attach a Subscription

```bash
sudo subscription-manager attach --auto
```

## Verify Registration

```bash
sudo subscription-manager status
sudo subscription-manager list --consumed
```

## View Available Subscriptions

```bash
sudo subscription-manager list --available --all
```

## Attach a Specific Subscription

```bash
sudo subscription-manager attach --pool=<pool-id>
```

## Enable Repositories

```bash
sudo subscription-manager repos --list
sudo subscription-manager repos --enable=rhel-9-for-x86_64-baseos-rpms
sudo subscription-manager repos --enable=rhel-9-for-x86_64-appstream-rpms
```

## Register with an Activation Key

For automated deployments, use activation keys:

```bash
sudo subscription-manager register \
  --org=<org-id> \
  --activationkey=<key-name>
```

## Check System Identity

```bash
sudo subscription-manager identity
```

## Unregister a System

```bash
sudo subscription-manager unregister
```

## Troubleshoot Registration Issues

```bash
# Check connectivity
curl -v https://subscription.rhsm.redhat.com

# Clean local data and re-register
sudo subscription-manager clean
sudo subscription-manager register
```

## Conclusion

Proper registration ensures your RHEL 9 system receives security updates and has access to Red Hat's full software ecosystem. Use activation keys for automated deployments.

