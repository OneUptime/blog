# How to Enable RBAC for Talos API in Machine Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, RBAC, Security, Machine Configuration, API Access Control

Description: Learn how to enable and configure Role-Based Access Control for the Talos API to secure node management and limit operator permissions.

---

The Talos API is the primary interface for managing Talos Linux nodes. Through it, you apply configurations, trigger upgrades, reboot nodes, read logs, and perform virtually every administrative operation. By default, any client with a valid certificate has full administrative access. This is fine for a home lab, but in production environments with multiple operators and automation systems, you need finer-grained access control. That is where RBAC for the Talos API comes in.

This guide explains how to enable RBAC, what roles are available, how to generate certificates with specific roles, and how to manage access for different team members and systems.

## What Is Talos API RBAC?

RBAC (Role-Based Access Control) for the Talos API restricts what actions a client can perform based on the role encoded in their client certificate. Without RBAC, every authenticated client is effectively an admin. With RBAC enabled, clients are assigned roles that determine their permissions.

The three built-in roles are:

- **os:admin** - Full access to all Talos API operations
- **os:operator** - Can perform operational tasks like rebooting, upgrading, and reading configs, but cannot change the machine configuration
- **os:reader** - Read-only access to logs, metrics, and status information

## Enabling RBAC

RBAC is enabled through the `machine.features` section of the Talos machine configuration:

```yaml
# Enable RBAC for the Talos API
machine:
  features:
    rbac: true
```

This single boolean toggle activates role enforcement. Once enabled, every Talos API request is checked against the role in the client's certificate.

You should enable RBAC during cluster creation by including it in the initial configuration. If you are enabling it on an existing cluster, apply the config change to all nodes:

```bash
# Apply RBAC-enabled config to all nodes
talosctl apply-config \
  --nodes 192.168.1.100,192.168.1.101,192.168.1.102 \
  --file controlplane.yaml
```

## Generating Role-Specific Certificates

When you create a cluster with `talosctl gen config`, the generated `talosconfig` file gets an `os:admin` role by default. For other team members, you want to generate certificates with limited roles.

Here is how to create a talosconfig with a specific role:

```bash
# Generate a new talosconfig with the reader role
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --with-secrets secrets.yaml \
  --roles os:reader \
  --output reader-talosconfig
```

You can also generate configs for the operator role:

```bash
# Generate a talosconfig with operator role
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --with-secrets secrets.yaml \
  --roles os:operator \
  --output operator-talosconfig
```

Distribute these role-specific talosconfigs to the appropriate team members.

## Role Permissions Breakdown

Understanding what each role can and cannot do is essential for proper access management.

**os:admin** has unrestricted access:
- Apply and modify machine configurations
- Bootstrap the cluster
- Reset nodes
- Read and write all resources
- Generate new certificates

**os:operator** can perform day-to-day operations:
- Reboot and shutdown nodes
- Trigger upgrades
- Read machine configurations
- View logs and events
- Read system resources
- Cannot modify machine configurations
- Cannot bootstrap or reset nodes

**os:reader** has read-only access:
- View logs and kernel messages
- Read system resources and status
- Check node health
- View certificate information
- Cannot modify anything
- Cannot trigger reboots or upgrades

```yaml
# Example: An SRE team might have this role distribution:
# - Platform engineers: os:admin
# - On-call operators: os:operator
# - Monitoring systems: os:reader
# - Developers: os:reader (if any access at all)
```

## Managing Multiple Talosconfigs

In practice, you will have multiple talosconfig files for different roles. Here is how to manage them:

```bash
# Set up different configs for different roles
mkdir -p ~/.talos/roles

# Admin config (keep this very secure)
cp admin-talosconfig ~/.talos/roles/admin.yaml

# Operator config (for on-call SREs)
cp operator-talosconfig ~/.talos/roles/operator.yaml

# Reader config (for monitoring and debugging)
cp reader-talosconfig ~/.talos/roles/reader.yaml

# Switch between configs using the --talosconfig flag
talosctl --talosconfig ~/.talos/roles/operator.yaml get members

# Or set the TALOSCONFIG environment variable
export TALOSCONFIG=~/.talos/roles/reader.yaml
talosctl dmesg --nodes 192.168.1.100
```

