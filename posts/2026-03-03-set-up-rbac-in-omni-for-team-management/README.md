# How to Set Up RBAC in Omni for Team Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Omni, RBAC, Kubernetes, Security, Team Management

Description: Learn how to configure role-based access control in Sidero Omni to manage team permissions across your Talos Linux clusters effectively.

---

When multiple people manage Talos Linux clusters, you need to control who can do what. Sidero Omni provides role-based access control (RBAC) that lets you define permissions at the organization and cluster level. This means your platform engineers can have full access while developers get read-only views, and nobody accidentally deletes a production cluster.

In this post, we will cover how to set up RBAC in Omni, define roles for different team members, and implement a practical access control strategy for your Talos infrastructure.

## Why RBAC Matters for Talos Management

Talos Linux is an immutable operating system, which already limits what can go wrong at the OS level. But at the cluster management level, there is still a lot of damage someone can do. Deleting a cluster, removing control plane nodes, or applying bad configurations can cause outages. RBAC in Omni helps you prevent these situations by restricting access to sensitive operations.

Without RBAC, everyone who has access to Omni has the same level of permissions. That might be fine for a small team of three engineers, but once your organization grows, it becomes a liability. You need separation between the people who manage infrastructure and the people who just need to see what is running.

## Understanding Omni Roles

Omni uses a role-based model with several predefined roles. Each role grants a specific set of permissions.

### Admin Role

Admins have full access to everything in Omni. They can create and delete clusters, manage machines, configure RBAC settings, and modify organization settings. This role should be limited to platform engineers and infrastructure leads.

### Operator Role

Operators can manage clusters and machines but cannot modify organization-level settings or RBAC configurations. This role is appropriate for engineers who deploy and maintain clusters on a daily basis but should not be changing access policies.

### Reader Role

Readers have view-only access to the Omni dashboard. They can see cluster status, machine information, and configuration details but cannot make any changes. This is the right role for developers who need to check on cluster health or verify deployments.

## Inviting Team Members

The first step in setting up RBAC is inviting your team members to your Omni organization. Each person needs an account, and you assign their role during the invitation process.

```bash
# Invite a team member using the Omni CLI
# Assign the operator role
omnictl access invite \
  --email engineer@company.com \
  --role Operator

# Invite someone with read-only access
omnictl access invite \
  --email developer@company.com \
  --role Reader

# Invite an admin (use sparingly)
omnictl access invite \
  --email platform-lead@company.com \
  --role Admin
```

You can also manage invitations through the Omni dashboard under the Organization settings. The dashboard shows you all current team members, their roles, and when they last accessed the system.

## Setting Up Role Assignments

For an existing team, you might need to change roles as responsibilities shift. Omni lets you update roles without removing and re-inviting users.

```bash
# Change a user's role from Reader to Operator
omnictl access update \
  --email engineer@company.com \
  --role Operator

# Downgrade someone to Reader
omnictl access update \
  --email former-admin@company.com \
  --role Reader

# List all current users and their roles
omnictl access list
```

Role changes take effect immediately. The next time the user loads the dashboard or makes an API call, their new permissions apply.

## Implementing a Practical RBAC Strategy

Here is a practical approach to RBAC that works well for most organizations.

### Platform Team (Admin Role)

Your platform or infrastructure team gets the Admin role. These are the people responsible for the Omni organization itself, RBAC policies, and high-level cluster decisions. Keep this group small. Two to four admins is usually enough, even for larger organizations.

### SRE and DevOps (Operator Role)

Site reliability engineers and DevOps engineers get the Operator role. They need to create clusters, add nodes, run upgrades, and troubleshoot issues. The Operator role gives them enough access to do their job without the ability to modify access policies or organization settings.

### Development Teams (Reader Role)

Most developers do not need to make changes in Omni. They might need to check which version of Kubernetes is running, verify that their namespace has enough resources, or see if a node issue is causing their deployment problems. The Reader role gives them this visibility without the risk of accidental changes.

```yaml
# Example RBAC mapping for a typical organization
rbac_assignments:
  admins:
    # Platform team leads
    - platform-lead@company.com
    - infrastructure-lead@company.com
  operators:
    # SRE and DevOps engineers
    - sre-engineer-1@company.com
    - sre-engineer-2@company.com
    - devops-engineer-1@company.com
    - devops-engineer-2@company.com
  readers:
    # Development team leads and senior developers
    - dev-lead-backend@company.com
    - dev-lead-frontend@company.com
    - senior-dev-1@company.com
```

## Service Account Access

For CI/CD pipelines and automation tools that interact with Omni, you will want to use service accounts rather than personal accounts. Service accounts have their own set of credentials and can be assigned specific roles.

```bash
# Create a service account for CI/CD with Operator permissions
omnictl serviceaccount create ci-pipeline \
  --role Operator

# Create a service account for monitoring with Reader permissions
omnictl serviceaccount create monitoring-bot \
  --role Reader

# List service accounts
omnictl serviceaccount list

# Rotate service account credentials
omnictl serviceaccount renew ci-pipeline
```

Service accounts should follow the principle of least privilege. If your CI/CD pipeline only needs to check cluster status, give it the Reader role. If it needs to trigger upgrades or scale clusters, use the Operator role.

## Kubernetes RBAC vs Omni RBAC

It is important to understand that Omni RBAC and Kubernetes RBAC are separate systems. Omni RBAC controls who can manage clusters through the Omni interface. Kubernetes RBAC controls who can interact with the Kubernetes API within a cluster.

A user with the Reader role in Omni might still have cluster-admin access in Kubernetes if you have configured it that way. For a complete access control strategy, you need to align both layers.

```yaml
# Kubernetes RBAC for a developer - applied inside the cluster
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-access
  namespace: app-namespace
subjects:
  - kind: User
    name: developer@company.com
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer-role
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-role
  namespace: app-namespace
rules:
  # Allow developers to manage their own deployments
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
```

## Auditing Access

Omni tracks all actions taken through the dashboard and CLI. This audit trail shows who did what and when. For compliance requirements, this is essential.

```bash
# View recent actions in Omni
omnictl audit list --limit 50

# Filter by user
omnictl audit list --user engineer@company.com

# Filter by action type
omnictl audit list --action cluster.create
```

Review the audit logs regularly. If someone is performing actions that seem outside their normal scope, it might be time to adjust their role or have a conversation about responsibilities.

## Revoking Access

When someone leaves the team or changes roles, revoke their access promptly.

```bash
# Remove a user from the organization
omnictl access revoke --email former-employee@company.com

# Revoke a service account
omnictl serviceaccount delete old-ci-pipeline
```

Make access revocation part of your offboarding process. If you use an identity provider with SSO, disabling the user in your IdP will also prevent them from accessing Omni.

## Conclusion

Setting up RBAC in Omni is a straightforward process that pays off significantly as your team and infrastructure grow. Start by mapping your team structure to the available roles, keep the admin group small, use service accounts for automation, and align Omni RBAC with your Kubernetes RBAC strategy. The combination of Omni's access control and Kubernetes-level permissions gives you a layered security model that protects your Talos clusters from both accidental and unauthorized changes.
