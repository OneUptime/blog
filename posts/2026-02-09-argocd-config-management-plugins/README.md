# How to Configure ArgoCD Config Management Plugins for Custom Manifest Generation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, Config Management, GitOps, Plugin Development

Description: Learn how to build and configure custom ArgoCD config management plugins to generate Kubernetes manifests from proprietary formats or external systems.

---

ArgoCD ships with native support for Helm, Kustomize, and plain YAML. But what happens when your organization uses a proprietary templating system, needs to fetch manifests from external APIs, or wants to integrate with legacy configuration management tools? That's where ArgoCD config management plugins come in.

This guide shows you how to build custom plugins that extend ArgoCD's manifest generation capabilities.

## Understanding ArgoCD Plugin Architecture

ArgoCD plugins are executables that implement a simple contract. They receive application source information and output valid Kubernetes manifests to stdout. The plugin system supports two versions:

- v1 plugins: Legacy plugin system, being deprecated
- v2 plugins: Current system using sidecar containers

This guide focuses on v2 plugins, which run as sidecar containers alongside the argocd-repo-server.

## Plugin Contract

Your plugin must implement three commands:

```bash
# Discover if the plugin should handle this repository
plugin discover

# Initialize/prepare the environment
plugin init

# Generate the manifests
plugin generate
```

ArgoCD calls these commands in sequence, passing environment variables with application details.

## Building a Basic Plugin

Let's build a plugin that generates Kubernetes manifests from CUE configuration files. Create a shell script:

```bash
#!/bin/bash
# cue-plugin.sh

case "$1" in
  discover)
    # Check if cue.mod directory exists
    if [ -d "cue.mod" ]; then
      echo "true"
      exit 0
    fi
    echo "false"
    exit 1
    ;;

  init)
    # Install dependencies or prepare environment
    echo "Initializing CUE plugin" >&2
    exit 0
    ;;

  generate)
    # Generate manifests
    cue export ./... --out yaml
    exit 0
    ;;

  *)
    echo "Unknown command: $1" >&2
    exit 1
    ;;
esac
```

Make it executable:

```bash
chmod +x cue-plugin.sh
```

## Creating the Plugin Container

Build a container image with your plugin and its dependencies:

```dockerfile
# Dockerfile
FROM alpine:3.18

# Install CUE
RUN apk add --no-cache bash curl && \
    curl -L https://github.com/cue-lang/cue/releases/download/v0.6.0/cue_v0.6.0_linux_amd64.tar.gz | \
    tar xz -C /usr/local/bin

# Copy plugin script
COPY cue-plugin.sh /usr/local/bin/cue-plugin
RUN chmod +x /usr/local/bin/cue-plugin

# ArgoCD expects the plugin at this location
ENTRYPOINT ["/usr/local/bin/cue-plugin"]
```

Build and push the image:

```bash
docker build -t yourregistry.io/argocd-cue-plugin:v1.0.0 .
docker push yourregistry.io/argocd-cue-plugin:v1.0.0
```

## Registering the Plugin with ArgoCD

Modify the argocd-repo-server deployment to include your plugin as a sidecar. Create a ConfigMap with the plugin definition:

```yaml
# argocd-cmp-cue.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cue-plugin
  namespace: argocd
data:
  plugin.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: cue
    spec:
      version: v1.0
      discover:
        command: ["/usr/local/bin/cue-plugin", "discover"]
      init:
        command: ["/usr/local/bin/cue-plugin", "init"]
      generate:
        command: ["/usr/local/bin/cue-plugin", "generate"]
```

Patch the argocd-repo-server deployment:

```yaml
# repo-server-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: cue-plugin
        image: yourregistry.io/argocd-cue-plugin:v1.0.0
        securityContext:
          runAsNonRoot: true
          runAsUser: 999
        volumeMounts:
        - name: var-files
          mountPath: /var/run/argocd
        - name: plugins
          mountPath: /home/argocd/cmp-server/plugins
        - name: cue-plugin-config
          mountPath: /home/argocd/cmp-server/config
      volumes:
      - name: cue-plugin-config
        configMap:
          name: cue-plugin
      - name: var-files
        emptyDir: {}
      - name: plugins
        emptyDir: {}
```

Apply the changes:

```bash
kubectl apply -f argocd-cmp-cue.yaml
kubectl patch deployment argocd-repo-server -n argocd --patch-file repo-server-patch.yaml
```

## Using Environment Variables

Plugins receive context through environment variables. Access them in your plugin:

```bash
#!/bin/bash
# Enhanced plugin with environment variable usage

case "$1" in
  generate)
    # ARGOCD_APP_NAME: Application name
    # ARGOCD_APP_NAMESPACE: Target namespace
    # ARGOCD_ENV_*: Custom parameters from Application

    echo "Generating manifests for ${ARGOCD_APP_NAME}" >&2

    # Pass environment-specific values to CUE
    cue export ./... \
      --out yaml \
      --inject "namespace=${ARGOCD_APP_NAMESPACE}" \
      --inject "app=${ARGOCD_APP_NAME}"
    exit 0
    ;;
esac
```

