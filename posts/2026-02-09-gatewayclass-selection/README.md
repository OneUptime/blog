# How to configure GatewayClass for selecting gateway implementation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, GatewayClass

Description: Learn how to create and configure GatewayClass resources to select and configure gateway controller implementations in Kubernetes.

---

GatewayClass is the resource that connects gateway infrastructure to specific controller implementations. Think of it as a template that defines which gateway controller handles your Gateways and what default configuration it uses. Understanding GatewayClass selection is essential for running multiple gateway types or managing gateways across teams in a Kubernetes cluster.

## Understanding GatewayClass

GatewayClass serves two purposes: it selects which controller manages Gateways of that class, and it provides a place for controller-specific configuration parameters. Different controllers like Istio, NGINX, Envoy Gateway, or HAProxy each provide their own GatewayClass implementations.

Users create Gateway resources that reference a GatewayClass, and the appropriate controller provisions the actual gateway infrastructure based on that class definition.

## Creating a Basic GatewayClass

Start with a simple GatewayClass that references a controller.

```yaml
# gatewayclass-basic.yaml

apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: nginx-gateway
spec:
  controllerName: gateway.nginx.org/nginx-gateway-controller
  description: "NGINX Gateway Controller"
```

Apply the GatewayClass:

```bash
kubectl apply -f gatewayclass-basic.yaml

# Verify it was accepted by the controller
kubectl get gatewayclass nginx-gateway -o wide
```

The controller watches for GatewayClasses with its controllerName and marks them as Accepted when ready.

## Configuring Controller-Specific Parameters

Different controllers support different configuration options. Some controllers use `parametersRef`; others use their own defaulting mechanism.

```yaml
# gatewayclass-with-params.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy-gateway
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
  description: "Envoy Gateway Controller"
  parametersRef:
    group: gateway.envoyproxy.io
    kind: EnvoyProxy
    name: envoy-gateway-config
    namespace: default

---
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: EnvoyProxy
metadata:
  name: envoy-gateway-config
  namespace: default
spec:
  provider:
    type: Kubernetes
    kubernetes:
      envoyDeployment:
        replicas: 3
        container:
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
```

This configuration tells Envoy Gateway how to provision gateway infrastructure.

## Creating Multiple GatewayClasses

Run multiple gateway implementations simultaneously for different use cases.

```yaml
# multiple-gatewayclasses.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: external-gateway
  labels:
    scope: external
spec:
  controllerName: gateway.nginx.org/nginx-gateway-controller
  description: "External-facing NGINX gateways"
  parametersRef:
    group: gateway.nginx.org
    kind: NginxProxy
    name: external-config
    namespace: default

---
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: internal-gateway
  labels:
    scope: internal
spec:
  controllerName: istio.io/gateway-controller
  description: "Internal-only Istio gateways"

---
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: service-mesh
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
  description: "Envoy Gateway service mesh gateway"
```

Different teams or applications can select appropriate GatewayClasses for their needs. Check your controller documentation before creating multiple classes with the same controller, because some implementations only manage one GatewayClass per controller deployment.

## Checking GatewayClass Status

Monitor GatewayClass acceptance and readiness.

```bash
# Check GatewayClass status
kubectl get gatewayclass

# Output shows:
# NAME               CONTROLLER                        ACCEPTED   AGE
# nginx-gateway      gateway.nginx.org/nginx-gateway-controller   True       5m
# istio-gateway      istio.io/gateway-controller         True       5m

# Get detailed status
kubectl describe gatewayclass nginx-gateway

# Check conditions
kubectl get gatewayclass nginx-gateway -o jsonpath='{.status.conditions[*]}'
```

An Accepted condition with status True means the controller recognized and accepted the GatewayClass.

## Implementing GatewayClass with RBAC

Control who can create GatewayClasses and which GatewayClasses a team can reference.

```yaml
# gatewayclass-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: gatewayclass-admin
rules:
  - apiGroups: ["gateway.networking.k8s.io"]
    resources: ["gatewayclasses"]
    verbs: ["create", "update", "patch", "delete"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: gateway-creator
rules:
  - apiGroups: ["gateway.networking.k8s.io"]
    resources: ["gateways"]
    verbs: ["create", "update", "patch", "delete"]
  - apiGroups: ["gateway.networking.k8s.io"]
    resources: ["gatewayclasses"]
    resourceNames: ["internal-gateway"]
    verbs: ["get"]

---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: restrict-gateway-class
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["gateway.networking.k8s.io"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["gateways"]
  validations:
    - expression: "object.spec.gatewayClassName == 'internal-gateway'"
      message: "Only the internal-gateway GatewayClass is allowed."

---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: restrict-gateway-class
spec:
  policyName: restrict-gateway-class
  validationActions: ["Deny"]
```

RBAC restricts GatewayClass management and visibility, while admission policy enforces which GatewayClass names developers can reference.

## Configuring Load Balancer Behavior

