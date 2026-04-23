# How to Configure RKE2 Kube-apiserver Arguments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Rancher, API Server, Configuration, Security

Description: Learn how to customize kube-apiserver arguments in RKE2 to tune performance, enable auditing, and enforce security policies.

## Introduction

The Kubernetes API server is the central management component of every cluster. RKE2 allows you to pass custom arguments to the kube-apiserver through its configuration file. This enables you to enable audit logging, configure admission controllers, tune performance, and enforce security policies tailored to your environment.

## How RKE2 Passes API Server Arguments

Use the `kube-apiserver-arg` key in `/etc/rancher/rke2/config.yaml` on your server nodes. Arguments are passed directly to the kube-apiserver process.

```yaml
# /etc/rancher/rke2/config.yaml

kube-apiserver-arg:
  - "argument-name=value"
```

## Enabling Audit Logging

Audit logging is critical for compliance and security monitoring. It records Kubernetes API activity according to the audit policy you configure.

### Step 1: Create the Audit Policy File

```bash
sudo mkdir -p /etc/rancher/rke2/ /var/lib/rancher/rke2/server/logs

sudo tee /etc/rancher/rke2/audit-policy.yaml > /dev/null <<EOF
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Don't log read-only requests
  - level: None
    verbs: ["get", "watch", "list"]
  # Log secret and configmap changes at the Metadata level
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]
  # Log pod changes at the RequestResponse level
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["pods"]
  # Log everything else at the Request level
  - level: Request
EOF
```

### Step 2: Configure the API Server to Use the Policy

```yaml
# /etc/rancher/rke2/config.yaml
kube-apiserver-arg:
  # Path to the audit policy file (inside the server pod)
  - "audit-policy-file=/etc/rancher/rke2/audit-policy.yaml"
  # Path to write audit logs
  - "audit-log-path=/var/lib/rancher/rke2/server/logs/audit.log"
  # Maximum age of audit log files in days
  - "audit-log-maxage=30"
  # Maximum number of rotated log files
  - "audit-log-maxbackup=10"
  # Maximum size of each audit log file in MB
  - "audit-log-maxsize=100"
```

## Configuring Admission Controllers

Admission controllers intercept create, update, delete, and some custom API requests to enforce policies.

```yaml
kube-apiserver-arg:
  # Enable specific admission controllers
  - "enable-admission-plugins=NodeRestriction,PodSecurity,ResourceQuota"
  # Disable specific admission controllers
  - "disable-admission-plugins=AlwaysPullImages"
```

### Enabling Pod Security Admission

```yaml
# Set the default Pod Security Admission policy
pod-security-admission-config-file: /etc/rancher/rke2/admission-config.yaml

kube-apiserver-arg:
  - "enable-admission-plugins=NodeRestriction,PodSecurity"
```

Create the admission configuration file:

```bash
sudo tee /etc/rancher/rke2/admission-config.yaml > /dev/null <<EOF
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
  - name: PodSecurity
    configuration:
      apiVersion: pod-security.admission.config.k8s.io/v1
      kind: PodSecurityConfiguration
      defaults:
        enforce: "baseline"
        enforce-version: "latest"
        audit: "restricted"
        audit-version: "latest"
        warn: "restricted"
        warn-version: "latest"
      exemptions:
        usernames: []
        runtimeClasses: []
        namespaces: [kube-system, rke2-system]
EOF
```

## Configuring OIDC Authentication

Integrate your cluster with an external identity provider:

```yaml
kube-apiserver-arg:
  # OIDC issuer URL
  - "oidc-issuer-url=https://sso.example.com/realms/myrealm"
  # OIDC client ID
  - "oidc-client-id=kubernetes"
  # JWT claim to use as the username
  - "oidc-username-claim=email"
  # JWT claim to use as groups
  - "oidc-groups-claim=groups"
```

## Tuning API Server Performance

```yaml
kube-apiserver-arg:
  # Maximum number of in-flight requests (default 400)
  - "max-requests-inflight=800"
  # Maximum number of mutating in-flight requests (default 200)
  - "max-mutating-requests-inflight=400"
  # Enable watch cache (default true)
  - "watch-cache=true"
```

## Configuring Anonymous Authentication

Disable anonymous authentication for enhanced security:

```yaml
kube-apiserver-arg:
  # Disable anonymous API access
  - "anonymous-auth=false"
```

## Configuring Service Account Token Settings

```yaml
kube-apiserver-arg:
  # Maximum lifetime of tokens created by the service account token issuer
  - "service-account-max-token-expiration=3600s"
  # Extend admission-injected projected tokens during the legacy-token transition
  - "service-account-extend-token-expiration=true"
```

## Enabling Feature Gates

```yaml
kube-apiserver-arg:
  # Enable feature gates supported by your Kubernetes version
  - "feature-gates=APIServingWithRoutine=true,WatchList=true"
```

## Complete Production-Ready Configuration

```yaml
# /etc/rancher/rke2/config.yaml - Server node configuration
token: "SecureClusterToken"
tls-san:
  - 192.168.1.100
  - my-cluster.example.com

kube-apiserver-arg:
  # Audit logging
  - "audit-policy-file=/etc/rancher/rke2/audit-policy.yaml"
  - "audit-log-path=/var/lib/rancher/rke2/server/logs/audit.log"
  - "audit-log-maxage=30"
  - "audit-log-maxbackup=10"
  - "audit-log-maxsize=100"

  # Security
  - "anonymous-auth=false"
  - "enable-admission-plugins=NodeRestriction,PodSecurity,ResourceQuota"

  # Performance tuning
  - "max-requests-inflight=800"
  - "max-mutating-requests-inflight=400"

  # Service accounts
  - "service-account-max-token-expiration=86400s"
```

## Applying Changes

```bash
# Restart the RKE2 server service to apply changes
sudo systemctl restart rke2-server.service

# Monitor the server startup
sudo journalctl -u rke2-server -f

# Verify the API server is running with correct arguments
ps aux | grep kube-apiserver | tr ' ' '\n' | grep -E "audit|admission|oidc"
```

## Verifying the Configuration

```bash
# Check the API server pod (it runs as a static pod)
kubectl -n kube-system get pod -l component=kube-apiserver

# View the API server manifest
sudo cat /var/lib/rancher/rke2/agent/pod-manifests/kube-apiserver.yaml | grep -A 5 "args:"
```

## Conclusion

Customizing kube-apiserver arguments in RKE2 is essential for production clusters that need audit logging, strong authentication, security policies, and performance tuning. By using the `kube-apiserver-arg` configuration key, you can pass any supported flag to the API server without manually editing pod manifests. Always test API server changes carefully, as a misconfigured API server will prevent the cluster from functioning.
