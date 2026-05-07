# How to Use RKE Templates for Consistent Cluster Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Templates, RKE

Description: A step-by-step guide to using RKE templates in Rancher for consistent and repeatable Kubernetes cluster provisioning.

RKE (Rancher Kubernetes Engine) templates allow you to define reusable cluster configurations that enforce organizational standards while still giving teams flexibility where needed. This guide covers how to create, customize, and deploy clusters using RKE templates in Rancher.

This guide applies to legacy Rancher environments that still support RKE1 templates. RKE1 reached end of life on July 31, 2025, and Rancher 2.12.0 and later no longer support provisioning or managing downstream RKE1 clusters.

## Prerequisites

- Rancher versions that still support RKE1 templates, such as v2.6 through v2.11
- Admin or standard user permissions with the Create RKE Templates permission
- Familiarity with RKE cluster configuration options
- If you plan to provision new nodes from an infrastructure provider, the relevant node driver or cloud credentials configured in Rancher

## What Are RKE Templates

RKE templates are versioned cluster configuration blueprints for Rancher-provisioned RKE1 clusters. Each template can have multiple revisions, and administrators can control which settings are enforced and which are open for customization. This separation enables platform teams to enforce security and networking standards while allowing development teams to adjust resource-specific settings.

## Step 1: Plan Your Template Structure

Before creating a template, plan which settings to enforce and which to mark as **Allow User Override**:

| Setting | Allow User Override | Reason |
|---------|---------------------|--------|
| Kubernetes Version | Yes | Allow controlled upgrades within the Rancher-supported RKE1 versions for your environment |
| Network Plugin | No | Ensure consistent networking |
| Authorization (RBAC) | No | Security requirement |
| Recurring etcd Snapshots | No | Data protection |
| Audit Logging | No | Compliance requirement |
| Pod Security Admission Configuration | No | Security baseline for Kubernetes v1.25+ |

## Step 2: Create the RKE Template

Navigate to **Cluster Management**, then **RKE1 Configuration** > **RKE Templates**, and click **Add Template**.

Enter the template details:

```plaintext
Name: standard-rke-cluster
Description: Organization-standard RKE cluster configuration

```

## Step 3: Configure RKE Options

Set the core RKE configuration for your template:

```yaml
rancher_kubernetes_engine_config:
  kubernetes_version: <supported-rke1-version>

  authorization:
    mode: rbac

  network:
    plugin: canal
    options:
      flannel_backend_type: vxlan

  services:
    kube-api:
      service_cluster_ip_range: 10.43.0.0/16
      extra_args:
        anonymous-auth: "false"
        profiling: "false"
    kube-controller:
      cluster_cidr: 10.42.0.0/16
      service_cluster_ip_range: 10.43.0.0/16
      extra_args:
        terminated-pod-gc-threshold: "1000"
        profiling: "false"
    kubelet:
      cluster_domain: cluster.local
      cluster_dns_server: 10.43.0.10
      extra_args:
        max-pods: "110"
        serialize-image-pulls: "false"
    scheduler:
      extra_args:
        profiling: "false"
```

## Step 4: Configure etcd Settings

Set up etcd backup and recovery options:

```yaml
rancher_kubernetes_engine_config:
  services:
    etcd:
      snapshot: true
      backup_config:
        enabled: true
        interval_hours: 6
        retention: 30
        s3backupconfig:
          access_key: ""
          bucket_name: "etcd-backups"
          endpoint: "s3.amazonaws.com"
          folder: ""
          region: "us-east-1"
          secret_key: ""
      extra_args:
        election-timeout: "5000"
        heartbeat-interval: "500"
```

## Step 5: Enable Security Features

For Kubernetes v1.25 and newer, use Pod Security Admission settings together with other security-related configurations:

