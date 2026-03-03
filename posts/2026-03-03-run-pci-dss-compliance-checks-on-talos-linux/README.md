# How to Run PCI DSS Compliance Checks on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, PCI DSS, Compliance, Security, Payment Processing

Description: Implement and verify PCI DSS compliance on Talos Linux clusters for payment processing workloads with specific controls, scanning tools, and configuration examples.

---

The Payment Card Industry Data Security Standard (PCI DSS) applies to any organization that stores, processes, or transmits cardholder data. If you run payment-related workloads on Talos Linux and Kubernetes, you need to meet PCI DSS requirements. Version 4.0 of the standard, which became mandatory in 2024, introduced new requirements around authentication, encryption, and continuous monitoring.

This guide covers implementing PCI DSS controls on Talos Linux clusters and running compliance checks to verify your configuration.

## PCI DSS Requirements Overview

PCI DSS version 4.0 has 12 main requirements grouped into six goals:

1. Build and Maintain a Secure Network (Requirements 1-2)
2. Protect Account Data (Requirements 3-4)
3. Maintain a Vulnerability Management Program (Requirements 5-6)
4. Implement Strong Access Control Measures (Requirements 7-9)
5. Regularly Monitor and Test Networks (Requirements 10-11)
6. Maintain an Information Security Policy (Requirement 12)

Talos Linux's immutable design helps with many of these, but specific Kubernetes configurations are needed.

## Requirement 1: Network Security Controls

PCI DSS requires network segmentation to isolate the Cardholder Data Environment (CDE) from other systems.

### Dedicated CDE Namespace

```yaml
# cde-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cardholder-data-env
  labels:
    pci-dss: "true"
    zone: cde
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Network Policies for CDE Isolation

```yaml
# cde-network-policies.yaml
# Default deny all traffic in the CDE
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: cardholder-data-env
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow inbound traffic only from the payment gateway
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-payment-ingress
  namespace: cardholder-data-env
spec:
  podSelector:
    matchLabels:
      app: payment-processor
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              zone: dmz
        - podSelector:
            matchLabels:
              app: payment-gateway
      ports:
        - port: 8443
          protocol: TCP
---
# Allow egress only to the tokenization service and database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-cde-egress
  namespace: cardholder-data-env
spec:
  podSelector:
    matchLabels:
      app: payment-processor
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: card-database
      ports:
        - port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: tokenization-service
      ports:
        - port: 8443
    - to:  # DNS resolution
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - port: 53
          protocol: UDP
```

### Talos Firewall Configuration

Configure the Talos nodes in the CDE with restrictive network settings:

```yaml
# Talos config for CDE nodes
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 10.100.0.10/24  # Dedicated CDE network
        routes:
          - network: 0.0.0.0/0
            gateway: 10.100.0.1
    nameservers:
      - 10.100.0.2  # Internal DNS only
  # Node labels for scheduling CDE workloads
  nodeLabels:
    pci-zone: cde
```

## Requirement 2: Secure System Configuration

PCI DSS requires removing unnecessary services and changing default credentials. Talos Linux excels here:

```yaml
# Talos inherently satisfies Requirement 2:
# - No unnecessary services (no SSH, no shell)
# - No default passwords (API-based auth only)
# - Minimal OS with no package manager
# - Immutable filesystem prevents tampering

# Additional hardening:
machine:
  sysctls:
    net.ipv4.ip_forward: "1"
    net.ipv4.conf.all.rp_filter: "1"      # Enable reverse path filtering
    net.ipv4.conf.all.accept_redirects: "0" # Disable ICMP redirects
    net.ipv4.conf.all.send_redirects: "0"
    net.ipv4.icmp_echo_ignore_broadcasts: "1"
    net.ipv6.conf.all.accept_ra: "0"       # Disable IPv6 router advertisements
```

## Requirement 3: Protect Stored Account Data

### Encryption at Rest

```yaml
# Enable etcd encryption for Kubernetes secrets
cluster:
  secretboxEncryptionSecret: "<strong-encryption-key>"
```

For volumes storing cardholder data:

```yaml
# encrypted-cde-storage.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cde-encrypted
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "3"
  encrypted: "true"
reclaimPolicy: Retain
allowVolumeExpansion: false  # Prevent unauthorized expansion
```

### Data Tokenization

Use tokenization to minimize the presence of cardholder data:

```yaml
# tokenization-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tokenization-service
  namespace: cardholder-data-env
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tokenization-service
  template:
    metadata:
      labels:
        app: tokenization-service
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: tokenizer
          image: your-tokenizer:v1.0.0
          securityContext:
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          ports:
            - containerPort: 8443
          env:
            - name: ENCRYPTION_KEY
              valueFrom:
                secretKeyRef:
                  name: tokenizer-keys
                  key: encryption-key
```

## Requirement 4: Encrypt Transmission of Cardholder Data

```yaml
# Enforce TLS 1.2+ for all CDE communications
cluster:
  apiServer:
    extraArgs:
      tls-min-version: "VersionTLS12"
      tls-cipher-suites: "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384"
```

Deploy Istio with strict mTLS for the CDE namespace:

```yaml
# strict-mtls-cde.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: cardholder-data-env
spec:
  mtls:
    mode: STRICT
