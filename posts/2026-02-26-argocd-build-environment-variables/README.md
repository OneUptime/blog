# How to Use Build Environment Variables in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Configuration Management, Manifest Generation

Description: Learn how to use ArgoCD build environment variables like ARGOCD_APP_NAME and ARGOCD_APP_REVISION in manifest generation for dynamic, context-aware deployments.

---

ArgoCD provides a set of built-in environment variables during the manifest generation phase. These variables expose metadata about the ArgoCD application - its name, namespace, target revision, and other context - that your Helm templates, Kustomize plugins, or config management plugins can use. This lets you create dynamic, context-aware manifests without hardcoding application-specific values. This guide covers all available build environment variables and practical patterns for using them.

## What Are Build Environment Variables?

When ArgoCD generates manifests from your Git repository, it sets several environment variables that are available to the manifest generation process. These variables are available to:

- Helm chart templates (via `--set` or custom wrappers)
- Config Management Plugins (CMPs)
- Custom tooling invoked during manifest generation

The variables are injected into the environment of the process that ArgoCD uses to render manifests. They are not injected into your running pods - they exist only during the build/render phase on the ArgoCD repo server.

## Available Build Environment Variables

ArgoCD provides the following environment variables during manifest generation:

| Variable | Description | Example Value |
|---|---|---|
| `ARGOCD_APP_NAME` | The name of the ArgoCD Application | `my-app-production` |
| `ARGOCD_APP_NAMESPACE` | The destination namespace | `production` |
| `ARGOCD_APP_REVISION` | The resolved Git revision (commit SHA) | `abc123def456...` |
| `ARGOCD_APP_SOURCE_PATH` | The path within the Git repository | `apps/my-app/overlays/production` |
| `ARGOCD_APP_SOURCE_REPO_URL` | The Git repository URL | `https://github.com/myorg/config.git` |
| `ARGOCD_APP_SOURCE_TARGET_REVISION` | The target revision (branch/tag/commit) | `main` |
| `KUBE_VERSION` | The Kubernetes version of the target cluster | `v1.28.0` |
| `KUBE_API_VERSIONS` | The API versions available on the target cluster | `apps/v1,batch/v1,...` |

## Enabling Build Environment for Helm

By default, ArgoCD does not pass build environment variables to Helm. You need to explicitly enable this in the Application spec:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/app-config.git
    path: charts/my-app
    helm:
      # Pass build environment variables to Helm
      parameters:
        - name: global.argocdAppName
          value: $ARGOCD_APP_NAME
        - name: global.argocdRevision
          value: $ARGOCD_APP_REVISION
        - name: global.targetNamespace
          value: $ARGOCD_APP_NAMESPACE
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

The `$VARIABLE_NAME` syntax tells ArgoCD to substitute the build environment variable value before passing it to Helm.

## Using Build Variables in Helm Templates

Once the build environment variables are passed as Helm values, you can use them in your templates:

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    app.kubernetes.io/managed-by: argocd
    argocd.argoproj.io/app-name: {{ .Values.global.argocdAppName | default "unknown" }}
  annotations:
    # Track which Git revision is deployed
    deployment.kubernetes.io/revision: {{ .Values.global.argocdRevision | default "unknown" | trunc 7 | quote }}
