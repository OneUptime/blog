# How to Delegate Cluster Management to Teams in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RBAC, Permission, Role, Security

Description: Learn how to delegate cluster management responsibilities to different teams in Rancher while maintaining security and governance.

As organizations scale their Kubernetes usage, a single platform team cannot manage every cluster, project, and namespace. Rancher's RBAC model allows you to delegate management responsibilities to team leads and project owners while keeping centralized governance. This guide shows how to set up effective delegation.

## Prerequisites

- Rancher v2.7+ with administrator access
- Multiple teams using Kubernetes
- An external authentication provider with group support
- A defined organizational structure

## Step 1: Define the Delegation Model

Plan who manages what:

```plaintext
Platform Team (Admins)
├── Manages Rancher itself
├── Creates clusters
├── Sets global policies
└── Assigns Cluster Owners

Cluster Owners (Team Leads)
├── Manages projects within their cluster
├── Assigns Project Owners and Members
├── Configures cluster-level resources
└── Monitors cluster health

Project Owners (Tech Leads)
├── Manages namespaces in their project
├── Assigns project members
├── Sets resource quotas
└── Manages workloads
```

## Step 2: Assign Cluster Owners

Give each cluster a designated owner or owning team:

**Via the UI:**

1. Navigate to the target cluster.
2. Go to **Cluster > Cluster Members**.
3. Click **Add**.
4. Search for the team lead or the team's group in your identity provider.
5. Select **Owner** as the role.
6. Click **Create**.

**Via Terraform:**

```hcl
# Assign the frontend-leads group as owners of the frontend cluster

resource "rancher2_cluster_role_template_binding" "frontend_owners" {
  name               = "frontend-cluster-owners"
  cluster_id         = rancher2_cluster.frontend.id
  role_template_id   = "cluster-owner"
  group_principal_id = data.rancher2_principal.frontend_leads.id
}

# Assign the backend-leads group as owners of the backend cluster
resource "rancher2_cluster_role_template_binding" "backend_owners" {
  name               = "backend-cluster-owners"
  cluster_id         = rancher2_cluster.backend.id
  role_template_id   = "cluster-owner"
  group_principal_id = data.rancher2_principal.backend_leads.id
}
```

## Step 3: Let Cluster Owners Create Projects

Cluster owners can create projects within their cluster. Guide them through the process:

1. Log in as the cluster owner.
2. Navigate to the cluster.
3. Go to **Cluster > Projects/Namespaces**.
4. Click **Create Project**.
5. Set the project name, resource quotas, and network isolation.
6. Click **Create**.

The cluster owner should create projects that align with their team's structure:

```plaintext
Frontend Cluster
├── Project: web-app (for the web application team)
├── Project: mobile-api (for the mobile API team)
└── Project: shared-infra (for shared services like databases)
```

## Step 4: Let Cluster Owners Assign Project Roles

Once projects exist, cluster owners can add team members:

1. Navigate to a project.
2. Go to **Project > Members**.
3. Click **Add**.
4. Search for team members or groups.
5. Assign **Owner** to tech leads and **Member** to developers.
6. Click **Create**.

## Step 5: Create a Delegated Admin Role

If you want delegated administrators to manage users but not have full cluster infrastructure access, create a custom role:

```yaml
apiVersion: management.cattle.io/v3
kind: RoleTemplate
metadata:
  name: cluster-user-manager
context: cluster
displayName: Cluster User Manager
rules:
  # Manage cluster members
  - apiGroups: ["management.cattle.io"]
    resources: ["clusterroletemplatebindings"]
    verbs: ["create", "get", "list", "watch", "update", "delete"]
  # Manage projects
  - apiGroups: ["management.cattle.io"]
    resources: ["projects"]
    verbs: ["create", "get", "list", "watch", "update", "delete"]
  # Manage project members
  - apiGroups: ["management.cattle.io"]
    resources: ["projectroletemplatebindings"]
    verbs: ["create", "get", "list", "watch", "update", "delete"]
  # View cluster resources (read-only)
  - apiGroups: [""]
    resources: ["nodes", "namespaces", "events"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch"]
```

```bash
# Run this against the Rancher management cluster.
kubectl apply -f cluster-user-manager.yaml
```

This role allows someone to manage membership bindings and projects without full `Owner` access. If they need to use the membership pages in the Rancher dashboard, Rancher also documents additional global-resource permissions for user and role lookup.

## Step 6: Set Up Cross-Team Visibility

Sometimes teams need read-only visibility into other teams' projects. The platform team can set up cross-team read access from the Rancher management cluster:

