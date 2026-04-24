# How to Hide Docker Hub from the Registry Dropdown in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Hub, Registry, Configuration, DevOps

Description: Learn how to hide the Docker Hub option from Portainer's registry dropdown to enforce use of private registries.

## Introduction

By default, Portainer shows **Docker Hub (anonymous)** as an option in the registry dropdown when deploying containers or stacks. For organizations that require all images to come from private registries, or for air-gapped environments where Docker Hub is not accessible, hiding Docker Hub reduces confusion and prevents accidental pulls from public registries. This guide covers the configuration.

## Prerequisites

- Portainer CE or BE with admin access
- Understanding of why you want to restrict registry access

## Why Hide Docker Hub

Common reasons to hide Docker Hub:

1. **Security policy** - Organization requires all images to be scanned before use
2. **Air-gapped environments** - No internet access; Docker Hub is unreachable
3. **Compliance** - All deployed software must be from approved registries
4. **Standardization** - Enforce use of internal registry mirror
5. **Rate limiting** - Prevent unauthenticated pulls that hit Docker Hub limits

## Step 1: Access Registry Settings

1. Log in to Portainer as admin
2. Click **Registries** in the sidebar
3. Find the built-in **Docker Hub (anonymous)** entry

Or navigate to:

1. **Registries** → **Docker Hub (anonymous)**

## Step 2: Hide Docker Hub

In Portainer:

1. Go to **Registries**
2. Find the **Docker Hub (anonymous)** entry
3. Click **Hide for all users**
4. Verify the entry is hidden from the registry dropdown for users who have other registries available

This only hides **Docker Hub (anonymous)** from the Portainer UI dropdown. It does not fully disable Docker Hub access, and if no other registries are available to a user, Portainer will still show **Docker Hub (anonymous)**.

## Alternative: Configure via Portainer API

Portainer documents hiding **Docker Hub (anonymous)** in the UI. Because this is built-in anonymous access rather than a registry you added yourself, check the version-specific Portainer API documentation for your release before attempting to automate it.

## Step 3: Manage Access to Approved Registries

Use Portainer's registry access controls on the registries you want users to use:

1. Go to the environment's **Host** or **Swarm** view, then open **Registries**
2. On your private registry, click **Manage access**
3. Grant access to the users or teams that should use your private registry
4. Remember registry access is environment-specific, not global

## Step 4: Configure Docker Daemon to Use a Registry Mirror

For a more robust setup, configure the Docker daemon to prefer your internal mirror for Docker Hub pulls:

```json
// /etc/docker/daemon.json
{
  "registry-mirrors": ["https://your-internal-mirror.company.com"]
}
```

This does not fully block direct Docker Hub access by itself. If you need a hard block, enforce it at the network or proxy layer as well.

Block Docker Hub at the network level using a firewall rule:

```bash
# Block Docker Hub IP ranges (use with caution - IPs change)
# Better to use a local proxy/mirror that blocks
```

## Step 5: Use a Registry Mirror as Replacement

Instead of just hiding Docker Hub, replace it with an internal mirror:

```json
// /etc/docker/daemon.json
{
  "registry-mirrors": ["https://internal-mirror.company.com"]
}
```

In Portainer:

1. Add your internal mirror as a Custom registry
2. Grant users access to that registry in the environment where they deploy workloads
3. Hide **Docker Hub (anonymous)** if you do not want it shown in the Portainer UI

## Step 6: Policy Documentation

When hiding Docker Hub, document the policy for developers:

```markdown
## Container Registry Policy

All container images must be pulled from the internal registry:
- Internal registry: registry.company.com
- All external images are mirrored here after security scanning
- To add a new external image: submit request to ops@company.com
- Docker Hub (anonymous) is hidden in the Portainer UI to reinforce this policy
```

## Step 7: Test the Configuration

After hiding Docker Hub:

1. Log in as a non-admin user
2. Make sure the user has access to at least one approved private registry
3. Go to **Containers → Add container**
4. Click the registry dropdown
5. **Docker Hub (anonymous)** should not appear if another accessible registry is available
6. If the user has no other registries available, Portainer will still show **Docker Hub (anonymous)**
7. Test that pulling an image from your private registry works

## Considering the Trade-offs

| Aspect | Hiding Docker Hub | Blocking at Network Level |
|--------|------------------|--------------------------|
| Ease of implementation | Simple | Requires firewall config |
| Effectiveness | UI-only; does not fully disable Docker Hub | Blocks all pulls |
| User experience | Cleaner UI | Fails with error |
| Maintenance | Low | Medium |

For strict enforcement, combine both: hide in Portainer UI AND block at the network/firewall level.

## Conclusion

Hiding Docker Hub from Portainer's registry dropdown is a straightforward way to guide users toward approved internal registries. Combined with a properly configured internal registry mirror and network-level controls, you can ensure all container images in your organization go through your security approval process before deployment. This is an important control for regulated industries and security-conscious organizations.
