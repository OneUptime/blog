# How to Configure EndpointSlices for Large-Scale Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Scalability

Description: Configure EndpointSlices to improve service discovery performance in large Kubernetes clusters by distributing endpoint information efficiently across multiple objects.

---

When your Kubernetes services grow to hundreds or thousands of endpoints, the traditional Endpoints API becomes a performance bottleneck. EndpointSlices solve this problem by distributing endpoint information across multiple smaller objects instead of storing everything in a single large Endpoints object. In Kubernetes 1.33 and later, the Endpoints API is deprecated in favor of EndpointSlices. This guide shows you how to leverage EndpointSlices for better scalability.

## The Endpoints API Scalability Problem

The traditional Endpoints API stores endpoint information for a service in a single object. For a service with 1,000 pods, that's one Endpoints object containing 1,000 IP addresses and port combinations. For more than 1,000 backing endpoints, Kubernetes truncates the Endpoints object and adds the `endpoints.kubernetes.io/over-capacity: truncated` annotation.

Every time a single pod changes (starts, stops, or becomes unhealthy), the entire Endpoints object must be updated and propagated to all nodes. On a 100-node cluster, that's 100 network transmissions of the full object just to update one endpoint.

As your cluster scales, this creates significant load on the API server and etcd. You'll notice:

- Increased API server CPU and memory usage
- Slower service updates (pods take longer to become routable)
- Higher network bandwidth consumption
- etcd performance degradation

EndpointSlices solve this by splitting endpoints into groups of approximately 100 endpoints per slice. Updating one endpoint only requires propagating one slice instead of the entire object.

## How EndpointSlices Work

EndpointSlices are stable in Kubernetes 1.21+. The endpoint slice controller automatically creates and manages EndpointSlices for every service with a selector.

Check if EndpointSlices are active in your cluster:

```bash
kubectl get endpointslices
```

You'll see output like:

```text
NAME                 ADDRESSTYPE   PORTS   ENDPOINTS   AGE
kubernetes           IPv4          6443    3           45d
my-service-7x9km     IPv4          80      47          2d
my-service-q4w2p     IPv4          80      53          2d
```

Notice how `my-service` has two EndpointSlice objects. The controller split 100 endpoints across two slices.

## Viewing EndpointSlice Details

Examine an EndpointSlice to see its structure:

```bash
kubectl get endpointslice my-service-7x9km -o yaml
```

The output shows:

```yaml
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: my-service-7x9km
  namespace: default
  labels:
    kubernetes.io/service-name: my-service
  ownerReferences:
  - apiVersion: v1
    kind: Service
    name: my-service
addressType: IPv4
ports:
- name: http
  port: 8080
  protocol: TCP
endpoints:
- addresses:
  - "10.244.1.5"
  conditions:
    ready: true
    serving: true
    terminating: false
  nodeName: worker-node-1
  targetRef:
    kind: Pod
    name: my-app-7d4f5b8c9-abc12
    namespace: default
- addresses:
  - "10.244.1.6"
  conditions:
    ready: true
    serving: true
    terminating: false
  nodeName: worker-node-1
  targetRef:
    kind: Pod
    name: my-app-7d4f5b8c9-def34
    namespace: default
# ... more endpoints up to ~100

```

Each endpoint includes:
- IP address
- Ready, serving, and terminating conditions
- Node name where the pod runs
- Reference to the source pod

## Creating Services with EndpointSlice Support

EndpointSlices work automatically with standard service definitions. Create a service with many endpoints:

```yaml
# large-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 250  # Large number of pods
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
spec:
  selector:
    app: web-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
```

Deploy this service:

```bash
kubectl apply -f large-service.yaml
```

Watch EndpointSlices being created:

```bash
kubectl get endpointslices -l kubernetes.io/service-name=web-app-service --watch
```

You'll see multiple EndpointSlices created as pods become ready. With 250 endpoints, you'll have 3 EndpointSlices (100 + 100 + 50).

## Configuring EndpointSlice Size

The default maximum endpoints per slice is 100. You can adjust this cluster-wide by configuring the endpoint slice controller:

```yaml
# kube-controller-manager configuration
apiVersion: v1
kind: Pod
metadata:
  name: kube-controller-manager
  namespace: kube-system
spec:
  containers:
  - name: kube-controller-manager
    command:
    - kube-controller-manager
    - --max-endpoints-per-slice=100  # Default value
```

Larger slices reduce the number of objects but increase update propagation size. Smaller slices do the opposite. The default of 100 works well for most clusters.

## Handling Dual-Stack Services

EndpointSlices support dual-stack (IPv4 and IPv6) services by creating separate slices for each address family when the cluster and backing pods have dual-stack networking:

```yaml
# dual-stack-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: dual-stack-app
spec:
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
  - IPv4
  - IPv6
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80
```

This creates two sets of EndpointSlices:

```bash
kubectl get endpointslices -l kubernetes.io/service-name=dual-stack-app
```

Output:

```text
NAME                      ADDRESSTYPE   PORTS   ENDPOINTS   AGE
dual-stack-app-ipv4-abc   IPv4          80      45          1d
dual-stack-app-ipv6-xyz   IPv6          80      45          1d
```

## Monitoring EndpointSlice Performance

Track EndpointSlice metrics to understand their impact:

```bash
# Count EndpointSlices per service
kubectl get endpointslices --all-namespaces -o json | \
  jq -r '.items | group_by(.metadata.labels."kubernetes.io/service-name") |
  map({service: .[0].metadata.labels."kubernetes.io/service-name", count: length}) |
  sort_by(.count) | reverse | .[]'
```

Monitor controller manager metrics for endpoint updates:

```bash
# Query Prometheus metrics
curl -sk https://kube-controller-manager:10257/metrics | grep endpoint_slice
```

Key metrics to watch:
- `endpoint_slice_controller_changes` - Number of slice updates from kube-controller-manager
- `endpoint_slice_controller_syncs` - Number of sync operations from kube-controller-manager
- `apiserver_storage_objects{resource="endpointslices"}` - Total slice count from kube-apiserver

## Using EndpointSlices in Custom Controllers

If you're building custom controllers that consume endpoint information, use the EndpointSlice API instead of the legacy Endpoints API:

```go
// Go example using client-go
package main

import (
    "context"
    "fmt"

    discoveryv1 "k8s.io/api/discovery/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

func main() {
    // Load kubeconfig
    config, _ := clientcmd.BuildConfigFromFlags("", "/path/to/kubeconfig")
    clientset, _ := kubernetes.NewForConfig(config)

    // List EndpointSlices for a service
    slices, err := clientset.DiscoveryV1().EndpointSlices("default").List(
        context.TODO(),
        metav1.ListOptions{
            LabelSelector: "kubernetes.io/service-name=my-service",
        },
    )

    if err != nil {
        panic(err)
    }

    // Process all endpoints across all slices
    for _, slice := range slices.Items {
        fmt.Printf("Slice: %s\n", slice.Name)
        for _, endpoint := range slice.Endpoints {
            ready := endpoint.Conditions.Ready == nil || *endpoint.Conditions.Ready
            if ready && len(endpoint.Addresses) > 0 {
                nodeName := ""
                if endpoint.NodeName != nil {
                    nodeName = *endpoint.NodeName
                }
                fmt.Printf("  Ready endpoint: %s on node %s\n",
                    endpoint.Addresses[0], nodeName)
            }
        }
    }
}
```

Use informers to watch for changes efficiently:

```go
import (
    informers "k8s.io/client-go/informers"
    "k8s.io/client-go/tools/cache"
)

func watchEndpointSlices(clientset *kubernetes.Clientset) {
    factory := informers.NewSharedInformerFactory(clientset, 0)
    informer := factory.Discovery().V1().EndpointSlices()

    informer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            slice := obj.(*discoveryv1.EndpointSlice)
            fmt.Printf("EndpointSlice added: %s\n", slice.Name)
        },
        UpdateFunc: func(old, new interface{}) {
            slice := new.(*discoveryv1.EndpointSlice)
            fmt.Printf("EndpointSlice updated: %s\n", slice.Name)
        },
        DeleteFunc: func(obj interface{}) {
            slice, ok := obj.(*discoveryv1.EndpointSlice)
            if !ok {
                tombstone := obj.(cache.DeletedFinalStateUnknown)
                slice = tombstone.Obj.(*discoveryv1.EndpointSlice)
            }
            fmt.Printf("EndpointSlice deleted: %s\n", slice.Name)
        },
    })

    factory.Start(make(chan struct{}))
}
```

## Troubleshooting EndpointSlice Issues

When endpoints aren't updating correctly, check the EndpointSlice controller:

```bash
# Check controller logs
kubectl logs -n kube-system -l component=kube-controller-manager | grep endpointslice
```

Verify that EndpointSlices match your pods:

```bash
# Count ready endpoints in slices
kubectl get endpointslices -l kubernetes.io/service-name=my-service -o json | \
  jq '[.items[].endpoints[] | select(.conditions.ready == true)] | length'

# Count ready pods
kubectl get pods -l app=my-app -o json | \
  jq '[.items[] | select(.status.conditions[] | select(.type == "Ready" and .status == "True"))] | length'
```

These numbers should match. If they don't, investigate pod readiness probes and service selectors.

## Topology Aware Hints with EndpointSlices

EndpointSlices support topology-aware routing hints that help route traffic to nearby endpoints:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: topology-aware-service
  annotations:
    service.kubernetes.io/topology-mode: Auto
spec:
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80
```

Check the hints in EndpointSlices:

```bash
kubectl get endpointslice my-service-abc -o jsonpath='{.endpoints[*].hints}'
```

Endpoints include zone hints:

```json
[{"forZones":[{"name":"us-east-1a"}]}]
```

This guides kube-proxy to prefer endpoints in the same zone, reducing cross-zone traffic costs.

## Performance Benefits in Real Clusters

In production clusters, EndpointSlices can provide measurable benefits:

- **API server load**: Smaller endpoint updates for large Services
- **Update propagation**: Fewer bytes to distribute when updating a single endpoint
- **Memory usage**: More efficient endpoint tracking for kube-proxy and other consumers
- **Network bandwidth**: Less endpoint-related watch traffic compared to large legacy Endpoints objects

These improvements become more significant as your cluster scales. A 500-node cluster with 10,000 endpoints sees dramatic performance gains compared to the legacy Endpoints API.

EndpointSlices are the foundation for scalable service discovery in large Kubernetes clusters. They work automatically for standard services while providing better performance and enabling advanced features like topology-aware routing. Make sure your custom controllers use the EndpointSlice API instead of the legacy Endpoints API to get these benefits.
