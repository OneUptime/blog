# How to Restrict Public Repository Usage in Portainer - Repo Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Docker Hub, Registry Policy, Compliance

Description: Learn how to prevent Portainer users from pulling images from public registries and enforce use of approved private registries.

## Why Restrict Public Repositories?

Allowing unrestricted Docker Hub and public registry access introduces risks:

- **Unvetted images**: Public images may contain vulnerabilities or malware.
- **Supply chain attacks**: Typosquatted images (e.g., `nginxx` instead of `nginx`).
- **Compliance**: Some regulations require all images to be from approved sources.
- **Rate limiting**: Anonymous Docker Hub pulls are rate-limited.

## Restricting Public Images in Portainer

### Method 1: Hide Anonymous Docker Hub

1. Go to **Registries**.
2. Under **Hiding anonymous Docker Hub**, click **Hide for all users**.

This hides Docker Hub (anonymous) from the Portainer registry selector, but it does not fully disable Docker Hub access because anonymous Docker Hub access is built into Docker. If no other registries are available to a user, Portainer will still display Docker Hub (anonymous).

For the environment level:
1. Go to **Host > Registries** or **Swarm > Registries** in the environment.
2. Select **Manage access** for each approved registry.
3. Select the users or teams that should have access, then click **Create access**.

### Method 2: Registry Policies

Portainer Business Edition can manage registry access with policies for Edge (Standard) Agent environments running 2.37.0 or later:

1. Go to **Policies > Create policy**.
2. Select **Docker > Registry > Custom** or **Kubernetes > Registry > Custom**.
3. Select the approved registry and the users, teams, or namespaces that should have access.
4. For Kubernetes environments requiring source enforcement, enable **Restrict to allowed sources** and add the approved registry URL prefixes. This requires Kubernetes 1.30 or later.

## Enforcing Registry Allow-Lists

If Portainer doesn't have a native allowlist for your environment, do not rely on Docker daemon configuration for this control. Docker Engine supports `registry-mirrors` and `insecure-registries`, but it does not support a `blocked-registries` key or a daemon-level registry allow-list. Enforce registry restrictions with network egress controls or an admission policy such as OPA Gatekeeper for Kubernetes.

## Using OPA Gatekeeper to Enforce Registry Policy (Kubernetes)

```yaml
# OPA Gatekeeper ConstraintTemplate

apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sallowedrepos
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedRepos
      validation:
        openAPIV3Schema:
          type: object
          properties:
            repos:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedrepos

        violation[{"msg": msg}] {
          image := container_images[_]
          not allowed_image(image)
          msg := sprintf("container image <%v> is not from an allowed repo", [image])
        }

        container_images[image] {
          image := input.review.object.spec.containers[_].image
        }

        container_images[image] {
          image := input.review.object.spec.initContainers[_].image
        }

        container_images[image] {
          image := input.review.object.spec.ephemeralContainers[_].image
        }

        allowed_image(image) {
          repo := input.parameters.repos[_]
          startswith(image, repo)
        }
---
# Apply the constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: allowed-repos
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    repos:
      - "registry.mycompany.com/"  # Only allow your private registry
      - "gcr.io/my-project/"       # And specific GCP project
```

## Auditing Current Image Sources

```bash
# Find all unique image registries in use
docker ps --format '{{.Image}}' | \
  awk -F/ '{ if (NF > 1 && ($1 ~ /[.:]/ || $1 == "localhost")) print $1; else print "docker.io" }' | \
  sort -u

# For Kubernetes
kubectl get pods --all-namespaces \
  -o jsonpath="{.items[*].spec['initContainers','containers','ephemeralContainers'][*].image}" | \
  tr -s '[:space:]' '\n' | \
  awk -F/ 'NF { if (NF > 1 && ($1 ~ /[.:]/ || $1 == "localhost")) print $1; else print "docker.io" }' | \
  sort -u
```

## Conclusion

Restricting public repository usage is a key supply chain security control. Start with Portainer's registry settings and policies to limit registry access, and layer in OPA Gatekeeper or Sigstore policy-controller checks for Kubernetes environments requiring strict compliance.
