# How to Use Dapr with Crossplane Compositions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Crossplane, Composition, Infrastructure, Kubernetes

Description: Learn how to use Crossplane compositions to provision cloud infrastructure and wire it into Dapr components automatically for seamless service integration.

---

Crossplane lets platform teams define cloud infrastructure as Kubernetes resources. When combined with Dapr, you can write a Crossplane composition that provisions a Redis cache, a message broker, or a secret store and simultaneously generates the matching Dapr component manifest - so application teams get both the cloud resource and the Dapr binding in a single claim.

## The Core Idea

A Crossplane composition bundles multiple managed resources. By adding a Dapr component manifest as a Kubernetes Object resource within the composition, you ensure the component is always kept in sync with the underlying cloud resource. Connection details (host, port, credentials) flow from the managed resource into the Dapr component via Crossplane's connection secret mechanism.

## Defining the Composite Resource Definition

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xdaprrediscaches.platform.example.com
spec:
  group: platform.example.com
  names:
    kind: XDaprRedisCache
    plural: xdaprrediscaches
  claimNames:
    kind: DaprRedisCache
    plural: daprrediscaches
  connectionSecretKeys:
    - host
    - port
    - password
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                namespace:
                  type: string
                  description: Target namespace for the Dapr component
                memorySizeGb:
                  type: integer
                  default: 1
```

## Writing the Composition

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: dapr-redis-gcp
spec:
  compositeTypeRef:
    apiVersion: platform.example.com/v1alpha1
    kind: XDaprRedisCache
  resources:
    - name: redis-instance
      base:
        apiVersion: redis.gcp.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-central1
            tier: BASIC
            memorySizeGb: 1
          writeConnectionSecretToRef:
            namespace: crossplane-system
            name: redis-conn
      patches:
        - fromFieldPath: spec.memorySizeGb
          toFieldPath: spec.forProvider.memorySizeGb
        - fromFieldPath: metadata.uid
          toFieldPath: spec.writeConnectionSecretToRef.name
          transforms:
            - type: string
              string:
                type: Format
                fmt: "redis-conn-%s"
        - type: ToCompositeFieldPath
          fromFieldPath: status.atProvider.host
          toFieldPath: status.redisHost

    - name: dapr-component
      base:
        apiVersion: kubernetes.crossplane.io/v1alpha2
        kind: Object
        spec:
          forProvider:
            manifest:
              apiVersion: dapr.io/v1alpha1
              kind: Component
              metadata:
                name: statestore
              spec:
                type: state.redis
                version: v1
                metadata:
                  - name: redisHost
                    value: ""
                  - name: actorStateStore
                    value: "true"
      patches:
        - fromFieldPath: spec.namespace
          toFieldPath: spec.forProvider.manifest.metadata.namespace
        - fromFieldPath: status.redisHost
          toFieldPath: spec.forProvider.manifest.spec.metadata[0].value
          transforms:
            - type: string
              string:
                type: Format
                fmt: "%s:6379"
          policy:
            fromFieldPath: Optional
```

## Claiming a Dapr Redis Cache

Application teams file a simple claim - Crossplane handles the rest:

```yaml
apiVersion: platform.example.com/v1alpha1
kind: DaprRedisCache
metadata:
  name: orders-cache
  namespace: order-service
spec:
  namespace: order-service
  memorySizeGb: 2
  writeConnectionSecretToRef:
    name: orders-cache-conn
```

```bash
kubectl apply -f dapr-redis-claim.yaml
kubectl get daprrediscaches orders-cache -w
kubectl get components -n order-service
```

## Using the Component in a Dapr Application

Once the composition reconciles, the statestore component is available for your application:

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient({ daprHost: '127.0.0.1', daprPort: '3500' });

async function saveOrderState(orderId, orderData) {
  await client.state.save('statestore', [
    { key: `order-${orderId}`, value: orderData }
  ]);
  console.log(`Saved order ${orderId} to Crossplane-provisioned Redis`);
}

saveOrderState('ORD-001', { status: 'pending', amount: 99.99 });
```

## Summary

Crossplane compositions let platform teams bundle cloud infrastructure provisioning with Dapr component creation in a single declarative resource. Developers claim infrastructure through a simple API, and both the underlying cloud resource and the Dapr component are created and kept in sync automatically.
