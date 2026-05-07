# How to Create and Manage Projects in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Project, Namespace, RBAC

Description: A complete guide to creating, configuring, and managing projects in Rancher to organize namespaces and control access to cluster resources.

Projects are a Rancher-specific concept that groups multiple Kubernetes namespaces together under a single management boundary. They simplify access control, resource quotas, and workload organization. This guide covers everything you need to know about creating and managing projects in Rancher.

## Prerequisites

- Rancher v2.7+ with cluster owner or administrator access
- At least one managed downstream cluster
- An understanding of your team structure and workload requirements

## Understanding Projects

A project in Rancher:

- Groups one or more Kubernetes namespaces together
- Provides a single point for access control (project roles apply to all namespaces in the project)
- Supports resource quotas that span across all namespaces in the project
- Can enforce network isolation between projects
- Appears as an organizational unit in the Rancher UI

Every cluster starts with two built-in projects:

- **Default**: Where namespaces go if they are not assigned to a specific project
- **System**: Contains Kubernetes system namespaces like `kube-system` and `cattle-system`

## Step 1: Create a Project via the UI

1. Navigate to your cluster in Rancher.
2. Go to **Cluster > Projects/Namespaces**.
3. Click **Create Project**.
4. Fill in the project details:
   - **Name**: Enter a descriptive name (for example, `backend-services`)
   - **Description**: Add a description of the project's purpose
5. Optionally configure:
   - **Resource Quotas**: Set limits on CPU, memory, and other resources
   - **Container Default Resource Limit**: Set default resource requests and limits for containers
   - **Pod Security Policy** (if your cluster still supports PSPs; PSA is configured at the cluster level)
6. Click **Create**.

## Step 2: Create a Project via kubectl

Project resources are created on the Rancher management cluster.

```yaml
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  generateName: p-
  namespace: c-m-xxxxx  # Your cluster ID
spec:
  displayName: backend-services
  description: "Backend microservices and APIs"
  clusterName: c-m-xxxxx
  resourceQuota:
    limit:
      pods: "200"
      requestsCpu: "16000m"
      requestsMemory: "32Gi"
  namespaceDefaultResourceQuota:
    limit:
      pods: "50"
      requestsCpu: "4000m"
      requestsMemory: "8Gi"
```

```bash
kubectl create -f project.yaml
```

## Step 3: Create a Project via the Rancher API

```bash
curl -X POST 'https://<rancher-url>/v3/projects' \
  -H 'Authorization: Bearer <api-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "backend-services",
    "description": "Backend microservices and APIs",
    "clusterId": "c-m-xxxxx",
    "resourceQuota": {
      "limit": {
        "pods": "200",
        "requestsCpu": "16000m",
        "requestsMemory": "32Gi"
      }
    }
  }'
```

## Step 4: Create Namespaces Within a Project

**Via the UI:**

1. Go to **Cluster > Projects/Namespaces**.
2. Find your project in the list.
3. Click **Create Namespace** within the project section.
4. Enter the namespace name.
5. Optionally set resource limits specific to this namespace.
6. Click **Create**.

**Via kubectl:**

Create the namespace on the downstream cluster that the project belongs to.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: api-production
  annotations:
    field.cattle.io/projectId: "c-m-xxxxx:p-xxxxx"
```

```bash
kubectl apply -f namespace.yaml
```

The `field.cattle.io/projectId` annotation assigns the namespace to the specified project.

## Step 5: Manage Project Members

Add users and groups to the project:

1. Navigate to the project.
2. Go to **Project > Members**.
3. Click **Add**.
4. Search for users or groups.
5. Assign the appropriate role (Project Owner, Project Member, or Read-Only).
6. Click **Create**.

## Step 6: Configure Project Resource Quotas

Update resource quotas on an existing project:

1. Go to **Cluster > Projects/Namespaces**.
2. Find the project and click the three-dot menu.
3. Select **Edit Config**.
4. Under **Resource Quotas**, configure:
   - **Project Limit**: Total resources the project can consume
   - **Namespace Default Limit**: Default allocation per namespace

```yaml
resourceQuota:
  limit:
    pods: "500"
    requestsCpu: "32000m"
    requestsMemory: "64Gi"
    limitsCpu: "64000m"
    limitsMemory: "128Gi"
    configMaps: "200"
    persistentVolumeClaims: "50"
    services: "100"
    servicesLoadBalancers: "10"
    servicesNodePorts: "20"
