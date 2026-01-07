# How to Run Security Audits on Kubernetes Clusters with kube-bench

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Compliance, CIS Benchmark, kube-bench, DevOps

Description: A practical guide to auditing Kubernetes cluster security using kube-bench, interpreting results, and fixing common CIS benchmark failures.

---

You've deployed Kubernetes. But is it secure? kube-bench runs the CIS (Center for Internet Security) Kubernetes Benchmark tests against your cluster and tells you exactly what's wrong.

## What Is kube-bench?

kube-bench is an open-source tool that checks whether Kubernetes is deployed according to security best practices as defined in the CIS Kubernetes Benchmark.

It tests:
- Control plane components (API server, etcd, controller manager, scheduler)
- Worker node configuration
- Policies and RBAC
- Secrets management
- Network policies

## Installing kube-bench

### Option 1: Run as a Kubernetes Job

Running kube-bench as a Kubernetes Job is the simplest method for most clusters. The job runs on a node, performs the security checks, and stores the results in the pod logs.

```bash
# Apply the kube-bench job manifest from the official repository
# This creates a job that runs security checks on the node where it's scheduled
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml

# Wait for the job to complete (timeout after 5 minutes)
kubectl wait --for=condition=complete job/kube-bench --timeout=300s

# Retrieve the security audit results from the job's pod logs
kubectl logs job/kube-bench
```

### Option 2: Run Directly on Nodes

Running kube-bench directly on nodes gives you more control and is necessary when you need to check specific node roles or run with elevated privileges.

```bash
# Download the kube-bench binary for Linux
curl -L https://github.com/aquasecurity/kube-bench/releases/download/v0.7.0/kube-bench_0.7.0_linux_amd64.tar.gz | tar xz

# Run on a master/control-plane node to check control plane components
# Requires root access to read configuration files
sudo ./kube-bench run --targets master

# Run on a worker node to check node-specific configuration
sudo ./kube-bench run --targets node
```

### Option 3: Docker Container

Using Docker is convenient for testing or when you don't want to install binaries on the node. The container needs access to host paths to read Kubernetes configuration.

```bash
# Run kube-bench container with access to host configuration directories
# -v mounts are read-only to prevent accidental modifications
docker run --rm -v /etc:/etc:ro -v /var:/var:ro \
  -v $(which kubectl):/usr/local/bin/kubectl:ro \
  -v ~/.kube:/root/.kube:ro \
  aquasec/kube-bench:latest run
```

## Understanding kube-bench Output

The output categorizes each check with a status indicator. Understanding these statuses helps prioritize your remediation efforts.

```
[INFO] 1 Control Plane Security Configuration
[INFO] 1.1 Control Plane Node Configuration Files
[PASS] 1.1.1 Ensure that the API server pod specification file permissions are set to 644 or more restrictive
[PASS] 1.1.2 Ensure that the API server pod specification file ownership is set to root:root
[FAIL] 1.1.3 Ensure that the controller manager pod specification file permissions are set to 644 or more restrictive
[WARN] 1.1.4 Ensure that the controller manager pod specification file ownership is set to root:root

== Summary ==
45 checks PASS
10 checks FAIL
15 checks WARN
5 checks INFO
```

- **PASS**: Configuration meets CIS benchmark
- **FAIL**: Security issue that should be fixed
- **WARN**: Requires manual verification
- **INFO**: Informational, no action needed

## Running Targeted Scans

### Scan Only Control Plane

Target specific components to reduce noise and focus on what matters for your role. Control plane scans should be run on master nodes.

```bash
# Run checks only for control plane components (API server, etcd, etc.)
kube-bench run --targets master
```

### Scan Only Worker Nodes

Worker node scans verify kubelet configuration and node-level security settings. Run these on each worker node or a representative sample.

```bash
# Run checks specific to worker node configuration
kube-bench run --targets node
```

### Scan Specific Sections

