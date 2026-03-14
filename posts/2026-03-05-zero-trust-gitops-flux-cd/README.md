# How to Implement Zero-Trust GitOps with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Zero Trust, Supply Chain, Defense in Depth

Description: Learn how to implement a zero-trust security model for your GitOps pipeline with Flux CD, where no component is trusted by default.

---

Zero-trust security operates on the principle of "never trust, always verify." In the context of GitOps with Flux CD, this means verifying every artifact, limiting every permission, encrypting every connection, and auditing every action. This guide shows you how to implement a zero-trust GitOps architecture with Flux CD.

## Zero-Trust Principles for GitOps

1. **Verify every artifact**: Validate image signatures, SBOM, and SLSA provenance.
2. **Least privilege**: Grant only the minimum permissions needed.
3. **Encrypt everything**: Use TLS for all network communication and encrypt secrets at rest.
4. **Assume breach**: Design for containment, not just prevention.
5. **Continuous verification**: Do not trust once; verify continuously.

## Step 1: Verify Git Source Integrity

Configure Flux to verify Git commit signatures:

```yaml
# verified-git-source.yaml
# GitRepository with commit signature verification
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/fleet-repo.git
  ref:
    branch: main
  verify:
    # Verify GPG or Sigstore commit signatures
    mode: HEAD
    provider: github
    secretRef:
      name: git-signing-public-keys
```

Create the signing keys secret:

```bash
# Import GPG public keys of authorized committers
gpg --export --armor trusted-developer@myorg.com > trusted-key.asc

# Create a secret with the public keys
kubectl create secret generic git-signing-public-keys \
  --from-file=author1.asc=trusted-key.asc \
  -n flux-system
```

## Step 2: Verify Container Image Signatures

Deploy a Kyverno policy that verifies Cosign signatures on all container images:

```yaml
# verify-all-images.yaml
# Kyverno policy to verify Cosign signatures on all container images
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: Enforce
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-cosign-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - "!kube-system"
      verifyImages:
        # Verify internal application images
        - imageReferences:
            - "ghcr.io/myorg/*"
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/myorg/*"
                    issuer: "https://token.actions.githubusercontent.com"
        # Verify Flux controller images
        - imageReferences:
            - "ghcr.io/fluxcd/*"
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/fluxcd/*"
                    issuer: "https://token.actions.githubusercontent.com"
```

## Step 3: Implement Least-Privilege RBAC

Use service account impersonation with minimal permissions for every Kustomization:

```yaml
# zero-trust-rbac.yaml
# Per-application service accounts with minimal permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: webapp-sa
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: webapp-deployer
  namespace: production
rules:
  # Only the exact resources this application needs
  - apiGroups: ["apps"]
    resources: ["deployments"]
    resourceNames: ["webapp"]  # Restrict to specific resource names
    verbs: ["get", "update", "patch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["create"]  # create does not support resourceNames
  - apiGroups: [""]
    resources: ["services"]
    resourceNames: ["webapp-svc"]
    verbs: ["get", "update", "patch"]
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["webapp-config"]
    verbs: ["get", "update", "patch"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: webapp-deployer
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: webapp-deployer
subjects:
  - kind: ServiceAccount
    name: webapp-sa
    namespace: production
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: webapp
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./apps/webapp
  prune: true
  targetNamespace: production
  serviceAccountName: webapp-sa
```

## Step 4: Encrypt All Secrets

Use SOPS with age encryption for all secrets in Git:

```yaml
# sops-encrypted-secret.yaml (before encryption)
# This file should be encrypted with SOPS before committing
apiVersion: v1
kind: Secret
metadata:
  name: webapp-db-credentials
  namespace: production
type: Opaque
stringData:
  username: ENC[AES256_GCM,data:...,type:str]
  password: ENC[AES256_GCM,data:...,type:str]
```

Configure Flux to decrypt SOPS secrets:

```yaml
# kustomization-with-sops.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: webapp-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  path: ./secrets/production
  prune: true
  decryption:
    provider: sops
    secretRef:
      name: sops-age-key
```

## Step 5: Lock Down Network Access

Apply strict network policies based on zero-trust principles:

```yaml
# zero-trust-network.yaml
# Default deny everything
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
---
# Allowlist: DNS only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-only
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes: ["Egress"]
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
        - podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
---
# Source controller: only specific Git hosts
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: source-controller-egress
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes: ["Egress"]
  egress:
    - ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 22
```

## Step 6: Continuous Audit and Monitoring

Implement continuous verification through monitoring:

```yaml
# zero-trust-monitoring.yaml
# Alert on any reconciliation failure or security event
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: security-alerts
  namespace: flux-system
spec:
  type: slack
  channel: security-events
  secretRef:
    name: security-slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: zero-trust-alerts
  namespace: flux-system
spec:
  providerRef:
    name: security-alerts
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: "*"
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
  inclusionList:
    - ".*error.*"
    - ".*failed.*"
    - ".*denied.*"
    - ".*forbidden.*"
    - ".*signature.*"
```

## Step 7: Enforce Pod Security Standards

Apply the strictest security profile to all namespaces:

```bash
# Apply Restricted PSS to all application namespaces
for NS in production staging flux-system; do
  kubectl label namespace "$NS" \
    pod-security.kubernetes.io/enforce=restricted \
    pod-security.kubernetes.io/enforce-version=v1.28 \
    --overwrite
done
```

## Zero-Trust Verification Script

Run this script to verify your zero-trust posture:

```bash
#!/bin/bash
# verify-zero-trust.sh
echo "=== Zero-Trust GitOps Verification ==="

echo "1. Git commit verification:"
kubectl get gitrepositories -A -o json | jq -r '.items[] | "\(.metadata.name): verify=\(.spec.verify // "NONE")"'

echo "2. Service account impersonation:"
kubectl get kustomizations -A -o json | jq -r '.items[] | "\(.metadata.name): sa=\(.spec.serviceAccountName // "NONE - USING CONTROLLER SA")"'

echo "3. Cross-namespace refs disabled:"
kubectl get deployment kustomize-controller -n flux-system -o yaml | grep -c "no-cross-namespace-refs" | xargs -I{} echo "Flags found: {}"

echo "4. Network policies:"
kubectl get networkpolicies -n flux-system --no-headers | wc -l | xargs -I{} echo "Policies: {}"

echo "5. PSS enforcement:"
kubectl get namespace flux-system -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/enforce}'
echo ""

echo "6. SOPS decryption configured:"
kubectl get kustomizations -A -o json | jq -r '.items[] | select(.spec.decryption != null) | "\(.metadata.name): \(.spec.decryption.provider)"'
```

## Best Practices

1. **Verify everything**: Never deploy unverified artifacts. Verify Git commits, image signatures, and SLSA provenance.
2. **Trust nothing by default**: Start with no permissions and add only what is strictly necessary.
3. **Encrypt all channels**: Use TLS for network communication and SOPS/Sealed Secrets for data at rest.
4. **Audit continuously**: Log and alert on every action. Assume breach and monitor for anomalies.
5. **Automate verification**: Integrate all verification steps into CI/CD pipelines so they run without human intervention.

Zero-trust GitOps with Flux CD requires effort to implement, but it provides the strongest security posture for your Kubernetes deployments. Every layer of verification reduces the risk of unauthorized changes reaching your production clusters.
