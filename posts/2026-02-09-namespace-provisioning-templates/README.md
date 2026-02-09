# How to Build Namespace Provisioning Templates with Pre-Configured RBAC and Network Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Templates, Automation

Description: Learn how to create reusable namespace provisioning templates that automatically configure RBAC, network policies, resource quotas, and other resources for consistent, secure namespace deployment.

---

Namespace provisioning templates standardize namespace creation by packaging RBAC policies, network policies, resource quotas, and other configurations into reusable blueprints. Templates ensure consistency, reduce errors, and accelerate environment provisioning while maintaining security and governance standards.

This guide covers building comprehensive namespace templates for different use cases.

## Template Architecture

A complete namespace template includes:

- Namespace definition with labels and annotations
- Resource quotas and limit ranges
- RBAC roles and bindings
- Network policies
- Pod security standards
- Service accounts
- Default ConfigMaps and Secrets

## Creating Base Templates

Build a foundational template:

```yaml
# templates/base-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ${NAMESPACE_NAME}
  labels:
    environment: ${ENVIRONMENT}
    team: ${TEAM_NAME}
    managed-by: platform-team
    template-version: v1.0.0
  annotations:
    contact-email: ${CONTACT_EMAIL}
    created-by: ${CREATED_BY}
    cost-center: ${COST_CENTER}
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: ${NAMESPACE_NAME}
spec:
  hard:
    requests.cpu: ${CPU_QUOTA}
    requests.memory: ${MEMORY_QUOTA}
    limits.cpu: ${CPU_LIMIT}
    limits.memory: ${MEMORY_LIMIT}
    pods: ${POD_QUOTA}
    services: "50"
    configmaps: "100"
    secrets: "100"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: ${NAMESPACE_NAME}
spec:
  limits:
  - type: Container
    max:
      cpu: "8"
      memory: 16Gi
    min:
      cpu: "100m"
      memory: 128Mi
    default:
      cpu: "500m"
      memory: 512Mi
    defaultRequest:
      cpu: "250m"
      memory: 256Mi
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: ${NAMESPACE_NAME}
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: ${NAMESPACE_NAME}
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector: {}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: ${NAMESPACE_NAME}
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-admin
  namespace: ${NAMESPACE_NAME}
rules:
- apiGroups: ["", "apps", "batch", "extensions"]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: ["networking.k8s.io"]
  resources: ["*"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-admin-binding
  namespace: ${NAMESPACE_NAME}
subjects:
- kind: Group
  name: ${TEAM_NAME}-admins
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: namespace-admin
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: default-app-sa
  namespace: ${NAMESPACE_NAME}
```

## Environment-Specific Templates

Create templates for different environments:

```yaml
# templates/production-namespace.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: environment-config
  namespace: ${NAMESPACE_NAME}
data:
  environment: production
  log-level: info
  monitoring-enabled: "true"
  backup-enabled: "true"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: ${NAMESPACE_NAME}
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    limits.cpu: "200"
    limits.memory: 400Gi
    pods: "500"
    persistentvolumeclaims: "100"
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: ${NAMESPACE_NAME}
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 9090
---
# templates/development-namespace.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: environment-config
  namespace: ${NAMESPACE_NAME}
data:
  environment: development
  log-level: debug
  monitoring-enabled: "false"
  backup-enabled: "false"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: development-quota
  namespace: ${NAMESPACE_NAME}
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    pods: "100"
```

## Template Rendering Engine

Build a template processor:

```python
#!/usr/bin/env python3
import yaml
import sys
from string import Template

def render_template(template_file, values):
    with open(template_file, 'r') as f:
        template_content = f.read()

    # Substitute variables
    template = Template(template_content)
    rendered = template.substitute(values)

    # Parse and return YAML documents
    return list(yaml.safe_load_all(rendered))

def create_namespace_from_template(template_name, params):
    template_file = f"templates/{template_name}.yaml"

    # Default values
    values = {
        'NAMESPACE_NAME': params['name'],
        'ENVIRONMENT': params.get('environment', 'development'),
        'TEAM_NAME': params['team'],
        'CONTACT_EMAIL': params['contact_email'],
        'CREATED_BY': params.get('created_by', 'platform-team'),
        'COST_CENTER': params.get('cost_center', 'unknown'),
        'CPU_QUOTA': params.get('cpu_quota', '20'),
        'MEMORY_QUOTA': params.get('memory_quota', '40Gi'),
        'CPU_LIMIT': params.get('cpu_limit', '40'),
        'MEMORY_LIMIT': params.get('memory_limit', '80Gi'),
        'POD_QUOTA': params.get('pod_quota', '100'),
    }

    # Render template
    documents = render_template(template_file, values)

    # Apply to cluster
    from kubernetes import client, config
    config.load_kube_config()

    for doc in documents:
        kind = doc['kind']
        api_version = doc['apiVersion']

        if kind == 'Namespace':
            v1 = client.CoreV1Api()
            v1.create_namespace(body=doc)
        elif kind == 'ResourceQuota':
            v1 = client.CoreV1Api()
            v1.create_namespaced_resource_quota(
                namespace=values['NAMESPACE_NAME'],
                body=doc
            )
        elif kind == 'NetworkPolicy':
            net_v1 = client.NetworkingV1Api()
            net_v1.create_namespaced_network_policy(
                namespace=values['NAMESPACE_NAME'],
                body=doc
            )
        # Add handlers for other resource types

    print(f"Namespace {values['NAMESPACE_NAME']} created from template {template_name}")

if __name__ == "__main__":
    params = {
        'name': 'team-backend-prod',
        'environment': 'production',
        'team': 'backend',
        'contact_email': 'backend@company.com',
        'cpu_quota': '100',
        'memory_quota': '200Gi'
    }

    create_namespace_from_template('production-namespace', params)
```

## Using Helm for Templates

Create a Helm chart for namespace provisioning:

```yaml
# Chart.yaml
apiVersion: v2
name: namespace-template
description: Standard namespace provisioning template
version: 1.0.0
appVersion: "1.0"

# values.yaml
namespace:
  name: ""
  labels:
    team: ""
    environment: ""
    costCenter: ""
  annotations:
    contactEmail: ""

resourceQuota:
  cpu: "50"
  memory: "100Gi"
  pods: "200"

networkPolicies:
  denyAllIngress: true
  allowSameNamespace: true
  allowDNS: true
  allowMonitoring: false

rbac:
  adminGroups: []
  viewerGroups: []

# templates/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace.name }}
  labels:
    {{- range $key, $val := .Values.namespace.labels }}
    {{ $key }}: {{ $val }}
    {{- end }}
  annotations:
    {{- range $key, $val := .Values.namespace.annotations }}
    {{ $key }}: {{ $val }}
    {{- end }}
```

Deploy using Helm:

```bash
helm install backend-prod ./namespace-template \
  --set namespace.name=team-backend-prod \
  --set namespace.labels.team=backend \
  --set namespace.labels.environment=production \
  --set resourceQuota.cpu=100 \
  --set resourceQuota.memory=200Gi
```

## Template Validation

Validate templates before application:

```python
def validate_template(template_file, values):
    try:
        documents = render_template(template_file, values)

        # Validate each document
        for doc in documents:
            # Check required fields
            if 'apiVersion' not in doc or 'kind' not in doc:
                raise ValueError(f"Missing required fields in document")

            # Validate resource quotas
            if doc['kind'] == 'ResourceQuota':
                validate_resource_quota(doc)

            # Validate network policies
            if doc['kind'] == 'NetworkPolicy':
                validate_network_policy(doc)

        print("Template validation passed")
        return True

    except Exception as e:
        print(f"Template validation failed: {e}")
        return False

def validate_resource_quota(quota):
    hard_limits = quota['spec']['hard']

    # Ensure CPU limits are >= requests
    if 'limits.cpu' in hard_limits and 'requests.cpu' in hard_limits:
        # Parse and compare CPU values
        pass

    # Similar checks for memory and other resources
```

## Best Practices

Follow these guidelines:

1. Version control all templates
2. Include comprehensive documentation
3. Validate templates before deployment
4. Use environment-specific templates
5. Implement template testing
6. Maintain backward compatibility
7. Document all template variables
8. Use meaningful defaults
9. Include examples for each template
10. Regular template reviews and updates

## Conclusion

Namespace provisioning templates standardize environment creation, reduce configuration drift, and accelerate deployment while maintaining security and compliance. By packaging best practices into reusable templates, platform teams can ensure consistent configuration across all namespaces while empowering developers with self-service capabilities.

Key components include base templates with security defaults, environment-specific configurations, automated rendering engines, validation frameworks, and version control integration. With well-designed templates, organizations can provision secure, compliant namespaces at scale with minimal manual effort.
