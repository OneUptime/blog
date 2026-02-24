# How to Restrict Istio Resource Creation with RBAC

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, RBAC, Kubernetes, Security, Policy

Description: Practical methods for using Kubernetes RBAC to restrict who can create and modify Istio custom resources in your cluster.

---

Not everyone in your cluster should be able to create Istio resources. An EnvoyFilter created by a well-meaning developer can redirect traffic in unexpected ways. A PeerAuthentication resource in the wrong namespace can break mTLS for the entire mesh. RBAC is your first line of defense against configuration mishaps, and it is worth getting right.

The core idea is simple: use Kubernetes RBAC to control which users, groups, and service accounts can create, update, and delete specific Istio CRDs. But the implementation gets interesting when you want granular control, like allowing VirtualService creation but blocking EnvoyFilter creation for the same user.

## Identifying High-Risk Resources

Not all Istio resources carry the same risk. Here is a rough categorization:

**High risk** (restrict to platform teams):
- EnvoyFilter - can modify any Envoy configuration
- Gateway - controls ingress to the cluster
- PeerAuthentication - controls mTLS enforcement
- Sidecar (in istio-system) - affects mesh-wide proxy configuration

**Medium risk** (allow for team leads or senior developers):
- AuthorizationPolicy - controls access between services
- RequestAuthentication - controls JWT validation
- ServiceEntry - registers external services

**Low risk** (allow for all developers):
- VirtualService - traffic routing within a namespace
- DestinationRule - load balancing and connection pool settings

## Blocking EnvoyFilter Creation

EnvoyFilter is the most dangerous Istio resource because it patches Envoy configuration directly. A bad EnvoyFilter can crash proxies across the mesh.

Create a ClusterRole that explicitly excludes EnvoyFilter access:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-safe-developer
rules:
  - apiGroups:
      - networking.istio.io
    resources:
      - virtualservices
      - destinationrules
      - serviceentries
    verbs:
      - get
      - list
      - watch
      - create
      - update
      - patch
      - delete
  - apiGroups:
      - networking.istio.io
    resources:
      - gateways
      - envoyfilters
      - sidecars
      - proxyconfigs
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - security.istio.io
    resources:
      - authorizationpolicies
      - requestauthentications
      - peerauthentications
    verbs:
      - get
      - list
      - watch
```

Developers bound to this role can read all Istio resources but only create/modify the safe ones.

## Restricting by Namespace

Even for safe resources, you want to restrict creation to specific namespaces. Use RoleBindings instead of ClusterRoleBindings:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-istio-access
  namespace: team-alpha
subjects:
  - kind: Group
    name: team-alpha-devs
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: istio-safe-developer
  apiGroup: rbac.authorization.k8s.io
```

This way, team-alpha developers can only create VirtualServices in the `team-alpha` namespace, nowhere else.

## Protecting the istio-system Namespace

Resources created in the `istio-system` namespace often have mesh-wide effects. A Telemetry resource in `istio-system` applies to every sidecar in the mesh. Lock down this namespace tightly:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: istio-system-readonly
  namespace: istio-system
rules:
  - apiGroups:
      - networking.istio.io
      - security.istio.io
      - telemetry.istio.io
    resources: ["*"]
    verbs:
      - get
      - list
      - watch
  - apiGroups: [""]
    resources:
      - configmaps
      - pods
      - services
    verbs:
      - get
      - list
      - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: all-devs-readonly
  namespace: istio-system
subjects:
  - kind: Group
    name: all-developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: istio-system-readonly
  apiGroup: rbac.authorization.k8s.io
```

## Using ValidatingWebhookConfiguration as a Second Layer

RBAC controls API access, but sometimes you need more nuanced restrictions. For example, RBAC cannot prevent someone from creating a VirtualService that routes traffic to a different namespace. For that, use a validating admission webhook.

Istio already includes a validation webhook. Check its configuration:

```bash
kubectl get validatingwebhookconfiguration | grep istio
```

You can also deploy additional policy enforcement with tools like OPA/Gatekeeper:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istioresourcerestriction
spec:
  crd:
    spec:
      names:
        kind: IstioResourceRestriction
      validation:
        openAPIV3Schema:
          type: object
          properties:
            allowedNamespaces:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package istioresourcerestriction

        violation[{"msg": msg}] {
          input.review.object.apiVersion == "networking.istio.io/v1"
          input.review.object.kind == "VirtualService"
          routes := input.review.object.spec.http[_].route[_]
          host := routes.destination.host
          contains(host, ".")
          namespace := split(host, ".")[1]
          not namespace_allowed(namespace)
          msg := sprintf("VirtualService cannot route to namespace %v", [namespace])
        }

        namespace_allowed(ns) {
          ns == input.review.object.metadata.namespace
        }

        namespace_allowed(ns) {
          ns == input.parameters.allowedNamespaces[_]
        }
```

Apply the constraint:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: IstioResourceRestriction
metadata:
  name: restrict-cross-namespace-routing
spec:
  match:
    kinds:
      - apiGroups: ["networking.istio.io"]
        kinds: ["VirtualService"]
    excludedNamespaces:
      - istio-system
  parameters:
    allowedNamespaces: []
```

## Restricting Resource Creation for CI/CD Pipelines

CI/CD service accounts should have just enough access to deploy, without the ability to create potentially dangerous resources:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cicd-istio-restricted
rules:
  - apiGroups:
      - networking.istio.io
    resources:
      - virtualservices
      - destinationrules
    verbs:
      - get
      - list
      - create
      - update
      - patch
  - apiGroups:
      - security.istio.io
    resources:
      - authorizationpolicies
    verbs:
      - get
      - list
      - create
      - update
      - patch
```

Notice the deliberate absence of `delete` permission. This prevents accidental deletion during deployments.

Bind it per namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-deploy-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: github-actions-deployer
    namespace: cicd
roleRef:
  kind: ClusterRole
  name: cicd-istio-restricted
  apiGroup: rbac.authorization.k8s.io
```

## Auditing Resource Creation

Track who creates what Istio resources by enabling audit logging:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
metadata:
  name: istio-audit
rules:
  - level: RequestResponse
    resources:
      - group: networking.istio.io
        resources: ["*"]
      - group: security.istio.io
        resources: ["*"]
      - group: telemetry.istio.io
        resources: ["*"]
    verbs: ["create", "update", "patch", "delete"]
```

## Testing Your Restrictions

Always test that restrictions work before assuming they do:

```bash
# Should succeed (VirtualService in own namespace)
kubectl auth can-i create virtualservices.networking.istio.io \
  -n team-alpha --as-group=team-alpha-devs --as=dev1

# Should fail (EnvoyFilter creation)
kubectl auth can-i create envoyfilters.networking.istio.io \
  -n team-alpha --as-group=team-alpha-devs --as=dev1

# Should fail (VirtualService in another team's namespace)
kubectl auth can-i create virtualservices.networking.istio.io \
  -n team-beta --as-group=team-alpha-devs --as=dev1

# Should fail (anything in istio-system)
kubectl auth can-i create virtualservices.networking.istio.io \
  -n istio-system --as-group=team-alpha-devs --as=dev1
```

The combination of RBAC for API-level access control and admission webhooks for content-level validation gives you a robust system for preventing misconfigurations. Start with RBAC since it is built into Kubernetes and requires no additional tooling. Add admission webhooks when you need restrictions that RBAC cannot express.
