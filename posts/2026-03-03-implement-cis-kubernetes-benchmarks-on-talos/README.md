# How to Implement CIS Kubernetes Benchmarks on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, CIS Benchmark, Security, Compliance, Hardening

Description: A practical guide to implementing CIS Kubernetes Benchmarks on Talos Linux clusters for improved security posture and compliance readiness.

---

Running Kubernetes in production means you need to think about security from the ground up. The Center for Internet Security (CIS) publishes a comprehensive set of benchmarks specifically for Kubernetes that cover everything from API server configuration to network policies. Talos Linux, with its immutable and minimal design, already addresses many of these benchmarks out of the box, but there is still work to do on the Kubernetes configuration side.

In this guide, we will walk through implementing CIS Kubernetes Benchmarks on a Talos Linux cluster, covering both the areas where Talos already excels and the areas where you need to add configuration.

## What Are CIS Kubernetes Benchmarks?

The CIS Kubernetes Benchmark is a set of recommendations for configuring Kubernetes to support a strong security posture. It covers several categories:

- Control plane components (API server, controller manager, scheduler)
- Worker node configuration (kubelet, proxy)
- Policies (RBAC, network policies, pod security)
- Secrets management
- General cluster hardening

Each recommendation is scored as either "Automated" (can be verified programmatically) or "Manual" (requires human review). Talos Linux handles many of the node-level controls automatically because the operating system is immutable and does not allow SSH access or arbitrary package installation.

## Why Talos Linux Has a Head Start

Talos Linux is built with security as a first-class concern. Here is what you get for free:

- No SSH access, reducing attack surface dramatically
- Immutable root filesystem, preventing unauthorized modifications
- Minimal OS with no package manager, shell, or unnecessary services
- API-driven configuration through `talosctl`
- Automatic mutual TLS between nodes

These properties mean that many CIS benchmark items related to host-level security are already satisfied without any additional work.

## Running kube-bench on Talos Linux

The standard tool for checking CIS compliance is kube-bench. You can run it as a Kubernetes Job on your Talos cluster.

```yaml
# kube-bench-job.yaml
# Runs CIS benchmark checks against your cluster
apiVersion: batch/v1
kind: Job
metadata:
  name: kube-bench
  namespace: default
spec:
  template:
    spec:
      hostPID: true
      containers:
      - name: kube-bench
        image: aquasec/kube-bench:latest
        command: ["kube-bench", "run", "--targets", "node,policies"]
        volumeMounts:
        - name: var-lib-kubelet
          mountPath: /var/lib/kubelet
          readOnly: true
        - name: etc-kubernetes
          mountPath: /etc/kubernetes
          readOnly: true
      restartPolicy: Never
      volumes:
      - name: var-lib-kubelet
        hostPath:
          path: /var/lib/kubelet
      - name: etc-kubernetes
        hostPath:
          path: /etc/kubernetes
  backoffLimit: 0
```

Apply and check the results:

```bash
# Deploy the kube-bench job
kubectl apply -f kube-bench-job.yaml

# Wait for completion and read the logs
kubectl wait --for=condition=complete job/kube-bench --timeout=120s
kubectl logs job/kube-bench
```

Note that some checks will report differently on Talos because configuration files are in non-standard locations compared to traditional distributions. You may need to customize the kube-bench configuration for accurate results.

## Configuring API Server Flags in Talos

Many CIS recommendations involve setting specific API server flags. In Talos, you configure these through the machine configuration file.

```yaml
# talos-patch-apiserver.yaml
# CIS-aligned API server configuration
cluster:
  apiServer:
    extraArgs:
      # CIS 1.2.1 - Ensure anonymous auth is disabled
      anonymous-auth: "false"
      # CIS 1.2.6 - Ensure the AlwaysAdmit admission controller is not set
      enable-admission-plugins: "NodeRestriction,PodSecurity,EventRateLimit"
      # CIS 1.2.10 - Ensure the admission control plugin EventRateLimit is set
      admission-control-config-file: "/etc/kubernetes/admission-control-config.yaml"
      # CIS 1.2.16 - Ensure audit logging is configured
      audit-log-path: "/var/log/kubernetes/audit.log"
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"
      # CIS 1.2.22 - Ensure the audit policy is configured
      audit-policy-file: "/etc/kubernetes/audit-policy.yaml"
      # CIS 1.2.29 - Ensure encryption provider is configured
      encryption-provider-config: "/etc/kubernetes/encryption-config.yaml"
```

