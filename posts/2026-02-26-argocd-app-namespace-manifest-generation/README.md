# How to Pass ARGOCD_APP_NAMESPACE to Manifest Generation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Namespace Management, Build Variables

Description: Learn how to use the ARGOCD_APP_NAMESPACE build environment variable in ArgoCD to generate namespace-aware manifests during rendering for multi-namespace deployments.

---

The `ARGOCD_APP_NAMESPACE` environment variable tells your manifest generation tools which namespace the ArgoCD Application deploys to. This is the destination namespace from `spec.destination.namespace`, not necessarily the namespace where the `Application` resource itself lives. Understanding this distinction and using the variable correctly enables powerful multi-namespace ArgoCD patterns.

This guide explains what `ARGOCD_APP_NAMESPACE` contains, how to use it, and the practical scenarios where it matters.

## What ARGOCD_APP_NAMESPACE Contains

The value comes from the Application's destination namespace:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api
  namespace: argocd    # This is where the Application resource lives
spec:
  destination:
    server: https://kubernetes.default.svc
    namespace: backend-api-production    # This is ARGOCD_APP_NAMESPACE
```

In a standard ArgoCD installation, Application resources usually live in `argocd`, but `ARGOCD_APP_NAMESPACE` is the namespace where the rendered resources will be deployed. With different Applications targeting different namespaces, the variable changes with `spec.destination.namespace`.

## Why ARGOCD_APP_NAMESPACE Matters

This variable becomes important in these scenarios:

1. **Multi-namespace deployments:** The same chart or Kustomize base can render namespace-specific manifests for different destinations
2. **Multi-tenant ArgoCD:** Different teams deploy workloads into different destination namespaces
3. **Namespace-scoped configuration:** Workloads need namespace-specific service names, policies, or configuration during rendering

## Using ARGOCD_APP_NAMESPACE in Helm

Pass the variable as a Helm parameter:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/helm-charts.git
    targetRevision: main
    path: charts/backend-api
    helm:
      parameters:
        - name: argocd.destinationNamespace
          value: $ARGOCD_APP_NAMESPACE
        - name: argocd.appName
          value: $ARGOCD_APP_NAME
  destination:
    server: https://kubernetes.default.svc
    namespace: backend-api
```

In your Helm templates, reference the value:

```yaml
# templates/deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "backend-api.fullname" . }}
  annotations:
    argocd.argoproj.io/destination-namespace: {{ .Values.argocd.destinationNamespace | default .Release.Namespace | quote }}
spec:
  template:
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          env:
            - name: DEPLOYMENT_NAMESPACE
              value: {{ .Values.argocd.destinationNamespace | default .Release.Namespace | quote }}
```

## Applications in Any Namespace Pattern

`ARGOCD_APP_NAMESPACE` remains the destination namespace even when you use the "Applications in Any Namespace" feature. Each team can create and manage their own ArgoCD Applications in their team namespace, while the build variable still reflects where the workload deploys:

```yaml
# Team Alpha's application - lives in team-alpha namespace
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend
  namespace: team-alpha
spec:
  project: team-alpha
  source:
    repoURL: https://github.com/team-alpha/frontend.git
    targetRevision: main
    path: deploy
    helm:
      parameters:
        - name: deploymentNamespace
          value: $ARGOCD_APP_NAMESPACE    # Passes "frontend-production"
  destination:
    server: https://kubernetes.default.svc
    namespace: frontend-production

---
# Team Beta's application - lives in team-beta namespace
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend
  namespace: team-beta
spec:
  project: team-beta
  source:
    repoURL: https://github.com/team-beta/frontend.git
    targetRevision: main
    path: deploy
    helm:
      parameters:
        - name: deploymentNamespace
          value: $ARGOCD_APP_NAMESPACE    # Passes "frontend-beta"
  destination:
    server: https://kubernetes.default.svc
    namespace: frontend-beta
```

Both teams can have an Application named `frontend`, differentiated by the Application namespace in the ArgoCD UI and CLI. The `ARGOCD_APP_NAMESPACE` variable lets the manifest generation know which destination namespace it is rendering for.

## Using in Custom Plugins

Custom plugins access `ARGOCD_APP_NAMESPACE` directly as an environment variable:

```bash
#!/bin/bash
# generate.sh - Custom config management plugin

APP_NAME="$ARGOCD_APP_NAME"
DESTINATION_NAMESPACE="$ARGOCD_APP_NAMESPACE"

echo "Generating manifests for $APP_NAME targeting namespace $DESTINATION_NAMESPACE"

# Use the namespace to determine destination-specific configuration
NAMESPACE_CONFIG_DIR="config/${DESTINATION_NAMESPACE}"

if [ -d "$NAMESPACE_CONFIG_DIR" ]; then
    echo "Using namespace-specific config from $NAMESPACE_CONFIG_DIR"
    # Merge namespace config with base manifests
    kustomize build . --load-restrictor LoadRestrictionsNone | \
        yq eval-all ". as \$item ireduce({}; . * \$item)" - "${NAMESPACE_CONFIG_DIR}/overrides.yaml"
else
    echo "No namespace-specific config found, using defaults"
    kustomize build .
fi
```

