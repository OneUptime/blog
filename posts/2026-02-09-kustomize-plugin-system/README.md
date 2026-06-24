# How to implement Kustomize plugin system for custom transformations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Plugin

Description: Master the Kustomize plugin system to create custom generators and transformers that extend Kustomize capabilities for organization-specific configuration requirements.

---

While Kustomize provides powerful built-in generators and transformers, some organizations have unique configuration requirements that standard features don't address. The plugin system extends Kustomize with custom logic, letting you generate resources dynamically or transform them in ways specific to your environment.

Plugins are executables that Kustomize invokes during the build process when alpha plugins are enabled. Legacy exec generators receive their plugin configuration as a temporary file path in the first command-line argument and produce Kubernetes manifests on stdout. Legacy exec transformers receive their configuration the same way, read resources from stdin, and write transformed resources to stdout. This extensibility makes Kustomize adaptable to virtually any configuration management need while maintaining its declarative approach.

## Understanding plugin types

Kustomize supports two plugin types: generators and transformers. Generators create new resources from configuration, while transformers modify existing resources. Both follow similar patterns but serve different purposes.

A generator might create multiple Deployment resources from a simple specification, while a transformer might add security contexts to all containers. Understanding which type fits your use case helps you design effective plugins.

## Plugin discovery and execution

Kustomize discovers plugins through `KUSTOMIZE_PLUGIN_HOME` or the Kustomize plugin directory under `XDG_CONFIG_HOME`, typically `~/.config/kustomize/plugin`. Plugins must follow a specific directory structure:

```text
~/.config/kustomize/plugin/
└── someteam.example.com/
    └── v1/
        └── myresourcegenerator/
            └── MyResourceGenerator
```

The path includes the API group, version, and kind. The executable must match the kind name and be in the correct directory for Kustomize to find it.

## Creating a simple generator plugin

Let's build a generator that creates multiple similar Deployments from a compact specification:

```yaml
# generators/multiapp.yaml

apiVersion: generators.example.com/v1
kind: MultiAppGenerator
metadata:
  name: create-apps
spec:
  apps:
  - name: app1
    replicas: 3
  - name: app2
    replicas: 5
  - name: app3
    replicas: 2
  image: myapp:latest
```

The plugin executable receives the configuration file path as its first argument and generates Deployment resources:

```bash
#!/bin/bash
# ~/.config/kustomize/plugin/generators.example.com/v1/multiappgenerator/MultiAppGenerator

# Read input configuration from the file path Kustomize passes as $1
CONFIG_FILE="${1:?usage: MultiAppGenerator CONFIG_FILE}"
INPUT=$(cat "$CONFIG_FILE")

# Extract values using yq or similar
IMAGE=$(echo "$INPUT" | yq eval '.spec.image' -)

# Generate deployments for each app
echo "$INPUT" | yq eval '.spec.apps[]' -o=json | while read app; do
  NAME=$(echo "$app" | jq -r '.name')
  REPLICAS=$(echo "$app" | jq -r '.replicas')

  cat <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $NAME
spec:
  replicas: $REPLICAS
  selector:
    matchLabels:
      app: $NAME
  template:
    metadata:
      labels:
        app: $NAME
    spec:
      containers:
      - name: app
        image: $IMAGE
        ports:
        - containerPort: 8080
---
EOF
done
```

Make the script executable and reference it in your kustomization:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

generators:
- generators/multiapp.yaml
```

Run the build with alpha plugins enabled:

```bash
kustomize build --enable-alpha-plugins .
```

## Building a Python transformer plugin

Python provides better structured data handling for complex transformations:

```python
#!/usr/bin/env python3
# ~/.config/kustomize/plugin/transformers.example.com/v1/securityenhancer/SecurityEnhancer

import sys
import yaml

def add_security_context(resource):
    """Add security context to all containers."""
    kind = resource.get('kind')

    # Only process workload resources
    if kind not in ['Deployment', 'StatefulSet', 'DaemonSet']:
        return resource

    spec = resource.setdefault('spec', {})
    template = spec.setdefault('template', {})
    pod_spec = template.setdefault('spec', {})

    # Add pod-level security context
    if 'securityContext' not in pod_spec:
        pod_spec['securityContext'] = {}

    pod_spec['securityContext'].update({
        'runAsNonRoot': True,
        'runAsUser': 1000,
        'fsGroup': 1000
    })

    # Add container-level security context
    for container in pod_spec.get('containers', []):
        if 'securityContext' not in container:
            container['securityContext'] = {}

        container['securityContext'].update({
            'allowPrivilegeEscalation': False,
            'readOnlyRootFilesystem': True,
            'capabilities': {
                'drop': ['ALL']
            }
        })

    return resource