spec:
  template:
    metadata:
      annotations:
        # Useful for debugging - shows which commit is running
        git-commit: {{ .Values.global.argocdRevision | default "unknown" | trunc 7 | quote }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          env:
            - name: APP_VERSION
              value: {{ .Values.global.argocdRevision | default "unknown" | trunc 7 | quote }}
            - name: DEPLOY_ENVIRONMENT
              value: {{ .Values.global.targetNamespace | default "unknown" | quote }}
```

## Using Build Variables in Config Management Plugins

Config Management Plugins (CMPs) have the build environment variables available directly in their environment. This is where they are most powerful:

```yaml
# ConfigMap for the CMP
apiVersion: v1
kind: ConfigMap
metadata:
  name: cmp-plugin
  namespace: argocd
data:
  plugin.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: my-custom-plugin
    spec:
      version: v1.0
      generate:
        command: ["/bin/bash", "-c"]
        args:
          - |
            # Build environment variables are automatically available
            echo "Generating manifests for: $ARGOCD_APP_NAME"
            echo "Target namespace: $ARGOCD_APP_NAMESPACE"
            echo "Git revision: $ARGOCD_APP_REVISION"
            echo "Source path: $ARGOCD_APP_SOURCE_PATH"

            # Use the variables in manifest generation
            cat manifests/*.yaml | \
              sed "s/PLACEHOLDER_NAMESPACE/$ARGOCD_APP_NAMESPACE/g" | \
              sed "s/PLACEHOLDER_REVISION/${ARGOCD_APP_REVISION:0:7}/g"
```

## Dynamic Labels and Annotations

A practical use case is adding deployment metadata to your resources automatically:

```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "my-app.fullname" . }}-deploy-info
  labels:
    app.kubernetes.io/part-of: {{ .Values.global.argocdAppName | default "unknown" }}
data:
  DEPLOY_COMMIT: {{ .Values.global.argocdRevision | default "unknown" | quote }}
  DEPLOY_APP: {{ .Values.global.argocdAppName | default "unknown" | quote }}
  DEPLOY_NAMESPACE: {{ .Values.global.targetNamespace | default "unknown" | quote }}
```

This ConfigMap can be mounted in your pods, giving the application runtime access to its deployment context:

```yaml
# In the deployment template
containers:
  - name: my-app
    envFrom:
      - configMapRef:
          name: {{ include "my-app.fullname" . }}-deploy-info
```

## Jsonnet with Build Variables

If you use Jsonnet for manifest generation, build environment variables can be passed as external variables:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/app-config.git
    path: jsonnet/my-app
    directory:
      jsonnet:
        extVars:
          - name: appName
            value: $ARGOCD_APP_NAME
          - name: namespace
            value: $ARGOCD_APP_NAMESPACE
          - name: revision
            value: $ARGOCD_APP_REVISION
```

Then in your Jsonnet file:

```jsonnet
local appName = std.extVar('appName');
local namespace = std.extVar('namespace');
local revision = std.extVar('revision');

{
  deployment: {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: appName,
      namespace: namespace,
      annotations: {
        'git-revision': revision,
      },
    },
    // ... rest of deployment spec
  },
}
```

## Application-Aware Kustomize Plugins

For Kustomize applications, build environment variables are available to exec plugins and KRM functions:

```yaml
# kustomization.yaml with a generator plugin
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
generators:
  - deploy-info-generator.yaml
```

```yaml
# deploy-info-generator.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: deploy-info
  annotations:
    config.kubernetes.io/function: |
      exec:
        path: ./generate-deploy-info.sh
```

```bash
#!/bin/bash
# generate-deploy-info.sh - Has access to ArgoCD build env vars
cat <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: deploy-info
data:
  GIT_COMMIT: "${ARGOCD_APP_REVISION:-unknown}"
  APP_NAME: "${ARGOCD_APP_NAME:-unknown}"
  NAMESPACE: "${ARGOCD_APP_NAMESPACE:-unknown}"
EOF
```

## Conditional Logic Based on Build Variables

Use build variables to conditionally include resources based on the application context:

```bash
#!/bin/bash
# CMP generate script with conditional logic

# Generate base manifests
kustomize build .

# Only add monitoring resources for production apps
if [[ "$ARGOCD_APP_NAME" == *"-production"* ]]; then
  echo "---"
  cat monitoring/servicemonitor.yaml
  echo "---"
  cat monitoring/prometheusrule.yaml
fi

# Add debug tools for dev apps
if [[ "$ARGOCD_APP_NAME" == *"-dev"* ]]; then
  echo "---"
  cat debug/debug-sidecar.yaml
fi
```

## KUBE_VERSION and KUBE_API_VERSIONS

The `KUBE_VERSION` and `KUBE_API_VERSIONS` variables are particularly useful for Helm charts that support multiple Kubernetes versions:

```yaml
# templates/ingress.yaml
{{- if semverCompare ">=1.19-0" .Capabilities.KubeVersion.GitVersion }}
apiVersion: networking.k8s.io/v1
{{- else }}
apiVersion: networking.k8s.io/v1beta1
{{- end }}
kind: Ingress
```

ArgoCD sets the Helm `.Capabilities` object using the target cluster's version, so these checks work correctly even when the ArgoCD server runs on a different Kubernetes version than the target cluster.

## Security Considerations

Build environment variables are not secret - they contain metadata about the application configuration, not credentials. However, be mindful of:

- **Do not use them for authentication**: They are visible in the ArgoCD UI and logs
- **Log carefully**: If your CMP scripts log build variables, those logs are accessible to ArgoCD UI users
- **Avoid embedding in images**: Do not bake build variables into container images, as they change with each deployment

## Debugging Build Variables

When build variables are not working as expected, check what ArgoCD is passing:

```bash
# View the rendered manifests to confirm variable substitution
argocd app manifests my-app-production

# Check the application spec for variable references
argocd app get my-app-production -o yaml | grep -A5 "helm:"
```

For CMPs, add debugging output to your generate script:

```bash
#!/bin/bash
# Log available environment variables (remove in production)
echo "# Debug: ARGOCD_APP_NAME=$ARGOCD_APP_NAME" >&2
echo "# Debug: ARGOCD_APP_NAMESPACE=$ARGOCD_APP_NAMESPACE" >&2
echo "# Debug: ARGOCD_APP_REVISION=$ARGOCD_APP_REVISION" >&2

# Normal manifest generation continues
kustomize build .
```

Build environment variables are a powerful ArgoCD feature that enables context-aware manifest generation. They bridge the gap between ArgoCD's application metadata and your manifest templates, letting you create smarter, more maintainable deployment configurations without hardcoding values.
