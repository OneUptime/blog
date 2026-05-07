# How to Move Namespaces Between Projects in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Project, Namespace

Description: Learn how to move Kubernetes namespaces between Rancher projects to reorganize workloads and align with team changes.

As organizations evolve, you may need to move namespaces between projects. A team might be restructured, an application might change ownership, or you might need to consolidate projects. Rancher makes it possible to reassign namespaces to different projects. This guide walks through the process and its implications.

## Prerequisites

- Rancher v2.7+ with cluster owner or administrator access
- Existing projects with namespaces that need to be moved
- Understanding of the access control implications of moving namespaces

## Understanding What Happens When You Move a Namespace

When you move a namespace from one project to another:

1. **RBAC changes**: The namespace inherits the RBAC bindings of the new project. Users who had access through the old project lose access. Users assigned to the new project gain access.
2. **Resource quotas may change**: If the source project has a project resource quota and the target project does not, Rancher removes the namespace's inherited project quota. Rancher does not allow moving a namespace into a project that already has a project resource quota configured.
3. **Network policies may change**: If project network isolation is enabled, the namespace's network access changes to match the new project's isolation settings.
4. **Workloads continue running**: Pods and other resources in the namespace are not affected. They keep running without interruption.

## Step 1: Check Current Namespace Assignment

Before moving a namespace, verify its current project assignment:

**Via the UI:**

1. Navigate to your cluster.
2. Go to **Cluster > Projects/Namespaces**.
3. Find the namespace in the list. It will be grouped under its current project.

**Via kubectl:**

```bash
# Check which project a namespace belongs to

kubectl get namespace <namespace-name> -o jsonpath='{.metadata.annotations.field\.cattle\.io/projectId}'
```

```bash
# List all namespaces with their project assignments
kubectl get namespaces -o json | \
  jq -r '.items[] | "\(.metadata.name)\t\(.metadata.annotations["field.cattle.io/projectId"] // "unassigned")"' | \
  column -t -s $'\t'
```

## Step 2: Move a Namespace via the Rancher UI

1. Navigate to your cluster.
2. Go to **Cluster > Projects/Namespaces**.
3. Find the namespace you want to move.
4. Click the three-dot menu next to the namespace.
5. Select **Move**.
6. In the dialog, select the target project from the dropdown.
7. Click **Move** to confirm.

After Rancher reconciles the move, the namespace appears under the new project with the new project's RBAC rules.

## Step 3: Move a Namespace via kubectl

Update the project annotation on the namespace:

```bash
# Move namespace to a different project
kubectl annotate namespace <namespace-name> \
  field.cattle.io/projectId="c-m-xxxxx:p-yyyyy" \
  --overwrite
```

Where `c-m-xxxxx` is the cluster ID and `p-yyyyy` is the target project ID.

## Step 4: Move a Namespace via the Rancher API

```bash
# Namespace to move
NAMESPACE="my-app-staging"
CLUSTER_ID="c-m-xxxxx"
TARGET_PROJECT="c-m-xxxxx:p-yyyyy"

# Look up the namespace resource and capture the URL in .actions.move
MOVE_ACTION=$(curl -sS -u '<access-key>:<secret-key>' \
  "https://<rancher-url>/v3/clusters/${CLUSTER_ID}/namespaces/${NAMESPACE}" | \
  jq -r '.actions.move')

# POST the target project to the move action URL
curl -sS -u '<access-key>:<secret-key>' \
  -H 'Content-Type: application/json' \
  -X POST "${MOVE_ACTION}" \
  -d "{
    \"projectId\": \"${TARGET_PROJECT}\"
  }"
```

## Step 5: Move Multiple Namespaces at Once

When reorganizing projects, you may need to move several namespaces:

```bash
#!/bin/bash
# move-namespaces.sh

CLUSTER_ID="c-m-xxxxx"
TARGET_PROJECT_ID="p-yyyyy"
NAMESPACES=("app-staging" "app-testing" "app-integration")

for ns in "${NAMESPACES[@]}"; do
  echo "Moving namespace: $ns to project: $TARGET_PROJECT_ID"

  kubectl annotate namespace $ns \
    field.cattle.io/projectId="${CLUSTER_ID}:${TARGET_PROJECT_ID}" \
    --overwrite

  echo "  Done."
done

echo "All namespaces moved successfully."
```