## Configuring RBAC Based on App Namespace

When using Applications in Any Namespace, ArgoCD RBAC scopes Application permissions with the format `<project>/<application-namespace>/<application-name>`. Use AppProject destination rules to scope where those Applications may deploy:

```csv
# Team alpha can only manage applications in the team-alpha project and namespace
p, role:team-alpha, applications, *, team-alpha/team-alpha/*, allow

# Team beta can only manage applications in the team-beta project and namespace
p, role:team-beta, applications, *, team-beta/team-beta/*, allow
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-alpha
  namespace: argocd
spec:
  sourceNamespaces:
    - team-alpha
  destinations:
    - server: https://kubernetes.default.svc
      namespace: frontend-production
```

## Namespace-Aware Service Discovery

Use `ARGOCD_APP_NAMESPACE` to configure service discovery that respects the destination namespace:

```yaml
# Helm values
argocd:
  destinationNamespace: ""    # Will be set to $ARGOCD_APP_NAMESPACE

# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "app.fullname" . }}-config
data:
  service-discovery.yaml: |
    # Only discover services in the deployment namespace scope
    deployment_namespace: {{ .Values.argocd.destinationNamespace | default .Release.Namespace }}
    monitoring_endpoint: http://prometheus.{{ .Values.argocd.destinationNamespace | default .Release.Namespace }}.svc:9090
    logging_endpoint: http://loki.{{ .Values.argocd.destinationNamespace | default .Release.Namespace }}.svc:3100
```

## Combining with Other Build Variables

The real power comes from combining `ARGOCD_APP_NAMESPACE` with other build variables:

```yaml
spec:
  source:
    helm:
      parameters:
        - name: argocd.appName
          value: $ARGOCD_APP_NAME
        - name: argocd.destinationNamespace
          value: $ARGOCD_APP_NAMESPACE
        - name: argocd.revision
          value: $ARGOCD_APP_REVISION
        - name: argocd.sourceRepo
          value: $ARGOCD_APP_SOURCE_REPO_URL
```

In templates:

```yaml
metadata:
  annotations:
    # Full ArgoCD context for traceability
    argocd.argoproj.io/app: "{{ .Values.argocd.appName }}"
    argocd.argoproj.io/destination-namespace: {{ .Values.argocd.destinationNamespace | quote }}
    argocd.argoproj.io/revision: {{ .Values.argocd.revision | quote }}
    argocd.argoproj.io/source: {{ .Values.argocd.sourceRepo | quote }}
```

## Enabling Applications in Any Namespace

To create Application resources outside the ArgoCD control plane namespace, you need to enable the feature:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # List namespaces where Applications can be created
  application.namespaces: "team-alpha,team-beta,team-gamma"
```

Or use a glob pattern:

```yaml
data:
  application.namespaces: "team-*"
```

Then allow those source namespaces in the AppProject used by each Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-alpha
  namespace: argocd
spec:
  sourceNamespaces:
    - team-alpha
```

## Debugging ARGOCD_APP_NAMESPACE

If the variable is not being passed correctly:

```bash
# Check the Application destination namespace
kubectl get application my-app -n argocd -o jsonpath='{.spec.destination.namespace}{"\n"}'

# Verify manifest generation in the repo server logs
kubectl logs -n argocd deployment/argocd-repo-server -f

# Test manifest generation locally
ARGOCD_APP_NAMESPACE=frontend-production ARGOCD_APP_NAME=frontend helm template ./charts/frontend
```

## Common Pitfalls

**Confusing app namespace with destination namespace.** `ARGOCD_APP_NAMESPACE` is where the Application deploys workloads, not where the Application CRD lives. For the Application resource namespace, check the Application's `metadata.namespace`.

**Assuming it is always "argocd".** If you hardcode checks for the `argocd` namespace, your templates will break because `ARGOCD_APP_NAMESPACE` usually contains the destination namespace, such as `backend-api-production`.

**Expecting Applications in Any Namespace to change this variable.** Applications in Any Namespace changes where `Application` resources may live. It does not change the meaning of `ARGOCD_APP_NAMESPACE`.

## Summary

The `ARGOCD_APP_NAMESPACE` variable provides the destination namespace where the ArgoCD Application deploys its resources. It is useful for namespace-specific configuration, AppProject destination scoping, service discovery, and deployment traceability. Combined with other build variables, it enables fully dynamic, namespace-aware manifest generation.