Apply this configuration with talosctl:

```bash
# Apply the API server configuration patch
talosctl apply-config --nodes <control-plane-ip> --patch @talos-patch-apiserver.yaml
```

## Setting Up Encryption at Rest

CIS benchmark 1.2.29 requires encryption of secrets at rest. Here is how to configure this in Talos:

```yaml
# encryption-config.yaml
# Encrypts secrets stored in etcd
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              # Generate with: head -c 32 /dev/urandom | base64
              secret: <base64-encoded-32-byte-key>
      - identity: {}
```

In your Talos machine configuration, mount this file into the API server:

```yaml
# Mount encryption config into the control plane
cluster:
  apiServer:
    extraVolumes:
      - hostPath: /var/etc/kubernetes/encryption-config.yaml
        mountPath: /etc/kubernetes/encryption-config.yaml
        readonly: true
```

## Configuring Kubelet Security Settings

The kubelet configuration also needs attention for CIS compliance:

```yaml
# talos-patch-kubelet.yaml
# CIS-aligned kubelet configuration
machine:
  kubelet:
    extraArgs:
      # CIS 4.2.1 - Ensure anonymous auth is disabled
      anonymous-auth: "false"
      # CIS 4.2.4 - Ensure read-only port is disabled
      read-only-port: "0"
      # CIS 4.2.6 - Ensure protect-kernel-defaults is enabled
      protect-kernel-defaults: "true"
      # CIS 4.2.11 - Ensure rotation of certificates
      rotate-certificates: "true"
      # CIS 4.2.12 - Ensure RotateKubeletServerCertificate is enabled
      feature-gates: "RotateKubeletServerCertificate=true"
```

## Implementing Network Policies

CIS section 5.3 requires network policies to be in place. Here is a default deny policy that satisfies the baseline requirement:

```yaml
# default-deny-all.yaml
# Blocks all ingress and egress traffic by default
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

Then selectively allow traffic for your workloads:

```yaml
# allow-app-traffic.yaml
# Permits specific traffic patterns for the application
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-app-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-frontend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
```

## Enforcing Pod Security Standards

CIS section 5.2 covers pod security. With Kubernetes Pod Security Standards, you can enforce these at the namespace level:

```bash
# Label namespaces with pod security enforcement
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

## RBAC Configuration

CIS section 5.1 covers role-based access control. Make sure you follow least-privilege principles:

```yaml
# read-only-role.yaml
# Grants read-only access to specific resources
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: pod-reader
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
```

## Automating Compliance Checks

Set up a CronJob to run kube-bench periodically and alert on failures:

```yaml
# kube-bench-cronjob.yaml
# Runs CIS compliance checks on a daily schedule
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kube-bench-scheduled
  namespace: security
spec:
  schedule: "0 6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          hostPID: true
          containers:
          - name: kube-bench
            image: aquasec/kube-bench:latest
            command:
              - /bin/sh
              - -c
              - |
                kube-bench run --json | tee /tmp/results.json
                # Send results to your monitoring system
          restartPolicy: OnFailure
```

## Summary

Talos Linux gives you a significant advantage when working toward CIS Kubernetes Benchmark compliance. Its immutable design, lack of SSH, and API-driven configuration eliminate entire categories of security concerns. The remaining work focuses on Kubernetes-level configuration - API server flags, kubelet settings, RBAC, network policies, and encryption at rest. By combining Talos Linux defaults with the configuration examples in this guide, you can achieve a strong compliance posture without the overhead of managing a traditional Linux distribution underneath your cluster.