When remediating issues, you can run specific sections to verify fixes without running the entire benchmark.

```bash
# Only API server checks (section 1.2)
kube-bench run --targets master --check 1.2

# Only etcd checks (section 2)
kube-bench run --targets master --check 2

# Only RBAC checks (section 5.1)
kube-bench run --targets master --check 5.1
```

### Output to JSON

JSON output enables integration with CI/CD pipelines, security dashboards, and automated alerting systems.

```bash
# Export results as JSON for programmatic processing
kube-bench run --json > kube-bench-results.json

# Parse with jq to find all failed checks in section 1.2
# Useful for creating remediation tickets automatically
cat kube-bench-results.json | jq '.Controls[] | select(.id == "1.2") | .tests[] | select(.status == "FAIL")'
```

## Fixing Common Failures

### 1.2.1: Ensure --anonymous-auth is set to false

**Problem**: Anonymous requests are allowed to the API server.

**Fix**: Add to kube-apiserver manifest:

Disabling anonymous authentication prevents unauthenticated access to the API server. This is a critical security control that ensures all requests must be authenticated.

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
spec:
  containers:
  - command:
    - kube-apiserver
    # Disable anonymous authentication - all requests must be authenticated
    - --anonymous-auth=false
```

### 1.2.6: Ensure --kubelet-certificate-authority is set

**Problem**: API server doesn't verify kubelet certificates.

**Fix**:

Setting the kubelet CA ensures the API server verifies kubelet TLS certificates, preventing man-in-the-middle attacks between the API server and kubelets.

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    # Verify kubelet certificates using the cluster CA
    - --kubelet-certificate-authority=/etc/kubernetes/pki/ca.crt
```

### 1.2.16: Ensure --audit-log-path is set

**Problem**: API audit logging is not enabled.

**Fix**:

Audit logging is essential for security forensics and compliance. It records all API requests, enabling you to detect and investigate suspicious activity.

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    # Path where audit logs will be written
    - --audit-log-path=/var/log/kubernetes/audit.log
    # Retain audit logs for 30 days
    - --audit-log-maxage=30
    # Keep 10 backup files
    - --audit-log-maxbackup=10
    # Rotate logs at 100MB
    - --audit-log-maxsize=100
    # Reference to the audit policy file
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
```

Create audit policy:

The audit policy defines what events to log and at what level of detail. This example shows a balanced policy that captures important events without excessive logging.

```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Don't log requests to health check and metadata endpoints
  # These are high-volume and low-security-value
  - level: None
    nonResourceURLs:
      - /healthz*
      - /version
      - /swagger*
  # Log pod changes at RequestResponse level for full audit trail
  # This includes the request body and response body
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["pods"]
  # Log secret and configmap changes at Metadata level
  # We don't log request/response bodies to avoid exposing sensitive data
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]
  # Log all other resources at Metadata level
  # Skip RequestReceived stage to reduce log volume
  - level: Metadata
    omitStages:
      - RequestReceived
```

### 1.2.21: Ensure --profiling is set to false

**Problem**: Profiling endpoints are enabled.

**Fix**:

Disabling profiling prevents potential information disclosure through profiling endpoints, which could expose internal cluster details to attackers.

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    # Disable profiling endpoints to reduce attack surface
    - --profiling=false
```

### 2.1: Ensure etcd encryption is configured

**Problem**: Secrets stored in etcd are not encrypted.

**Fix**:

Encrypting secrets at rest in etcd protects sensitive data even if an attacker gains access to the etcd data files or backups.

```yaml
# /etc/kubernetes/enc/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets  # Encrypt secrets stored in etcd
    providers:
      # aescbc provides strong encryption - key must be 32 bytes, base64-encoded
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      # identity provider as fallback allows reading unencrypted secrets
      # during migration - remove after all secrets are re-encrypted
      - identity: {}
```

Add to API server:

