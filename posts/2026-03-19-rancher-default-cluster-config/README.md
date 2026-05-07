# How to Set Default Cluster Configuration in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cluster Templates

Description: Learn how to configure default cluster settings in Rancher to streamline cluster provisioning and maintain consistency.

Setting default cluster configurations in Rancher helps ensure that every new cluster starts with your organization's preferred settings. In practice, Rancher standardizes these defaults through cluster templates and cluster YAML, while project-level settings handle quotas and container defaults inside the cluster.

## Prerequisites

- Rancher v2.6 or later installed
- Rancher v2.7.2 or later if you want to use Pod Security Admission configuration templates
- Administrator access to Rancher
- Basic understanding of Kubernetes cluster configuration
- At least one infrastructure provider configured

## Understanding Default Configuration

Default cluster configuration in Rancher works at multiple levels. Rancher does not expose every cluster field as a single global default under **Global Settings**. Instead, cluster templates provide repeatable defaults for new clusters, Pod Security Admission configuration templates provide security baselines, and project-level quotas and container defaults control what happens inside a cluster after it is created.

## Step 1: Configure Default Kubernetes Version

Set the default Kubernetes version in the cluster template you use for new clusters:

1. Create or select the cluster template that your team will use.
2. Edit the `provisioning.cattle.io/v1` `Cluster` manifest used by that template.
3. Set `kubernetesVersion` to a version supported by your Rancher release.

```yaml
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: template-rke2
  namespace: fleet-default
spec:
  kubernetesVersion: <supported-rke2-version>
```

## Step 2: Configure Default Network Settings

Set up default networking parameters in the cluster configuration:

1. Edit the cluster template or cluster YAML.
2. Under `rkeConfig.machineGlobalConfig`, set the network CIDRs and cluster DNS values you want every new cluster to use.

```yaml
spec:
  rkeConfig:
    machineGlobalConfig:
      cni: calico
      cluster-cidr: 10.42.0.0/16
      service-cidr: 10.43.0.0/16
      cluster-dns: 10.43.0.10
```

## Step 3: Set Default Pod Security Configuration

Configure pod security defaults with a Pod Security Admission (PSA) configuration template:

```yaml
spec:
  defaultPodSecurityAdmissionConfigurationTemplateName: rancher-restricted
```

Apply this through the Rancher UI:

1. Navigate to **Cluster Management**.
2. Click **Advanced** and open **Pod Security Admissions** to create or edit templates.
3. When you create or edit a cluster, select the template under **Security**, or set `defaultPodSecurityAdmissionConfigurationTemplateName` in the cluster YAML.

## Step 4: Configure Default etcd Snapshot Settings

Set recurring etcd snapshot defaults in the cluster configuration:

```yaml
spec:
  rkeConfig:
    etcd:
      snapshotRetention: 14
      snapshotScheduleCron: "0 */12 * * *"
```

## Step 5: Set Default Monitoring Configuration

Enable monitoring defaults for clusters created from your template:

1. In your cluster template values file, enable monitoring.
2. Pass any `rancher-monitoring` chart values under `monitoring.values`.

Create a default values file for the monitoring chart:

```yaml
monitoring:
  enabled: true
  version: ""
  values:
    prometheus:
      prometheusSpec:
        resources:
          requests:
            cpu: 750m
            memory: 750Mi
          limits:
            cpu: 1000m
            memory: 2000Mi
        retention: 7d
        retentionSize: 10GB
        storageSpec:
          volumeClaimTemplate:
            spec:
              accessModes:
                - ReadWriteOnce
              resources:
                requests:
                  storage: 50Gi

    grafana:
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 200m
          memory: 256Mi

    alertmanager:
      alertmanagerSpec:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

## Step 6: Configure Default Resource Quotas

Set resource quotas that apply to namespaces created in a specific project:

1. Go to **Cluster Management**.
2. Select a cluster and click **Explore**.
3. Navigate to **Projects/Namespaces** and switch to **Group by Project** if needed.
4. Edit the project you want to standardize.
5. Under **Resource Quotas**, set both the **Project Limit** and the **Namespace Default Limit**.

The **Namespace Default Limit** propagates to namespaces created later in that project. It is not a global default for every project in Rancher.

## Step 7: Set Default Container Resource Limits

Configure default container resource limits:

1. From the same project **Edit Config** screen, expand **Container Default Resource Limit**.
2. Set default CPU and memory requests and limits for containers.

When the container default resource limit is set at the project level, Rancher propagates it to namespaces created in that project afterward. Existing namespaces are not updated automatically.

## Step 8: Configure Default Audit Logging

Set up default audit logging for newly provisioned clusters. Create a secret containing your audit policy, then mount it onto control plane nodes with `machineSelectorFiles`:

```yaml
spec:
  rkeConfig:
    machineGlobalConfig:
      kube-apiserver-arg:
        - audit-policy-file=/etc/rancher/rke2/user-audit-policy.yaml
        - audit-log-path=/etc/rancher/rke2/user-audit.logs
    machineSelectorFiles:
      - fileSources:
          - secret:
              name: audit-policy
              items:
                - key: audit-policy
                  path: /etc/rancher/rke2/user-audit-policy.yaml
        machineLabelSelector:
          matchLabels:
            rke.cattle.io/control-plane-role: 'true'
```

## Step 9: Set Default Agent Configuration

Configure default cluster agent and system agent environment variables:

```yaml
spec:
  agentEnvVars:
    - name: HTTP_PROXY
      value: http://proxy.example.com:8080
    - name: HTTPS_PROXY
      value: http://proxy.example.com:8080
    - name: NO_PROXY
      value: 127.0.0.1,localhost,.svc,.cluster.local
```

## Step 10: Document and Distribute Defaults

Create documentation for your default configuration:

```bash
# Export the baseline values for the official example cluster template
helm repo add cluster-templates https://raw.githubusercontent.com/rancher/cluster-template-examples/main
helm repo update
helm show values cluster-templates/cluster-template > rancher-defaults.yaml
```

## Best Practices

- **Review defaults quarterly**: Kubernetes and Rancher evolve rapidly, so review your default settings on a regular cadence.
- **Use cluster templates as the baseline**: In Rancher, cluster templates are the primary way to standardize Kubernetes version, networking, monitoring, and agent settings for new clusters.
- **Test in staging first**: Always verify new default settings in a staging environment before applying them to production.
- **Keep documentation current**: Maintain a living document that explains each default and why it was chosen.
- **Version control your template values and cluster YAML**: Store your cluster template, monitoring values, and project standards in Git to track changes over time.

## Conclusion

Configuring default cluster settings in Rancher creates a strong foundation for consistent Kubernetes deployments. By standardizing cluster templates, PSA templates, and project-level controls, you reduce the effort required to provision new clusters while maintaining organizational standards. Cluster templates are the core mechanism for making those defaults repeatable.