```bash
#!/bin/bash
# grant-cross-team-read-access.sh
set -euo pipefail

CLUSTER_ID="c-m-xxxxx"
QA_GROUP="openldap_group://cn=qa-team,ou=groups,dc=example,dc=com"

# Give the QA team read-only access to all projects
kubectl --namespace "$CLUSTER_ID" get projects.management.cattle.io \
  -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.backingNamespace}{"\n"}{end}' |
while read -r PROJECT_ID BACKING_NAMESPACE; do
  cat <<EOF | kubectl create -f -
apiVersion: management.cattle.io/v3
kind: ProjectRoleTemplateBinding
metadata:
  generateName: prtb-
  namespace: ${BACKING_NAMESPACE}
projectName: "${CLUSTER_ID}:${PROJECT_ID}"
roleTemplateName: read-only
groupPrincipalName: "${QA_GROUP}"
EOF
done
```

## Step 7: Provide Self-Service Documentation

Create documentation for cluster owners so they can manage their clusters independently:

Key tasks to document for cluster owners:

- How to create projects and namespaces
- How to add and remove team members
- How to set resource quotas on projects
- How to enable project network isolation
- How to view cluster monitoring dashboards
- Escalation procedures for cluster-level issues

Key tasks to document for project owners:

- How to add team members to their project
- How to create namespaces within the project
- How to deploy workloads through the Rancher UI
- How to set up Helm chart deployments
- How to view project-level monitoring

## Step 8: Implement Guardrails

Delegation works best with guardrails that prevent teams from making harmful changes. Set up constraints:

**Resource quotas per project:**

Project resources are managed on the Rancher management cluster:

```yaml
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  name: p-xxxxx
  namespace: c-m-xxxxx
spec:
  clusterName: c-m-xxxxx
  displayName: web-app
  resourceQuota:
    limit:
      pods: "100"
      requestsCpu: "8000m"
      requestsMemory: "16Gi"
      limitsCpu: "16000m"
      limitsMemory: "32Gi"
  namespaceDefaultResourceQuota:
    limit:
      pods: "50"
      requestsCpu: "4000m"
      requestsMemory: "8Gi"
```

**Limit the roles that cluster owners can assign:**

Lock the roles you do not want assigned. In Rancher, a locked role is removed from the member-role drop-down and cannot be newly assigned. For example, if you want to stop teams from granting broad access, lock roles such as `Cluster Owner`, `Cluster Member`, or `Create Projects`, then provide a narrower custom role for new assignments.

## Step 9: Monitor Delegated Actions

Track what delegated administrators do:

```bash
# Watch membership and project changes on the Rancher management cluster
kubectl get clusterroletemplatebindings.management.cattle.io -A -w
kubectl get projectroletemplatebindings.management.cattle.io -A -w
kubectl get projects.management.cattle.io -A -w

# For Helm installs with Rancher API auditing enabled
kubectl -n cattle-system logs -f <rancher-pod-name> rancher-audit-log
```

For Docker installs, Rancher writes the API audit log to `/var/log/auditlog/rancher-api-audit.log` by default.

## Step 10: Scale the Model

As you add more clusters and teams, maintain consistency:

```hcl
# Use Terraform modules to apply the same delegation pattern to new clusters
module "cluster_delegation" {
  source = "./modules/cluster-delegation"

  for_each = {
    "frontend" = {
      cluster_id     = rancher2_cluster.frontend.id
      owner_group    = "cn=frontend-leads,ou=groups,dc=example,dc=com"
      member_group   = "cn=frontend-devs,ou=groups,dc=example,dc=com"
    }
    "backend" = {
      cluster_id     = rancher2_cluster.backend.id
      owner_group    = "cn=backend-leads,ou=groups,dc=example,dc=com"
      member_group   = "cn=backend-devs,ou=groups,dc=example,dc=com"
    }
  }

  cluster_id   = each.value.cluster_id
  owner_group  = each.value.owner_group
  member_group = each.value.member_group
}
```

## Best Practices

- **Trust but verify**: Delegate management to teams but audit their actions regularly.
- **Use groups**: Map delegation to identity provider groups for automatic onboarding and offboarding.
- **Set guardrails**: Apply resource quotas and role restrictions so delegated admins cannot accidentally harm the cluster.
- **Document procedures**: Provide clear documentation so cluster owners can be self-sufficient.
- **Start small**: Begin with one cluster and one team, refine the model, then expand.
- **Regular sync**: Hold monthly meetings with cluster owners to discuss issues and improvements.

## Conclusion

Delegating cluster management in Rancher enables your organization to scale Kubernetes adoption without bottlenecking on a single platform team. By assigning cluster owners, creating purpose-built roles, setting guardrails, and monitoring delegated actions, you empower teams to manage their own infrastructure while maintaining centralized governance. The key is finding the right balance between autonomy and control.