```yaml
# Reference the encryption configuration in the API server manifest
- --encryption-provider-config=/etc/kubernetes/enc/encryption-config.yaml
```

### 4.2.1: Ensure kubelet --anonymous-auth is false

**Problem**: Kubelet allows anonymous requests.

**Fix** in kubelet config:

Kubelet anonymous authentication must be disabled to prevent unauthenticated access to the kubelet API, which could expose sensitive node and pod information.

```yaml
# /var/lib/kubelet/config.yaml
authentication:
  anonymous:
    enabled: false  # Disable anonymous access to kubelet
  webhook:
    enabled: true   # Use API server for authentication
authorization:
  mode: Webhook     # Delegate authorization to API server
```

### 4.2.6: Ensure --protect-kernel-defaults is true

**Problem**: Kubelet doesn't protect kernel parameters.

**Fix**:

Protecting kernel defaults ensures kubelet errors if required kernel parameters differ from the kubelet's defaults, preventing misconfigurations that could affect security.

```yaml
# /var/lib/kubelet/config.yaml
# Kubelet will error if kernel parameters don't match expected defaults
protectKernelDefaults: true
```

### 5.1.5: Ensure default service accounts are not actively used

**Problem**: Pods using default ServiceAccount.

**Fix**: Create dedicated ServiceAccounts and disable automount on default:

The default service account in each namespace should not be used by applications. Create dedicated service accounts with minimal permissions for each workload.

```bash
# Disable automatic token mounting for the default service account
# This prevents pods from accidentally using the default SA
kubectl patch serviceaccount default -n <namespace> \
  -p '{"automountServiceAccountToken": false}'
```

### 5.2.2: Minimize admission of privileged containers

**Problem**: Privileged containers are allowed.

**Fix**: Enable Pod Security Standards:

Pod Security Standards provide a built-in way to enforce security policies. The "restricted" profile prevents privileged containers and enforces other security best practices.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Enforce restricted security - pods violating this won't be created
    pod-security.kubernetes.io/enforce: restricted
    # Audit mode logs violations without blocking
    pod-security.kubernetes.io/audit: restricted
    # Warn mode shows warnings to users
    pod-security.kubernetes.io/warn: restricted
```

### 5.3.2: Ensure NetworkPolicy is configured

**Problem**: No network policies exist.

**Fix**: Apply default deny policy:

A default deny network policy blocks all ingress and egress traffic. You then create additional policies to explicitly allow only required traffic.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  # Empty selector matches all pods in the namespace
  podSelector: {}
  # Block both ingress and egress by default
  policyTypes:
    - Ingress
    - Egress
```

## Automated Remediation Script

This script automates common kubelet security remediations. Run it on each worker node after backing up the existing configuration.

```bash
#!/bin/bash
# remediate-kubelet.sh - Run on each node
# Applies CIS benchmark security settings to kubelet configuration

KUBELET_CONFIG="/var/lib/kubelet/config.yaml"

# Backup original config before making changes
cp $KUBELET_CONFIG ${KUBELET_CONFIG}.backup

# Apply security settings by appending to the config file
# Note: In production, use a proper YAML merge tool
cat <<EOF >> $KUBELET_CONFIG
# CIS Benchmark Remediations
authentication:
  anonymous:
    enabled: false      # 4.2.1 - Disable anonymous authentication
  webhook:
    enabled: true       # Use API server for authentication
authorization:
  mode: Webhook         # 4.2.2 - Use webhook authorization
protectKernelDefaults: true  # 4.2.6 - Protect kernel defaults
readOnlyPort: 0         # 4.2.4 - Disable read-only port
eventRecordQPS: 0       # Disable event rate limiting for audit trail
EOF

# Restart kubelet to apply changes
systemctl restart kubelet

echo "Kubelet remediation complete. Verify with kube-bench."
```

## Continuous Compliance with CronJob

