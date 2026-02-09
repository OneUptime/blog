# How to Use Metacontroller for Declarative Custom Controllers Without Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Metacontroller, Controllers

Description: Learn how to build Kubernetes controllers without writing Go code using Metacontroller, which lets you implement controller logic in any language using simple webhooks.

---

Writing Kubernetes controllers typically requires learning Go, understanding client-go, and managing complex reconciliation loops. Metacontroller provides an alternative approach where you write simple webhooks in any language to implement controller logic. Metacontroller handles watches, caching, and reconciliation while you focus on business logic.

This makes it possible to build custom controllers using Python, Node.js, Ruby, or any language that can handle HTTP requests. Your webhook receives the current state and returns the desired state, and Metacontroller makes it happen.

## Installing Metacontroller

Deploy Metacontroller to your cluster:

```bash
# Install using kubectl
kubectl apply -k https://github.com/metacontroller/metacontroller/manifests/production
```

Verify the installation:

```bash
kubectl get pods -n metacontroller

NAME                              READY   STATUS    RESTARTS   AGE
metacontroller-0                  1/1     Running   0          1m
```

## Understanding Metacontroller Concepts

Metacontroller provides three controller patterns:

**CompositeController**: Manages a parent-child relationship where a parent resource creates and manages child resources.

**DecoratorController**: Adds resources alongside an existing resource without owning it.

**CustomController**: The most flexible pattern for arbitrary controller logic.

## Creating a Simple CompositeController

Define a CompositeController that manages child resources. Here's a controller for a simple Application CRD that creates a Deployment and Service:

```yaml
apiVersion: metacontroller.k8s.io/v1alpha1
kind: CompositeController
metadata:
  name: application-controller
spec:
  # Parent resource to watch
  parentResource:
    apiVersion: example.com/v1
    resource: applications

  # Child resources this controller manages
  childResources:
  - apiVersion: apps/v1
    resource: deployments
  - apiVersion: v1
    resource: services

  # Webhook that computes desired child resources
  hooks:
    sync:
      webhook:
        url: http://application-controller.default.svc/sync
```

## Implementing the Sync Webhook

The sync webhook receives the parent resource and current children, and returns desired children. Here's a Python implementation:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/sync', methods=['POST'])
def sync():
    # Get the request body
    body = request.get_json()

    # Extract parent resource (the Application)
    parent = body['parent']
    children = body.get('children', {})

    # Generate desired children
    desired_children = {
        'deployments.apps/v1': [create_deployment(parent)],
        'services.v1': [create_service(parent)]
    }

    return jsonify({
        'status': compute_status(parent, children),
        'children': desired_children
    })

def create_deployment(parent):
    """Create a Deployment for the Application"""
    name = parent['metadata']['name']
    namespace = parent['metadata']['namespace']
    spec = parent['spec']

    return {
        'apiVersion': 'apps/v1',
        'kind': 'Deployment',
        'metadata': {
            'name': name,
            'namespace': namespace
        },
        'spec': {
            'replicas': spec.get('replicas', 1),
            'selector': {
                'matchLabels': {'app': name}
            },
            'template': {
                'metadata': {
                    'labels': {'app': name}
                },
                'spec': {
                    'containers': [{
                        'name': 'app',
                        'image': spec['image'],
                        'ports': [{
                            'containerPort': spec.get('port', 8080)
                        }]
                    }]
                }
            }
        }
    }

def create_service(parent):
    """Create a Service for the Application"""
    name = parent['metadata']['name']
    namespace = parent['metadata']['namespace']
    spec = parent['spec']

    return {
        'apiVersion': 'v1',
        'kind': 'Service',
        'metadata': {
            'name': name,
            'namespace': namespace
        },
        'spec': {
            'selector': {'app': name},
            'ports': [{
                'port': 80,
                'targetPort': spec.get('port', 8080)
            }],
            'type': spec.get('serviceType', 'ClusterIP')
        }
    }

def compute_status(parent, children):
    """Compute status based on child resource states"""
    deployments = children.get('deployments.apps/v1', [])

    if not deployments:
        return {'phase': 'Pending'}

    deployment = deployments[0]
    status = deployment.get('status', {})

    available = status.get('availableReplicas', 0)
    desired = status.get('replicas', 0)

    if available == desired and available > 0:
        return {'phase': 'Running', 'ready': True}
    else:
        return {'phase': 'Deploying', 'ready': False}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
```

## Deploying the Webhook

Package and deploy your webhook:

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app.py .

CMD ["python", "app.py"]
```

Deploy to Kubernetes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: application-controller
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: application-controller
  template:
    metadata:
      labels:
        app: application-controller
    spec:
      containers:
      - name: webhook
        image: myregistry/application-controller:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: application-controller
  namespace: default
spec:
  selector:
    app: application-controller
  ports:
  - port: 80
    targetPort: 80
