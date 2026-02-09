# How to Configure kubeadm ClusterConfiguration for Custom API Server Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubeadm, Cluster Administration

Description: Learn how to use kubeadm ClusterConfiguration to customize Kubernetes API server flags, enabling advanced features like audit logging, encryption at rest, and fine-tuned authentication settings.

---

The Kubernetes API server is the central management component of your cluster, and customizing its configuration unlocks powerful features for security, performance, and compliance. While kubeadm provides sensible defaults, production clusters often require custom API server flags for audit logging, admission control, authentication methods, and other advanced capabilities.

This guide demonstrates how to use kubeadm's ClusterConfiguration to customize API server flags during cluster initialization and how to modify them on existing clusters.

## Understanding ClusterConfiguration

ClusterConfiguration is a kubeadm configuration object that defines cluster-wide settings. It allows you to customize control plane components including the API server, controller manager, and scheduler.

Basic structure:

```yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.28.0
controlPlaneEndpoint: "k8s-api.example.com:6443"
apiServer:
  extraArgs:
    # Custom API server flags go here
  extraVolumes:
    # Additional volume mounts
  certSANs:
    # Certificate Subject Alternative Names
```

## Creating a Custom ClusterConfiguration

Create a configuration file with custom API server settings:

```yaml
# kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
kubernetesVersion: v1.28.0
controlPlaneEndpoint: "k8s-api.example.com:6443"
networking:
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
apiServer:
  extraArgs:
    # Audit logging
    audit-log-path: "/var/log/kubernetes/audit.log"
    audit-log-maxage: "30"
    audit-log-maxbackup: "10"
    audit-log-maxsize: "100"
    audit-policy-file: "/etc/kubernetes/audit-policy.yaml"
    # Authentication
    oidc-issuer-url: "https://accounts.google.com"
    oidc-client-id: "kubernetes"
    oidc-username-claim: "email"
    oidc-groups-claim: "groups"
    # Authorization
    authorization-mode: "Node,RBAC"
    # Encryption at rest
    encryption-provider-config: "/etc/kubernetes/encryption-config.yaml"
    # API priority and fairness
    enable-priority-and-fairness: "true"
    # Request timeout
    default-watch-cache-size: "200"
    # Enable features
    feature-gates: "TTLAfterFinished=true,EphemeralContainers=true"
  extraVolumes:
  - name: audit-log
    hostPath: "/var/log/kubernetes"
    mountPath: "/var/log/kubernetes"
    readOnly: false
  - name: audit-policy
    hostPath: "/etc/kubernetes/audit-policy.yaml"
    mountPath: "/etc/kubernetes/audit-policy.yaml"
    readOnly: true
  - name: encryption-config
    hostPath: "/etc/kubernetes/encryption-config.yaml"
    mountPath: "/etc/kubernetes/encryption-config.yaml"
    readOnly: true
  certSANs:
  - "k8s-api.example.com"
  - "10.0.0.100"
  - "api.cluster.local"
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: "10.0.0.10"
  bindPort: 6443
nodeRegistration:
  kubeletExtraArgs:
    node-ip: "10.0.0.10"
```

## Setting Up Audit Logging

Before initializing the cluster, create the audit policy file:

```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Don't log read-only requests
- level: None
  verbs: ["get", "list", "watch"]
# Don't log events requests
- level: None
  resources:
  - group: ""
    resources: ["events"]
# Log metadata for everything else
- level: Metadata
  omitStages:
  - RequestReceived
# Log request and response for secrets
- level: RequestResponse
  resources:
  - group: ""
    resources: ["secrets"]
# Log request for pods
- level: Request
  resources:
  - group: ""
    resources: ["pods"]
  verbs: ["create", "update", "patch", "delete"]
```

Create the directory for audit logs:

```bash
sudo mkdir -p /var/log/kubernetes
sudo chmod 700 /var/log/kubernetes
```

## Configuring Encryption at Rest

Create an encryption configuration file:

```yaml
# /etc/kubernetes/encryption-config.yaml
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
```

Generate an encryption key:

```bash
# Generate random 32-byte key and encode
head -c 32 /dev/urandom | base64

# Example output: NTRhNGU3YjAtMzE2Ny00OGEwLWI3YzgtNmQ5MjQwNzU1NzU1Cg==

# Place in encryption-config.yaml
```

## Initializing the Cluster with Custom Config

Initialize your cluster using the custom configuration:

```bash
# Initialize control plane
sudo kubeadm init --config kubeadm-config.yaml

# Save the join command output for worker nodes
# kubeadm join k8s-api.example.com:6443 --token xxx --discovery-token-ca-cert-hash sha256:yyy

# Set up kubectl access
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

Verify API server is running with custom flags:

```bash
# Check API server pod
kubectl get pod -n kube-system kube-apiserver-<node-name> -o yaml | grep -A 30 "command:"

# Check API server logs
kubectl logs -n kube-system kube-apiserver-<node-name>

# Verify audit logs are being written
sudo ls -lh /var/log/kubernetes/
sudo tail -f /var/log/kubernetes/audit.log
```

## Modifying API Server Flags on Existing Clusters

For existing clusters, update the ClusterConfiguration:

```bash
# Extract current configuration
kubectl -n kube-system get configmap kubeadm-config -o yaml > current-config.yaml

# Edit the ClusterConfiguration section
vim current-config.yaml
```

Add your custom flags to the apiServer.extraArgs section, then apply:

```bash
# Update the configmap
kubectl -n kube-system apply -f current-config.yaml

