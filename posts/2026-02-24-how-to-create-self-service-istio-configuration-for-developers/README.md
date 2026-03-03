# How to Create Self-Service Istio Configuration for Developers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Self-Service, Platform Engineering, Kubernetes, DevOps

Description: How to enable application developers to self-serve common Istio configurations through simplified interfaces without needing mesh expertise.

---

Most developers do not want to become Istio experts. They want to deploy their service, route some traffic, and make sure things are secure and observable. The gap between what Istio can do and what developers need to do is where self-service tooling fits in. You build interfaces that translate simple developer intent into correct Istio configuration, with guardrails to prevent misconfigurations.

## Identifying Self-Service Use Cases

Start by figuring out what developers actually need to configure themselves. In most organizations, these are the top requests:

- Route traffic to a new version of their service (canary, blue-green)
- Add a timeout or retry policy to an upstream dependency
- Grant another service access to their endpoints
- Expose a service externally through the ingress gateway
- View metrics and traces for their service

Everything else (mesh-wide policies, mTLS configuration, control plane settings) should remain with the platform team.

## Using Kubernetes Custom Resources

The cleanest approach is creating Custom Resource Definitions (CRDs) that represent developer-level concepts. Here is a CRD for traffic routing:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: trafficroutes.platform.company.com
spec:
  group: platform.company.com
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
            required: ["service"]
            properties:
              service:
                type: string
              routes:
                type: array
                items:
                  type: object
                  properties:
                    version:
                      type: string
                    weight:
                      type: integer
                      minimum: 0
                      maximum: 100
              timeout:
                type: string
              retries:
                type: integer
                minimum: 0
                maximum: 10
  scope: Namespaced
  names:
    plural: trafficroutes
    singular: trafficroute
    kind: TrafficRoute
```

Developers create resources like:

```yaml
apiVersion: platform.company.com/v1
kind: TrafficRoute
metadata:
  name: my-service-route
  namespace: team-checkout
spec:
  service: checkout-api
  routes:
  - version: v1
    weight: 80
  - version: v2
    weight: 20
  timeout: 5s
  retries: 3
```

## Building the Translation Controller

A controller watches TrafficRoute resources and creates the corresponding Istio VirtualService and DestinationRule:

```python
import kopf
from kubernetes import client, config
import yaml

config.load_incluster_config()
custom_api = client.CustomObjectsApi()

@kopf.on.create('platform.company.com', 'v1', 'trafficroutes')
@kopf.on.update('platform.company.com', 'v1', 'trafficroutes')
def handle_traffic_route(spec, name, namespace, **kwargs):
    service = spec['service']
    routes = spec.get('routes', [])
    timeout = spec.get('timeout', '30s')
    retries = spec.get('retries', 0)

    # Build VirtualService
    vs = {
        'apiVersion': 'networking.istio.io/v1beta1',
        'kind': 'VirtualService',
        'metadata': {
            'name': f'{service}-managed',
            'namespace': namespace,
            'labels': {
                'managed-by': 'platform-controller'
            }
        },
        'spec': {
            'hosts': [service],
            'http': [{
                'timeout': timeout,
                'route': [
                    {
                        'destination': {
                            'host': service,
                            'subset': route['version']
                        },
                        'weight': route['weight']
                    }
                    for route in routes
                ]
            }]
        }
    }

    if retries > 0:
        vs['spec']['http'][0]['retries'] = {
            'attempts': retries,
            'perTryTimeout': timeout
        }

    # Build DestinationRule
    dr = {
        'apiVersion': 'networking.istio.io/v1beta1',
        'kind': 'DestinationRule',
        'metadata': {
            'name': f'{service}-managed',
            'namespace': namespace,
            'labels': {
                'managed-by': 'platform-controller'
            }
        },
        'spec': {
            'host': service,
            'subsets': [
                {
                    'name': route['version'],
                    'labels': {'version': route['version']}
                }
                for route in routes
            ]
        }
    }

    # Apply VirtualService
    try:
        custom_api.create_namespaced_custom_object(
            'networking.istio.io', 'v1beta1', namespace,
            'virtualservices', vs
        )
    except client.exceptions.ApiException as e:
        if e.status == 409:
            custom_api.patch_namespaced_custom_object(
                'networking.istio.io', 'v1beta1', namespace,
                'virtualservices', f'{service}-managed', vs
            )

    # Apply DestinationRule
    try:
        custom_api.create_namespaced_custom_object(
            'networking.istio.io', 'v1beta1', namespace,
            'destinationrules', dr
        )
    except client.exceptions.ApiException as e:
        if e.status == 409:
            custom_api.patch_namespaced_custom_object(
                'networking.istio.io', 'v1beta1', namespace,
                'destinationrules', f'{service}-managed', dr
            )
