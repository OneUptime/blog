# How to Configure Namespace Isolation with Network Policies and Pod Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Networking

Description: Learn how to implement comprehensive namespace isolation using network policies, pod security standards, and RBAC to create secure multi-tenant Kubernetes environments with defense in depth.

---

Namespace isolation is fundamental to running secure multi-tenant Kubernetes clusters. By combining network policies, pod security standards, RBAC, and resource controls, you can create strong security boundaries that prevent tenants from interfering with each other while maintaining operational flexibility.

This guide covers implementing defense-in-depth namespace isolation.

## Isolation Layers

Complete namespace isolation requires multiple security layers:

- Network isolation (NetworkPolicies)
- Compute isolation (Pod Security Standards)
- API access isolation (RBAC)
- Resource isolation (ResourceQuotas and LimitRanges)
- Data isolation (separate secrets and ConfigMaps)

Each layer provides defense against different attack vectors.

## Implementing Network Isolation

Create default-deny network policies:

```yaml
# Deny all ingress traffic by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: tenant-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
# Deny all egress traffic by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-egress
  namespace: tenant-a
spec:
  podSelector: {}
  policyTypes:
  - Egress
---
# Allow intra-namespace communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: tenant-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector: {}
  egress:
  - to:
    - podSelector: {}
---
# Allow DNS resolution
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: tenant-a
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
---
# Allow external HTTPS traffic for specific pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-https
  namespace: tenant-a
spec:
  podSelector:
    matchLabels:
      internet-access: "true"
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector: {}
      podSelector: {}
    ports:
    - protocol: TCP
      port: 443
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - 169.254.169.254/32  # Block metadata service
    ports:
    - protocol: TCP
      port: 443
---
# Allow ingress from ingress controller
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
  namespace: tenant-a
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: web
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
```

## Implementing Pod Security Standards

Apply pod security admission:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-a
  labels:
    # Enforce restricted pod security standard
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest

    # Audit and warn for restricted standard
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

Create a Pod Security Policy (for clusters still using PSP):

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted-namespace-psp
spec:
  # Prevent privileged containers
  privileged: false
  allowPrivilegeEscalation: false

  # Require dropping all capabilities
  requiredDropCapabilities:
  - ALL

  # Allowed volume types
  volumes:
  - configMap
  - emptyDir
  - projected
  - secret
  - downwardAPI
  - persistentVolumeClaim

  # Host restrictions
  hostNetwork: false
  hostIPC: false
  hostPID: false
  hostPorts:
  - min: 0
    max: 0

  # User and group restrictions
  runAsUser:
    rule: MustRunAsNonRoot
  runAsGroup:
    rule: MustRunAs
    ranges:
    - min: 1
      max: 65535
  fsGroup:
    rule: MustRunAs
    ranges:
    - min: 1
      max: 65535

  # SELinux
  seLinux:
    rule: RunAsAny

  # Read-only root filesystem
  readOnlyRootFilesystem: false

  # Seccomp
  seccompProfile:
    type: RuntimeDefault

  # AppArmor
  annotations:
    apparmor.security.beta.kubernetes.io/allowedProfileNames: 'runtime/default'
    apparmor.security.beta.kubernetes.io/defaultProfileName: 'runtime/default'
```

## Implementing RBAC Isolation

Create namespace-scoped roles:

```yaml
# Namespace admin role (full access within namespace)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-admin
  namespace: tenant-a
