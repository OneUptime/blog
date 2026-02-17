# How to Create Monitoring Groups to Organize Resources in Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Resource Groups, Organization, Infrastructure

Description: Create monitoring groups in Google Cloud Monitoring to organize your cloud resources into logical collections for targeted monitoring, alerting, and dashboard creation.

---

When you have hundreds of VMs, containers, and services, monitoring everything as a flat list does not work. You need to organize resources into logical groups - by application, by team, by environment, or by function. Google Cloud Monitoring groups let you define dynamic collections of resources based on labels, names, or other criteria. Once grouped, you can create dashboards, alerts, and uptime checks that target the entire group rather than individual resources.

This post shows you how to create and use monitoring groups effectively.

## What Are Monitoring Groups?

A monitoring group is a dynamic collection of monitored resources defined by filter criteria. Resources that match the criteria are automatically included in the group. When new resources are created that match the filter, they are added automatically. When resources are deleted or their labels change, they leave the group.

Groups can be nested - a parent group can contain child groups for more specific categorization. For example, a "Production" parent group could contain "Production - Frontend" and "Production - Backend" child groups.

## Creating a Group via the Console

The simplest way to create a group:

1. Navigate to Monitoring in the Cloud Console
2. Click Groups in the sidebar
3. Click Create Group
4. Give the group a name
5. Define the filter criteria (resource type, labels, name pattern)
6. Save the group

## Creating a Group via the API

For automation and version control, use the Cloud Monitoring API.

```bash
# Create a group for all production VMs using curl
ACCESS_TOKEN=$(gcloud auth print-access-token)

curl -X POST \
  "https://monitoring.googleapis.com/v3/projects/my-project/groups" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Production VMs",
    "filter": "resource.type = \"gce_instance\" AND resource.metadata.user_labels.env = \"production\"",
    "isCluster": false
  }'
```

## Filtering by Labels

The most common way to define groups is by resource labels. If your resources are properly labeled, groups practically create themselves.

To group all resources for a specific application:

```json
{
  "displayName": "Order Service",
  "filter": "resource.metadata.user_labels.app = \"order-service\""
}
```

To group all resources in a specific environment:

```json
{
  "displayName": "Staging Environment",
  "filter": "resource.metadata.user_labels.env = \"staging\""
}
```

To combine multiple criteria:

```json
{
  "displayName": "Production Frontend",
  "filter": "resource.metadata.user_labels.env = \"production\" AND resource.metadata.user_labels.tier = \"frontend\""
}
```

## Filtering by Resource Type

You can also create groups based on resource type.

```json
{
  "displayName": "All Cloud SQL Instances",
  "filter": "resource.type = \"cloudsql_database\""
}
```

Or combine resource type with labels:

```json
{
  "displayName": "Production Databases",
  "filter": "resource.type = \"cloudsql_database\" AND resource.metadata.user_labels.env = \"production\""
}
```

## Filtering by Name Pattern

Group resources by name using the `has_substring` or `starts_with` functions.

```json
{
  "displayName": "API Servers",
  "filter": "resource.type = \"gce_instance\" AND resource.metadata.name = starts_with(\"api-\")"
}
```

This catches all VMs whose names start with "api-", like api-server-1, api-server-2, and so on.

## Creating Nested Groups (Subgroups)

Nested groups let you build a hierarchy. Create a parent group first, then reference its ID when creating child groups.

```bash
# First, create the parent group
curl -X POST \
  "https://monitoring.googleapis.com/v3/projects/my-project/groups" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Production",
    "filter": "resource.metadata.user_labels.env = \"production\""
  }'

# Note the group ID from the response (e.g., "projects/my-project/groups/1234567890")

# Create a child group under the parent
curl -X POST \
  "https://monitoring.googleapis.com/v3/projects/my-project/groups" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Production - Web Tier",
    "filter": "resource.metadata.user_labels.env = \"production\" AND resource.metadata.user_labels.tier = \"web\"",
    "parentName": "projects/my-project/groups/1234567890"
  }'
```

