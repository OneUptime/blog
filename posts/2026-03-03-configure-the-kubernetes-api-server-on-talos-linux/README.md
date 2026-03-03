# How to Configure the Kubernetes API Server on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, API Server, Cluster Configuration, Security

Description: Learn how to customize the Kubernetes API server configuration on Talos Linux using machine config patches.

---

The Kubernetes API server is the central hub of every cluster. Every kubectl command, every controller action, and every node registration goes through it. Configuring it correctly is essential for security, performance, and functionality. On Talos Linux, you cannot edit API server manifests or configuration files directly because the filesystem is immutable. Instead, all customization happens through the Talos machine configuration, which generates the appropriate static pod manifests automatically.

This guide covers the most common API server configuration changes you will need to make on a Talos Linux cluster.

## How Talos Manages the API Server

Talos Linux runs the Kubernetes API server as a static pod on each control plane node. The configuration is derived from the `cluster.apiServer` section of the machine configuration. When you apply a configuration change, Talos regenerates the static pod manifest and the API server restarts with the new settings.

View the current API server configuration:

```bash
# View the cluster API server configuration
talosctl -n 192.168.1.10 get machineconfig -o yaml | grep -A 50 "apiServer:"
```

## Adding Extra Arguments

The most common customization is adding extra command-line arguments to the API server. These control everything from authentication to admission control to audit logging.

```yaml
# api-server-args.yaml
# Add extra arguments to the Kubernetes API server
cluster:
  apiServer:
    extraArgs:
      # Authentication settings
      anonymous-auth: "false"
      # Audit logging
      audit-log-path: /var/log/audit/kube-apiserver-audit.log
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"
      # Request handling
      max-requests-inflight: "800"
      max-mutating-requests-inflight: "400"
      # etcd compaction
      etcd-compaction-interval: "5m0s"
      # Feature gates
      feature-gates: "GracefulNodeShutdown=true"
      # Logging
      v: "2"
```

Apply the configuration:

```bash
# Apply to all control plane nodes
talosctl apply-config --nodes 192.168.1.10,192.168.1.11,192.168.1.12 \
  --patch @api-server-args.yaml
```

## Configuring TLS and Certificates

The API server uses TLS certificates for secure communication. Talos manages certificate generation automatically, but you can customize certificate-related settings:

```yaml
# api-server-tls.yaml
# Configure API server TLS settings
cluster:
  apiServer:
    extraArgs:
      # Set the TLS cipher suites
      tls-cipher-suites: "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
      # Minimum TLS version
      tls-min-version: "VersionTLS12"
    # Add Subject Alternative Names for the API server certificate
    certSANs:
      - api.mycluster.example.com
      - 10.0.0.100
      - 192.168.1.10
```

The `certSANs` field is important if you access the API server through a load balancer or a custom DNS name. Without the correct SANs, TLS validation will fail.

## Configuring Admission Controllers

Admission controllers intercept requests to the API server before objects are persisted. They enforce policies and modify objects:

```yaml
# admission-controllers.yaml
# Configure admission controllers
cluster:
  apiServer:
    extraArgs:
      enable-admission-plugins: "NamespaceLifecycle,LimitRanger,ServiceAccount,DefaultStorageClass,DefaultTolerationSeconds,MutatingAdmissionWebhook,ValidatingAdmissionWebhook,ResourceQuota,PodSecurity,NodeRestriction"
      disable-admission-plugins: ""
```

## Adding Extra Volumes

Some API server features require mounting additional files or directories. For example, audit policies, custom authentication configurations, or encryption configuration files need to be mounted into the API server pod:

```yaml
# api-server-volumes.yaml
# Mount extra volumes into the API server
cluster:
  apiServer:
    extraVolumes:
      - hostPath: /etc/kubernetes/audit-policy
        mountPath: /etc/kubernetes/audit-policy
        name: audit-policy
        readOnly: true
      - hostPath: /etc/kubernetes/encryption
        mountPath: /etc/kubernetes/encryption
        name: encryption-config
        readOnly: true
      - hostPath: /var/log/audit
        mountPath: /var/log/audit
        name: audit-log
machine:
  files:
    # Create the audit policy file on disk
    - content: |
        apiVersion: audit.k8s.io/v1
        kind: Policy
        rules:
          - level: Metadata
      permissions: 0644
      path: /etc/kubernetes/audit-policy/policy.yaml
      op: create
    # Create the encryption configuration
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
                      secret: YOUR_BASE64_ENCODED_KEY
              - identity: {}
      permissions: 0600
      path: /etc/kubernetes/encryption/config.yaml
      op: create
```

