# How to Build Istio Configuration Wizards

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Configuration, Developer Tools, Platform Engineering, Automation

Description: How to build interactive configuration wizards that guide developers through creating correct Istio configurations without needing deep mesh expertise.

---

Even with templates and abstractions, developers sometimes need to create custom Istio configurations. A wizard guides them through the process step by step, asking questions in plain language and generating the correct YAML. This is especially valuable for complex scenarios like canary deployments, mTLS exceptions, or multi-service routing that involve multiple interconnected resources.

## Why Wizards Work

Wizards work because they:

- Ask one question at a time instead of presenting a wall of YAML
- Only show relevant options based on previous answers
- Validate as they go, catching mistakes immediately
- Generate all related resources together (VirtualService + DestinationRule)
- Include comments explaining what each section does

## Building a CLI Wizard

A CLI wizard is the simplest starting point. Use a scripting language with a good prompt library. Here is a Python wizard using `questionary`:

```python
#!/usr/bin/env python3
import questionary
import yaml
import sys

def main():
    print("Istio Configuration Wizard")
    print("=" * 40)

    # Step 1: What do you want to configure?
    config_type = questionary.select(
        "What would you like to configure?",
        choices=[
            "Traffic routing (canary, blue-green, weighted)",
            "Service access control (authorization)",
            "Resiliency (timeouts, retries, circuit breaking)",
            "External ingress (expose service outside cluster)",
        ]
    ).ask()

    if "Traffic routing" in config_type:
        generate_traffic_config()
    elif "access control" in config_type:
        generate_auth_config()
    elif "Resiliency" in config_type:
        generate_resiliency_config()
    elif "ingress" in config_type:
        generate_ingress_config()


def generate_traffic_config():
    service_name = questionary.text(
        "Service name:",
        validate=lambda x: len(x) > 0
    ).ask()

    namespace = questionary.text(
        "Namespace:",
        validate=lambda x: len(x) > 0
    ).ask()

    port = questionary.text(
        "Service port:",
        default="8080",
        validate=lambda x: x.isdigit()
    ).ask()

    strategy = questionary.select(
        "Routing strategy:",
        choices=["Canary (gradual rollout)", "Blue-Green (instant switch)", "Weighted (custom split)"]
    ).ask()

    versions = []
    if "Canary" in strategy:
        canary_weight = questionary.text(
            "Canary traffic percentage (0-100):",
            default="10",
            validate=lambda x: x.isdigit() and 0 <= int(x) <= 100
        ).ask()
        versions = [
            {"name": "stable", "labels": {"version": "v1"}, "weight": 100 - int(canary_weight)},
            {"name": "canary", "labels": {"version": "v2"}, "weight": int(canary_weight)},
        ]
    elif "Blue-Green" in strategy:
        active = questionary.select(
            "Which version should receive traffic?",
            choices=["v1 (blue)", "v2 (green)"]
        ).ask()
        if "v1" in active:
            versions = [
                {"name": "blue", "labels": {"version": "v1"}, "weight": 100},
                {"name": "green", "labels": {"version": "v2"}, "weight": 0},
            ]
        else:
            versions = [
                {"name": "blue", "labels": {"version": "v1"}, "weight": 0},
                {"name": "green", "labels": {"version": "v2"}, "weight": 100},
            ]
    elif "Weighted" in strategy:
        num_versions = questionary.text(
            "Number of versions:",
            default="2",
            validate=lambda x: x.isdigit() and int(x) > 0
        ).ask()
        remaining = 100
        for i in range(int(num_versions)):
            v_name = questionary.text(f"Version {i+1} name:").ask()
            v_label = questionary.text(f"Version {i+1} label value:").ask()
            if i < int(num_versions) - 1:
                weight = questionary.text(
                    f"Weight for {v_name} (remaining: {remaining}):",
                    validate=lambda x: x.isdigit() and int(x) <= remaining
                ).ask()
                remaining -= int(weight)
            else:
                weight = str(remaining)
                print(f"Weight for {v_name}: {weight} (remaining)")
            versions.append({"name": v_name, "labels": {"version": v_label}, "weight": int(weight)})

    # Generate the YAML
    vs = {
        "apiVersion": "networking.istio.io/v1beta1",
        "kind": "VirtualService",
        "metadata": {
            "name": service_name,
            "namespace": namespace,
        },
        "spec": {
            "hosts": [service_name],
            "http": [{
                "route": [
                    {
                        "destination": {
                            "host": service_name,
                            "subset": v["name"],
                            "port": {"number": int(port)},
                        },
                        "weight": v["weight"],
                    }
                    for v in versions if v["weight"] > 0
                ]
            }]
        }
    }

    dr = {
        "apiVersion": "networking.istio.io/v1beta1",
        "kind": "DestinationRule",
        "metadata": {
            "name": service_name,
            "namespace": namespace,
        },
        "spec": {
            "host": service_name,
            "subsets": [
                {"name": v["name"], "labels": v["labels"]}
                for v in versions
            ]
        }
    }

    output = yaml.dump(vs, default_flow_style=False)
    output += "---\n"
    output += yaml.dump(dr, default_flow_style=False)

    print("\n" + "=" * 40)
    print("Generated Configuration:")
    print("=" * 40)
    print(output)

    save = questionary.confirm("Save to file?", default=True).ask()
    if save:
        filename = questionary.text(
            "Filename:",
            default=f"{service_name}-istio.yaml"
        ).ask()
        with open(filename, 'w') as f:
            f.write(output)
        print(f"Saved to {filename}")

    apply_now = questionary.confirm("Apply to cluster now?", default=False).ask()
    if apply_now:
        import subprocess
        subprocess.run(["kubectl", "apply", "-f", filename])


if __name__ == "__main__":
    main()
```

