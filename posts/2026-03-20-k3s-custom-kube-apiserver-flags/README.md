# How to Configure K3s with Custom kube-apiserver Flags - Kube

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kube-apiserver, Configuration, Kubernetes, Security, SUSE Rancher

Description: Learn how to pass custom kube-apiserver flags to K3s for advanced configuration including feature gates, admission plugins, audit logging, and API server tuning.

---

K3s embeds the kube-apiserver and other Kubernetes components. You can pass custom flags to the embedded kube-apiserver through K3s configuration to enable feature gates, customize admission controllers, and tune API server behavior.

---

## Step 1: Pass kube-apiserver Flags via Config File

```yaml
# /etc/rancher/k3s/config.yaml

kube-apiserver-arg:
  - "anonymous-auth=false"
  - "profiling=false"
  - "request-timeout=300s"
```

Restart K3s to apply:

```bash
systemctl restart k3s
```

---

## Step 2: Configure Pod Security Admission

```yaml
# /var/lib/rancher/k3s/server/psa.yaml
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
        namespaces:
          - kube-system
          - cattle-system
```

```yaml
# /etc/rancher/k3s/config.yaml - reference the config file
kube-apiserver-arg:
  - "admission-control-config-file=/var/lib/rancher/k3s/server/psa.yaml"
```

---

## Step 3: Configure Audit Logging

```yaml
# /etc/rancher/k3s/config.yaml
kube-apiserver-arg:
  - "audit-log-path=/var/lib/rancher/k3s/server/logs/audit.log"
  - "audit-log-maxage=30"
  - "audit-log-maxbackup=5"
  - "audit-log-maxsize=100"
  - "audit-policy-file=/var/lib/rancher/k3s/server/audit.yaml"
```

```yaml
# /var/lib/rancher/k3s/server/audit.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
    resources:
      - group: ""
        resources: ["pods"]
  - level: None
    users: ["system:kube-proxy"]
    verbs: ["watch"]
```

Create the log directory before restarting K3s:

```bash
mkdir -p -m 700 /var/lib/rancher/k3s/server/logs
```

---

## Step 4: Enable Feature Gates

```yaml
# /etc/rancher/k3s/config.yaml
kube-apiserver-arg:
  - "feature-gates=CoordinatedLeaderElection=true"
  - "runtime-config=coordination.k8s.io/v1beta1=true"
```

Feature gates are version-specific, so verify that the gate exists in the Kubernetes release bundled with your K3s version before enabling it.

---

## Step 5: Tune API Server Performance

```yaml
# /etc/rancher/k3s/config.yaml
kube-apiserver-arg:
  # Increase max requests in flight for high-load clusters
  - "max-requests-inflight=800"
  - "max-mutating-requests-inflight=400"

  # API Priority and Fairness is enabled by default, but can be set explicitly
  - "enable-priority-and-fairness=true"
```

---

## Step 6: Configure OIDC Authentication

```yaml
# /etc/rancher/k3s/config.yaml
kube-apiserver-arg:
  - "oidc-issuer-url=https://accounts.google.com"
  - "oidc-client-id=my-k8s-client"
  - "oidc-username-claim=email"
```

---

## Step 7: Verify Applied Flags

```bash
# K3s logs the effective kube-apiserver command line at startup
journalctl -u k3s | grep "Running kube-apiserver" | tail -n 1

# Filter for a specific flag you configured
journalctl -u k3s | grep "Running kube-apiserver" | tail -n 1 | grep audit-policy-file
```

---

## Available Flag Categories

| Category | Example Flags |
|---|---|
| Security | `--anonymous-auth`, `--enable-admission-plugins` |
| Audit | `--audit-log-path`, `--audit-policy-file` |
| Authentication | `--oidc-issuer-url`, `--token-auth-file` |
| Performance | `--max-requests-inflight`, `--watch-cache-sizes` |
| Feature gates | `--feature-gates` |

---

## Best Practices

- Pass all kube-apiserver customizations through `/etc/rancher/k3s/config.yaml` under `kube-apiserver-arg` - this is the supported way and survives K3s upgrades.
- Enable audit logging with both `--audit-log-path` and `--audit-policy-file` on any cluster used for production or compliance - the audit policy controls which API server operations are recorded.
- Test new kube-apiserver flags in a K3d local cluster before applying them to production - some flags can break API server startup if misconfigured.
