# How to Hide Docker Hub from the Registry Dropdown in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Hub, Registry Management, Security, DevOps

Description: Learn how to hide Docker Hub from Portainer's registry dropdown to enforce the use of private registries in your organization.

## Why Hide Docker Hub?

Organizations with strict security policies may want to steer developers away from pulling images directly from Docker Hub and instead use a private, audited registry. Portainer allows administrators to hide the built-in anonymous Docker Hub option from the registry selection dropdown.

## Hiding Docker Hub in Portainer

This is a global setting in Portainer:

1. Log in to Portainer as an administrator.
2. Go to **Registries**.
3. Find the **Docker Hub (anonymous)** entry in the registry list.
4. Click **Hide for all users**.

In current Portainer releases, this control is available in Business Edition.

Portainer notes that this does not fully disable anonymous Docker Hub access, because it is built into Docker itself. If no other registries are available to a user, the **Docker Hub (anonymous)** option will still appear.

## Restricting Registry Access

For stricter control, limit access to approved registries in each environment or apply a registry policy:

1. In the target environment, go to **Host > Registries**.
2. Find your approved registry and click **Manage access**.
3. Grant access to the required users or teams with **Create access**.
4. If you need consistent access rules across environment groups, create a **Docker > Registry** policy under **Environment-related > Policies**.

## Portainer API Approach

You can list configured registries via the Portainer API:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:9000/api/registries
```

However, the current Portainer API reference does not document a `restricted` field for hiding the built-in anonymous Docker Hub entry. Use the **Hide for all users** action in the Portainer UI for that specific setting.

## Enforcing a Specific Registry

To guide users toward a specific registry, you can:

1. Add your private registry (e.g., Harbor or ECR) to Portainer.
2. Hide **Docker Hub (anonymous)**.
3. Grant users or teams access to the private registry in each environment, or apply a Docker registry policy.

This steers users toward approved registries in Portainer's UI and lets you scope registry access through Portainer.

## Communicating the Policy

When Docker Hub is hidden, users no longer see the anonymous Docker Hub option in Portainer's registry dropdown. This does not prevent users from referencing Docker Hub images directly in YAML, so provide documentation explaining:

```text
All images must be pulled from registry.mycompany.com
Tag your images as: registry.mycompany.com/myteam/myimage:tag
```

## Conclusion

Hiding Docker Hub from Portainer's dropdown is a useful UI control for steering users toward private registries. Combine it with registry access controls or registry policies for stronger enforcement.
