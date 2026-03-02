# How to Deploy CRDs Before Custom Resources with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CRD, Sync Waves

Description: Learn how to use ArgoCD sync waves and sync phases to deploy Custom Resource Definitions before the custom resources that depend on them.

---

If you have ever watched an ArgoCD sync fail because a custom resource tried to deploy before its CRD existed, you know the pain. Kubernetes needs the CRD registered first, or it has no idea what to do with your custom resource manifest. ArgoCD gives you tools to handle this ordering problem cleanly.

## Why Ordering Matters

When you apply a bunch of manifests to a Kubernetes cluster, kubectl processes them in a somewhat random order. ArgoCD does the same unless you tell it otherwise. If your Application includes both CRDs and the custom resources that depend on those CRDs, you will hit race conditions.

The typical error looks like this:

```
resource mapping not found for name: "my-resource" namespace: "" from "":
no matches for kind "MyCustomResource" in version "example.com/v1"
```

This happens because the API server has not registered the CRD yet when ArgoCD tries to create the custom resource instance.

## Sync Waves: The Primary Solution

ArgoCD sync waves let you assign an ordering number to each resource. Resources in lower-numbered waves deploy first, and ArgoCD waits for them to become healthy before moving to the next wave.

Here is a CRD manifest with a sync wave annotation:

```yaml
# crd-definition.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.example.com
  annotations:
    argocd.argoproj.io/sync-wave: "-1"  # Deploys before wave 0
spec:
  group: example.com
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                replicas:
                  type: integer
  scope: Namespaced
  names:
    plural: myresources
    singular: myresource
    kind: MyResource
```

And here is the custom resource that depends on it:

```yaml
# my-custom-resource.yaml
apiVersion: example.com/v1
kind: MyResource
metadata:
  name: my-instance
  annotations:
    argocd.argoproj.io/sync-wave: "1"  # Deploys after wave 0
spec:
  replicas: 3
```

The CRD is in wave -1, so it deploys first. The custom resource is in wave 1, so it deploys after. ArgoCD processes waves in numerical order: -1, 0, 1, 2, and so on.

## Using Sync Phases for Even More Control

Sync waves work within sync phases. ArgoCD has three phases: PreSync, Sync, and PostSync. You can put your CRDs in the PreSync phase to guarantee they exist before the main Sync phase runs.

```yaml
# crd in PreSync phase
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.example.com
  annotations:
    argocd.argoproj.io/hook: PreSync
spec:
  group: example.com
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
  scope: Namespaced
  names:
    plural: myresources
    singular: myresource
    kind: MyResource
```

However, using hooks for CRDs has a caveat: hook resources are not tracked as part of the Application by default. You would need to set `argocd.argoproj.io/hook-delete-policy` carefully to avoid the CRD being cleaned up.

For most teams, sync waves are the better approach for CRDs because the CRD stays managed as a regular Application resource.

## A Complete Multi-Wave Example

Here is a real-world pattern for deploying a cert-manager setup where you need the CRDs, then the controller, then the certificate resources:

```yaml
# Wave -2: Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
  annotations:
    argocd.argoproj.io/sync-wave: "-2"

---
# Wave -1: CRDs (these take a moment to register)
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: certificates.cert-manager.io
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  group: cert-manager.io
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
  scope: Namespaced
  names:
    plural: certificates
    singular: certificate
    kind: Certificate

---
# Wave 0: Controller deployment (default wave)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cert-manager
  template:
    metadata:
      labels:
        app: cert-manager
    spec:
      containers:
        - name: cert-manager
          image: quay.io/jetstack/cert-manager-controller:v1.14.0

---
# Wave 1: ClusterIssuer (needs CRD and running controller)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx

---
# Wave 2: Certificate resources (needs ClusterIssuer)
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-app-tls
  namespace: default
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  secretName: my-app-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - app.example.com
```

## Health Checks for CRDs

ArgoCD needs to know when a CRD is "healthy" before it moves to the next sync wave. By default, ArgoCD considers a CRD healthy once it is created. But CRD registration is not instant - the API server needs time to set up the endpoints.

You can add a custom health check in the argocd-cm ConfigMap to wait for the CRD to be fully established:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.apiextensions.k8s.io_CustomResourceDefinition: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.conditions ~= nil then
        for i, condition in ipairs(obj.status.conditions) do
          if condition.type == "Established" and condition.status == "True" then
            hs.status = "Healthy"
            hs.message = "CRD is established"
            return hs
          end
        end
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for CRD to be established"
    return hs
```

This Lua script checks the CRD status conditions for "Established". Until it sees that condition as True, it reports the CRD as Progressing, which prevents ArgoCD from advancing to the next sync wave.

## Splitting CRDs into a Separate Application

For large projects, many teams keep CRDs in a dedicated ArgoCD Application and the custom resources in another. This gives you independent lifecycle management.

```yaml
# App for CRDs only
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-operator-crds
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-operator
    path: crds/
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: false  # Never auto-delete CRDs
      selfHeal: true

---
# App for the operator and custom resources
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-operator
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-operator
    path: deploy/
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: my-operator
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Setting `prune: false` on the CRD Application is important. You do not want ArgoCD accidentally deleting CRDs, which would cascade-delete every custom resource in your cluster.

## Troubleshooting Tips

If your sync still fails with CRD ordering issues, check these common problems:

1. **Missing sync wave annotations** - Every resource that depends on a CRD needs a higher wave number than the CRD itself.
2. **CRD not fully established** - Add the custom health check shown above to wait for the Established condition.
3. **Helm chart CRDs** - Helm puts CRDs in a special `crds/` directory. ArgoCD handles these differently. You might need to use `--skip-crds` in Helm and manage CRDs separately.
4. **Server-side apply conflicts** - If multiple tools manage the same CRD, you will see conflict errors. Use `argocd.argoproj.io/sync-options: ServerSideApply=true` to handle this.

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-options: ServerSideApply=true
```

## Summary

The key takeaway is that sync waves are your primary tool for ordering CRDs before custom resources. Assign negative wave numbers to CRDs, leave standard resources at wave 0, and put custom resource instances in positive waves. For production setups, consider splitting CRDs into their own ArgoCD Application with pruning disabled to prevent accidental deletion cascades.