def main():
    if len(sys.argv) < 2:
        print("Error: Configuration file path required", file=sys.stderr)
        sys.exit(1)

    # Read transformer configuration from the file path Kustomize passes as $1
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    # Read resources to transform from stdin
    resources = [r for r in yaml.safe_load_all(sys.stdin) if r]

    # Transform each resource
    transformed = [add_security_context(r) for r in resources]

    # Output transformed resources
    yaml.dump_all(transformed, sys.stdout, default_flow_style=False)

if __name__ == '__main__':
    main()
```

Use the transformer in your kustomization and run the build with alpha plugins enabled:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml

transformers:
- |-
  apiVersion: transformers.example.com/v1
  kind: SecurityEnhancer
  metadata:
    name: add-security
```

```bash
kustomize build --enable-alpha-plugins .
```

## Using Go for production plugins

For production use, Go provides better performance and maintainability:

```go
// ~/.config/kustomize/plugin/transformers.example.com/v1/resourcelimiter/ResourceLimiter
package main

import (
    "bytes"
    "io"
    "os"

    "gopkg.in/yaml.v3"
)

type Config struct {
    Spec struct {
        CPULimit    string `yaml:"cpuLimit"`
        MemoryLimit string `yaml:"memoryLimit"`
    } `yaml:"spec"`
}

func ensureMap(obj map[string]interface{}, key string) map[string]interface{} {
    if existing, ok := obj[key].(map[string]interface{}); ok {
        return existing
    }
    next := map[string]interface{}{}
    obj[key] = next
    return next
}

func addLimits(resource map[string]interface{}, cfg Config) {
    kind, _ := resource["kind"].(string)
    if kind != "Deployment" && kind != "StatefulSet" {
        return
    }

    spec := ensureMap(resource, "spec")
    template := ensureMap(spec, "template")
    podSpec := ensureMap(template, "spec")

    containers, ok := podSpec["containers"].([]interface{})
    if !ok {
        return
    }

    for _, item := range containers {
        container, ok := item.(map[string]interface{})
        if !ok {
            continue
        }

        resources := ensureMap(container, "resources")
        limits := ensureMap(resources, "limits")
        limits["cpu"] = cfg.Spec.CPULimit
        limits["memory"] = cfg.Spec.MemoryLimit
    }
}

func main() {
    if len(os.Args) < 2 {
        _, _ = os.Stderr.WriteString("configuration file path required\n")
        os.Exit(1)
    }

    configBytes, err := os.ReadFile(os.Args[1])
    if err != nil {
        panic(err)
    }

    var cfg Config
    if err := yaml.Unmarshal(configBytes, &cfg); err != nil {
        panic(err)
    }

    input, err := io.ReadAll(os.Stdin)
    if err != nil {
        panic(err)
    }

    decoder := yaml.NewDecoder(bytes.NewReader(input))
    encoder := yaml.NewEncoder(os.Stdout)
    defer encoder.Close()

    for {
        var resource map[string]interface{}
        err := decoder.Decode(&resource)
        if err == io.EOF {
            break
        }
        if err != nil {
            panic(err)
        }
        if len(resource) == 0 {
            continue
        }

        addLimits(resource, cfg)
        if err := encoder.Encode(resource); err != nil {
            panic(err)
        }
    }
}
```

Compile the plugin and place the binary in the plugin directory. For this example, the plugin configuration should include `spec.cpuLimit` and `spec.memoryLimit`.

## Configuration-driven plugins

Make plugins flexible through configuration:

```yaml
# transformers/add-labels.yaml
apiVersion: transformers.example.com/v1
kind: LabelAdder
metadata:
  name: add-standard-labels
spec:
  labels:
    environment: production
    cost-center: "12345"
    compliance: required
  excludeKinds:
  - Secret
  - ConfigMap
```

The plugin reads these configuration values and applies labels selectively based on the rules.

## Plugin error handling

Plugins should provide clear error messages:

