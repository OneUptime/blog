# How to Fix Network Endpoint Group Health Check Returning Unhealthy for GKE Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Network Endpoint Group, Health Check, Kubernetes

Description: Fix NEG health check failures for GKE pods in Google Cloud when using container-native load balancing with network endpoint groups.

---

Container-native load balancing with Network Endpoint Groups (NEGs) is the recommended way to route traffic to GKE pods from Google Cloud load balancers. Instead of routing to node IPs and relying on kube-proxy to forward traffic, NEGs let the load balancer send traffic directly to pod IPs. It works great when it works, but when NEG health checks start reporting your pods as unhealthy while the pods are clearly running and serving, debugging can be painful.

## Understanding NEG Health Checks in GKE

When you create a Kubernetes Service with a NEG annotation, GKE creates a Network Endpoint Group and registers your pod IPs as endpoints. The Google Cloud load balancer then health-checks these endpoints directly. The health check probes go from Google's health check infrastructure (IP ranges `35.191.0.0/16` and `130.211.0.0/22`) to the pod IP addresses on the VPC network.

This is different from traditional health checks that target node IPs. With NEGs, the probes go directly to pod IPs, which means firewall rules, network policies, and pod readiness all have to be correctly configured for the pod IPs specifically.

## Step 1: Check GKE Firewall Rules

GKE automatically creates firewall rules for health check traffic, but sometimes these rules are missing, modified, or blocked by higher-priority deny rules.

List the firewall rules related to your GKE cluster:

```bash
# List firewall rules for your GKE cluster

gcloud compute firewall-rules list \
    --filter="name~gke-your-cluster" \
    --format="table(name, direction, sourceRanges, allowed, priority)"
```

You should see a rule that allows traffic from `130.211.0.0/22` and `35.191.0.0/16`. If it is missing, create it:

```bash
# Create firewall rule for health check probes to reach pod IPs
gcloud compute firewall-rules create allow-neg-health-check \
    --network=your-vpc \
    --action=allow \
    --direction=ingress \
    --target-tags=your-gke-node-network-tags \
    --source-ranges=35.191.0.0/16,130.211.0.0/22 \
    --rules=tcp:your-app-port \
    --priority=1000
```

If you use target tags, make sure they are the network tags on the GKE node VMs. Pods don't have Compute Engine target tags, and the firewall rule must apply to the nodes that host the Pod alias IP ranges.

## Step 2: Check Kubernetes Network Policies

If you are using Kubernetes NetworkPolicy resources, they might be blocking health check traffic. Network policies act as a pod-level firewall, and if you have a default-deny ingress policy, health check probes will be dropped.

Check for network policies in your namespace:

```bash
# List network policies in the namespace
kubectl get networkpolicies -n your-namespace -o yaml
```

If you have a restrictive policy, add an ingress rule that allows traffic from Google's health check ranges:

```yaml
# NetworkPolicy that allows Google health check probes
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-health-checks
  namespace: your-namespace
spec:
  podSelector:
    matchLabels:
      app: your-app
  policyTypes:
    - Ingress
  ingress:
    - from:
        - ipBlock:
            cidr: 35.191.0.0/16
        - ipBlock:
            cidr: 130.211.0.0/22
      ports:
        - protocol: TCP
          port: 8080  # Your application port
```

## Step 3: Verify Pod Readiness Probe Configuration

For GKE Ingress, the Google Cloud health check is created from a BackendConfig, inferred from the serving pod's readiness probe when possible, or created from default values. If there is no BackendConfig and your readiness probe is misconfigured, the NEG health check can inherit those problems.

Check your pod's readiness probe:

```bash
# Check the readiness probe configuration of your pod
kubectl get pod your-pod -n your-namespace -o jsonpath='{.spec.containers[0].readinessProbe}' | jq .
```

Make sure:
- The port matches your application's actual listening port
- The path returns a 200 status code (for HTTP probes)
- The initial delay gives the application enough time to start up
- The timeout is not too short for your application's response time

