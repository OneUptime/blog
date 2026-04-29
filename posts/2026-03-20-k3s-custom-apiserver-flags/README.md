# How to Configure K3s with Custom kube-apiserver Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Kube-apiserver, Configuration, Security, DevOps

Description: Learn how to pass custom kube-apiserver flags in K3s to enable advanced features, security hardening, and compliance configurations.

## Introduction

The Kubernetes API server (`kube-apiserver`) has hundreds of configuration flags that control admission controllers, authentication, authorization, resource limits, audit logging, and more. In K3s, these flags are passed via the `kube-apiserver-arg` configuration option. This guide covers common and important kube-apiserver customizations for K3s deployments.

## How to Pass kube-apiserver Flags in K3s

K3s accepts kube-apiserver flags through two methods:

**Method 1: Config file (recommended)**

```yaml
# /etc/rancher/k3s/config.yaml

kube-apiserver-arg:
  - "flag-name=value"
  - "another-flag=another-value"
```

**Method 2: Environment variable / CLI**

```bash
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="server --kube-apiserver-arg flag-name=value" \
  sh -s -
```

## Common kube-apiserver Customizations

### Security Hardening

```yaml
# /etc/rancher/k3s/config.yaml
kube-apiserver-arg:
  # Disable anonymous authentication
  - "anonymous-auth=false"

  # Enable audit logging
  - "audit-log-path=/var/lib/rancher/k3s/server/logs/audit.log"
  - "audit-log-maxage=30"
  - "audit-log-maxbackup=10"
  - "audit-log-maxsize=100"
  - "audit-policy-file=/var/lib/rancher/k3s/server/audit.yaml"

  # TLS security settings
  - "tls-min-version=VersionTLS12"
  - "tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"

  # Enable non-default admission plugins
  - "enable-admission-plugins=NodeRestriction,AlwaysPullImages,DenyServiceExternalIPs"

  # Disable profiling endpoints
  - "profiling=false"

  # Use a custom encryption provider config
  - "encryption-provider-config=/etc/rancher/k3s/encryption-config.yaml"
```

### Add Custom TLS SANs

```yaml
# Add additional SANs to the API server certificate.
# Use the top-level tls-san setting in K3s config, not kube-apiserver-arg.
tls-san:
  - "k3s.example.com"
  - "192.168.1.10"
  - "10.0.0.1"
```

### Configure Admission Controllers

```yaml
kube-apiserver-arg:
  # Enable non-default admission plugins
  - "enable-admission-plugins=NodeRestriction,AlwaysPullImages,DenyServiceExternalIPs"

  # Disable specific admission plugins (if needed)
  - "disable-admission-plugins=DefaultStorageClass"

  # PodSecurity is enabled by default in current Kubernetes releases
  # Use an admission configuration file to tune enforcement levels
  - "admission-control-config-file=/var/lib/rancher/k3s/server/psa.yaml"
```

### Configure Authorization

```yaml
kube-apiserver-arg:
  # RBAC + Node authorization (default in K3s, but explicit here)
  - "authorization-mode=Node,RBAC"

  # Add ABAC if needed (not commonly used)
  # - "authorization-mode=Node,RBAC,ABAC"
  # - "authorization-policy-file=/etc/k3s/abac-policy.json"
```

### API Server Performance Tuning

```yaml
kube-apiserver-arg:
  # Limit concurrent requests to protect the API server
  - "max-requests-inflight=400"
  - "max-mutating-requests-inflight=200"

  # Disable watch caching for high-churn resources only when needed
  - "watch-cache-sizes=events#0"

  # Event retention (reduce for resource-constrained nodes)
  - "event-ttl=1h"

  # Enable request timeout
  - "request-timeout=60s"
  - "min-request-timeout=300"
```

### Feature Gates

```yaml
kube-apiserver-arg:
  # Feature gates are version-specific; verify support with kube-apiserver -h
  - "feature-gates=APIServingWithRoutine=true,ConcurrentWatchObjectDecode=true"

  # SidecarContainers is GA as of Kubernetes 1.33, so no feature gate is needed
```