## Building a Web-Based Wizard

For broader adoption, build a web interface. Here is a React-based wizard component:

```jsx
import React, { useState } from 'react';
import yaml from 'js-yaml';

function IstioWizard() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    serviceName: '',
    namespace: '',
    port: 8080,
    strategy: '',
    canaryWeight: 10,
    timeout: '10s',
    retries: 3,
  });

  const steps = [
    // Step 0: Basic info
    <div key="basic">
      <h2>Service Information</h2>
      <label>Service Name</label>
      <input
        value={config.serviceName}
        onChange={e => setConfig({...config, serviceName: e.target.value})}
      />
      <label>Namespace</label>
      <input
        value={config.namespace}
        onChange={e => setConfig({...config, namespace: e.target.value})}
      />
      <label>Port</label>
      <input
        type="number"
        value={config.port}
        onChange={e => setConfig({...config, port: parseInt(e.target.value)})}
      />
    </div>,

    // Step 1: Routing strategy
    <div key="routing">
      <h2>Routing Strategy</h2>
      {['canary', 'blue-green', 'weighted'].map(s => (
        <button
          key={s}
          onClick={() => setConfig({...config, strategy: s})}
          className={config.strategy === s ? 'selected' : ''}
        >
          {s}
        </button>
      ))}
      {config.strategy === 'canary' && (
        <div>
          <label>Canary Traffic: {config.canaryWeight}%</label>
          <input
            type="range" min="0" max="100"
            value={config.canaryWeight}
            onChange={e => setConfig({...config, canaryWeight: parseInt(e.target.value)})}
          />
        </div>
      )}
    </div>,

    // Step 2: Review and generate
    <div key="review">
      <h2>Review Configuration</h2>
      <pre>{generateYaml(config)}</pre>
      <button onClick={() => copyToClipboard(generateYaml(config))}>
        Copy to Clipboard
      </button>
    </div>
  ];

  return (
    <div className="wizard">
      {steps[step]}
      <div className="navigation">
        {step > 0 && <button onClick={() => setStep(step - 1)}>Back</button>}
        {step < steps.length - 1 && (
          <button onClick={() => setStep(step + 1)}>Next</button>
        )}
      </div>
    </div>
  );
}

function generateYaml(config) {
  const vs = {
    apiVersion: 'networking.istio.io/v1beta1',
    kind: 'VirtualService',
    metadata: {
      name: config.serviceName,
      namespace: config.namespace,
    },
    spec: {
      hosts: [config.serviceName],
      http: [{
        timeout: config.timeout,
        route: [
          {
            destination: {
              host: config.serviceName,
              subset: 'stable',
              port: { number: config.port },
            },
            weight: 100 - config.canaryWeight,
          },
          {
            destination: {
              host: config.serviceName,
              subset: 'canary',
              port: { number: config.port },
            },
            weight: config.canaryWeight,
          },
        ]
      }]
    }
  };

  return yaml.dump(vs);
}
```