## Advanced Plugin Example: External API Integration

Build a plugin that fetches manifests from an external configuration management system:

```python
#!/usr/bin/env python3
# api-plugin.py

import sys
import os
import requests
import yaml

def discover():
    """Check if config.yaml exists with our API endpoint"""
    config_file = "config.yaml"
    if os.path.exists(config_file):
        with open(config_file) as f:
            config = yaml.safe_load(f)
            if config.get("source") == "external-api":
                print("true")
                return 0
    print("false")
    return 1

def init():
    """Initialize plugin"""
    print("Initializing API plugin", file=sys.stderr)
    return 0

def generate():
    """Fetch and generate manifests from external API"""
    # Read configuration
    with open("config.yaml") as f:
        config = yaml.safe_load(f)

    api_endpoint = config.get("apiEndpoint")
    app_id = config.get("applicationId")

    # Get credentials from environment
    api_token = os.environ.get("API_TOKEN")

    # Fetch manifests from API
    headers = {"Authorization": f"Bearer {api_token}"}
    response = requests.get(
        f"{api_endpoint}/applications/{app_id}/manifests",
        headers=headers
    )

    if response.status_code != 200:
        print(f"API request failed: {response.status_code}", file=sys.stderr)
        return 1

    # Output manifests
    manifests = response.json()
    for manifest in manifests:
        print(yaml.dump(manifest))
        print("---")

    return 0

if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else ""

    if command == "discover":
        sys.exit(discover())
    elif command == "init":
        sys.exit(init())
    elif command == "generate":
        sys.exit(generate())
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)
```

Container for the Python plugin:

```dockerfile
FROM python:3.11-alpine

RUN pip install --no-cache-dir requests pyyaml

COPY api-plugin.py /usr/local/bin/api-plugin
RUN chmod +x /usr/local/bin/api-plugin

ENTRYPOINT ["/usr/local/bin/api-plugin"]
```

## Passing Parameters to Plugins

Configure Application to pass custom parameters:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/yourorg/configs
    targetRevision: main
    path: apps/production
    plugin:
      name: cue
      env:
        - name: ENVIRONMENT
          value: production
        - name: REGION
          value: us-east-1
        - name: REPLICAS
          value: "3"
```

Access these in your plugin via `ARGOCD_ENV_ENVIRONMENT`, `ARGOCD_ENV_REGION`, etc.

## Handling Secrets Securely

Never hardcode secrets in your plugin. Use Kubernetes secrets mounted as volumes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
spec:
  template:
    spec:
      containers:
      - name: cue-plugin
        env:
        - name: API_TOKEN
          valueFrom:
            secretKeyRef:
              name: plugin-secrets
              key: api-token
        volumeMounts:
        - name: plugin-secrets
          mountPath: /etc/secrets
          readOnly: true
      volumes:
      - name: plugin-secrets
        secret:
          secretName: plugin-secrets
```

## Debugging Plugins

View plugin logs:

```bash
# Get repo-server pod name
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-repo-server

# View plugin container logs
kubectl logs -n argocd <pod-name> -c cue-plugin
```

Enable verbose logging in your plugin:

```bash
#!/bin/bash
set -x  # Enable debug output

case "$1" in
  generate)
    echo "Current directory: $(pwd)" >&2
    echo "Directory contents:" >&2
    ls -la >&2

    # Generate manifests
    cue export ./... --out yaml
    ;;
esac
```

## Plugin Best Practices

Follow these guidelines when building plugins:

1. **Fail fast**: Exit with non-zero status codes on errors
2. **Log to stderr**: Use stderr for debug messages, stdout only for manifests
3. **Validate input**: Check for required files and environment variables
4. **Handle errors gracefully**: Provide clear error messages
5. **Keep it lightweight**: Minimize container image size
6. **Version your plugins**: Use semantic versioning for container images
7. **Document parameters**: Clearly document expected environment variables

## Testing Plugins Locally

Test your plugin before deploying to ArgoCD:

```bash
# Clone test repository
git clone https://github.com/yourorg/test-config /tmp/test

cd /tmp/test

# Set environment variables
export ARGOCD_APP_NAME=test-app
export ARGOCD_APP_NAMESPACE=default

# Test discover
./cue-plugin.sh discover

# Test generate
./cue-plugin.sh generate
```

## Conclusion

ArgoCD config management plugins give you unlimited flexibility in how manifests are generated. Whether you need to integrate with legacy systems, support proprietary formats, or fetch configurations from external APIs, plugins provide a clean extension point without modifying ArgoCD itself. Build your plugin as a container, register it as a sidecar, and ArgoCD will seamlessly integrate it into your GitOps workflows.