```python
#!/usr/bin/env python3
import sys
import yaml

def validate_config(config):
    """Validate plugin configuration."""
    required_fields = ['spec', 'spec.image']

    for field in required_fields:
        parts = field.split('.')
        obj = config
        for part in parts:
            if part not in obj:
                print(f"Error: Required field '{field}' missing", file=sys.stderr)
                sys.exit(1)
            obj = obj[part]

def main():
    try:
        if len(sys.argv) < 2:
            print("Error: Configuration file path required", file=sys.stderr)
            sys.exit(1)

        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        validate_config(config)

        # Process resources from stdin...

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

Error messages go to stderr and the plugin exits with a non-zero code, causing Kustomize to fail with a helpful message.

## Testing plugins locally

Test plugins independently before using them in kustomizations:

```bash
#!/bin/bash
# test-plugin.sh

# Create test input
cat > test-input.yaml <<EOF
apiVersion: generators.example.com/v1
kind: MultiAppGenerator
metadata:
  name: test
spec:
  apps:
  - name: test-app
    replicas: 1
  image: test:latest
EOF

# Run plugin
~/.config/kustomize/plugin/generators.example.com/v1/multiappgenerator/MultiAppGenerator test-input.yaml

# Validate output
if [ $? -eq 0 ]; then
    echo "Plugin test passed"
else
    echo "Plugin test failed"
    exit 1
fi
```

Include these tests in version control alongside your plugins.

## Plugin versioning

Maintain multiple plugin versions for backward compatibility:

```text
~/.config/kustomize/plugin/
└── generators.example.com/
    ├── v1/
    │   └── appgenerator/
    │       └── AppGenerator
    └── v2/
        └── appgenerator/
            └── AppGenerator
```

Consumers specify which version they need through the API version in their configuration:

```yaml
# Using v1
apiVersion: generators.example.com/v1
kind: AppGenerator

# Using v2
apiVersion: generators.example.com/v2
kind: AppGenerator
```

## Sharing plugins across teams

Distribute plugins through Git repositories or container images:

```dockerfile
# Dockerfile
FROM alpine:latest

RUN apk add --no-cache bash python3 py3-yaml

COPY plugins/ /kustomize/plugin/

CMD ["/bin/sh"]
```

Teams can mount this container's filesystem when running Kustomize:

```bash
docker run --rm -v "$PWD/plugins:/dest" plugin-container cp -r /kustomize/plugin/. /dest/
```

## Performance optimization

For plugins that process many resources, optimize performance:

```python
# Inefficient: Process resources one at a time
for resource in resources:
    transform(resource)

# Efficient: Batch process similar resources
deployments = [r for r in resources if r['kind'] == 'Deployment']
services = [r for r in resources if r['kind'] == 'Service']

transform_deployments(deployments)
transform_services(services)
```

Profile your plugins to identify bottlenecks, especially when working with large kustomizations.

## Security considerations

Plugins execute with the same permissions as the user running Kustomize. Validate inputs carefully to prevent injection attacks:

```python
import re

def validate_name(name):
    """Ensure name contains only safe characters."""
    if not re.match(r'^[a-z0-9-]+$', name):
        raise ValueError(f"Invalid name: {name}")
    return name
```

Never execute shell commands with unsanitized input from configuration files.

## Documentation requirements

Document your plugins thoroughly:

````markdown
# MultiAppGenerator Plugin

## Purpose
Generates multiple similar Deployments from a compact specification.

## Configuration

```yaml
apiVersion: generators.example.com/v1
kind: MultiAppGenerator
metadata:
  name: example
spec:
  apps:
  - name: app-name
    replicas: 3
  image: container:tag
```

## Fields
- `apps`: List of applications to generate
- `apps[].name`: Application name (used for Deployment name)
- `apps[].replicas`: Number of replicas
- `image`: Container image for all applications

## Output
Generates one Deployment per app in the apps list.
````

Include examples and common troubleshooting scenarios.

## Best practices for plugin development

Keep plugins focused on one responsibility. Multiple simple plugins are easier to maintain than one complex plugin.

Use standard libraries and tools when possible. Depend on widely available packages rather than obscure dependencies.

Validate inputs thoroughly. Plugins should fail fast with clear error messages when given invalid configuration.

Version your plugins using directories for different API versions. This allows consumers to upgrade at their own pace.

Test plugins with various inputs including edge cases. Automated tests prevent regressions when updating plugins.

## Conclusion

The Kustomize plugin system extends configuration management capabilities beyond built-in features, enabling organizations to implement custom logic specific to their requirements. Whether generating resources from compact specifications or enforcing organization-wide policies through transformers, plugins provide the flexibility needed for complex environments.

By following plugin development best practices and maintaining clear documentation, you can build a library of reusable components that enhance Kustomize for your entire organization. The plugin system's extensibility ensures Kustomize can adapt to virtually any configuration management need while maintaining its declarative, version-controlled approach.
