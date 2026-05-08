# How to Secure Calico Alternate Registry Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Security, Container Registry, Kubernetes, Networking, DevOps

Description: Learn how to securely configure Calico to pull images from alternate private registries with proper authentication and access controls.

---

## Introduction

Calico components run as containers within your Kubernetes cluster, and by default operator-based installations pull images from public registries like `quay.io/calico` and `quay.io/tigera`. In enterprise and air-gapped environments, you often need to redirect image pulls to an internal or alternate registry. This is common for compliance, security scanning, and network isolation requirements.

However, simply pointing Calico at a different registry is not enough. You must also secure the registry credentials, use immutable image references, and ensure that the configuration itself is protected from unauthorized changes. A misconfigured registry setup can expose credentials or allow tampered images to enter your cluster.

This guide covers best practices for securing your Calico alternate registry configuration, including credential management, image digest pinning, and RBAC controls around the configuration resources.

## Prerequisites

- Kubernetes cluster with Calico installed
- `kubectl` with cluster-admin access
- Access to a private container registry
- Familiarity with Kubernetes Secrets and RBAC

## Configuring the Alternate Registry

### Setting the Registry in the Calico Installation Resource

For operator-based Calico installations, configure the alternate registry in the Installation custom resource:

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  registry: registry.internal.example.com
  imagePath: calico
```

Apply the configuration:

```bash
kubectl apply -f installation.yaml
```

Verify the registry setting:

```bash
kubectl get installation default -o jsonpath='{.spec.registry}'
```

### Creating Image Pull Secrets

Create a Kubernetes secret for registry authentication:

```bash
kubectl create secret docker-registry calico-registry-secret \
  --docker-server=registry.internal.example.com \
  --docker-username=calico-pull \
  --docker-password="${REGISTRY_PASSWORD}" \
  --docker-email=ops@example.com \
  -n tigera-operator
```

Reference the secret in the Installation resource:

```yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  registry: registry.internal.example.com
  imagePath: calico
  imagePullSecrets:
    - name: calico-registry-secret
```

## Securing Credentials with Sealed Secrets

Avoid storing plain-text credentials in version control. Use Sealed Secrets or an external secrets manager:

```bash
# Install kubeseal CLI, then seal the secret

kubeseal --format yaml < calico-registry-secret.yaml > calico-registry-sealed.yaml
```

Apply the sealed secret:

```bash
kubectl apply -f calico-registry-sealed.yaml
```

## Enforcing Image Digest Pinning

Use image digests instead of tags to prevent tag mutation attacks. For operator-based installations, specify image digests with an `ImageSet` resource instead of adding digests directly to the Installation resource:

```yaml
apiVersion: operator.tigera.io/v1
kind: ImageSet
metadata:
  name: calico-v3.32.0
spec:
  images:
    - image: calico/node
      digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

The ImageSet name must match the Calico release deployed by the operator, and all images deployed by the operator must be included.

Verify running images use digests:

```bash
kubectl get pods -n calico-system -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}'
```

## RBAC Controls for Configuration

Restrict who can modify the Installation resource and registry secrets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-installation-viewer
rules:
  - apiGroups: ["operator.tigera.io"]
    resources: ["installations"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-installation-admin
rules:
  - apiGroups: ["operator.tigera.io"]
    resources: ["installations"]
    verbs: ["get", "list", "watch", "update", "patch"]
```

## Verification

Confirm Calico pods are pulling from the alternate registry:

```bash
# Check image sources for all calico-system pods
kubectl get pods -n calico-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].image}{"\n"}{end}'

# Verify no public registry references remain
kubectl get pods -n calico-system -o yaml | grep -Ec "quay.io|docker.io"

# Check pod events for pull errors
kubectl get events -n calico-system --field-selector reason=Failed
```

## Troubleshooting

- **ImagePullBackOff errors**: Verify the image pull secret exists in the `tigera-operator` namespace and the credentials are valid. Test with `docker login registry.internal.example.com`.
- **Secret not found**: Ensure the secret name in `imagePullSecrets` matches the actual secret name in the `tigera-operator` namespace.
- **Permission denied on Installation resource**: Check your RBAC bindings and ensure your user or service account has the required permissions.
- **Images pulling from wrong registry**: Confirm the Installation resource has been reconciled by the operator. Check `kubectl get tigerastatus` for status.

## Conclusion

Securing your Calico alternate registry configuration requires attention to credential management, image integrity, and access controls. By using sealed secrets for credentials, enforcing image digest pinning, and applying RBAC restrictions to configuration resources, you can maintain a secure supply chain for your Calico deployment. These practices are especially important in regulated environments where auditability and tamper resistance are required.
