# How to configure Kustomize generators for custom resource generation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, DevOps

Description: Master Kustomize generators to automatically create ConfigMaps, Secrets, and custom resources dynamically during build time for more maintainable configurations.

---

Generators in Kustomize are powerful tools that create Kubernetes resources dynamically during the build process. Rather than writing static manifest files, you define generation rules in your kustomization.yaml that produce resources from various sources like files, literals, or environment variables. This approach reduces duplication and keeps sensitive data out of version control.

Understanding how to configure and use generators effectively can dramatically improve your Kubernetes workflow. You can generate ConfigMaps from directories of configuration files, create Secrets from environment files, and even build custom resources using generator plugins.

## Built-in generator types

Kustomize provides three built-in generators: configMapGenerator, secretGenerator, and generatorOptions. Each serves a specific purpose in creating resources from external data sources.

The configMapGenerator creates ConfigMap resources from files, directories, or literal key-value pairs. This is useful for application configuration that changes between environments:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

configMapGenerator:
- name: app-config
  files:
  - config.properties
  - database.conf
  literals:
  - LOG_LEVEL=info
  - MAX_CONNECTIONS=100
```

When you build this kustomization, Kustomize generates a ConfigMap named app-config with a hash suffix (like app-config-6h7k8m9g2t). This hash changes whenever the content changes, triggering rolling updates automatically.

## Generating Secrets securely

The secretGenerator works similarly but creates Secret resources. It can read from files or literals, encoding values in base64 automatically:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

secretGenerator:
- name: database-credentials
  files:
  - username.txt
  - password.txt
  type: Opaque

- name: tls-cert
  files:
  - tls.crt=certs/server.crt
  - tls.key=certs/server.key
  type: kubernetes.io/tls
```

The key=value syntax lets you rename files during generation. This is particularly useful for TLS certificates where Kubernetes expects specific key names.

Never commit sensitive files to version control. Use environment-specific directories or external secret management tools to provide these files during build time.

## Loading files from directories

Instead of listing individual files, you can generate resources from entire directories. This is perfect for applications with many configuration files:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

configMapGenerator:
- name: nginx-config
  files:
  - configs/nginx.conf
  - configs/mime.types
  - configs/fastcgi_params

- name: app-properties
  envs:
  - application.env
```

The envs option parses environment file format (KEY=value lines) and creates a ConfigMap with each line as a separate key. This works well with dotenv-style configuration.

## Controlling generator behavior with options

GeneratorOptions modifies how all generators in a kustomization behave. You can disable name hashing, add labels, or set annotations:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

generatorOptions:
  disableNameSuffixHash: false
  labels:
    app: myapp
    managed-by: kustomize
  annotations:
    config-version: v1.2.0

configMapGenerator:
- name: app-config
  literals:
  - KEY=value
```

The disableNameSuffixHash option is useful when you need predictable resource names, though it removes the automatic rolling update trigger. Use it carefully in production environments.

## Creating custom generators with plugins

For more advanced use cases, you can write custom generator plugins. These are executables that Kustomize calls during the build process to generate resources.

Here's a simple generator plugin that creates resources from a custom configuration format:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

generators:
- |-
  apiVersion: someteam.example.com/v1
  kind: MyResourceGenerator
  metadata:
    name: my-generator
  spec:
    count: 3
    prefix: worker
```

The plugin executable must be in the Kustomize plugin path and follow naming conventions. When Kustomize encounters this generator, it executes the plugin and includes its output in the build.

## Building a shell-based generator plugin

You can create plugins in any language. Here's a simple bash example that generates multiple Deployment resources:

```bash
#!/bin/bash
# This plugin generates N deployments based on input configuration

# Read input from stdin (the generator configuration)
CONFIG=$(cat)

# Parse configuration (simplified for example)
COUNT=$(echo "$CONFIG" | grep count | cut -d: -f2 | tr -d ' ')
PREFIX=$(echo "$CONFIG" | grep prefix | cut -d: -f2 | tr -d ' ')

# Generate resources
for i in $(seq 1 $COUNT); do
  cat <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${PREFIX}-${i}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${PREFIX}
      instance: "${i}"
  template:
    metadata:
      labels:
        app: ${PREFIX}
        instance: "${i}"
    spec:
      containers:
      - name: worker
        image: worker:latest
---
EOF
done
```

Place this script in your plugin directory with the correct path structure and make it executable. Kustomize will invoke it during builds.

## Using environment variables in generators

You can reference environment variables when generating resources. This is useful for injecting build-time information:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

configMapGenerator:
- name: build-info
  literals:
  - BUILD_NUMBER=$(BUILD_NUMBER)
  - GIT_COMMIT=$(GIT_COMMIT)
  - BUILD_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
```

Set these environment variables before running `kustomize build`. This technique integrates well with CI/CD pipelines where build metadata is available as environment variables.

## Combining multiple generator sources

A single generator can pull data from multiple sources. This lets you combine static configuration with dynamic values:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

configMapGenerator:
- name: complete-config
  files:
  - static-config.yaml
  - feature-flags.json
  envs:
  - database.env
  literals:
  - ENVIRONMENT=production
  - REGION=us-east-1
```

The resulting ConfigMap contains all data merged together. If keys conflict, later sources override earlier ones.

## Generator behavior in overlays

When using overlays, you can add to or replace generators from the base. This enables environment-specific configuration:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

configMapGenerator:
- name: app-config
  literals:
  - LOG_LEVEL=info
  - CACHE_SIZE=100
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

configMapGenerator:
- name: app-config
  behavior: merge
  literals:
  - LOG_LEVEL=warn
  - CACHE_SIZE=1000
  - METRICS_ENABLED=true
```

The behavior field controls how overlays interact with base generators. Options are create, replace, and merge. The merge behavior combines values, with overlay literals overriding base values for matching keys.

## Referencing generated resources

When generators create resources with hash suffixes, referencing them in other manifests requires special handling. Use nameReference to automatically update references:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

configMapGenerator:
- name: app-config
  literals:
  - KEY=value

resources:
- deployment.yaml

configurations:
- kustomizeconfig.yaml
```

Kustomize automatically updates ConfigMap and Secret references in standard fields like volumes and envFrom. For custom fields, define additional nameReference rules in a configuration file.

## Best practices for generators

Always use generators for ConfigMaps and Secrets rather than checking in static manifests. This provides automatic hash suffixes and better change tracking. The hash suffix ensures that pods get recreated when configuration changes, preventing stale configuration bugs.

Keep generated content in separate directories outside version control. Use .gitignore to exclude sensitive files while maintaining the kustomization.yaml that defines generation rules.

For complex generation logic, prefer external tools or scripts over inline generators. Commit the generation scripts to version control so the build process is reproducible.

## Conclusion

Kustomize generators provide a robust way to create Kubernetes resources dynamically from various data sources. Whether you're generating simple ConfigMaps from files or building custom resources with plugins, generators keep your configurations DRY and maintainable.

The built-in configMapGenerator and secretGenerator handle most common scenarios, while the plugin system offers unlimited flexibility for custom requirements. By combining generators with overlays and patches, you can build sophisticated configuration management systems that scale across multiple environments and applications.
