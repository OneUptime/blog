# How to Sync Common Configuration Across Clusters with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Multi-Cluster, common configuration, GitOps, Kubernetes, shared resources

Description: Learn how to define and synchronize common Kubernetes configurations across multiple clusters using Flux CD for consistent infrastructure management.

---

## Introduction

When managing multiple Kubernetes clusters, certain configurations must be consistent everywhere: security policies, monitoring agents, logging collectors, RBAC rules, and network policies. Maintaining these manually across clusters is error-prone and leads to drift. Flux CD enables you to define common configurations once and sync them across all clusters automatically. This guide shows you how to set up and manage shared configurations.

## What Should Be Common Across Clusters

Typical configurations that should be identical or near-identical across all clusters:

- **Security policies**: PodSecurityStandards, NetworkPolicies, OPA/Gatekeeper constraints
- **Monitoring stack**: Prometheus, Grafana, alerting rules
- **Logging pipeline**: Fluentbit, Loki, log shipping configurations
- **Certificate management**: cert-manager, ClusterIssuers
- **RBAC**: ClusterRoles, ClusterRoleBindings for platform teams
- **Resource quotas**: Default quotas and limit ranges
- **Namespace standards**: Standard namespaces with required labels

## Repository Structure

```text
fleet-repo/
  common/
    security/
      pod-security.yaml
      network-policies.yaml
      kustomization.yaml
    monitoring/
      prometheus-stack.yaml
      alerting-rules.yaml
      kustomization.yaml
    logging/
      fluentbit.yaml
      kustomization.yaml
    rbac/
      platform-admin.yaml
      developer-role.yaml
      kustomization.yaml
    namespaces/
      standard-namespaces.yaml
      kustomization.yaml
  clusters/
    cluster-a/
      common.yaml
      apps.yaml
    cluster-b/
      common.yaml
      apps.yaml
    cluster-c/
      common.yaml
      apps.yaml
```

## Defining Common Security Policies

```yaml
# common/security/pod-security.yaml
# Enforce restricted pod security standards across all namespaces
apiVersion: v1
kind: Namespace
metadata:
  name: apps
  labels:
    # Enforce restricted pod security standards
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
# Default deny-all network policy applied to every namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: apps
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

```yaml
# common/security/network-policies.yaml
# Allow DNS resolution for all pods (required for service discovery)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: apps
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to: []
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
---
# Allow Prometheus to scrape metrics from all pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: apps
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
      ports:
        - protocol: TCP
          port: 9090
        - protocol: TCP
          port: 8080
```

```yaml
# common/security/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - pod-security.yaml
  - network-policies.yaml
```

## Defining Common Monitoring Stack

```yaml
# common/monitoring/prometheus-stack.yaml
# Kube-prometheus-stack deployed consistently across all clusters
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "56.6.2"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  install:
    createNamespace: true
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    # Common Prometheus configuration for all clusters
    prometheus:
      prometheusSpec:
        # Standard retention across all clusters
        retention: 15d
        # Standard scrape interval
        scrapeInterval: 30s
        # Enable remote write for centralized metrics
        remoteWrite:
          - url: https://metrics.your-org.com/api/v1/write
            basicAuth:
              username:
                name: metrics-credentials
                key: username
              password:
                name: metrics-credentials
                key: password
        # Resource limits consistent across clusters
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 8Gi
    # Standard Grafana configuration
    grafana:
      enabled: true
      adminPassword: ""
      dashboardProviders:
        dashboardproviders.yaml:
          apiVersion: 1
          providers:
            - name: default
              folder: ""
              type: file
              options:
                path: /var/lib/grafana/dashboards/default
    # Standard alertmanager configuration
    alertmanager:
      enabled: true
      config:
        route:
          receiver: "slack-notifications"
          group_by: ["alertname", "cluster"]
        receivers:
          - name: "slack-notifications"
            slack_configs:
              - channel: "#alerts"
                send_resolved: true
```

```yaml
# common/monitoring/alerting-rules.yaml
# Standard alerting rules applied across all clusters
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: common-alerts
  namespace: monitoring
spec:
  groups:
    - name: node-alerts
      rules:
        # Alert when node memory usage exceeds 90%
        - alert: HighNodeMemoryUsage
          expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High memory usage on {{ $labels.instance }}"
        # Alert when node disk usage exceeds 85%
        - alert: HighNodeDiskUsage
          expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.15
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High disk usage on {{ $labels.instance }}"
    - name: pod-alerts
      rules:
        # Alert when pods are in CrashLoopBackOff
        - alert: PodCrashLooping
          expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"
```

## Defining Common RBAC

```yaml
# common/rbac/platform-admin.yaml
# ClusterRole for platform administrators across all clusters
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: platform-admin
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
---
# Bind the platform-admin role to the platform team group
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: platform-admin-binding
subjects:
  - kind: Group
    name: platform-team
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: platform-admin
  apiGroup: rbac.authorization.k8s.io
