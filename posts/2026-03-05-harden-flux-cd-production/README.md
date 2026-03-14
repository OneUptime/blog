# How to Harden Flux CD for Production Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Hardening, Production, Best Practices

Description: A comprehensive guide to hardening Flux CD for production environments covering RBAC, network policies, pod security, supply chain verification, and more.

---

Deploying Flux CD in production requires careful hardening to ensure your GitOps infrastructure is secure, reliable, and resilient. This guide provides a comprehensive checklist and step-by-step instructions for hardening every aspect of a Flux CD installation.

## Hardening Checklist

Before deploying Flux to production, address each of these areas:

1. RBAC and service account impersonation
2. Network policies
3. Pod security standards
4. Resource limits
5. Supply chain verification
6. Secret management
7. Cross-namespace restrictions
8. Audit logging
9. High availability
10. Monitoring and alerting

## Step 1: Apply Least-Privilege RBAC

Replace default broad RBAC with minimal permissions and use service account impersonation:

```yaml
# hardened-rbac.yaml
# Minimal ClusterRole for kustomize-controller with impersonation only
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-kustomize-hardened
rules:
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["impersonate"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations", "kustomizations/status", "kustomizations/finalizers"]
    verbs: ["get", "list", "watch", "update", "patch"]
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["gitrepositories", "ocirepositories", "buckets"]
    verbs: ["get", "list", "watch"]
```

## Step 2: Enable Cross-Namespace Restrictions

Prevent resources from referencing objects across namespaces:

```yaml
# hardened-kustomization.yaml
# Bootstrap overlay with all hardening flags enabled
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Enable cross-namespace restrictions on all controllers
  - target:
      kind: Deployment
      name: "(kustomize-controller|helm-controller|notification-controller|image-reflector-controller|image-automation-controller)"
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --no-cross-namespace-refs=true
  # Disable remote bases
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --no-remote-bases=true
```

## Step 3: Apply Network Policies

Lock down network access for all Flux controllers:

```yaml
# hardened-network-policies.yaml
# Default deny all traffic in flux-system
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
---
# Allow DNS resolution
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes: ["Egress"]
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
# Allow API server and HTTPS egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes: ["Egress"]
  egress:
    - ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 6443
        - protocol: TCP
          port: 22
---
# Allow source-controller ingress from other Flux controllers
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-ingress
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: flux-system
      ports:
        - protocol: TCP
          port: 9090
        - protocol: TCP
          port: 8080
```

## Step 4: Set Resource Limits

Prevent resource exhaustion by setting limits on all controllers:

```yaml
# hardened-resource-limits.yaml
# Resource limits patch for all Flux controllers
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: "1"
            memory: 1Gi
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: "1"
            memory: 1Gi
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: "1"
            memory: 1Gi
```

## Step 5: Enforce Pod Security Standards

Apply the Restricted security profile to the Flux namespace:

```bash
# Label the flux-system namespace with Restricted PSS
kubectl label namespace flux-system \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=v1.28 \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted \
  --overwrite
```

## Step 6: Verify Supply Chain Integrity

Verify Flux controller images before deployment:

```bash
#!/bin/bash
# verify-flux-supply-chain.sh
# Verify image signatures and SLSA provenance for all Flux controllers

ISSUER="https://token.actions.githubusercontent.com"

IMAGES=$(kubectl get deployments -n flux-system \
  -o jsonpath='{range .items[*]}{.spec.template.spec.containers[*].image}{"\n"}{end}')

for IMAGE in $IMAGES; do
  CONTROLLER=$(echo "$IMAGE" | sed 's|.*/\(.*\):.*|\1|')
  echo "Verifying: $IMAGE"

  # Verify image signature
  cosign verify "$IMAGE" \
    --certificate-identity-regexp="^https://github.com/fluxcd/${CONTROLLER}/.*" \
    --certificate-oidc-issuer="$ISSUER" > /dev/null 2>&1 && echo "  Signature: OK" || echo "  Signature: FAILED"

  # Verify SLSA provenance
  cosign verify-attestation "$IMAGE" \
    --type slsaprovenance \
    --certificate-identity-regexp="^https://github.com/slsa-framework/slsa-github-generator/.*" \
    --certificate-oidc-issuer="$ISSUER" > /dev/null 2>&1 && echo "  SLSA: OK" || echo "  SLSA: FAILED"
done
```

## Step 7: Configure Monitoring and Alerting

Set up comprehensive monitoring for your Flux installation:

```yaml
# flux-alerts.yaml
# Alert configuration for production Flux monitoring
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: production-alerts
  namespace: flux-system
spec:
  type: slack
  channel: production-gitops
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: all-flux-events
  namespace: flux-system
spec:
  providerRef:
    name: production-alerts
  eventSeverity: error
  eventSources:
    - kind: GitRepository
      name: "*"
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: HelmRepository
      name: "*"
```

## Production Hardening Verification

Run a final verification to ensure all hardening measures are in place:

```bash
#!/bin/bash
# verify-hardening.sh
# Verify all production hardening measures

echo "=== RBAC Check ==="
kubectl auth can-i create clusterroles \
  --as=system:serviceaccount:flux-system:kustomize-controller && echo "FAIL: Too broad" || echo "PASS: Limited"

echo "=== Network Policies ==="
kubectl get networkpolicies -n flux-system --no-headers | wc -l | xargs -I{} echo "{} network policies found"

echo "=== Pod Security Standards ==="
kubectl get namespace flux-system -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/enforce}'
echo ""

echo "=== Resource Limits ==="
kubectl get deployments -n flux-system -o json | jq -r '.items[] | "\(.metadata.name): \(.spec.template.spec.containers[0].resources.limits // "NO LIMITS")"'

echo "=== Cross-Namespace Refs ==="
kubectl get deployment kustomize-controller -n flux-system -o yaml | grep -c "no-cross-namespace" | xargs -I{} echo "{} cross-namespace flags found"

echo "=== Controller Status ==="
kubectl get deployments -n flux-system
```

## Best Practices Summary

1. **Use service account impersonation** for every Kustomization and HelmRelease.
2. **Enable `--no-cross-namespace-refs`** on all controllers.
3. **Apply network policies** with default-deny and specific allow rules.
4. **Set resource limits** to prevent denial-of-service through resource exhaustion.
5. **Enforce Restricted Pod Security Standards** on the flux-system namespace.
6. **Verify image signatures** and SLSA provenance before deploying Flux.
7. **Encrypt secrets at rest** and use SOPS for secrets in Git.
8. **Enable audit logging** for all Flux controller operations.
9. **Set up monitoring and alerting** for reconciliation failures.
10. **Rotate credentials regularly** including deploy keys, tokens, and webhook secrets.

A hardened Flux CD installation combines multiple security layers to create a defense-in-depth approach. No single measure is sufficient on its own; together they provide comprehensive protection for your GitOps infrastructure.