## Step 4: Check the NEG Status and Endpoints

Verify that the NEG has the correct endpoints registered:

```bash
# List NEGs in the project
gcloud compute network-endpoint-groups list \
    --format="table(name, zone, size, networkEndpointType)"

# List endpoints in a specific NEG
gcloud compute network-endpoint-groups list-network-endpoints your-neg \
    --zone=us-central1-a \
    --format="table(networkEndpoint.ipAddress, networkEndpoint.port)"
```

Compare the endpoints in the NEG with the actual pod IPs:

```bash
# Get pod IPs for comparison
kubectl get pods -n your-namespace -l app=your-app \
    -o jsonpath='{range .items[*]}{.status.podIP}{"\t"}{.metadata.name}{"\n"}{end}'
```

If pods are missing from the NEG, there might be an issue with NEG synchronization. Check the ServiceNetworkEndpointGroup resource and Service events:

```bash
# Check Service NEG status and events
kubectl get svcneg -n your-namespace
kubectl get svcneg your-svcneg -n your-namespace -o yaml
kubectl describe service your-service -n your-namespace
```

## Step 5: Verify the BackendConfig Health Check Override

If you are using a BackendConfig resource to customize the health check, make sure it matches what your application expects:

```yaml
# Example BackendConfig with custom health check settings
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: your-backend-config
  namespace: your-namespace
spec:
  healthCheck:
    checkIntervalSec: 15
    timeoutSec: 5
    healthyThreshold: 1
    unhealthyThreshold: 3
    type: HTTP
    requestPath: /healthz
    port: 8080
```

Make sure the Service references this BackendConfig:

```yaml
# Service annotation referencing the BackendConfig
apiVersion: v1
kind: Service
metadata:
  name: your-service
  namespace: your-namespace
  annotations:
    cloud.google.com/neg: '{"ingress": true}'
    cloud.google.com/backend-config: '{"default": "your-backend-config"}'
spec:
  selector:
    app: your-app
  ports:
    - port: 80
      targetPort: 8080
```

## Step 6: Check for Pod IP Reachability

The pod IPs must be routable from Google's health check infrastructure. In a VPC-native GKE cluster, pod IPs come from the pod address range (secondary range) assigned to the subnet. Verify this is configured correctly:

```bash
# Check the cluster's pod address range
gcloud container clusters describe your-cluster \
    --zone=us-central1-a \
    --format="json(ipAllocationPolicy)"
```

If you are using a non-VPC-native cluster (routes-based), NEGs will not work correctly because pod IPs are not routable from outside the cluster nodes.

## Step 7: Look at the Load Balancer Health Status

Check the health status from the load balancer's perspective:

```bash
# Get health status for the backend service
gcloud compute backend-services get-health your-backend-service \
    --global \
    --format="json(status)"
```

This shows you exactly which endpoints the load balancer considers healthy or unhealthy.

## Step 8: Check for GKE Version Compatibility

Some NEG features require specific GKE versions. If you are running an older GKE version, certain NEG configurations might not work correctly. Check your cluster version:

```bash
# Check your GKE cluster version
gcloud container clusters describe your-cluster \
    --zone=us-central1-a \
    --format="json(currentMasterVersion, currentNodeVersion)"
```

Consider upgrading to a recent stable version if you are behind.

## Common Gotchas

A few things that regularly trip people up:

1. The NEG annotation must be on the Service, not the Deployment
2. If using Ingress, ClusterIP is recommended for NEG-backed Services unless you explicitly need NodePort
3. Pod readiness gates - GKE uses readiness gates with NEGs, so pods might show as not ready until the load balancer confirms health
4. Changing a pod readiness probe after Ingress creation does not update the existing load balancer health check; use BackendConfig for explicit control, or redeploy the pods and Ingress so GKE recreates the health check

## Monitoring NEG Health

Set up alerts for NEG health check failures using [OneUptime](https://oneuptime.com) so you catch issues early. Monitor both the Kubernetes readiness probe status and the Google Cloud health check status to get the full picture of pod health.