```

## Using the Controller

Create the Application CRD:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.example.com
spec:
  group: example.com
  names:
    kind: Application
    plural: applications
  scope: Namespaced
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
              image:
                type: string
              replicas:
                type: integer
              port:
                type: integer
              serviceType:
                type: string
          status:
            type: object
            properties:
              phase:
                type: string
              ready:
                type: boolean
    subresources:
      status: {}
```

Create an Application resource:

```yaml
apiVersion: example.com/v1
kind: Application
metadata:
  name: webapp
  namespace: default
spec:
  image: nginx:latest
  replicas: 3
  port: 80
  serviceType: LoadBalancer
```

Metacontroller calls your webhook, which returns the desired Deployment and Service. Metacontroller creates and manages them.

## Using DecoratorController

DecoratorController adds resources alongside existing ones. Here's an example that adds a ConfigMap to every Deployment:

```yaml
apiVersion: metacontroller.k8s.io/v1alpha1
kind: DecoratorController
metadata:
  name: deployment-config-injector
spec:
  resources:
  - apiVersion: apps/v1
    resource: deployments
    # Only watch deployments with this annotation
    annotationSelector:
      matchExpressions:
      - key: inject-config
        operator: Exists

  attachments:
  - apiVersion: v1
    resource: configmaps

  hooks:
    sync:
      webhook:
        url: http://config-injector.default.svc/sync
```

The webhook implementation:

```python
@app.route('/sync', methods=['POST'])
def sync():
    body = request.get_json()
    deployment = body['object']

    config_name = f"{deployment['metadata']['name']}-config"
    namespace = deployment['metadata']['namespace']

    configmap = {
        'apiVersion': 'v1',
        'kind': 'ConfigMap',
        'metadata': {
            'name': config_name,
            'namespace': namespace
        },
        'data': {
            'app.conf': generate_config(deployment)
        }
    }

    return jsonify({
        'attachments': [configmap]
    })

def generate_config(deployment):
    """Generate configuration based on deployment"""
    return f"""
    replicas: {deployment['spec']['replicas']}
    image: {deployment['spec']['template']['spec']['containers'][0]['image']}
    """
```

## Implementing Finalize Hooks

Clean up external resources when the parent is deleted:

```yaml
apiVersion: metacontroller.k8s.io/v1alpha1
kind: CompositeController
metadata:
  name: database-controller
spec:
  parentResource:
    apiVersion: example.com/v1
    resource: databases

  hooks:
    sync:
      webhook:
        url: http://database-controller.default.svc/sync
    finalize:
      webhook:
        url: http://database-controller.default.svc/finalize
```

Finalize webhook:

```python
@app.route('/finalize', methods=['POST'])
def finalize():
    body = request.get_json()
    database = body['parent']

    # Clean up external resources
    db_id = database['status'].get('externalDatabaseId')
    if db_id:
        delete_external_database(db_id)

    # Return finalized=true when cleanup is complete
    return jsonify({
        'finalized': True
    })
```

## Using Node.js for Webhooks

The same patterns work in any language. Here's a Node.js example:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/sync', (req, res) => {
  const { parent, children } = req.body;

  // Generate desired state
  const deployment = createDeployment(parent);
  const service = createService(parent);

  res.json({
    status: computeStatus(parent, children),
    children: {
      'deployments.apps/v1': [deployment],
      'services.v1': [service]
    }
  });
});

function createDeployment(parent) {
  const { name, namespace } = parent.metadata;
  const { image, replicas = 1 } = parent.spec;

  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name, namespace },
    spec: {
      replicas,
      selector: { matchLabels: { app: name } },
      template: {
        metadata: { labels: { app: name } },
        spec: {
          containers: [{
            name: 'app',
            image
          }]
        }
      }
    }
  };
}

app.listen(80, () => {
  console.log('Webhook listening on port 80');
});
```

## Customize Hook

The customize hook modifies resources before they're applied:

```yaml
apiVersion: metacontroller.k8s.io/v1alpha1
kind: CompositeController
metadata:
  name: app-controller
spec:
  parentResource:
    apiVersion: example.com/v1
    resource: applications

  childResources:
  - apiVersion: apps/v1
    resource: deployments
    updateStrategy:
      method: InPlace
      statusChecks:
        conditions:
        - type: Available
          status: "True"

  hooks:
    customize:
      webhook:
        url: http://app-controller.default.svc/customize
```

## Rolling Updates

Control how child resources are updated:

```yaml
spec:
  childResources:
  - apiVersion: apps/v1
    resource: deployments
    updateStrategy:
      method: RollingRecreate  # Delete old, create new
      # or
      method: InPlace  # Update in place
      # or
      method: OnDelete  # Only update when manually deleted
```

## Benefits of Metacontroller

Use any programming language. Write webhooks in Python, Node.js, Ruby, or whatever your team knows best.

Less code to maintain. You don't need to handle watches, caching, work queues, or retries. Focus only on computing desired state.

Faster iteration. Change your webhook logic and redeploy without recompiling or understanding client-go internals.

Lower barrier to entry. Team members who don't know Go can still build Kubernetes controllers.

Metacontroller simplifies controller development by handling the infrastructure and letting you focus on the business logic in whatever language you prefer.