```

```yaml
# common/rbac/developer-role.yaml
# ClusterRole for developers with restricted access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: developer
rules:
  # Developers can view most resources
  - apiGroups: ["", "apps", "batch"]
    resources: ["pods", "deployments", "services", "configmaps", "jobs", "cronjobs"]
    verbs: ["get", "list", "watch"]
  # Developers can view logs and exec into pods
  - apiGroups: [""]
    resources: ["pods/log", "pods/exec"]
    verbs: ["get", "create"]
  # Developers cannot access secrets directly
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
```

```yaml
# common/rbac/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - platform-admin.yaml
  - developer-role.yaml
```

## Defining Common Namespaces

```yaml
# common/namespaces/standard-namespaces.yaml
# Standard namespaces that must exist on every cluster
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    managed-by: flux
    purpose: monitoring
---
apiVersion: v1
kind: Namespace
metadata:
  name: logging
  labels:
    managed-by: flux
    purpose: logging
---
apiVersion: v1
kind: Namespace
metadata:
  name: ingress-system
  labels:
    managed-by: flux
    purpose: ingress
---
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
  labels:
    managed-by: flux
    purpose: certificates
---
# Default LimitRange for the apps namespace
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: apps
spec:
  limits:
    - default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      type: Container
```

## Referencing Common Configs from Each Cluster

Each cluster creates a Flux Kustomization that points to the common directory.

```yaml
# clusters/cluster-a/common.yaml
# Flux Kustomization that applies all common configurations to cluster-a
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: common-security
  namespace: flux-system
spec:
  interval: 10m
  path: ./common/security
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Security policies should be applied first
  force: false
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: common-rbac
  namespace: flux-system
spec:
  interval: 10m
  path: ./common/rbac
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: common-namespaces
  namespace: flux-system
spec:
  interval: 10m
  path: ./common/namespaces
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: common-monitoring
  namespace: flux-system
spec:
  interval: 10m
  path: ./common/monitoring
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    # Monitoring depends on namespaces existing
    - name: common-namespaces
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: common-logging
  namespace: flux-system
spec:
  interval: 10m
  path: ./common/logging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: common-namespaces
```

## Verifying Configuration Consistency

```bash
# Compare a specific resource across all clusters to verify consistency
for ctx in cluster-a cluster-b cluster-c; do
  echo "=== $ctx ==="
  kubectl --context "$ctx" get clusterrole platform-admin -o yaml | grep -A 20 "rules:"
done

# Verify all common Kustomizations are healthy on each cluster
for ctx in cluster-a cluster-b cluster-c; do
  echo "=== $ctx ==="
  kubectl --context "$ctx" get kustomizations -n flux-system | grep common
done

# Check for configuration drift by comparing resources
kubectl --context cluster-a get networkpolicy -n apps -o yaml > /tmp/cluster-a-netpol.yaml
kubectl --context cluster-b get networkpolicy -n apps -o yaml > /tmp/cluster-b-netpol.yaml
diff /tmp/cluster-a-netpol.yaml /tmp/cluster-b-netpol.yaml
```

## Handling Exceptions

Sometimes a cluster needs a slight variation of the common configuration. Use post-build variable substitution to handle this.

```yaml
# clusters/cluster-a/common.yaml (with variable substitution)
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: common-monitoring
  namespace: flux-system
spec:
  interval: 10m
  path: ./common/monitoring
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Substitute cluster-specific values into common templates
  postBuild:
    substitute:
      CLUSTER_NAME: cluster-a
      CLUSTER_REGION: us-east-1
      RETENTION_DAYS: "30"
    substituteFrom:
      - kind: ConfigMap
        name: cluster-settings
```

## Best Practices

1. **Apply common configs with dependencies**: Use `dependsOn` to ensure namespaces exist before deploying monitoring.
2. **Enable pruning**: Set `prune: true` so removing a resource from Git removes it from all clusters.
3. **Version common configurations**: Use tags or branches to control when clusters pick up changes.
4. **Use post-build substitution**: For minor per-cluster variations, use variable substitution instead of duplicating configs.
5. **Test common changes carefully**: A change to common configurations affects all clusters simultaneously.
6. **Separate by concern**: Split common configs into security, monitoring, RBAC, and so on for independent lifecycle management.

## Conclusion

Syncing common configuration across clusters with Flux CD eliminates configuration drift and ensures every cluster meets your organization's baseline standards. By organizing shared resources into a `common` directory and referencing them from each cluster's Flux Kustomization, changes propagate automatically to all clusters. Use dependency ordering to ensure resources are applied in the right sequence, and leverage post-build substitution for the rare cases where a common resource needs a cluster-specific value.
