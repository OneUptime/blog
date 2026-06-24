# How to Enforce Cluster Templates with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Templates, RBAC

Description: Learn how to enforce cluster templates in Rancher so that all new clusters must be created from approved templates.

Enforcing RKE templates in Rancher ensures that every new Rancher-provisioned RKE1 cluster in your organization meets defined standards. When template enforcement is enabled, users cannot create clusters with ad-hoc configurations. This guide shows you how to set up and manage template enforcement effectively.

This feature applies to Rancher's legacy RKE1 templates. Rancher 2.12 and later no longer support provisioning or managing downstream RKE1 clusters, so use this guide only with Rancher 2.11 or earlier.

## Prerequisites

- Rancher v2.6 through v2.11 with admin access
- At least one RKE template already created and configured
- Users and roles configured in Rancher
- An understanding of Rancher RBAC

## Why Enforce RKE Templates

Without enforcement, any user with cluster creation permissions can provision clusters with arbitrary configurations. This leads to configuration drift, security gaps, and operational inconsistencies. Enforcement ensures that every cluster aligns with your organization's standards for networking, security, and resource management.

## Step 1: Enable Template Enforcement

Enable the enforcement setting at the global level:

1. Log in to Rancher as an administrator.
2. Click the hamburger menu and go to **Global Settings**.
3. Find the setting `cluster-template-enforcement`.
4. Click **Edit** and set the value to `true`.

Alternatively, use the Rancher API:

```bash
curl -s -k \
  -X PUT \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "true"}' \
  "https://rancher.example.com/v3/settings/cluster-template-enforcement"
```

## Step 2: Verify Enforcement Is Active

Confirm the setting is applied:

```bash
curl -s -k \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  "https://rancher.example.com/v3/settings/cluster-template-enforcement" | jq '.value'
```

The output should return `"true"`.

## Step 3: Prepare Templates for Enforcement

Before enforcing templates, make sure your templates are production-ready:

1. Navigate to **Cluster Management** then **RKE1 Configuration > RKE Templates**.
2. Review each template to ensure all critical settings are not marked **Allow User Override**.
3. Verify that you have matching node templates or other provisioning workflows for the infrastructure providers your teams use.
4. Set a default revision for each template.

Check that the following settings are locked in your templates:

```yaml
# Critical locked settings checklist

rancher_kubernetes_engine_config:
  authorization:
    mode: rbac  # Locked

  network:
    plugin: canal  # Locked

  services:
    kube_api:
      audit_log:
        enabled: true  # Locked
      secrets_encryption_config:
        enabled: true  # Locked
    etcd:
      backup_config:
        enabled: true  # Locked
        interval_hours: 6  # Locked
```

## Step 4: Assign Template Access

Make sure all users who need to create clusters have access to at least one template:

1. Open an RKE template.
2. Click **Add Member**.
3. Add users or groups that need access.
4. Set the access type to **User** for people who should use but not modify the template.

## Step 5: Test Enforcement

Verify that enforcement works correctly:

1. Log in as a non-admin user who has cluster creation permissions.
2. Navigate to **Cluster Management** and click **Create**.
3. You should be required to use an existing RKE template and revision.
4. Attempting to create a cluster without selecting a template should be blocked.

## Step 6: Handle Exceptions

In Rancher, RKE template enforcement exempts administrators only:

1. Go to **Users & Authentication** if you need to review who has administrator access.
2. Remove unnecessary administrator access before enabling enforcement.
3. For users who need more flexibility, share a less restrictive RKE template instead of bypassing enforcement.

Template ownership lets a user revise and share a template, but it does not exempt them from enforcement. Limit administrator access to platform administrators only.

## Step 7: Monitor Compliance

Set up monitoring to track template compliance across your Rancher-provisioned RKE clusters:

```bash
# List all clusters and their template status
curl -s -k \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  "https://rancher.example.com/v3/clusters" | \
  jq '.data[] | {
    name: .name,
    driver: .driver,
    template: .clusterTemplateId,
    revision: .clusterTemplateRevisionId,
    state: .state
  }'
```

Create a script to run periodically and alert on non-compliant clusters:

```bash
#!/bin/bash
# check-template-compliance.sh

RANCHER_URL="https://rancher.example.com"
TOKEN="$RANCHER_TOKEN"

clusters=$(curl -s -k \
  -H "Authorization: Bearer $TOKEN" \
  "$RANCHER_URL/v3/clusters" | jq -r '.data[] | select(.driver == "rancherKubernetesEngine" and .clusterTemplateId == null) | .name')

if [ -n "$clusters" ]; then
  echo "WARNING: The following clusters are not using templates:"
  echo "$clusters"
  # Send alert via your preferred notification system
fi
```

## Step 8: Update Enforcement Policies

As your organization grows, refine your enforcement approach:

1. **Create provider-specific templates**: Have separate templates for AWS, Azure, GCP, and on-premises deployments, and pair them with node templates if you also need to standardize infrastructure.
2. **Establish a template review process**: Require peer review before template changes are published.
3. **Version template policies**: Track which templates are approved for which environments.

```yaml
# Example: Template naming convention
templates:
  - name: prod-aws-standard
    provider: amazonec2
    environment: production
    locked_fields: [network, rbac, etcd, audit]

  - name: dev-aws-flexible
    provider: amazonec2
    environment: development
    locked_fields: [network, rbac]

  - name: prod-vsphere-standard
    provider: vsphere
    environment: production
    locked_fields: [network, rbac, etcd, audit]
```

## Step 9: Handle Template Enforcement with Terraform

If you use Terraform for Rancher management, configure enforcement in your Terraform code:

```hcl
resource "rancher2_setting" "cluster_template_enforcement" {
  name  = "cluster-template-enforcement"
  value = "true"
}
```

## Best Practices

- **Communicate changes early**: Notify teams before enabling enforcement so they understand the new requirements.
- **Provide sufficient templates**: Ensure there are RKE templates for every valid use case to avoid blocking legitimate work.
- **Audit regularly**: Review template assignments and compliance reports on a regular schedule.
- **Maintain escape hatches**: Have a documented process for emergency administrator access or approved use of a more permissive template.
- **Automate compliance checks**: Integrate template compliance into your CI/CD pipelines and monitoring dashboards.

## Conclusion

Enforcing RKE templates in Rancher is a critical governance step for organizations running multiple Kubernetes clusters. By enabling enforcement, preparing comprehensive templates, and monitoring compliance, you create a secure and consistent foundation for your container infrastructure. The key is balancing control with flexibility so teams can remain productive within defined guardrails.