# Edit the static pod manifest directly
sudo vim /etc/kubernetes/manifests/kube-apiserver.yaml
```

The API server manifest is a static pod configuration. Add flags to the command section:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    - --advertise-address=10.0.0.10
    - --audit-log-path=/var/log/kubernetes/audit.log
    - --audit-log-maxage=30
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    # ... other flags
    volumeMounts:
    - mountPath: /var/log/kubernetes
      name: audit-log
    - mountPath: /etc/kubernetes/audit-policy.yaml
      name: audit-policy
      readOnly: true
  volumes:
  - hostPath:
      path: /var/log/kubernetes
      type: DirectoryOrCreate
    name: audit-log
  - hostPath:
      path: /etc/kubernetes/audit-policy.yaml
      type: File
    name: audit-policy
```

The kubelet automatically restarts the API server when the manifest changes.

## Configuring OIDC Authentication

Enable OIDC authentication for external identity providers:

```yaml
# kubeadm-oidc-config.yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
apiServer:
  extraArgs:
    oidc-issuer-url: "https://accounts.google.com"
    oidc-client-id: "kubernetes.cluster.example.com"
    oidc-username-claim: "email"
    oidc-username-prefix: "oidc:"
    oidc-groups-claim: "groups"
    oidc-groups-prefix: "oidc:"
    oidc-ca-file: "/etc/kubernetes/pki/oidc-ca.crt"
  extraVolumes:
  - name: oidc-ca
    hostPath: "/etc/kubernetes/pki/oidc-ca.crt"
    mountPath: "/etc/kubernetes/pki/oidc-ca.crt"
    readOnly: true
```

## Enabling Admission Controllers

Configure additional admission controllers:

```yaml
apiServer:
  extraArgs:
    enable-admission-plugins: "NodeRestriction,PodSecurityPolicy,ResourceQuota,LimitRanger,MutatingAdmissionWebhook,ValidatingAdmissionWebhook"
    disable-admission-plugins: "PersistentVolumeLabel"
    admission-control-config-file: "/etc/kubernetes/admission-config.yaml"
  extraVolumes:
  - name: admission-config
    hostPath: "/etc/kubernetes/admission-config.yaml"
    mountPath: "/etc/kubernetes/admission-config.yaml"
    readOnly: true
```

## Tuning API Server Performance

Optimize API server for large clusters:

```yaml
apiServer:
  extraArgs:
    # Increase max requests in flight
    max-requests-inflight: "800"
    max-mutating-requests-inflight: "400"
    # Watch cache
    default-watch-cache-size: "500"
    watch-cache-sizes: "persistentvolumes#1000,persistentvolumeclaims#1000"
    # Event rate limiting
    event-ttl: "1h"
    # API priority and fairness
    enable-priority-and-fairness: "true"
    # Connection limits
    min-request-timeout: "1800"
```

## Setting Up Multi-Master Configuration

For highly available clusters, configure multiple API server endpoints:

```yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
controlPlaneEndpoint: "k8s-api-lb.example.com:6443"
apiServer:
  extraArgs:
    apiserver-count: "3"
  certSANs:
  - "k8s-api-lb.example.com"
  - "k8s-master-1.example.com"
  - "k8s-master-2.example.com"
  - "k8s-master-3.example.com"
  - "10.0.0.10"
  - "10.0.0.11"
  - "10.0.0.12"
```

## Verifying API Server Configuration

Check that your custom flags are active:

```bash
# View API server process arguments
ps aux | grep kube-apiserver

# Check API server flags via API
kubectl get --raw /metrics | grep apiserver

# Verify specific features
kubectl api-versions  # Should show enabled API groups
kubectl auth can-i --list --as=system:anonymous  # Test auth

# Check audit logs are working
sudo tail -f /var/log/kubernetes/audit.log | jq .
```

## Updating Configuration with kubeadm upgrade

When upgrading Kubernetes, preserve custom configuration:

```bash
# Upgrade kubeadm
sudo apt-mark unhold kubeadm
sudo apt-get update && sudo apt-get install -y kubeadm=1.28.x-00
sudo apt-mark hold kubeadm

# Upgrade with custom config
sudo kubeadm upgrade apply v1.28.x --config kubeadm-config.yaml

# Verify upgrade preserved settings
kubectl logs -n kube-system kube-apiserver-<node> | grep "audit-log-path"
```

## Common API Server Flags Reference

Here's a quick reference of frequently used flags:

```yaml
apiServer:
  extraArgs:
    # Security
    anonymous-auth: "false"
    insecure-port: "0"
    tls-min-version: "VersionTLS12"
    tls-cipher-suites: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"

    # Auditing
    audit-log-path: "/var/log/kubernetes/audit.log"
    audit-policy-file: "/etc/kubernetes/audit-policy.yaml"

    # Authentication
    oidc-issuer-url: "https://identity.example.com"
    client-ca-file: "/etc/kubernetes/pki/ca.crt"

    # Authorization
    authorization-mode: "Node,RBAC"

    # Performance
    max-requests-inflight: "800"
    enable-priority-and-fairness: "true"

    # Features
    feature-gates: "EphemeralContainers=true"
    runtime-config: "api/all=true"
```

Customizing API server flags through kubeadm ClusterConfiguration gives you fine-grained control over your Kubernetes cluster's behavior. Always test configuration changes in a development environment first, maintain version-controlled configuration files, and document the purpose of each custom flag for future reference and troubleshooting.
