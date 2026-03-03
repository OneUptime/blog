# How to Configure API Server Extra Args in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes API Server, Cluster Configuration, Security, Kubernetes

Description: Learn how to pass extra arguments to the Kubernetes API server in Talos Linux for security hardening, feature gates, and custom configurations.

---

The Kubernetes API server is the central component of your cluster. Every kubectl command, every controller reconciliation, and every admission webhook goes through it. While Talos Linux configures the API server with sensible defaults, there are many scenarios where you need to pass additional arguments - enabling feature gates, configuring audit logging, setting admission controllers, tuning performance parameters, or meeting compliance requirements.

This guide covers how to add extra arguments to the Kubernetes API server through the Talos machine configuration.

## The API Server Extra Args Configuration

Extra arguments for the API server are configured under `cluster.apiServer.extraArgs` in the Talos machine configuration:

```yaml
# Add extra args to the Kubernetes API server
cluster:
  apiServer:
    extraArgs:
      feature-gates: "GracefulNodeShutdown=true"
      audit-log-path: "/var/log/audit/kube-apiserver-audit.log"
      audit-log-maxage: "30"
```

Each key-value pair in `extraArgs` becomes a command-line flag for the API server process. The key is the flag name (without the leading dashes), and the value is the flag value.

## Enabling Feature Gates

Feature gates let you enable experimental or beta Kubernetes features. They are one of the most common reasons to use extra args:

```yaml
# Enable specific feature gates
cluster:
  apiServer:
    extraArgs:
      feature-gates: >-
        GracefulNodeShutdown=true,
        TopologyAwareHints=true,
        MinDomainsInPodTopologySpread=true,
        NodeSwap=true
```

Be careful with feature gates. Beta features are generally safe, but alpha features can have bugs or change behavior in future releases. Always check the Kubernetes release notes for the stability level of each feature gate.

## Configuring Audit Logging

Audit logging records all API requests, which is essential for security compliance and troubleshooting:

```yaml
# Enable API server audit logging
cluster:
  apiServer:
    extraArgs:
      audit-log-path: "/var/log/audit/kube-apiserver-audit.log"
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"
      audit-policy-file: "/etc/kubernetes/audit-policy.yaml"
```

You also need to provide the audit policy file. This can be done through `cluster.apiServer.extraVolumes` and `machine.files`:

```yaml
# Provide the audit policy file
machine:
  files:
    - content: |
        apiVersion: audit.k8s.io/v1
        kind: Policy
        rules:
          # Log all requests at the metadata level
          - level: Metadata
            resources:
              - group: ""
                resources: ["secrets", "configmaps"]
          # Log pod changes at request level
          - level: Request
            resources:
              - group: ""
                resources: ["pods"]
            verbs: ["create", "update", "patch", "delete"]
          # Default: log everything at metadata level
          - level: Metadata
      permissions: 0o644
      path: /var/etc/kubernetes/audit-policy.yaml
      op: create

cluster:
  apiServer:
    extraArgs:
      audit-log-path: "/var/log/audit/kube-apiserver-audit.log"
      audit-policy-file: "/etc/kubernetes/audit-policy.yaml"
    extraVolumes:
      - hostPath: /var/etc/kubernetes
        mountPath: /etc/kubernetes
        readOnly: true
      - hostPath: /var/log/audit
        mountPath: /var/log/audit
        readOnly: false
```

## Configuring Admission Controllers

Admission controllers intercept requests to the API server before objects are persisted. You can enable additional admission controllers or disable default ones:

```yaml
# Configure admission controllers
cluster:
  apiServer:
    extraArgs:
      enable-admission-plugins: >-
        NodeRestriction,
        PodSecurity,
        ResourceQuota,
        LimitRanger,
        ServiceAccount,
        DefaultStorageClass,
        MutatingAdmissionWebhook,
        ValidatingAdmissionWebhook
      disable-admission-plugins: "AlwaysPullImages"
```

The `PodSecurity` admission controller is particularly important - it enforces Pod Security Standards at the namespace level, replacing the deprecated PodSecurityPolicy.