Control how gateways provision load balancers through GatewayClass parameters.

```yaml
# gatewayclass-loadbalancer.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: aws-nlb-gateway
spec:
  controllerName: gateway.nginx.org/nginx-gateway-controller
  parametersRef:
    group: gateway.nginx.org
    kind: NginxProxy
    name: aws-nlb-config
    namespace: default

---
apiVersion: gateway.nginx.org/v1alpha2
kind: NginxProxy
metadata:
  name: aws-nlb-config
  namespace: default
spec:
  kubernetes:
    service:
      type: LoadBalancer
      patches:
        - type: StrategicMerge
          value:
            metadata:
              annotations:
                service.beta.kubernetes.io/aws-load-balancer-type: "external"
                service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "instance"
                service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
```

## Setting Resource Limits via GatewayClass

Define default resource constraints for gateways.

```yaml
# gatewayclass-resources.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: production-gateway
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
  parametersRef:
    group: gateway.envoyproxy.io
    kind: EnvoyProxy
    name: production-config
    namespace: default

---
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: EnvoyProxy
metadata:
  name: production-config
  namespace: default
spec:
  provider:
    type: Kubernetes
    kubernetes:
      envoyDeployment:
        replicas: 3
        container:
          resources:
            requests:
              cpu: "1000m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
        pod:
          affinity:
            podAntiAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                - labelSelector:
                    matchLabels:
                      gateway.envoyproxy.io/owning-gateway-name: production-gateway
                  topologyKey: kubernetes.io/hostname
```

This ensures production gateways have adequate resources and spread across nodes.

## Implementing Default Limits

Configure default behavior for all gateways using a GatewayClass.

```yaml
# gatewayclass-defaults.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: standard-gateway
spec:
  controllerName: gateway.nginx.org/nginx-gateway-controller
  parametersRef:
    group: gateway.nginx.org
    kind: NginxProxy
    name: standard-config
    namespace: default

---
apiVersion: gateway.nginx.org/v1alpha2
kind: NginxProxy
metadata:
  name: standard-config
  namespace: default
spec:
  workerConnections: 10000
  logging:
    errorLevel: warn
  kubernetes:
    deployment:
      replicas: 3
```

## Selecting GatewayClass in Gateway Resources

Reference your GatewayClass when creating Gateways.

```yaml
# gateway-using-class.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  gatewayClassName: nginx-gateway  # References the GatewayClass
  listeners:
    - name: http
      protocol: HTTP
      port: 80
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: tls-secret
```

The gateway uses the implementation-specific defaults associated with the specified GatewayClass.

## Monitoring GatewayClass Usage

Track which GatewayClasses are actively used.

```bash
# List all Gateways and their classes
kubectl get gateways -A -o custom-columns=NAME:.metadata.name,NAMESPACE:.metadata.namespace,CLASS:.spec.gatewayClassName

# Count Gateways per GatewayClass
kubectl get gateways -A -o json | jq -r '.items[].spec.gatewayClassName' | sort | uniq -c

# Find unused GatewayClasses
comm -23 \
  <(kubectl get gatewayclass -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | sort) \
  <(kubectl get gateway -A -o jsonpath='{.items[*].spec.gatewayClassName}' | tr ' ' '\n' | sort | uniq)
```

## Migrating Between GatewayClasses

Change a Gateway's class by updating the gatewayClassName field.

```yaml
# Before migration
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-gateway
spec:
  gatewayClassName: old-gateway-class
  # ...

# After migration
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-gateway
spec:
  gatewayClassName: new-gateway-class
  # ...
```

Apply the change:

```bash
kubectl patch gateway my-gateway -p '{"spec":{"gatewayClassName":"new-gateway-class"}}'

# Monitor the migration
kubectl get gateway my-gateway -w
```

The new controller provisions infrastructure for the updated class. Cleanup behavior for infrastructure owned by the previous class is implementation-specific, so test migrations before changing production Gateways.

## Best Practices for GatewayClass Management

Create descriptive GatewayClass names that indicate their purpose, like `external-nginx` or `internal-istio`.

Use labels to categorize GatewayClasses by scope, environment, or team ownership.

Document GatewayClass purposes and configurations in descriptions and annotations.

Limit the number of GatewayClasses to avoid confusion. Most clusters need only 2-4 classes.

Set reasonable resource limits in GatewayClass parameters to prevent resource exhaustion.

Use RBAC to control who manages GatewayClasses, and use admission policy to control which teams can reference specific GatewayClasses.

Monitor GatewayClass acceptance status to catch controller configuration issues early.

Version your GatewayClass configurations alongside application deployments.

Test GatewayClass changes in non-production environments before applying to production.

Keep GatewayClass configurations in version control for auditability and rollback capability.

GatewayClass selection determines how your gateways behave and which controllers manage them. Thoughtful GatewayClass design enables teams to use appropriate gateway implementations while maintaining consistency and control across your infrastructure.