## Adding Validation to the Wizard

The wizard should validate configurations before presenting them to the user:

```python
def validate_config(config):
    errors = []

    # Check service name is valid DNS
    import re
    if not re.match(r'^[a-z][a-z0-9-]*$', config['service_name']):
        errors.append("Service name must be lowercase alphanumeric with hyphens")

    # Check weights sum to 100
    total = sum(v['weight'] for v in config['versions'])
    if total != 100:
        errors.append(f"Traffic weights must sum to 100 (currently {total})")

    # Check timeout format
    timeout = config.get('timeout', '')
    if timeout and not re.match(r'^\d+[sm]$', timeout):
        errors.append("Timeout must be in format like '10s' or '1m'")

    # Check namespace exists
    try:
        v1 = client.CoreV1Api()
        v1.read_namespace(config['namespace'])
    except client.exceptions.ApiException:
        errors.append(f"Namespace '{config['namespace']}' does not exist")

    return errors
```

## Wizard for Complex Scenarios

Some scenarios involve multiple services and complex routing rules. A wizard handles these by asking structured questions:

```python
def generate_traffic_mirror_config():
    print("Traffic Mirroring Configuration")

    service = questionary.text("Primary service name:").ask()
    mirror_service = questionary.text("Mirror service name:").ask()
    mirror_percentage = questionary.text(
        "Mirror traffic percentage (1-100):",
        default="100"
    ).ask()

    vs = {
        "apiVersion": "networking.istio.io/v1beta1",
        "kind": "VirtualService",
        "metadata": {"name": service},
        "spec": {
            "hosts": [service],
            "http": [{
                "route": [{
                    "destination": {"host": service}
                }],
                "mirror": {
                    "host": mirror_service
                },
                "mirrorPercentage": {
                    "value": float(mirror_percentage)
                }
            }]
        }
    }

    return yaml.dump(vs)
```

## Integrating with GitOps

After the wizard generates YAML, offer to create a pull request:

```python
def create_pr(filename, content, service_name):
    import subprocess

    branch = f"istio-config/{service_name}"
    subprocess.run(["git", "checkout", "-b", branch])

    with open(filename, 'w') as f:
        f.write(content)

    subprocess.run(["git", "add", filename])
    subprocess.run(["git", "commit", "-m", f"Add Istio configuration for {service_name}"])
    subprocess.run(["git", "push", "origin", branch])

    # Create PR using gh CLI
    subprocess.run([
        "gh", "pr", "create",
        "--title", f"Istio config for {service_name}",
        "--body", f"Generated by Istio Configuration Wizard\n\nService: {service_name}"
    ])
```

## Packaging and Distribution

Package the CLI wizard as a single binary or pip package:

```bash
# Install as a pip package
pip install istio-wizard

# Or use as a standalone script
curl -sL https://internal.company.com/tools/istio-wizard | python3
```

For the web wizard, deploy it alongside your internal developer portal:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: istio-wizard
  namespace: platform-tools
spec:
  replicas: 2
  selector:
    matchLabels:
      app: istio-wizard
  template:
    metadata:
      labels:
        app: istio-wizard
    spec:
      containers:
      - name: wizard
        image: internal/istio-wizard:v1
        ports:
        - containerPort: 3000
```

## Summary

Configuration wizards make Istio accessible to developers who do not want to memorize CRD schemas. A CLI wizard works well for teams that live in the terminal, while a web wizard reaches a broader audience. The key features are step-by-step guidance, real-time validation, generation of all related resources, and integration with GitOps workflows. Build wizards for the most common scenarios (canary deployments, service access, ingress exposure) and expand from there based on what teams actually request. The wizard becomes the front door to Istio for most developers, and the raw YAML remains available for advanced users.