## Configuring OIDC Authentication

If you want to authenticate users through an identity provider like Keycloak, Auth0, or Dex, configure OIDC authentication on the API server:

```yaml
# oidc-auth.yaml
# Configure OIDC authentication for the API server
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: "https://auth.example.com/realms/kubernetes"
      oidc-client-id: "kubernetes"
      oidc-username-claim: "email"
      oidc-groups-claim: "groups"
      oidc-username-prefix: "oidc:"
      oidc-groups-prefix: "oidc:"
```

After applying this, users can authenticate with their identity provider credentials, and RBAC rules can reference the OIDC groups and usernames.

## Setting Resource Limits

For large clusters, you may need to adjust the API server's resource handling:

```yaml
# api-server-resources.yaml
# Tune API server for large clusters
cluster:
  apiServer:
    extraArgs:
      # Increase the number of concurrent requests
      max-requests-inflight: "1600"
      max-mutating-requests-inflight: "800"
      # Adjust watch cache sizes
      default-watch-cache-size: "200"
      # Increase event TTL
      event-ttl: "2h0m0s"
    # Set resource limits for the API server pod
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 2000m
        memory: 4Gi
```

## Enabling API Aggregation

API aggregation lets you extend the Kubernetes API with custom API servers. This is used by metrics-server and other extensions:

```yaml
# api-aggregation.yaml
# Enable API aggregation layer
cluster:
  apiServer:
    extraArgs:
      enable-aggregator-routing: "true"
      requestheader-client-ca-file: /etc/kubernetes/pki/front-proxy-ca.crt
      requestheader-allowed-names: front-proxy-client
      requestheader-extra-headers-prefix: X-Remote-Extra-
      requestheader-group-headers: X-Remote-Group
      requestheader-username-headers: X-Remote-User
      proxy-client-cert-file: /etc/kubernetes/pki/front-proxy-client.crt
      proxy-client-key-file: /etc/kubernetes/pki/front-proxy-client.key
```

Note that Talos Linux typically handles API aggregation configuration automatically. Only add these settings if you need to customize the defaults.

## Configuring API Server for High Availability

In a multi-control-plane setup, the API server configuration should be consistent across all control plane nodes. When using Talos, apply the same configuration patch to all control plane nodes:

```bash
# Apply configuration to all control plane nodes at once
talosctl apply-config \
  --nodes 192.168.1.10,192.168.1.11,192.168.1.12 \
  --patch @api-server-config.yaml
```

Configure your load balancer to distribute traffic across the API servers:

```yaml
# Talos machine config with load balancer endpoint
cluster:
  controlPlane:
    endpoint: https://api.mycluster.example.com:6443
  apiServer:
    certSANs:
      - api.mycluster.example.com
```

## Verifying API Server Configuration

After applying changes, verify the API server is running with the expected configuration:

```bash
# Check the API server is healthy
talosctl -n 192.168.1.10 service kube-apiserver

# View API server logs for startup messages
talosctl -n 192.168.1.10 logs kube-apiserver --tail 50

# Verify the API server is responding
kubectl cluster-info

# Check the server's TLS certificate
openssl s_client -connect 192.168.1.10:6443 -showcerts </dev/null 2>/dev/null | \
  openssl x509 -text -noout | grep -A 3 "Subject Alternative Name"

# Verify specific flags are active
kubectl get pod -n kube-system kube-apiserver-talos-control-1 -o yaml | \
  grep -A 100 "spec:" | grep -E "^\s+--"
```

## Rolling Back Configuration

If an API server configuration change causes problems, you can revert by applying the previous configuration:

```bash
# If the API server is unresponsive, use talosctl to fix it
# Apply the previous working configuration
talosctl apply-config --nodes 192.168.1.10 --file previous-config.yaml

# Or remove problematic extra args with an empty patch
talosctl apply-config --nodes 192.168.1.10 --patch @fixed-config.yaml
```

Configuring the Kubernetes API server on Talos Linux is done entirely through machine configuration patches. While this is different from editing manifest files directly, it is actually more reliable because the configuration is declarative, version-controlled, and consistently applied across all control plane nodes. The key is understanding which settings go in `extraArgs`, which require `extraVolumes`, and which need files created on the host through `machine.files`.