## Step 6: Move a Namespace to No Project (Unassign)

To remove a namespace from any project:

```bash
# Remove the project assignment
kubectl annotate namespace <namespace-name> \
  field.cattle.io/projectId-

kubectl label namespace <namespace-name> \
  field.cattle.io/projectId-
```

The namespace will appear as unassigned in the Rancher UI. It will not inherit any project-level RBAC or resource quotas.

## Step 7: Handle Resource Quota Conflicts

When resource quotas are involved, check for conflicts:

```bash
# Run this against the management cluster
# Check whether the target project has a project resource quota configured
kubectl --namespace <cluster-id> get projects.management.cattle.io <target-project-id> -o json | \
  jq '.spec.resourceQuota'

# Check the namespace's current resource quota, if any
kubectl get resourcequota -n <namespace-name>
```

If the target project already has a project resource quota configured, Rancher will not allow the move. If you move a namespace from a project that has a quota set to a project with no project quota set, Rancher removes the namespace's inherited project quota.

To handle this:

1. Check whether the target project has a project resource quota configured.
2. If it does, remove or adjust that project quota before moving, or choose a different target project.
3. If the source project had a quota and the target does not, review the namespace's quota after the move.

## Step 8: Update Access After Moving

After moving a namespace, verify that the right people have access:

```bash
# Inspect rolebindings in the namespace after the move
kubectl get rolebindings -n <namespace-name> -o json | \
  jq -r '.items[] | "\(.metadata.name)\t\(.roleRef.name)\t\(.subjects[]? | "\(.kind)/\(.name)")"' | \
  column -t -s $'\t'
```

If specific users need access to the namespace in its new project, add them as project members:

1. Navigate to the new project.
2. Go to **Project > Members**.
3. Add any users who need access but are not yet members.

## Step 9: Move Namespaces with Terraform

Manage namespace moves declaratively:

```hcl
# Move a namespace from one project to another by changing the project_id
resource "rancher2_namespace" "app_staging" {
  name        = "app-staging"
  # Change this from the old project ID to the new one
  project_id  = rancher2_project.new_team.id
  description = "Staging environment for the app"
}
```

```bash
terraform plan  # Review the change
terraform apply # Execute the move
```

## Step 10: Verify the Move

After moving, confirm everything is in order:

```bash
# Verify the namespace is in the correct project
kubectl get namespace <namespace-name> -o json | \
  jq '{
    name: .metadata.name,
    project: .metadata.annotations["field.cattle.io/projectId"],
    labels: .metadata.labels
  }'

# Verify workloads are still running
kubectl get pods -n <namespace-name>

# Verify RBAC is correct
kubectl auth can-i list pods -n <namespace-name> --as=<new-project-member>
kubectl auth can-i list pods -n <namespace-name> --as=<old-project-member>
```

## Common Scenarios

**Team restructuring**: When teams merge or split, move their namespaces to match the new structure.

**Environment promotion**: Move a namespace from a development project to a staging project as part of a promotion workflow.

**Resource rebalancing**: Move namespaces between projects to redistribute resource quotas.

**Cleanup**: Move orphaned namespaces from the Default project into proper team projects.

## Best Practices

- **Communicate before moving**: Inform affected teams before moving namespaces, as their access will change.
- **Move during low-traffic periods**: While workloads keep running, RBAC changes could temporarily affect ongoing operations.
- **Check quotas first**: Verify whether the target project has a project resource quota configured before moving.
- **Update documentation**: Keep records of which namespaces belong to which projects.
- **Use Terraform**: Manage namespace-to-project assignments in code for auditability.
- **Test in staging**: Practice namespace moves in a non-production environment first.

## Conclusion

Moving namespaces between projects in Rancher is a straightforward operation with significant implications for access control and resource management. By understanding the effects on RBAC, resource quotas, and network policies, you can reorganize your cluster structure confidently. Always communicate changes to affected teams and verify access after the move completes.
