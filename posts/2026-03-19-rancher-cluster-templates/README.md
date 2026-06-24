# How to Create Cluster Templates in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Templates, RBAC

Description: Learn how to create and manage cluster templates in Rancher for standardized Kubernetes cluster provisioning across your organization.

RKE templates in Rancher allow administrators to define standardized configurations for Rancher-provisioned RKE1 clusters. By using templates, you ensure consistency across environments and reduce the chance of misconfigurations. This guide walks you through creating, managing, and sharing RKE templates in Rancher.

## Prerequisites

Before you begin, make sure you have the following in place:

- A Rancher version that still supports downstream RKE1 clusters and RKE templates. RKE1 reached end of life on July 31, 2025, and Rancher v2.12 and later do not support provisioning or managing downstream RKE1 clusters.
- The **Create RKE Templates** permission in Rancher. To revise, share, or delete a template, you must be an owner of that template.
- At least one cloud credential configured if provisioning cloud-based clusters
- A basic understanding of Kubernetes cluster components

## Understanding RKE Templates

RKE templates are pre-defined cluster configurations that administrators can create and share with other users. They enforce organizational standards by locking down specific settings while allowing flexibility on others. Templates can define Kubernetes versions, networking plugins, cloud provider options, add-ons, and security-related settings. Node templates and node pool settings are configured separately.

## Step 1: Access the RKE Templates Section

Navigate to the RKE templates area in Rancher:

1. Log in to your Rancher dashboard.
2. Click on the hamburger menu in the top-left corner.
3. Select **Cluster Management**.
4. Click on **RKE Templates** in the left sidebar under the **RKE1 Configuration** section.

## Step 2: Create a New RKE Template

Click the **Add Template** button to start creating a new template.

Fill in the basic information:

```plaintext
Template Name: production-standard
Description: Standard production RKE template with Calico networking and CIS hardening

```

## Step 3: Configure the Kubernetes Version

Select the Kubernetes version for your template:

1. Under **Kubernetes Version**, choose the desired version from the dropdown.
2. For production environments, it is recommended to use a stable, well-tested version rather than the latest release.
3. Rancher stores this as an exact `kubernetes_version` value in the RKE configuration, so use one of the specific versions Rancher offers in the dropdown rather than a wildcard.

## Step 4: Configure the Network Provider

Choose and configure the network plugin:

1. Under **Network Provider**, select your preferred CNI plugin (Calico, Canal, Flannel, or Weave).
2. Configure plugin-specific options.

For Calico, a common production configuration looks like this:

```yaml
network:
  plugin: calico
```

For Canal:

```yaml
network:
  plugin: canal
  options:
    canal_flannel_backend_type: vxlan
```

If you need to set `calico_cloud_provider`, the supported values are `aws` and `gce`. Also note that Weave is deprecated in RKE with Kubernetes v1.27 and later and removed in v1.30.

## Step 5: Configure Authorization

Set up the authorization mode:

1. Under **Authorization**, select the authorization mode.
2. For RKE clusters, use **RBAC**, which is the supported authorization mode and is enabled by default.

```yaml
authorization:
  mode: rbac
```

## Step 6: Define Cluster Services Configuration

Configure etcd, the API server, and other cluster services:

```yaml
services:
  etcd:
    backup_config:
      interval_hours: 6
      retention: 30
  kube-api:
    audit_log:
      enabled: true
      configuration:
        max_age: 30
        max_backup: 10
        max_size: 100
    event_rate_limit:
      enabled: true
    secrets_encryption_config:
      enabled: true
  kubelet:
    extra_args:
      protect-kernel-defaults: "true"
```

## Step 7: Set Template Override Controls

Control how the template can be modified:

1. While defining the template, use the **Allow User Override** toggle on individual settings to decide whether users can change them.
2. Leave the toggle off for settings that should be enforced by the template.

Settings with **Allow User Override** turned off are fixed by the template. Settings with it turned on must be supplied during cluster creation and can be edited later.

## Step 8: Share the Template

Configure who can use the template:

1. Under **Share Template**, click **Add Member**.
2. Search for users or groups.
3. Assign the appropriate access type:
   - **Owner**: Can modify and delete the template
   - **User**: Can use the template to create clusters

```plaintext
Member: devops-team
Access Type: User

Member: platform-admin
Access Type: Owner
```

## Step 9: Create a Cluster from the Template

Once your template is saved, users can create clusters from it:

1. Go to **Cluster Management** and click **Create**.
2. Select the infrastructure provider.
3. Provide the cluster name and node template details as usual.
4. Under **Cluster Options**, check **Use an existing RKE template and revision**.
5. Select your template and revision from the dropdowns.
6. Fill in any fields that were marked **Allow User Override**.
7. Click **Create** to provision the cluster.

## Step 10: Manage Template Revisions

As your infrastructure evolves, you may need to update templates:

1. Navigate back to **RKE Templates**.
2. Go to the template and click **⋮ > Edit** to create a new revision, or use **New Revision from Default** or **Clone Revision** to start from an existing revision.
3. Make the necessary changes.
4. Save the revision and, if needed, set it as the default.

Existing clusters using previous revisions will not be automatically updated. Cluster owners can choose to upgrade to the new revision at their discretion.

## Using the Rancher API for Template Management

You can also manage RKE templates programmatically using the Rancher API. Rancher v2.8 and later introduced the Rancher Kubernetes API (RK-API), but the legacy `/v3` API is still available and exposes an API browser for discovering schemas and request formats.

```bash
# Query the legacy v3 API root and inspect the available collection links
curl -sS -u "$RANCHER_ACCESS_KEY:$RANCHER_SECRET_KEY" \
  "https://rancher.example.com/v3" | jq '.links'
```

From the `/v3` API UI, inspect the `clusterTemplates` and `clusterTemplateRevisions` schemas for your Rancher version and follow the `collection`, `links`, and `actions` values rather than hard-coding deeper URLs.

## Best Practices

When working with RKE templates, keep these guidelines in mind:

- **Version your templates**: Use descriptive revision names so teams can track changes over time.
- **Enforce critical settings**: Leave **Allow User Override** turned off for networking, RBAC, and security settings that should not drift.
- **Test before enforcing**: Create a test cluster from your template before mandating its use across the organization.
- **Document customizable fields**: Clearly communicate which settings users can adjust and which are fixed by the template.
- **Review regularly**: Schedule periodic reviews of your templates to incorporate security patches and Kubernetes version updates.
- **Plan migration off RKE1**: RKE templates are part of the legacy RKE1 workflow; Rancher v2.12 and later do not support downstream RKE1 clusters.

## Conclusion

RKE templates in Rancher provide a powerful way to standardize Kubernetes deployments across your organization when you are operating legacy RKE1 environments. By defining and enforcing templates, you reduce configuration drift, improve security posture, and simplify the cluster provisioning process for your teams. Start with a small number of well-defined templates and iterate as your infrastructure requirements evolve.