```

## Requirement 5: Vulnerability Management

### Container Image Scanning

```bash
# Install Trivy Operator for continuous vulnerability scanning
helm install trivy-operator aquasecurity/trivy-operator \
  --namespace trivy-system \
  --create-namespace \
  --set operator.scanJobsConcurrentLimit=5
```

Enforce image scanning through admission control:

```yaml
# Require vulnerability scanning before deployment
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: cde-trusted-registries
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    namespaces: ["cardholder-data-env"]
  parameters:
    repos:
      - "registry.example.com/cde/"  # Only allow pre-scanned images
```

## Requirement 7: Restrict Access

```yaml
# RBAC for CDE namespace - minimal access
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cde-operator
  namespace: cardholder-data-env
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  # No access to exec into pods
  # No access to secrets
  # No create/update/delete permissions
```

## Requirement 8: Multi-Factor Authentication

PCI DSS 4.0 requires MFA for all access to the CDE. Configure your OIDC provider to require MFA:

```yaml
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: "https://auth.example.com"
      oidc-client-id: "kubernetes-pci"
      oidc-username-claim: "email"
      oidc-groups-claim: "groups"
      # Require MFA claim from the identity provider
      oidc-required-claim: "mfa_verified=true"
```

## Requirement 10: Log and Monitor All Access

```yaml
# Comprehensive audit policy for PCI DSS
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log everything in the CDE namespace at full detail
  - level: RequestResponse
    namespaces: ["cardholder-data-env"]

  # Log all authentication events
  - level: Request
    resources:
      - group: "authentication.k8s.io"

  # Log all access control changes
  - level: RequestResponse
    resources:
      - group: "rbac.authorization.k8s.io"

  # Default metadata for everything else
  - level: Metadata
    omitStages:
      - RequestReceived
```

Configure log shipping with integrity verification:

```yaml
machine:
  logging:
    destinations:
      - endpoint: "tcp://pci-siem.example.com:6514"
        format: json_lines
```

## Requirement 11: Regular Security Testing

### Automated Compliance Scanning

```bash
# Run PCI-relevant compliance checks with Kubescape
kubescape scan framework nist \
  --include-namespaces cardholder-data-env \
  --format json \
  --output pci-scan-results.json

# Run kube-bench for CIS benchmarks
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: kube-bench-pci
spec:
  template:
    spec:
      hostPID: true
      containers:
        - name: kube-bench
          image: aquasec/kube-bench:latest
          command: ["kube-bench", "run"]
      restartPolicy: Never
EOF
```

### Automated Compliance Scanning Schedule

```yaml
# weekly-pci-scan.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: pci-compliance-scan
  namespace: compliance
spec:
  schedule: "0 4 * * 0"  # Weekly on Sunday at 4 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: scanner
              image: aquasec/trivy:latest
              command:
                - trivy
                - k8s
                - --namespace
                - cardholder-data-env
                - --report
                - all
                - --format
                - json
                - --output
                - /reports/pci-scan.json
              volumeMounts:
                - name: reports
                  mountPath: /reports
          volumes:
            - name: reports
              persistentVolumeClaim:
                claimName: compliance-reports
          restartPolicy: OnFailure
```

## Evidence Collection for QSA

PCI DSS assessments are conducted by a Qualified Security Assessor (QSA). Prepare evidence:

```bash
#!/bin/bash
# collect-pci-evidence.sh

DIR="./pci-evidence-$(date +%Y%m%d)"
mkdir -p "$DIR"

# Requirement 1 - Network segmentation
kubectl get networkpolicies -n cardholder-data-env -o yaml > "$DIR/req1-network-policies.yaml"

# Requirement 2 - System hardening
talosctl get machineconfig -o yaml > "$DIR/req2-system-config.yaml"

# Requirement 7 - Access control
kubectl get roles,rolebindings -n cardholder-data-env -o yaml > "$DIR/req7-rbac.yaml"

# Requirement 10 - Audit logs
kubectl logs -n logging -l app=audit-collector --tail=1000 > "$DIR/req10-audit-sample.log"

# Requirement 11 - Security testing
kubectl get vulnerabilityreports -n cardholder-data-env -o yaml > "$DIR/req11-vuln-reports.yaml"

# Cluster overview
kubectl get nodes -o wide > "$DIR/cluster-nodes.txt"
kubectl get pods -n cardholder-data-env -o wide > "$DIR/cde-pods.txt"

echo "Evidence collected in $DIR"
```

## Summary

PCI DSS compliance on Talos Linux benefits from the OS's inherent security properties - immutability, minimal attack surface, API-only management, and no default credentials. These satisfy several requirements with zero additional configuration. Your focus should be on the Kubernetes layer: network segmentation through network policies, RBAC for access control, audit logging with proper retention, vulnerability scanning, and encryption of cardholder data at rest and in transit. The key to passing a PCI assessment is not just having the controls in place but being able to demonstrate they are working continuously. Automate your compliance scans, keep your evidence organized, and run your CDE workloads on dedicated, hardened nodes. Talos Linux gives you a solid foundation - build on it with disciplined Kubernetes security practices.
