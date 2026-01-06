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

```bash
# Run kube-bench as a job
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml

# Wait for completion
kubectl wait --for=condition=complete job/kube-bench --timeout=300s

# Get results
kubectl logs job/kube-bench
```

### Option 2: Run Directly on Nodes

```bash
# Download binary
curl -L https://github.com/aquasecurity/kube-bench/releases/download/v0.7.0/kube-bench_0.7.0_linux_amd64.tar.gz | tar xz

# Run on master node
sudo ./kube-bench run --targets master

# Run on worker node
sudo ./kube-bench run --targets node
```

### Option 3: Docker Container

```bash
# Run against current node
docker run --rm -v /etc:/etc:ro -v /var:/var:ro \
  -v $(which kubectl):/usr/local/bin/kubectl:ro \
  -v ~/.kube:/root/.kube:ro \
  aquasec/kube-bench:latest run
```

## Understanding kube-bench Output

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

```bash
kube-bench run --targets master
```

### Scan Only Worker Nodes

```bash
kube-bench run --targets node
```

### Scan Specific Sections

```bash
# Only API server checks
kube-bench run --targets master --check 1.2

# Only etcd checks
kube-bench run --targets master --check 2

# Only RBAC checks
kube-bench run --targets master --check 5.1
```

### Output to JSON

```bash
kube-bench run --json > kube-bench-results.json

# Parse with jq
cat kube-bench-results.json | jq '.Controls[] | select(.id == "1.2") | .tests[] | select(.status == "FAIL")'
```

## Fixing Common Failures

### 1.2.1: Ensure --anonymous-auth is set to false

**Problem**: Anonymous requests are allowed to the API server.

**Fix**: Add to kube-apiserver manifest:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --anonymous-auth=false
```

### 1.2.6: Ensure --kubelet-certificate-authority is set

**Problem**: API server doesn't verify kubelet certificates.

**Fix**:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --kubelet-certificate-authority=/etc/kubernetes/pki/ca.crt
```

### 1.2.16: Ensure --audit-log-path is set

**Problem**: API audit logging is not enabled.

**Fix**:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --audit-log-path=/var/log/kubernetes/audit.log
    - --audit-log-maxage=30
    - --audit-log-maxbackup=10
    - --audit-log-maxsize=100
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
```

Create audit policy:

```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Don't log requests to certain non-resource URLs
  - level: None
    nonResourceURLs:
      - /healthz*
      - /version
      - /swagger*
  # Log pod changes at RequestResponse level
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["pods"]
  # Log configmap and secret changes
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets", "configmaps"]
  # Log all other resources at Metadata level
  - level: Metadata
    omitStages:
      - RequestReceived
```

### 1.2.21: Ensure --profiling is set to false

**Problem**: Profiling endpoints are enabled.

**Fix**:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --profiling=false
```

### 2.1: Ensure etcd encryption is configured

**Problem**: Secrets stored in etcd are not encrypted.

**Fix**:

```yaml
# /etc/kubernetes/enc/encryption-config.yaml
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

Add to API server:

```yaml
- --encryption-provider-config=/etc/kubernetes/enc/encryption-config.yaml
```

### 4.2.1: Ensure kubelet --anonymous-auth is false

**Problem**: Kubelet allows anonymous requests.

**Fix** in kubelet config:

```yaml
# /var/lib/kubelet/config.yaml
authentication:
  anonymous:
    enabled: false
  webhook:
    enabled: true
authorization:
  mode: Webhook
```

### 4.2.6: Ensure --protect-kernel-defaults is true

**Problem**: Kubelet doesn't protect kernel parameters.

**Fix**:

```yaml
# /var/lib/kubelet/config.yaml
protectKernelDefaults: true
```

### 5.1.5: Ensure default service accounts are not actively used

**Problem**: Pods using default ServiceAccount.

**Fix**: Create dedicated ServiceAccounts and disable automount on default:

```bash
# Disable token automount on default SA
kubectl patch serviceaccount default -n <namespace> \
  -p '{"automountServiceAccountToken": false}'
```

### 5.2.2: Minimize admission of privileged containers

**Problem**: Privileged containers are allowed.

**Fix**: Enable Pod Security Standards:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 5.3.2: Ensure NetworkPolicy is configured

**Problem**: No network policies exist.

**Fix**: Apply default deny policy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

## Automated Remediation Script

```bash
#!/bin/bash
# remediate-kubelet.sh - Run on each node

KUBELET_CONFIG="/var/lib/kubelet/config.yaml"

# Backup original config
cp $KUBELET_CONFIG ${KUBELET_CONFIG}.backup

# Apply security settings
cat <<EOF >> $KUBELET_CONFIG
# CIS Benchmark Remediations
authentication:
  anonymous:
    enabled: false
  webhook:
    enabled: true
authorization:
  mode: Webhook
protectKernelDefaults: true
readOnlyPort: 0
eventRecordQPS: 0
EOF

# Restart kubelet
systemctl restart kubelet

echo "Kubelet remediation complete. Verify with kube-bench."
```

## Continuous Compliance with CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kube-bench-scan
  namespace: security
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          hostPID: true
          containers:
            - name: kube-bench
              image: aquasec/kube-bench:latest
              command: ["kube-bench", "run", "--json"]
              volumeMounts:
                - name: var-lib-etcd
                  mountPath: /var/lib/etcd
                  readOnly: true
                - name: etc-kubernetes
                  mountPath: /etc/kubernetes
                  readOnly: true
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
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          tolerations:
            - key: node-role.kubernetes.io/control-plane
              effect: NoSchedule
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Kubernetes Security Scan

on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:

jobs:
  kube-bench:
    runs-on: ubuntu-latest
    steps:
      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBECONFIG }}

      - name: Run kube-bench
        run: |
          kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml
          kubectl wait --for=condition=complete job/kube-bench --timeout=300s
          kubectl logs job/kube-bench > kube-bench-results.txt

      - name: Check for failures
        run: |
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

```bash
# EKS
kube-bench run --targets node --benchmark eks-1.2.0

# GKE
kube-bench run --targets node --benchmark gke-1.2.0

# AKS
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