## RBAC and Kubernetes API Access

Talos API RBAC is separate from Kubernetes RBAC. Having `os:admin` on the Talos API does not give you Kubernetes cluster-admin access, and vice versa. They are independent systems securing different APIs.

However, if you have `os:admin` on the Talos API, you can extract the Kubernetes admin kubeconfig, which effectively gives you Kubernetes admin access too. Keep this in mind when assigning Talos roles.

```bash
# An os:admin user can get the Kubernetes admin kubeconfig
talosctl kubeconfig --nodes 192.168.1.100

# An os:reader user cannot do this
talosctl kubeconfig --nodes 192.168.1.100
# Error: access denied
```

## Allowing Kubernetes Pods to Access Talos API

Sometimes you need Kubernetes workloads (like operators or controllers) to access the Talos API. The `kubernetesTalosAPIAccess` feature controls this:

```yaml
# Allow specific Kubernetes pods to access Talos API with RBAC
machine:
  features:
    rbac: true
    kubernetesTalosAPIAccess:
      enabled: true
      allowedRoles:
        - os:reader    # Pods can only get reader access
      allowedKubernetesNamespaces:
        - kube-system  # Only pods in kube-system
        - monitoring   # And monitoring namespace
```

This is the safest way to give in-cluster workloads access to the Talos API. The `allowedRoles` list restricts the maximum role a pod can assume, and `allowedKubernetesNamespaces` restricts which namespaces can access the API at all.

## Auditing API Access

With RBAC enabled, you can audit who is accessing the Talos API and what they are doing:

```bash
# Check API access logs
talosctl logs machined --nodes 192.168.1.100 | grep "api"

# Look for access denied events
talosctl dmesg --nodes 192.168.1.100 | grep -i "denied\|unauthorized\|rbac"
```

Monitoring access patterns helps you identify potential security issues and verify that RBAC is working as intended.

## Migrating to RBAC

If you have an existing cluster without RBAC and want to enable it, follow these steps:

```bash
# Step 1: Generate role-specific talosconfigs before enabling RBAC
# This way team members have their configs ready

# Step 2: Enable RBAC in the machine config
# Update machine.features.rbac to true in your config

# Step 3: Apply to all nodes
talosctl apply-config --nodes 192.168.1.100 --file controlplane.yaml
talosctl apply-config --nodes 192.168.1.101 --file controlplane.yaml
talosctl apply-config --nodes 192.168.1.110 --file worker.yaml

# Step 4: Verify admin access still works
talosctl get members --nodes 192.168.1.100

# Step 5: Test role-specific access
TALOSCONFIG=reader-talosconfig talosctl dmesg --nodes 192.168.1.100
# Should work (read-only operation)

TALOSCONFIG=reader-talosconfig talosctl reboot --nodes 192.168.1.100
# Should fail (requires operator or admin role)
```

## Handling Emergency Access

Even with RBAC, make sure you have a break-glass procedure for emergencies. Keep the `os:admin` talosconfig in a secure location (encrypted vault, hardware security module) where it can be accessed in an emergency but not during routine operations.

```bash
# Store admin config securely
# For example, using a password-protected archive
gpg --symmetric --cipher-algo AES256 admin-talosconfig -o admin-talosconfig.gpg

# In an emergency, decrypt and use
gpg --decrypt admin-talosconfig.gpg > /tmp/admin-talosconfig
talosctl --talosconfig /tmp/admin-talosconfig reboot --nodes 192.168.1.100
# Clean up after use
shred -u /tmp/admin-talosconfig
```

## Best Practices

Enable RBAC from day one on every production cluster. There is no performance cost and the security benefits are significant. Give every human operator the minimum role they need. Automation systems that only read metrics get `os:reader`. On-call engineers who need to reboot nodes get `os:operator`. Only the platform team gets `os:admin`. Rotate certificates regularly and revoke access for team members who leave. Audit API access logs periodically to spot unusual patterns.

RBAC for the Talos API is one of the simplest yet most impactful security measures you can implement. It takes minutes to enable and immediately improves your cluster's security posture.