## Authentication and Authorization Settings

You can configure authentication mechanisms through extra args:

```yaml
# Configure OIDC authentication for the API server
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: "https://accounts.google.com"
      oidc-client-id: "my-kubernetes-client-id"
      oidc-username-claim: "email"
      oidc-groups-claim: "groups"
      oidc-username-prefix: "oidc:"
      oidc-groups-prefix: "oidc:"
```

This enables your team to authenticate to Kubernetes using Google accounts (or any OIDC provider like Okta, Auth0, or Dex).

## Performance Tuning

For large clusters, you might need to tune API server performance parameters:

```yaml
# Performance tuning for large clusters
cluster:
  apiServer:
    extraArgs:
      # Increase the number of requests the API server can handle
      max-requests-inflight: "800"
      max-mutating-requests-inflight: "400"

      # Watch cache sizes
      default-watch-cache-size: "500"
      watch-cache-sizes: "secrets#1000,configmaps#1000,pods#5000"

      # etcd compaction frequency
      etcd-compaction-interval: "5m0s"

      # Request timeout
      request-timeout: "60s"

      # Increase event TTL for better observability
      event-ttl: "2h0m0s"
```

These settings should be tuned based on your cluster size and workload patterns. The defaults work well for clusters with up to a few hundred nodes.

## Security Hardening

Several extra args improve the API server's security posture:

```yaml
# Security hardening settings
cluster:
  apiServer:
    extraArgs:
      # Enable TLS 1.2 minimum
      tls-min-version: "VersionTLS12"

      # Restrict cipher suites
      tls-cipher-suites: >-
        TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
        TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
        TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
        TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384

      # Profiling (disable in production)
      profiling: "false"

      # Anonymous auth (keep disabled)
      anonymous-auth: "false"
```

## Extra Volumes for the API Server

Some extra args require additional files (like audit policies, OIDC CA certificates, or encryption config). You mount these using `extraVolumes`:

```yaml
# Mount additional volumes into the API server pod
cluster:
  apiServer:
    extraArgs:
      encryption-provider-config: "/etc/kubernetes/encryption-config.yaml"
    extraVolumes:
      - hostPath: /var/etc/kubernetes
        mountPath: /etc/kubernetes
        readOnly: true
```

Then place the required file using `machine.files`:

```yaml
# Place the encryption configuration file
machine:
  files:
    - content: |
        apiVersion: apiserver.config.k8s.io/v1
        kind: EncryptionConfiguration
        resources:
          - resources:
              - secrets
            providers:
              - aescbc:
                  keys:
                    - name: key1
                      secret: <base64-encoded-32-byte-key>
              - identity: {}
      permissions: 0o600
      path: /var/etc/kubernetes/encryption-config.yaml
      op: create
```

## Applying the Configuration

Apply the config to your control plane nodes:

```bash
# Apply to all control plane nodes
talosctl apply-config \
  --nodes 192.168.1.100,192.168.1.101,192.168.1.102 \
  --file controlplane.yaml
```

API server extra args changes typically require the API server pod to restart. Talos handles this automatically, but there will be a brief period where the API server is unavailable. In a multi-control-plane setup, apply changes one node at a time to maintain availability:

```bash
# Rolling update: apply to one control plane at a time
talosctl apply-config --nodes 192.168.1.100 --file controlplane.yaml
# Wait for the API server to come back up
kubectl get nodes
# Then apply to the next node
talosctl apply-config --nodes 192.168.1.101 --file controlplane.yaml
```

## Verifying Extra Args

After applying, verify that the API server picked up the new arguments:

```bash
# Check the API server pod spec for the extra args
kubectl -n kube-system get pod kube-apiserver-cp-01 -o yaml | grep -A 50 "command:"
```

You should see your extra args in the command section of the pod spec.

## Best Practices

Only add extra args when you have a specific need. Each additional argument is a configuration point that needs to be maintained and can cause issues during upgrades. Document why each extra arg was added. Test changes on a non-production cluster first. When adding args that require extra volumes, validate the file paths and permissions carefully - a missing file or wrong permission will prevent the API server from starting.
