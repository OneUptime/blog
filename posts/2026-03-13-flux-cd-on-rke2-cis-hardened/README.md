# How to Set Up Flux CD on RKE2 with CIS Hardened Profile

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, RKE2, CIS Hardening, Security

Description: Bootstrap Flux CD on RKE2 with CIS security hardening enabled, ensuring your GitOps-managed cluster meets compliance benchmarks from day one.

---

## Introduction

RKE2 (Rancher Kubernetes Engine 2) is a security-focused Kubernetes distribution from SUSE that ships with CIS Kubernetes Benchmark compliance built in. Its hardened profile applies secure defaults across the API server, controller manager, scheduler, kubelet, and etcd — settings that many organizations must enable to meet compliance requirements (PCI-DSS, HIPAA, SOC 2).

Bootstrapping Flux CD on a CIS-hardened RKE2 cluster requires some additional consideration: hardening restricts pod security, network policies, and audit logging in ways that affect Flux's controllers. This guide covers configuring RKE2 with the CIS profile, adjusting Flux's deployment to comply with pod security standards, and verifying the full GitOps workflow.

## Prerequisites

- Linux nodes with RKE2 packages available (RHEL/CentOS/Ubuntu)
- `kubectl` and `flux` CLI on your workstation
- A Git repository for Flux CD bootstrap
- Root or sudo access on all RKE2 nodes

## Step 1: Prepare Nodes for CIS Hardening

```bash
# RKE2 CIS profile requires specific kernel parameters
cat >> /etc/sysctl.d/60-rke2-cis.conf << EOF
vm.panic_on_oom=0
vm.overcommit_memory=1
kernel.panic=10
kernel.panic_on_oops=1
EOF

sysctl --system

# Create etcd user (required by CIS profile)
useradd -r -c "etcd user" -s /sbin/nologin -M etcd -U
```

## Step 2: Configure RKE2 with CIS Profile

```yaml
# /etc/rancher/rke2/config.yaml (on all server nodes)
# Enable CIS 1.23 hardening profile
profile: cis-1.23

# API server additional arguments for compliance
kube-apiserver-arg:
  - "audit-log-path=/var/lib/rancher/rke2/server/logs/audit.log"
  - "audit-log-maxage=30"
  - "audit-log-maxbackup=10"
  - "audit-log-maxsize=100"
  - "audit-policy-file=/etc/rancher/rke2/audit-policy.yaml"
  - "anonymous-auth=false"

# Kubelet hardening
kubelet-arg:
  - "protect-kernel-defaults=true"
  - "make-iptables-util-chains=true"
  - "streaming-connection-idle-timeout=5m"

# TLS cipher suite restrictions
kube-apiserver-arg:
  - "tls-min-version=VersionTLS12"
  - "tls-cipher-suites=TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"

# Disable unused features
disable:
  - rke2-ingress-nginx  # Deploy via Flux instead
```

```yaml
# /etc/rancher/rke2/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all secret access at the metadata level
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
  # Log everything at the Request level
  - level: Request
    omitStages:
      - RequestReceived
```

## Step 3: Install and Start RKE2

```bash
# Install RKE2 server
curl -sfL https://get.rke2.io | INSTALL_RKE2_TYPE=server sh -

# Enable and start RKE2
systemctl enable rke2-server
systemctl start rke2-server

# Wait for the server to be ready
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
/var/lib/rancher/rke2/bin/kubectl get nodes
```

## Step 4: Configure kubectl with RKE2 Kubeconfig

```bash
# Copy the RKE2 binaries to PATH
ln -s /var/lib/rancher/rke2/bin/kubectl /usr/local/bin/kubectl

# Export kubeconfig
mkdir -p ~/.kube
cp /etc/rancher/rke2/rke2.yaml ~/.kube/rke2-config
export KUBECONFIG=~/.kube/rke2-config

kubectl get nodes
```

## Step 5: Create Flux Namespace with Pod Security Standards

RKE2's CIS profile enforces Pod Security Standards. The `flux-system` namespace needs the `privileged` label for Flux controllers:

```yaml
# Apply before bootstrapping Flux
apiVersion: v1
kind: Namespace
metadata:
  name: flux-system
  labels:
    # Flux controllers require privileged PSS due to volume mounting
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: privileged
    pod-security.kubernetes.io/warn: privileged
```

```bash
kubectl apply -f flux-namespace.yaml
```

## Step 6: Bootstrap Flux CD on RKE2

```bash
export GITHUB_TOKEN=ghp_your_github_token

flux bootstrap github \
  --owner=my-org \
  --repository=rke2-fleet \
  --branch=main \
  --path=clusters/rke2-cis \
  --personal \
  --network-policy=false  # RKE2 CIS profile manages network policies separately

# Verify Flux is running
kubectl get pods -n flux-system
```

## Step 7: Run CIS Benchmark Validation

```bash
# Install kube-bench to validate CIS compliance
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml

# Check kube-bench results
kubectl logs job.batch/kube-bench

# Run the RKE2-specific benchmark
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: kube-bench-rke2
spec:
  template:
    spec:
      hostPID: true
      containers:
        - name: kube-bench
          image: aquasec/kube-bench:latest
          command: ["kube-bench", "--benchmark", "rke2-cis-1.23"]
          volumeMounts:
            - name: var-lib-rancher
              mountPath: /var/lib/rancher
              readOnly: true
      volumes:
        - name: var-lib-rancher
          hostPath:
            path: /var/lib/rancher
      restartPolicy: Never
EOF
```

## Best Practices

- Apply the `flux-system` namespace with PSS `privileged` enforcement before running `flux bootstrap` so Flux controllers are not blocked by the admission controller.
- Use the RKE2 CIS profile's audit log output to feed into a SIEM (Splunk, Elastic) for compliance reporting.
- Manage ingress, CNI, and other cluster addons via Flux HelmRelease resources rather than RKE2's built-in addon mechanism to maintain GitOps discipline.
- Run `kube-bench` as a scheduled Job (via Flux) on every cluster to continuously validate CIS compliance after upgrades.
- Use NetworkPolicy resources (managed by Flux) to implement the CIS-required network segmentation between `flux-system`, application namespaces, and `kube-system`.

## Conclusion

RKE2 with the CIS hardened profile gives you a security-first Kubernetes foundation. Flux CD on top of RKE2 ensures that even in a hardened environment, your cluster configuration is declarative and auditable. The combination is particularly well-suited for regulated industries where both GitOps discipline and security compliance benchmarks are required.