### OIDC Authentication Integration

```yaml
kube-apiserver-arg:
  # Configure OIDC identity provider
  - "oidc-issuer-url=https://accounts.google.com"
  - "oidc-client-id=your-client-id"
  - "oidc-username-claim=email"
  - "oidc-groups-claim=groups"
  - "oidc-required-claim=hd=your-company.com"

  # Or use Dex/Keycloak
  - "oidc-issuer-url=https://dex.example.com"
  - "oidc-client-id=kubernetes"
  - "oidc-ca-file=/etc/k3s/dex-ca.pem"
```

### Complete Security-Hardened Configuration

```yaml
# /etc/rancher/k3s/config.yaml
# Comprehensive security-hardened K3s configuration

# K3s-level settings
write-kubeconfig-mode: "0600"
secrets-encryption: true
tls-san:
  - "k3s.example.com"
  - "192.168.1.10"

# kube-apiserver hardening
kube-apiserver-arg:
  # Authentication
  - "anonymous-auth=false"

  # Authorization
  - "authorization-mode=Node,RBAC"

  # TLS hardening
  - "tls-min-version=VersionTLS12"
  - "tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"

  # Admission control
  - "enable-admission-plugins=NodeRestriction,AlwaysPullImages,DenyServiceExternalIPs"

  # Audit logging
  - "audit-log-path=/var/lib/rancher/k3s/server/logs/audit.log"
  - "audit-log-maxage=30"
  - "audit-log-maxbackup=10"
  - "audit-log-maxsize=100"
  - "audit-policy-file=/var/lib/rancher/k3s/server/audit.yaml"

  # Performance
  - "max-requests-inflight=400"
  - "max-mutating-requests-inflight=200"
  - "event-ttl=1h"

  # Security
  - "profiling=false"
  - "service-account-lookup=true"

# kube-controller-manager hardening
kube-controller-manager-arg:
  - "terminated-pod-gc-threshold=100"
  - "profiling=false"
  - "use-service-account-credentials=true"

# kube-scheduler hardening
kube-scheduler-arg:
  - "profiling=false"

# kubelet hardening
kubelet-arg:
  - "protect-kernel-defaults=true"
  - "read-only-port=0"
  - "streaming-connection-idle-timeout=5m"
  - "make-iptables-util-chains=true"
  - "event-qps=5"
  - "tls-min-version=VersionTLS12"
```

## Apply and Verify Configuration

```bash
# Apply the configuration
systemctl restart k3s

# Verify kube-apiserver started with custom flags
# Check the K3s startup log for the effective kube-apiserver flags
journalctl -u k3s | grep 'Running kube-apiserver' | tail -n1 | grep -E "tls-min-version|enable-admission-plugins|anonymous-auth"

# Or check API server readiness
kubectl get --raw='/readyz?verbose'

# Verify audit logging is working
kubectl get pods -A  # Trigger some API calls
tail -n 5 /var/lib/rancher/k3s/server/logs/audit.log

# Verify TLS configuration
openssl s_client -connect 127.0.0.1:6444 2>&1 | grep -E "Protocol|Cipher"

# Check admission webhooks
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations
```

## Validate Security Settings with kube-bench

```bash
# Install kube-bench for CIS benchmark compliance
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml

# Wait for job to complete
kubectl wait --for=condition=complete job/kube-bench --timeout=120s

# View results
kubectl logs job/kube-bench | head -100

# Focus on API server checks
kubectl logs job/kube-bench | grep -A 5 "\[FAIL\]"
```

## Conclusion

Customizing kube-apiserver flags in K3s enables security hardening, compliance configuration, and performance tuning that goes beyond the defaults. The `kube-apiserver-arg` configuration key provides a direct passthrough to all kube-apiserver flags. For production deployments, always test configuration changes in a staging environment first, validate with kube-bench against CIS benchmarks, and document your security configuration for compliance audits. The combination of custom kube-apiserver flags with K3s's built-in security features (secrets encryption, TLS) provides a solid foundation for secure Kubernetes deployments.
