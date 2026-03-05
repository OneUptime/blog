# How to Restrict Kustomize Remote Bases in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Kustomize, Remote Bases

Description: Learn how to restrict the use of Kustomize remote bases in Flux CD to prevent untrusted external resources from being applied to your cluster.

---

Kustomize supports remote bases, which allow a kustomization.yaml to reference resources from external Git repositories or URLs. While convenient, remote bases introduce supply chain risks because a third-party repository change could inject malicious manifests into your cluster. Flux CD provides mechanisms to restrict or disable remote bases entirely.

## The Risk of Remote Bases

A Kustomize overlay can reference a remote base like this:

```yaml
# kustomization.yaml with a remote base - potential security risk
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # This fetches manifests from an external Git repository
  - https://github.com/external-org/k8s-manifests//base?ref=main
  # Local resources are safer
  - deployment.yaml
  - service.yaml
```

If the external repository is compromised or the maintainer pushes malicious changes, those changes flow directly into your cluster.

## Step 1: Disable Remote Bases in Kustomize Controller

The kustomize-controller supports the `--no-remote-bases` flag, which prevents the use of remote bases in all Kustomizations:

```yaml
# kustomization.yaml (Flux bootstrap overlay)
# Disable remote bases in the kustomize-controller
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --no-remote-bases=true
```

Apply the patch:

```bash
# Apply the patched configuration
kubectl apply -k /path/to/flux-system/

# Verify the flag is set
kubectl get deployment kustomize-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].args}' | tr ',' '\n'

# Restart the controller to pick up changes
kubectl rollout restart deployment kustomize-controller -n flux-system
```

## Step 2: Verify Remote Bases Are Blocked

Test that a Kustomization using remote bases is rejected:

```bash
# Create a test kustomization.yaml with a remote base
mkdir -p /tmp/test-remote-base
cat > /tmp/test-remote-base/kustomization.yaml << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - https://github.com/fluxcd/flux2/manifests/install/?ref=main
EOF

# Push this to your Git repository and create a Flux Kustomization
# The kustomize-controller should reject it with an error about remote bases
```

## Step 3: Use Local Vendoring Instead

Instead of remote bases, vendor (copy) external manifests into your repository:

```bash
# Clone the external repository
git clone https://github.com/external-org/k8s-manifests.git /tmp/external

# Copy the specific base you need into your repository
cp -r /tmp/external/base/ ./vendors/external-org/base/

# Reference the vendored copy in your kustomization.yaml
cat > kustomization.yaml << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../vendors/external-org/base/
  - deployment.yaml
EOF
```

## Step 4: Use Flux GitRepository for External Sources

A safer alternative to remote bases is to use Flux GitRepository resources that pin to specific commits:

```yaml
# external-source.yaml
# Pin to a specific commit for reproducibility and security
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: external-manifests
  namespace: flux-system
spec:
  interval: 1h
  url: https://github.com/external-org/k8s-manifests.git
  ref:
    # Pin to a specific commit SHA for immutability
    commit: abc123def456789
  verify:
    # Optionally verify the commit signature
    mode: HEAD
    provider: github
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: external-resources
  namespace: flux-system
spec:
  interval: 1h
  sourceRef:
    kind: GitRepository
    name: external-manifests
  path: ./base
  prune: true
  serviceAccountName: restricted-deployer
```

## Step 5: Use OPA Gatekeeper to Enforce Restrictions

Add a policy layer that blocks remote base references in any Kustomize configuration committed to your repository:

```yaml
# gatekeeper-no-remote-bases.yaml
# OPA Gatekeeper constraint template to detect remote bases in manifests
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8snoremotebases
spec:
  crd:
    spec:
      names:
        kind: K8sNoRemoteBases
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8snoremotebases
        violation[{"msg": msg}] {
          input.review.object.kind == "Kustomization"
          input.review.object.apiVersion == "kustomize.toolkit.fluxcd.io/v1"
          # Check if the path references an external URL
          path := input.review.object.spec.path
          contains(path, "://")
          msg := sprintf("Remote bases are not allowed in Kustomization %v", [input.review.object.metadata.name])
        }
```

## Best Practices

1. **Disable remote bases by default**: Use `--no-remote-bases=true` on all production clusters.
2. **Vendor external dependencies**: Copy external manifests into your repository and review changes through pull requests.
3. **Pin to commit SHAs**: If using Flux GitRepository for external sources, always pin to a specific commit.
4. **Review vendored updates**: When updating vendored manifests, diff the changes carefully before committing.
5. **Use image verification**: If external manifests reference container images, verify their signatures.
6. **Automate vendor updates**: Use Dependabot or Renovate to create pull requests when upstream bases change.

Restricting Kustomize remote bases is a fundamental supply chain security measure. By ensuring all manifests are either authored in your repository or fetched through verified, pinned Flux sources, you maintain full control over what gets deployed to your cluster.
