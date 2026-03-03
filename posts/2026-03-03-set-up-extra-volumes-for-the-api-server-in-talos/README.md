# How to Set Up Extra Volumes for the API Server in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, API Server, VOLUME, Configuration

Description: Learn how to mount extra volumes into the Kubernetes API server on Talos Linux for audit logs, custom policies, and certificates.

---

The Kubernetes API server runs as a static pod on Talos Linux control plane nodes. Sometimes it needs access to files on the host filesystem - audit policies, encryption configurations, custom certificate authority bundles, or OIDC provider configurations. Since Talos Linux is immutable, you cannot just drop files onto the filesystem and add volume mounts to a manifest. Instead, you use the Talos machine configuration to both create the files and configure the extra volumes.

This guide covers the complete process of mounting extra volumes into the API server on Talos Linux, with practical examples for the most common use cases.

## How Extra Volumes Work in Talos

The Talos machine configuration has two features that work together for this purpose. The `machine.files` section lets you create files on the Talos filesystem. The `cluster.apiServer.extraVolumes` section tells Talos to add volume mounts to the API server static pod manifest.

The general pattern is:

1. Create the file on the host using `machine.files`
2. Mount it into the API server using `cluster.apiServer.extraVolumes`
3. Reference it in the API server arguments using `cluster.apiServer.extraArgs`

```yaml
# General pattern for extra volumes
machine:
  files:
    - content: |
        # Your file content here
      permissions: 0644
      path: /etc/kubernetes/custom/my-config.yaml
      op: create

cluster:
  apiServer:
    extraVolumes:
      - hostPath: /etc/kubernetes/custom
        mountPath: /etc/kubernetes/custom
        name: my-custom-config
        readOnly: true
    extraArgs:
      my-config-flag: /etc/kubernetes/custom/my-config.yaml
```

## Use Case 1: Audit Policy

The most common reason to add extra volumes is for Kubernetes audit logging. The audit policy file must be accessible to the API server:

```yaml
# audit-policy-volume.yaml
# Mount audit policy and log directory
machine:
  files:
    - content: |
        apiVersion: audit.k8s.io/v1
        kind: Policy
        rules:
          # Don't log requests to these endpoints
          - level: None
            nonResourceURLs:
              - /healthz*
              - /readyz*
              - /livez*
              - /metrics
          # Don't log watch requests on events
          - level: None
            resources:
              - group: ""
                resources: ["events"]
            verbs: ["watch"]
          # Log secret access at metadata level only
          - level: Metadata
            resources:
              - group: ""
                resources: ["secrets", "configmaps"]
          # Log RBAC changes with request bodies
          - level: Request
            resources:
              - group: "rbac.authorization.k8s.io"
          # Log everything else at metadata level
          - level: Metadata
            omitStages:
              - RequestReceived
      permissions: 0644
      path: /etc/kubernetes/audit/audit-policy.yaml
      op: create

cluster:
  apiServer:
    extraVolumes:
      # Mount the audit policy directory
      - hostPath: /etc/kubernetes/audit
        mountPath: /etc/kubernetes/audit
        name: audit-policy
        readOnly: true
      # Mount the audit log directory (writable)
      - hostPath: /var/log/kubernetes/audit
        mountPath: /var/log/kubernetes/audit
        name: audit-log
    extraArgs:
      audit-policy-file: /etc/kubernetes/audit/audit-policy.yaml
      audit-log-path: /var/log/kubernetes/audit/kube-apiserver-audit.log
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"
```

Apply to control plane nodes:

```bash
# Apply audit configuration to all control plane nodes
talosctl apply-config --nodes 192.168.1.10,192.168.1.11,192.168.1.12 \
  --patch @audit-policy-volume.yaml
```

## Use Case 2: Encryption at Rest

Encrypting Kubernetes secrets at rest requires an encryption configuration file:

```yaml
# encryption-volume.yaml
# Mount encryption configuration for secrets at rest
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
      permissions: 0600
      path: /etc/kubernetes/encryption/config.yaml
      op: create

cluster:
  apiServer:
    extraVolumes:
      - hostPath: /etc/kubernetes/encryption
        mountPath: /etc/kubernetes/encryption
        name: encryption-config
        readOnly: true
    extraArgs:
      encryption-provider-config: /etc/kubernetes/encryption/config.yaml
```

Generate the encryption key:

```bash
# Generate a random 32-byte key for AES-CBC encryption
head -c 32 /dev/urandom | base64
```

## Use Case 3: OIDC Authentication

When using OIDC authentication with a custom CA certificate:

```yaml
# oidc-volume.yaml
# Mount OIDC CA certificate and configuration
machine:
  files:
    - content: |
        -----BEGIN CERTIFICATE-----
        YOUR_CA_CERTIFICATE_CONTENT_HERE
        -----END CERTIFICATE-----
      permissions: 0644
      path: /etc/kubernetes/oidc/ca.crt
      op: create

cluster:
  apiServer:
    extraVolumes:
      - hostPath: /etc/kubernetes/oidc
        mountPath: /etc/kubernetes/oidc
        name: oidc-ca
        readOnly: true
    extraArgs:
      oidc-issuer-url: "https://auth.example.com/realms/kubernetes"
      oidc-client-id: "kubernetes"
      oidc-ca-file: /etc/kubernetes/oidc/ca.crt
      oidc-username-claim: "email"
      oidc-groups-claim: "groups"
```

## Use Case 4: Webhook Authentication

If you use a webhook token authenticator:

```yaml
# webhook-auth-volume.yaml
# Mount webhook authentication configuration
machine:
  files:
    - content: |
        apiVersion: v1
        kind: Config
        clusters:
          - name: auth-webhook
            cluster:
              server: https://auth-service.auth.svc:8443/authenticate
              certificate-authority: /etc/kubernetes/webhook-auth/ca.crt
        contexts:
          - name: auth-webhook
            context:
              cluster: auth-webhook
        current-context: auth-webhook
      permissions: 0644
      path: /etc/kubernetes/webhook-auth/config.yaml
      op: create
    - content: |
        -----BEGIN CERTIFICATE-----
        WEBHOOK_CA_CERTIFICATE_HERE
        -----END CERTIFICATE-----
      permissions: 0644
      path: /etc/kubernetes/webhook-auth/ca.crt
      op: create

cluster:
  apiServer:
    extraVolumes:
      - hostPath: /etc/kubernetes/webhook-auth
        mountPath: /etc/kubernetes/webhook-auth
        name: webhook-auth
        readOnly: true
    extraArgs:
      authentication-token-webhook-config-file: /etc/kubernetes/webhook-auth/config.yaml
```

## Use Case 5: Admission Control Configuration

For the admission control configuration file that configures built-in admission plugins:

```yaml
# admission-config-volume.yaml
# Mount admission control configuration
machine:
  files:
    - content: |
        apiVersion: apiserver.config.k8s.io/v1
        kind: AdmissionConfiguration
        plugins:
          - name: PodSecurity
            configuration:
              apiVersion: pod-security.admission.config.k8s.io/v1
              kind: PodSecurityConfiguration
              defaults:
                enforce: baseline
                enforce-version: latest
                audit: restricted
                audit-version: latest
                warn: restricted
                warn-version: latest
              exemptions:
                usernames: []
                runtimeClasses: []
                namespaces:
                  - kube-system
                  - kube-node-lease
      permissions: 0644
      path: /etc/kubernetes/admission/config.yaml
      op: create

cluster:
  apiServer:
    extraVolumes:
      - hostPath: /etc/kubernetes/admission
        mountPath: /etc/kubernetes/admission
        name: admission-config
        readOnly: true
    extraArgs:
      admission-control-config-file: /etc/kubernetes/admission/config.yaml
```

## Combining Multiple Extra Volumes

