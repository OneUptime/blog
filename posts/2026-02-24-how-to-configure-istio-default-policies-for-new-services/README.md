# How to Configure Istio Default Policies for New Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Default Policies, Kubernetes, Security, Platform Engineering

Description: How to configure sensible default Istio policies that automatically apply to every new service deployed in your mesh without manual configuration.

---

When a new service joins your Istio mesh, it should get a set of sane defaults automatically. Timeouts, retries, circuit breaking, mTLS enforcement, and basic authorization should all be in place from day one. Relying on developers to manually configure these for every service means some services will inevitably ship without them. Defaults solve this by making the secure, resilient path the default path.

## Namespace-Level Defaults

The most effective way to set defaults in Istio is at the namespace level. When a team creates a new service in their namespace, it automatically inherits the namespace policies.

### Default mTLS Mode

Enforce strict mTLS for all services in a namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: team-backend
spec:
  mtls:
    mode: STRICT
```

This ensures every service in the team-backend namespace requires mutual TLS for incoming connections. No plaintext allowed.

### Default Authorization Policy

Start with a deny-all posture and allow specific traffic:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: team-backend
spec:
  {}
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-intra-namespace
  namespace: team-backend
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - team-backend
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-istio-system
  namespace: team-backend
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - istio-system
```

The empty spec on the first policy creates a default deny. The other two policies allow intra-namespace communication and traffic from the Istio system namespace (needed for health checks and ingress).

### Default Sidecar Scope

Limit the configuration that each sidecar receives:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: team-backend
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "team-frontend/*"
    - "team-shared/*"
```

This tells sidecars in team-backend to only load configuration for their own namespace, istio-system, team-frontend, and team-shared. In a cluster with hundreds of services, this dramatically reduces memory usage and configuration push time.

## Mesh-Wide Defaults

Some defaults should apply across the entire mesh. Configure these in the IstioOperator or meshConfig:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      # Default proxy concurrency
      concurrency: 2

      # Enable access logging
      accessLogFile: /dev/stdout
      accessLogEncoding: JSON

      # Default tracing sampling
      tracing:
        sampling: 10

    # Default timeout for HTTP requests
    defaultHttpRetryPolicy:
      attempts: 2
      perTryTimeout: 5s
      retryOn: connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes

    # Default destination rule settings
    defaultDestinationRuleExportTo:
    - "."
    - "istio-system"

    # Default virtual service export scope
    defaultServiceExportTo:
    - "."
    - "istio-system"
```

The `defaultServiceExportTo` and `defaultDestinationRuleExportTo` settings limit the visibility of services and rules to their own namespace and istio-system by default. Services that need to be visible to other namespaces must explicitly export.

## Automatic Sidecar Injection Defaults

Configure the sidecar injector with sensible resource defaults:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
        holdApplicationUntilProxyStarts: true
    sidecarInjectorWebhook:
      defaultTemplates:
      - sidecar
```

The `holdApplicationUntilProxyStarts: true` setting is an important default. It prevents the application container from starting before the Envoy proxy is ready, which avoids connection errors during startup.

## Namespace Initialization Controller

Automate the creation of default policies when a new namespace is labeled for Istio injection. Build a controller or use a Kubernetes initializer:

```python
import kopf
from kubernetes import client, config

config.load_incluster_config()
custom_api = client.CustomObjectsApi()

@kopf.on.update('', 'v1', 'namespaces', labels={'istio-injection': 'enabled'})
@kopf.on.create('', 'v1', 'namespaces', labels={'istio-injection': 'enabled'})
def init_istio_namespace(name, spec, **kwargs):
    # Create default PeerAuthentication
    peer_auth = {
        'apiVersion': 'security.istio.io/v1',
        'kind': 'PeerAuthentication',
        'metadata': {
            'name': 'default',
            'namespace': name
        },
        'spec': {
            'mtls': {'mode': 'STRICT'}
        }
    }

    # Create default deny AuthorizationPolicy
    deny_all = {
        'apiVersion': 'security.istio.io/v1',
        'kind': 'AuthorizationPolicy',
        'metadata': {
            'name': 'deny-all',
            'namespace': name
        },
        'spec': {}
    }

    # Create allow-same-namespace policy
    allow_ns = {
        'apiVersion': 'security.istio.io/v1',
        'kind': 'AuthorizationPolicy',
        'metadata': {
            'name': 'allow-same-namespace',
            'namespace': name
        },
        'spec': {
            'action': 'ALLOW',
            'rules': [{'from': [{'source': {'namespaces': [name]}}]}]
        }
    }

    # Create default sidecar scope
    sidecar = {
        'apiVersion': 'networking.istio.io/v1beta1',
        'kind': 'Sidecar',
        'metadata': {
            'name': 'default',
            'namespace': name
        },
        'spec': {
            'egress': [{'hosts': ['./*', 'istio-system/*']}]
        }
    }

    for resource, group, version, plural in [
        (peer_auth, 'security.istio.io', 'v1', 'peerauthentications'),
        (deny_all, 'security.istio.io', 'v1', 'authorizationpolicies'),
        (allow_ns, 'security.istio.io', 'v1', 'authorizationpolicies'),
        (sidecar, 'networking.istio.io', 'v1beta1', 'sidecars'),
    ]:
        try:
            custom_api.create_namespaced_custom_object(
                group, version, name, plural, resource
            )
        except client.exceptions.ApiException as e:
            if e.status != 409:  # Ignore already exists
                raise
```

## Default Telemetry Configuration

Set up default observability for every namespace:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: default
  namespace: team-backend
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code >= 400"
  tracing:
  - randomSamplingPercentage: 10
    providers:
    - name: zipkin
  metrics:
  - providers:
    - name: prometheus
```

This configures access logging only for error responses (to reduce log volume), 10% trace sampling, and Prometheus metrics for all services in the namespace.

## Default DestinationRule for All Services

Apply a wildcard DestinationRule that gives every service circuit breaking:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: default-circuit-breaker
  namespace: team-backend
spec:
  host: "*.team-backend.svc.cluster.local"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
```

The wildcard host `*.team-backend.svc.cluster.local` matches all services in the namespace. Individual services can override these with their own DestinationRule that has a more specific host.

## Verifying Defaults Are Applied

Check that a new service picks up all the defaults:

```bash
# Deploy a new service
kubectl apply -f new-service.yaml -n team-backend

# Verify mTLS
istioctl x describe pod new-service-abc123 -n team-backend

# Verify authorization
istioctl x authz check new-service-abc123 -n team-backend

# Verify sidecar configuration scope
istioctl proxy-config cluster new-service-abc123 -n team-backend
```

The sidecar should show a limited set of clusters (only the namespaces listed in the Sidecar resource) rather than every service in the mesh.

## Overriding Defaults

Defaults should be overridable. A service that needs to talk to an external namespace can create its own Sidecar resource:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: my-service
  namespace: team-backend
spec:
  workloadSelector:
    labels:
      app: my-service
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "team-data/*"
    - "team-analytics/*"
```

The workload-specific Sidecar takes precedence over the namespace-level default.

## Summary

Default Istio policies ensure every service starts with security, resiliency, and observability baked in. Use namespace-level PeerAuthentication for mTLS, AuthorizationPolicies for default-deny access control, Sidecar resources for configuration scope, wildcard DestinationRules for circuit breaking, and Telemetry resources for observability. Automate the creation of these defaults when new namespaces are labeled for Istio injection. Let individual services override defaults when they have specific needs, but make the safe configuration the path of least resistance.