```

## Self-Service Authorization Policies

Create a simplified interface for service access control:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: serviceaccess.platform.company.com
spec:
  group: platform.company.com
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
              allowFrom:
                type: array
                items:
                  type: object
                  properties:
                    service:
                      type: string
                    namespace:
                      type: string
                    paths:
                      type: array
                      items:
                        type: string
  scope: Namespaced
  names:
    plural: serviceaccess
    singular: serviceaccess
    kind: ServiceAccess
```

Developers write:

```yaml
apiVersion: platform.company.com/v1
kind: ServiceAccess
metadata:
  name: checkout-api-access
  namespace: team-checkout
spec:
  allowFrom:
  - service: frontend
    namespace: team-frontend
    paths: ["/api/v1/cart", "/api/v1/checkout"]
  - service: admin-dashboard
    namespace: team-admin
    paths: ["/api/v1/*"]
```

The controller translates this to an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: checkout-api-access
  namespace: team-checkout
spec:
  selector:
    matchLabels:
      app: checkout-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - cluster.local/ns/team-frontend/sa/frontend
    to:
    - operation:
        paths: ["/api/v1/cart", "/api/v1/checkout"]
  - from:
    - source:
        principals:
        - cluster.local/ns/team-admin/sa/admin-dashboard
    to:
    - operation:
        paths: ["/api/v1/*"]
```

## Self-Service Ingress

Letting developers expose services externally through a simplified resource:

```yaml
apiVersion: platform.company.com/v1
kind: ExternalEndpoint
metadata:
  name: checkout-external
  namespace: team-checkout
spec:
  service: checkout-api
  port: 8080
  hostname: checkout.mycompany.com
  tls: true
  paths:
  - /api/v1/public
```

This creates a Gateway entry and VirtualService that routes external traffic to the service, with TLS automatically configured through cert-manager.

## Validation Webhooks

Prevent misconfigurations with admission webhooks:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: platform-validation
webhooks:
- name: validate.platform.company.com
  clientConfig:
    service:
      name: platform-webhook
      namespace: platform-system
      path: /validate
  rules:
  - apiGroups: ["platform.company.com"]
    resources: ["trafficroutes", "serviceaccess", "externalendpoints"]
    operations: ["CREATE", "UPDATE"]
    apiVersions: ["v1"]
  failurePolicy: Fail
```

The webhook validates things like:

- Traffic weights add up to 100
- Timeout values are within acceptable ranges
- Referenced services actually exist
- Developers only configure resources in their own namespace

```python
def validate_traffic_route(spec):
    errors = []

    routes = spec.get('routes', [])
    total_weight = sum(r.get('weight', 0) for r in routes)
    if total_weight != 100:
        errors.append(f"Route weights must sum to 100, got {total_weight}")

    timeout = spec.get('timeout', '30s')
    if parse_duration(timeout) > 60:
        errors.append("Timeout cannot exceed 60 seconds")

    retries = spec.get('retries', 0)
    if retries > 10:
        errors.append("Retries cannot exceed 10")

    return errors
```

## GitOps Integration

For teams using GitOps, the self-service resources live in their application repositories:

```text
my-service/
  k8s/
    deployment.yaml
    service.yaml
    traffic-route.yaml     # Platform CRD
    service-access.yaml    # Platform CRD
```

ArgoCD or Flux syncs these resources, and the platform controller creates the corresponding Istio configurations. Developers never need to touch Istio YAML directly.

## Providing Status Feedback

Developers need to know if their configurations are working. Update the status subresource of your custom resources:

```yaml
apiVersion: platform.company.com/v1
kind: TrafficRoute
metadata:
  name: my-service-route
  namespace: team-checkout
spec:
  service: checkout-api
  routes:
  - version: v1
    weight: 80
  - version: v2
    weight: 20
status:
  state: Active
  message: "VirtualService and DestinationRule created successfully"
  lastUpdated: "2026-02-24T10:30:00Z"
  istioResources:
  - kind: VirtualService
    name: checkout-api-managed
  - kind: DestinationRule
    name: checkout-api-managed
```

Developers can check:

```bash
kubectl get trafficroutes -n team-checkout
```

## Summary

Self-service Istio configuration is about giving developers simple, validated interfaces that translate into correct Istio resources. Custom Resource Definitions define the developer-facing API, a controller handles the translation, and validation webhooks prevent misconfigurations. This approach integrates naturally with GitOps workflows and gives developers clear status feedback. The platform team stays in control of mesh-wide policies while application teams can independently manage their own traffic routing, access control, and resiliency settings.