In practice, you often need several extra volumes at once. Combine them in a single configuration patch:

```yaml
# combined-volumes.yaml
# Multiple extra volumes for a production API server
machine:
  files:
    - content: |
        # Audit policy content
        apiVersion: audit.k8s.io/v1
        kind: Policy
        rules:
          - level: Metadata
      permissions: 0644
      path: /etc/kubernetes/audit/policy.yaml
      op: create
    - content: |
        # Encryption config content
        apiVersion: apiserver.config.k8s.io/v1
        kind: EncryptionConfiguration
        resources:
          - resources: ["secrets"]
            providers:
              - aescbc:
                  keys:
                    - name: key1
                      secret: YOUR_KEY_HERE
              - identity: {}
      permissions: 0600
      path: /etc/kubernetes/encryption/config.yaml
      op: create
    - content: |
        # Admission config content
        apiVersion: apiserver.config.k8s.io/v1
        kind: AdmissionConfiguration
        plugins:
          - name: PodSecurity
            configuration:
              apiVersion: pod-security.admission.config.k8s.io/v1
              kind: PodSecurityConfiguration
              defaults:
                enforce: baseline
                enforce-version: latest
      permissions: 0644
      path: /etc/kubernetes/admission/config.yaml
      op: create

cluster:
  apiServer:
    extraVolumes:
      - hostPath: /etc/kubernetes/audit
        mountPath: /etc/kubernetes/audit
        name: audit-policy
        readOnly: true
      - hostPath: /var/log/kubernetes/audit
        mountPath: /var/log/kubernetes/audit
        name: audit-log
      - hostPath: /etc/kubernetes/encryption
        mountPath: /etc/kubernetes/encryption
        name: encryption-config
        readOnly: true
      - hostPath: /etc/kubernetes/admission
        mountPath: /etc/kubernetes/admission
        name: admission-config
        readOnly: true
    extraArgs:
      audit-policy-file: /etc/kubernetes/audit/policy.yaml
      audit-log-path: /var/log/kubernetes/audit/api-audit.log
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"
      encryption-provider-config: /etc/kubernetes/encryption/config.yaml
      admission-control-config-file: /etc/kubernetes/admission/config.yaml
```

## Verifying Extra Volumes

After applying the configuration, verify that the volumes are mounted correctly:

```bash
# Check the API server pod spec for volume mounts
kubectl get pod -n kube-system -l component=kube-apiserver -o yaml | grep -A 5 "volumeMounts"

# Check the API server arguments
kubectl get pod -n kube-system -l component=kube-apiserver -o yaml | grep -E "^\s+--"

# View API server logs for any file access errors
talosctl -n 192.168.1.10 logs kube-apiserver --tail 50 | grep -i "error\|file\|mount\|permission"

# Verify the files exist on the host
talosctl -n 192.168.1.10 ls /etc/kubernetes/audit/
talosctl -n 192.168.1.10 read /etc/kubernetes/audit/policy.yaml
```

## Troubleshooting

If the API server fails to start after adding extra volumes:

```bash
# Check machine config was applied correctly
talosctl -n 192.168.1.10 get machineconfig -o yaml | grep -A 20 "extraVolumes"

# Check if the files were created
talosctl -n 192.168.1.10 ls /etc/kubernetes/

# View the API server service status
talosctl -n 192.168.1.10 services kube-apiserver

# Check for errors in machined logs
talosctl -n 192.168.1.10 logs machined | grep -i "api\|file\|error" | tail -20
```

Common issues include incorrect file permissions (use 0644 for readable configs and 0600 for secrets), YAML syntax errors in the file content, and mismatched paths between the file creation and the volume mount.

Extra volumes for the API server in Talos Linux bridge the gap between Talos's immutable filesystem and the API server's need for configuration files. The combination of `machine.files` for file creation and `cluster.apiServer.extraVolumes` for mounting provides a clean, declarative way to configure advanced API server features without compromising Talos's security model.
