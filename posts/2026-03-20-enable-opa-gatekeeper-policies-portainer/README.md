# How to Enable OPA Gatekeeper Policies with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OPA Gatekeeper, Kubernetes, Policy, Security

Description: Learn how to install OPA Gatekeeper and configure admission control policies for Kubernetes workloads managed through Portainer.

## What Is OPA Gatekeeper?

OPA (Open Policy Agent) Gatekeeper is a Kubernetes admission controller that enforces custom policies at the API level. Admission requests that create or update Kubernetes objects (from Portainer or kubectl) must pass policy checks before they are accepted.

## Installing OPA Gatekeeper

```bash
# Install Gatekeeper on your Kubernetes cluster

kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.22.2/deploy/gatekeeper.yaml

# Verify Gatekeeper is running
kubectl get pods -n gatekeeper-system
```

## Policy 1: Require Resource Limits on App and Init Containers

```yaml
# constraint-template-required-resources.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredresources
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredResources
      validation:
        openAPIV3Schema:
          type: object
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredresources

        # Block pods where app containers don't have resource limits
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.cpu
          msg := sprintf("Container <%v> must have CPU limits", [container.name])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.resources.limits.memory
          msg := sprintf("Container <%v> must have memory limits", [container.name])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.initContainers[_]
          not container.resources.limits.cpu
          msg := sprintf("Init container <%v> must have CPU limits", [container.name])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.initContainers[_]
          not container.resources.limits.memory
          msg := sprintf("Init container <%v> must have memory limits", [container.name])
        }
---
# Apply the constraint to all pods
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredResources
metadata:
  name: require-resource-limits
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
```

## Policy 2: Block Privileged Containers

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8spspprivilegedcontainer
spec:
  crd:
    spec:
      names:
        kind: K8sPSPPrivilegedContainer
      validation:
        openAPIV3Schema:
          type: object
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8spspprivilegedcontainer

        violation[{"msg": msg}] {
          c := input.review.object.spec.containers[_]
          c.securityContext.privileged
          msg := sprintf("Privileged containers are not allowed: <%v>", [c.name])
        }

        violation[{"msg": msg}] {
          c := input.review.object.spec.initContainers[_]
          c.securityContext.privileged
          msg := sprintf("Privileged init containers are not allowed: <%v>", [c.name])
        }

        violation[{"msg": msg}] {
          c := input.review.object.spec.ephemeralContainers[_]
          c.securityContext.privileged
          msg := sprintf("Privileged ephemeral containers are not allowed: <%v>", [c.name])
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sPSPPrivilegedContainer
metadata:
  name: block-privileged
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
```

## Policy 3: Enforce Approved Image Registries

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sallowedreposv2
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedReposv2
      validation:
        openAPIV3Schema:
          type: object
          properties:
            allowedImages:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedreposv2

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not image_matches(container.image, input.parameters.allowedImages)
          msg := sprintf("Container <%v> has an invalid image <%v>", [container.name, container.image])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.initContainers[_]
          not image_matches(container.image, input.parameters.allowedImages)
          msg := sprintf("Init container <%v> has an invalid image <%v>", [container.name, container.image])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.ephemeralContainers[_]
          not image_matches(container.image, input.parameters.allowedImages)
          msg := sprintf("Ephemeral container <%v> has an invalid image <%v>", [container.name, container.image])
        }

        image_matches(image, allowed_images) {
          allowed := allowed_images[_]
          not endswith(allowed, "*")
          allowed == image
        }

        image_matches(image, allowed_images) {
          allowed := allowed_images[_]
          endswith(allowed, "*")
          prefix := trim_suffix(allowed, "*")
          startswith(image, prefix)
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedReposv2
metadata:
  name: allowed-image-registries
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    allowedImages:
      - "registry.mycompany.com/*"  # Only allow internal registry
      - "gcr.io/myproject/*"        # Allowed GCP project
```

## Applying Policies via Portainer

Deploy Gatekeeper policies as Kubernetes manifests in Portainer:

1. Go to your Kubernetes environment.
2. Select **kubectl shell** from the menu.
3. Apply the YAML manifests with `kubectl apply -f`.

Or use **Applications** > **Create from code** and choose **Manifest**.

## Testing Policy Enforcement

```bash
# This pod should be DENIED by the resource-limits policy
kubectl run test-pod --image=registry.mycompany.com/nginx --restart=Never

# Check installed templates and the audit status of the constraint
kubectl get constrainttemplates
kubectl get k8srequiredresources require-resource-limits \
  -o jsonpath='{.status.totalViolations}'
```

## Audit Mode vs. Enforce Mode

Start in audit mode to see violations without blocking deployments:

```yaml
spec:
  enforcementAction: dryrun   # "dryrun" = audit, "deny" = enforce, "warn" = allow with a warning
```

## Conclusion

OPA Gatekeeper provides programmable admission control for any Kubernetes workload managed through Portainer. Start with the most impactful policies (resource limits, no privileged containers, registry restrictions) and add more as your security posture matures.
