# How to Manage Kubernetes Services in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Service, Networking, DevOps

Description: Learn how to create, edit, and delete Kubernetes Services in Portainer to expose your applications within the cluster or to external traffic.

## Introduction

Kubernetes Services provide stable network endpoints for Pods. Portainer offers a visual interface to manage Services without requiring direct `kubectl` access, making it accessible to teams that prefer a UI-driven workflow while still supporting advanced configuration.

## Prerequisites

- Portainer CE or BE with a Kubernetes environment connected
- Applications (Deployments) already running in your cluster
- Namespace-level or admin access in Portainer

## Types of Kubernetes Services

| Type | Use Case |
|------|----------|
| `ClusterIP` | Internal cluster communication only |
| `NodePort` | Expose on each node's IP at a static port |
| `LoadBalancer` | Request an external load balancer when supported by your cluster |
| `ExternalName` | Map to an external DNS name |

## Viewing Services in Portainer

1. Log into Portainer.
2. Select your **Kubernetes** environment.
3. Navigate to **Networking** → **Services**.

This view lists all services you have access to. Each entry shows:
- Service name
- Namespace
- Type (ClusterIP, NodePort, etc.)
- Cluster IP
- External IP / Ports

## Creating a Service via Portainer UI

### From the Application Deployment Form

When creating a new application in Portainer:

1. Go to **Applications** → **Add with form**.
2. Fill in your deployment details (image, replicas, etc.).
3. In the **Publishing the application** section, select the service type tab and click **Create service**.
4. Configure the service as needed:
   - **Service type**: `ClusterIP`, `NodePort`, or `LoadBalancer`
   - **Service port**: e.g., `80`
   - **Target/container port**: e.g., `8080`
   - **Node port** (optional): e.g., `30080` when using `NodePort`
   - **Annotations** (optional)
5. Deploy. Portainer deploys the application and creates the Service.

### Applying a Service YAML via Portainer's kubectl shell

For more control, use Portainer's `kubectl shell`:

```yaml
# service-clusterip.yaml - Internal service

apiVersion: v1
kind: Service
metadata:
  name: myapp-service
  namespace: production
spec:
  selector:
    app: myapp        # Matches Pod labels
  ports:
    - protocol: TCP
      port: 80        # Service port
      targetPort: 8080  # Container port
  type: ClusterIP
```

```yaml
# service-nodeport.yaml - Expose on host port
apiVersion: v1
kind: Service
metadata:
  name: myapp-nodeport
  namespace: production
spec:
  selector:
    app: myapp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
      nodePort: 30080   # Must be in the configured NodePort range (30000-32767 by default)
  type: NodePort
```

```yaml
# service-loadbalancer.yaml - Cloud load balancer
apiVersion: v1
kind: Service
metadata:
  name: myapp-lb
  namespace: production
spec:
  selector:
    app: myapp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer
```

```bash
# After saving a manifest to a file in the kubectl shell
kubectl apply -f service-clusterip.yaml
```

## Editing an Existing Service

1. In Portainer, go to **Applications** and select the application that owns the service.
2. Click **Edit this application**.
3. If the application was deployed from a form, update the service in the **Publishing the application** section.
4. If the application was deployed from the Web Editor, update the manifest directly.
5. Save the changes.

## Deleting a Service

Via UI:
1. Go to **Networking** → **Services**.
2. Select the service with the checkbox.
3. Click **Remove** in the toolbar.
4. Confirm deletion.

Via kubectl shell:

```bash
# Delete a specific service
kubectl delete service myapp-service -n production

# Delete all services with a label
kubectl delete service -l app=myapp -n production
```

## Working with Headless Services

Headless Services (ClusterIP: None) are used for StatefulSets and direct Pod DNS lookups:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-headless
  namespace: production
spec:
  clusterIP: None    # Makes it headless
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
```

## Verifying Service Connectivity

```bash
# Check service EndpointSlices (confirms Pods are selected)
kubectl get endpointslice -l kubernetes.io/service-name=myapp-service -n production

# Test service DNS from inside the cluster
kubectl run test-pod --image=busybox --restart=Never --rm -it -- nslookup myapp-service.production.svc.cluster.local

# Check service details
kubectl describe service myapp-service -n production
```

## Conclusion

Managing Kubernetes Services in Portainer is streamlined through its UI, allowing teams to expose applications internally or externally without deep Kubernetes expertise. Use ClusterIP for internal microservice communication, NodePort for development access, and LoadBalancer for production-grade external exposure. Always verify that service selectors match your Pod labels to ensure proper traffic routing.