namespaceDefaultResourceQuota:
  limit:
    pods: "100"
    requestsCpu: "8000m"
    requestsMemory: "16Gi"
```

## Step 7: Enable Project Network Isolation

Isolate network traffic between projects:

1. Go to the project's edit page.
2. Under **Network Isolation**, check **Enable Project Network Isolation**.
3. Click **Save**.

This creates NetworkPolicy resources that prevent pods in other projects from communicating with pods in this project unless explicitly allowed.

## Step 8: List and View Projects

**Via the UI:**

Navigate to **Cluster > Projects/Namespaces** to see all projects, their namespaces, and resource usage.

**Via kubectl:**

```bash
# List all projects for a cluster from the Rancher management cluster

kubectl --namespace c-m-xxxxx get projects
```

**Via the API:**

```bash
curl -s 'https://<rancher-url>/v3/projects?clusterId=c-m-xxxxx' \
  -H 'Authorization: Bearer <api-token>' | \
  jq '.data[] | {id, name, state}'
```

## Step 9: Edit a Project

**Via the UI:**

1. Go to **Cluster > Projects/Namespaces**.
2. Click the three-dot menu next to the project.
3. Select **Edit Config**.
4. Modify the name, description, resource quotas, or network isolation settings.
5. Click **Save**.

**Via kubectl:**

```bash
kubectl edit projects.management.cattle.io <project-name> -n <cluster-id>
```

## Step 10: Delete a Project

Deleting a project removes the project container but does not delete the namespaces. The namespaces become unassigned.

**Via the UI:**

1. Go to **Cluster > Projects/Namespaces**.
2. Ensure no critical workloads are running in the project's namespaces.
3. Click the three-dot menu next to the project.
4. Select **Delete**.
5. Confirm the deletion.

**Via kubectl:**

```bash
kubectl delete projects.management.cattle.io <project-name> -n <cluster-id>
```

After deletion, the namespaces remain on the cluster and appear in **Not in a Project** until you reassign them or clean them up.

## Step 11: Manage Projects with Terraform

```hcl
resource "rancher2_project" "frontend" {
  name        = "frontend-services"
  cluster_id  = rancher2_cluster.production.id
  description = "Frontend web applications and static assets"

  resource_quota {
    project_limit {
      pods               = "200"
      requests_cpu       = "16000m"
      requests_memory    = "32Gi"
    }
    namespace_default_limit {
      pods               = "50"
      requests_cpu       = "4000m"
      requests_memory    = "8Gi"
    }
  }

  container_resource_limit {
    limits_cpu      = "500m"
    limits_memory   = "512Mi"
    requests_cpu    = "100m"
    requests_memory = "128Mi"
  }
}

resource "rancher2_namespace" "frontend_prod" {
  name        = "frontend-prod"
  project_id  = rancher2_project.frontend.id
  description = "Production frontend namespace"
}
```

## Best Practices

- **One project per team or application**: Align projects with your organizational or application boundaries.
- **Set resource quotas early**: Configure resource quotas when creating the project to prevent resource contention.
- **Use network isolation**: Enable project network isolation for any project that should be isolated from others.
- **Assign members at the project level**: Manage access at the project level rather than per-namespace for simplicity.
- **Use descriptive names**: Name projects clearly so their purpose is obvious to anyone viewing the cluster.
- **Avoid the Default project**: Move workloads out of the Default project into purpose-specific projects.
- **Use Terraform for consistency**: Manage project configurations as code across multiple clusters.

## Conclusion

Projects in Rancher provide a powerful organizational layer on top of Kubernetes namespaces. By creating projects that match your team structure, configuring resource quotas, and managing access through project roles, you build a well-organized and secure Kubernetes environment. Use automation tools like Terraform to maintain consistency across clusters as your platform grows.