rules:
- apiGroups: ["", "apps", "batch", "extensions", "networking.k8s.io"]
  resources: ["*"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-a-admins
  namespace: tenant-a
subjects:
- kind: Group
  name: tenant-a-admins
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: namespace-admin
  apiGroup: rbac.authorization.k8s.io
---
# Developer role (read-only with exec)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-developer
  namespace: tenant-a
rules:
- apiGroups: ["", "apps", "batch"]
  resources: ["pods", "deployments", "services", "configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-a-developers
  namespace: tenant-a
subjects:
- kind: Group
  name: tenant-a-developers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: namespace-developer
  apiGroup: rbac.authorization.k8s.io
---
# Viewer role (read-only, no exec)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-viewer
  namespace: tenant-a
rules:
- apiGroups: ["", "apps", "batch", "extensions"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-a-viewers
  namespace: tenant-a
subjects:
- kind: Group
  name: tenant-a-viewers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: namespace-viewer
  apiGroup: rbac.authorization.k8s.io
```

## Implementing Service Account Isolation

Create dedicated service accounts:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-backend
  namespace: tenant-a
automountServiceAccountToken: false
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-backend-role
  namespace: tenant-a
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["app-config"]
  verbs: ["get"]
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["app-secrets"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-backend-binding
  namespace: tenant-a
subjects:
- kind: ServiceAccount
  name: app-backend
  namespace: tenant-a
roleRef:
  kind: Role
  name: app-backend-role
  apiGroup: rbac.authorization.k8s.io
```

## Deploying Secure Workloads

Deploy applications with security hardening:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: tenant-a
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      serviceAccountName: app-backend
      automountServiceAccountToken: true

      # Security context for pod
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 3000
        fsGroup: 2000
        seccompProfile:
          type: RuntimeDefault

      containers:
      - name: app
        image: myapp:v1.0.0
        ports:
        - containerPort: 8080

        # Security context for container
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL

        # Resource limits
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

        # Read-only root filesystem requires writable volumes
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache

      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

## Monitoring Isolation Violations

Create alerts for policy violations:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: isolation-violation-alerts
  namespace: monitoring
spec:
  groups:
  - name: isolation.rules
    interval: 1m
    rules:
    - alert: PodSecurityViolation
      expr: |
        pod_security_policy_error{namespace=~"tenant-.*"} > 0
      labels:
        severity: critical
      annotations:
        summary: "Pod security policy violation"
        description: "Pod in {{ $labels.namespace }} violates security policy"

    - alert: NetworkPolicyViolation
      expr: |
        rate(network_policy_drop_count{namespace=~"tenant-.*"}[5m]) > 10
      labels:
        severity: warning
      annotations:
        summary: "High rate of network policy drops"
        description: "{{ $labels.namespace }} has {{ $value }} drops/sec"

    - alert: UnauthorizedAPIAccess
      expr: |
        rate(apiserver_audit_event_total{verb=~"create|update|delete",response_code=~"403"}[5m]) > 5
      labels:
        severity: warning
      annotations:
        summary: "Unauthorized API access attempts"
        description: "{{ $labels.user }} attempted unauthorized access"
```

## Testing Isolation

Create test scenarios:

```bash
#!/bin/bash
# test-namespace-isolation.sh

echo "Testing network isolation..."
# Try to access pod in different namespace
kubectl run test-pod -n tenant-a --image=busybox --rm -it -- \
  wget -O- http://service.tenant-b.svc.cluster.local
# Should fail due to network policy

echo "Testing API isolation..."
# Try to list pods in different namespace
kubectl auth can-i list pods -n tenant-b --as=system:serviceaccount:tenant-a:default
# Should return 'no'

echo "Testing privileged container..."
# Try to create privileged pod
kubectl run privileged-test -n tenant-a --image=busybox \
  --overrides='{"spec":{"containers":[{"name":"test","image":"busybox","securityContext":{"privileged":true}}]}}'
# Should fail due to pod security standard

echo "All isolation tests complete"
```

## Best Practices

Follow these guidelines:

1. Implement default-deny network policies
2. Enforce restricted pod security standard
3. Use RBAC with least privilege
4. Disable service account token automounting when not needed
5. Run containers as non-root users
6. Use read-only root filesystems
7. Drop all capabilities
8. Monitor for policy violations
9. Regular security audits
10. Test isolation regularly

## Conclusion

Comprehensive namespace isolation requires multiple security layers working together. By combining network policies, pod security standards, RBAC, and resource controls, you create defense-in-depth protection that prevents tenants from interfering with each other and limits the blast radius of security incidents.

Key components include default-deny network policies with explicit allow rules, restricted pod security standards enforcement, namespace-scoped RBAC with least privilege, service account isolation, secure workload configuration, and continuous monitoring for violations. With proper isolation, Kubernetes clusters can safely host multiple tenants while maintaining strong security boundaries.