## Practical Group Hierarchy Example

Here is a group hierarchy that works well for a typical organization:

```
All Resources
  Production
    Production - Frontend
    Production - Backend
    Production - Databases
    Production - Cache
  Staging
    Staging - Frontend
    Staging - Backend
  Development
  Shared Services
    CI/CD
    Monitoring
    Logging
```

Each group is defined by label-based filters, and resources automatically appear in the right group based on their labels.

## Using Groups in Dashboards

Groups are especially useful in dashboards. Instead of filtering by individual resources, you filter by group.

In the Cloud Monitoring console, when you create a dashboard widget, you can select a group as the resource scope. The widget then shows data only for resources in that group.

This means you can create a single dashboard template and use it with different groups. A "Service Health" dashboard that works for the frontend group also works for the backend group - just switch the group filter.

## Using Groups in Alerting Policies

Alerting policies can target groups instead of all resources. This lets you set different thresholds for different environments.

```json
{
  "displayName": "Production CPU Alert",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "High CPU in Production",
      "conditionThreshold": {
        "filter": "resource.type = \"gce_instance\" AND metric.type = \"compute.googleapis.com/instance/cpu/utilization\" AND group.id = \"1234567890\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.8,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MEAN"
          }
        ]
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"]
}
```

By targeting the production group, this alert only fires for production VMs. You can create a separate alert with different thresholds for staging.

## Using Groups with Uptime Checks

You can create uptime checks for all resources in a group. When a new resource is added to the group, it automatically gets monitored.

## Managing Groups

List, update, and manage groups through the API.

```bash
# List all groups
curl -s \
  "https://monitoring.googleapis.com/v3/projects/my-project/groups" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" | jq '.group[].displayName'

# List members (resources) of a group
curl -s \
  "https://monitoring.googleapis.com/v3/projects/my-project/groups/GROUP_ID/members" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" | jq '.members[].displayName'

# Update a group's filter
curl -X PUT \
  "https://monitoring.googleapis.com/v3/projects/my-project/groups/GROUP_ID" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Production VMs",
    "filter": "resource.type = \"gce_instance\" AND resource.metadata.user_labels.env = \"production\" AND resource.metadata.user_labels.team = \"platform\""
  }'

# Delete a group
curl -X DELETE \
  "https://monitoring.googleapis.com/v3/projects/my-project/groups/GROUP_ID" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

## Labeling Best Practices for Groups

Groups are only as good as your resource labels. Here are labeling practices that make groups work well:

- Use consistent label keys across all resources. Decide on `env` vs `environment` and stick with it.
- Apply labels at creation time through Terraform, Deployment Manager, or gcloud commands.
- Standardize label values. Use `production` everywhere, not `prod` in some places and `production` in others.
- Include team ownership labels. `team=backend` makes it easy to create per-team monitoring views.
- Add application and service labels. `app=order-service` and `component=api` let you create fine-grained groups.

```bash
# Example: creating a VM with proper labels for group membership
gcloud compute instances create api-server-1 \
  --zone=us-central1-a \
  --labels=env=production,team=backend,app=order-service,tier=api
```

## Cluster Groups

Setting `isCluster: true` on a group tells Cloud Monitoring to display its members as a cluster in the console. This is useful for groups of VMs or containers that work together and should be monitored as a unit.

```json
{
  "displayName": "API Server Cluster",
  "filter": "resource.type = \"gce_instance\" AND resource.metadata.user_labels.app = \"api-server\"",
  "isCluster": true
}
```

## Summary

Monitoring groups bring order to your Cloud Monitoring setup. By organizing resources into logical collections based on labels, names, or resource types, you can create targeted dashboards, scoped alerts, and manageable monitoring views. Groups are dynamic, so they grow and shrink automatically as resources come and go. The key requirement is consistent resource labeling - invest in that, and groups give you a structured way to monitor even the largest infrastructure.