Automated daily scans ensure ongoing compliance and catch configuration drift. This CronJob runs kube-bench daily and stores results for review.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kube-bench-scan
  namespace: security
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          # Required to access host process information
          hostPID: true
          containers:
            - name: kube-bench
              image: aquasec/kube-bench:latest
              # Output JSON for easy parsing and alerting
              command: ["kube-bench", "run", "--json"]
              volumeMounts:
                # Mount etcd data directory for etcd checks
                - name: var-lib-etcd
                  mountPath: /var/lib/etcd
                  readOnly: true
                # Mount Kubernetes config directory for all checks
                - name: etc-kubernetes
                  mountPath: /etc/kubernetes
                  readOnly: true
                # Mount results directory for output
                - name: results
                  mountPath: /results
          volumes:
            - name: var-lib-etcd
              hostPath:
                path: /var/lib/etcd
            - name: etc-kubernetes
              hostPath:
                path: /etc/kubernetes
            - name: results
              emptyDir: {}
          restartPolicy: OnFailure
          # Schedule on control plane nodes for full checks
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          # Tolerate control plane taints
          tolerations:
            - key: node-role.kubernetes.io/control-plane
              effect: NoSchedule
```

## Integration with CI/CD

### GitHub Actions Example

Integrating kube-bench with CI/CD enables automatic security validation. This workflow runs daily and fails if any security checks fail, ensuring issues are addressed promptly.

```yaml
name: Kubernetes Security Scan

on:
  schedule:
    - cron: '0 0 * * *'  # Run daily at midnight
  workflow_dispatch:  # Allow manual triggers

jobs:
  kube-bench:
    runs-on: ubuntu-latest
    steps:
      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          # Kubeconfig stored as GitHub secret
          kubeconfig: ${{ secrets.KUBECONFIG }}

      - name: Run kube-bench
        run: |
          # Deploy kube-bench job to the cluster
          kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml
          # Wait for completion
          kubectl wait --for=condition=complete job/kube-bench --timeout=300s
          # Save results to file for artifact upload
          kubectl logs job/kube-bench > kube-bench-results.txt

      - name: Check for failures
        run: |
          # Fail the pipeline if any FAIL results are found
          if grep -q "FAIL" kube-bench-results.txt; then
            echo "Security failures detected!"
            grep "FAIL" kube-bench-results.txt
            exit 1
          fi

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: kube-bench-results
          path: kube-bench-results.txt
```

## Managed Kubernetes Considerations

For EKS, GKE, AKS - you don't control the control plane. Run kube-bench against worker nodes only:

Managed Kubernetes services handle control plane security, but you're responsible for worker node configuration. Use the appropriate benchmark for each provider.

```bash
# EKS - Use the EKS-specific benchmark
kube-bench run --targets node --benchmark eks-1.2.0

# GKE - Use the GKE-specific benchmark
kube-bench run --targets node --benchmark gke-1.2.0

# AKS - Use the AKS-specific benchmark
kube-bench run --targets node --benchmark aks-1.0
```

## Prioritizing Fixes

Focus on these high-impact areas first:

1. **API Server Authentication** (1.2.1-1.2.3) - Prevent unauthorized access
2. **etcd Encryption** (2.1) - Protect secrets at rest
3. **Audit Logging** (1.2.16-1.2.19) - Enable forensics
4. **Kubelet Security** (4.2.x) - Secure node access
5. **Pod Security** (5.2.x) - Prevent privileged containers
6. **Network Policies** (5.3.x) - Microsegmentation

## Security Checklist Post-Scan

- [ ] All FAIL items have remediation tickets
- [ ] WARN items reviewed and documented
- [ ] Scan results stored in compliance system
- [ ] Weekly scan scheduled
- [ ] Critical failures trigger alerts
- [ ] Baseline established for drift detection

---

kube-bench doesn't fix your cluster - it tells you what's wrong. Run it regularly, fix the failures, and track your security posture over time. A passing kube-bench scan doesn't mean you're secure, but failing it means you definitely have work to do.
