# How to Secure Calico ImageSet Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, ImageSet, Security, Supply Chain

Description: Implement security best practices for Calico ImageSet management including image signing, digest pinning, registry access controls, and supply chain integrity verification.

---

## Introduction

Securing Calico ImageSet management is a critical part of your Kubernetes supply chain security posture. Without proper controls, an attacker who gains access to your private registry or CI/CD pipeline could substitute malicious images for legitimate Calico components, giving them deep network-level access to your cluster. The Calico data plane runs with elevated privileges, making it a high-value target.

The core security principles for ImageSet management are: use cryptographic digests (not mutable tags), enforce image signing verification, restrict registry write access, and audit all changes to `ImageSet` resources. Together these controls ensure that only verified, authorized images can be deployed as Calico components.

This guide covers the full security stack for Calico ImageSet management, from registry hardening to Kubernetes RBAC and admission control.

## Prerequisites

- Calico installed via the Tigera Operator with ImageSet configured
- Private container registry with access control (Harbor, Artifactory)
- `cosign` CLI for image signing/verification
- OPA Gatekeeper or Kyverno for admission control

## Security Control 1: Digest Pinning

Always use SHA256 digests in ImageSet, never mutable tags:

```yaml
# INSECURE - uses mutable tag
spec:
  images:
    - image: "calico/node"
      # No digest field - operator falls back to tag

# SECURE - uses immutable digest
spec:
  images:
    - image: "calico/node"
      digest: "sha256:a3b4c5d6e7f8..."
```

```bash
# Generate digests for all images before creating ImageSet
for img in calico/cni calico/node calico/kube-controllers calico/typha; do
  echo -n "  ${img}: "
  crane digest "registry.internal.example.com/calico/${img}:v3.27.0"
done
```

## Security Control 2: Image Signing with Cosign

```bash
# Sign images after mirroring to private registry
REGISTRY="registry.internal.example.com/calico"
CALICO_VERSION="v3.27.0"

for img in cni node kube-controllers typha; do
  cosign sign --key cosign.key \
    "${REGISTRY}/${img}:${CALICO_VERSION}"
done

# Verify signatures before applying ImageSet
for img in cni node kube-controllers typha; do
  cosign verify --key cosign.pub \
    "${REGISTRY}/${img}:${CALICO_VERSION}" && echo "${img}: signature valid"
done
```

## Security Control 3: Registry Access Control

Configure your registry to restrict write access:

```yaml
# Harbor project configuration (applied via API or UI)
# - Set project to "Private"
# - Grant push access only to CI/CD service account
# - Enable content trust (require signed images)
# - Configure vulnerability scanning on push

# imagePullSecret for Calico to pull from private registry
kubectl create secret docker-registry calico-registry-secret \
  --docker-server=registry.internal.example.com \
  --docker-username=calico-pull-user \
  --docker-password="${REGISTRY_PULL_TOKEN}" \
  -n calico-system

# Reference in Installation resource
kubectl patch installation default --type=merge -p '{
  "spec": {
    "imagePullSecrets": [
      {"name": "calico-registry-secret"}
    ]
  }
}'
```

## Security Control 4: RBAC for ImageSet Resources

```yaml
# Restrict who can modify ImageSet resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-imageset-admin
rules:
  - apiGroups: ["operator.tigera.io"]
    resources: ["imagesets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-imageset-viewer
rules:
  - apiGroups: ["operator.tigera.io"]
    resources: ["imagesets"]
    verbs: ["get", "list", "watch"]
```

## Security Control 5: Admission Policy for Digest Enforcement

```yaml
# Kyverno policy to require digest in ImageSet
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-calico-imageset-digest
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-digest-present
      match:
        any:
          - resources:
              kinds: ["ImageSet"]
              apiGroups: ["operator.tigera.io"]
      validate:
        message: "All images in ImageSet must specify a digest"
        foreach:
          - list: "request.object.spec.images"
            deny:
              conditions:
                any:
                  - key: "{{ element.digest }}"
                    operator: Equals
                    value: ""
```

## Security Audit

```bash
# Audit ImageSet resource changes
kubectl get events --field-selector reason=Updated -A | grep imageset

# Review audit logs for ImageSet mutations
# (assuming audit log is enabled)
grep '"resource":"imagesets"' /var/log/kubernetes/audit.log | \
  jq 'select(.verb == "update" or .verb == "create")' | \
  jq '{time: .requestReceivedTimestamp, user: .user.username, verb: .verb}'
```

## Conclusion

Securing Calico ImageSet management requires a defense-in-depth approach: immutable digests prevent tag hijacking, image signing ensures supply chain integrity, registry access controls prevent unauthorized image pushes, Kubernetes RBAC limits who can modify ImageSet resources, and admission policies enforce organizational standards. Together these controls make it significantly harder for an attacker to substitute malicious images for Calico components, protecting the integrity of your cluster's network fabric.