```yaml
default_pod_security_admission_configuration_template_name: rancher-restricted

rancher_kubernetes_engine_config:
  services:
    kube-api:
      audit_log:
        enabled: true
        configuration:
          max_age: 30
          max_backup: 10
          max_size: 100
          path: /var/log/kube-audit/audit-log.json
          format: json
          policy:
            apiVersion: audit.k8s.io/v1
            kind: Policy
            rules:
              - level: Metadata
                resources:
                  - group: ""
                    resources: ["secrets", "configmaps"]
              - level: RequestResponse
                resources:
                  - group: ""
                    resources: ["pods"]
      secrets_encryption_config:
        enabled: true
      event_rate_limit:
        enabled: true
```

## Step 6: Lock Template Fields

After configuring your template, use the **Allow User Override** toggles to control which fields end users can change:

1. Next to each setting, locate the **Allow User Override** toggle.
2. Turn the toggle off for settings that Rancher should enforce.
3. At minimum, keep user override disabled for the following sections:
   - Network Provider
   - Authorization configuration
   - etcd snapshot settings
   - Audit log configuration
   - Secrets encryption
   - Pod security admission settings

## Step 7: Create Template Revisions

Save the initial template, then create revisions as your standards evolve:

1. Open the template.
2. Use **Edit** to create an updated revision, or **New Revision from Default** to clone the default revision first.
3. Update the Kubernetes version or other settings.
4. Give the revision a descriptive name like `v1.1-k8s-1.28`.
5. Optionally set it as the default revision.

You can also automate this with Rancher's v3 API, but the exact request body is schema-driven and version-dependent. Use Rancher's `/v3` API browser or capture the request from the Rancher UI before scripting it.

## Step 8: Provision a Cluster from the Template

Create a new cluster using the RKE template:

1. Go to **Cluster Management** and click **Create**.
2. Select **Custom** or your preferred infrastructure provider.
3. Provide the cluster name and node template details as usual.
4. Under **Cluster Options**, check **Use an existing RKE template and revision**.
5. Choose the template and template revision.
6. Configure any fields marked **Allow User Override** as needed.
7. Set up your nodes with appropriate roles:
   - **etcd**: At least 3 nodes for high availability
   - **control plane**: At least 2 nodes
   - **worker**: At least 2 nodes if you want workloads to be rescheduled after a node failure

```bash
# Rancher generates the exact registration command for each node.
# This example is for a node that runs both the etcd and controlplane roles.
docker run -d --privileged --restart=unless-stopped \
  --net=host \
  -v /etc/kubernetes:/etc/kubernetes \
  -v /var/run:/var/run \
  rancher/rancher-agent:<matching-rancher-version> \
  --server https://rancher.example.com \
  --token <node-registration-token> \
  --etcd --controlplane
```

## Step 9: Update Clusters to New Revisions

When you create a new template revision, update existing clusters:

1. Go to the cluster's dashboard.
2. Click the three-dot menu and select **Edit Config**.
3. In the **Cluster Options** section, select the new template revision.
4. Review the changes that will be applied.
5. Click **Save** to begin the upgrade.

## Step 10: Share Templates Within Rancher

RKE templates can be shared with users or groups in the same Rancher installation:

1. Open the template and click **Edit**.
2. In **Share Template**, add users or groups with **User** access, or enable **Make Public (read-only)**.
3. Click **Save**.

## Best Practices

- **Start with a minimal enforced configuration**: Only disable **Allow User Override** for settings that are truly mandatory. You can always enforce more later.
- **Use descriptive revision names**: Include the Kubernetes version and date in revision names for easy tracking.
- **Test revisions in staging**: Always test new template revisions with a staging cluster before rolling them out to production.
- **Automate carefully**: Use Rancher's API for template workflows, and tools such as Terraform for the underlying infrastructure when needed.
- **Monitor template compliance**: Regularly audit clusters to ensure they are using approved template revisions.

## Conclusion

In legacy Rancher environments that still support RKE1, RKE templates bring consistency and governance to Kubernetes cluster provisioning. By thoughtfully designing your templates with the right balance of enforced and flexible settings, you empower teams to move quickly while maintaining organizational standards. Combine templates with Rancher's RBAC system and you have a robust platform for multi-team Kubernetes management.
