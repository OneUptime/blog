# How to Migrate Workloads from GKE Standard to GKE Autopilot Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Autopilot, Migration, Kubernetes, Cluster Management

Description: A practical guide to migrating workloads from GKE Standard to GKE Autopilot with zero downtime using a blue-green cluster migration strategy.

---

Migrating from GKE Standard to GKE Autopilot is a move many teams are making. Autopilot removes the need to manage nodes, handles security hardening, and can reduce costs for many workload patterns. But you cannot convert an existing Standard cluster to Autopilot in place. You need to create a new Autopilot cluster and move your workloads over.

The good news is that with the right approach, you can do this with zero downtime. The strategy is a blue-green cluster migration: stand up the new Autopilot cluster, deploy your workloads to it, shift traffic over, and then decommission the old cluster.

## Planning the Migration

Before touching any infrastructure, audit your existing workloads for Autopilot compatibility. Autopilot has restrictions that Standard does not:

- DaemonSets are not allowed (Autopilot manages the nodes)
- Privileged containers are restricted
- Host network and host PID are not available
- Resource requests are mandatory and have minimum values
- Some node-level customizations are not possible

Check your workloads for these issues:

```bash
# Find pods using host network
kubectl get pods --all-namespaces -o json | \
  python3 -c "import json,sys; pods=json.load(sys.stdin); [print(f\"{p['metadata']['namespace']}/{p['metadata']['name']}\") for p in pods['items'] if p['spec'].get('hostNetwork')]"

# Find DaemonSets that need to be handled differently
kubectl get daemonsets --all-namespaces

# Find pods without resource requests
kubectl get pods --all-namespaces -o json | \
  python3 -c "
import json,sys
pods = json.load(sys.stdin)
for p in pods['items']:
    for c in p['spec'].get('containers', []):
        if not c.get('resources', {}).get('requests'):
            print(f\"{p['metadata']['namespace']}/{p['metadata']['name']} - {c['name']}\")
"
```

## Step 1: Create the Autopilot Cluster

Create the new Autopilot cluster in the same region as your Standard cluster:

```bash
# Create the new Autopilot cluster
gcloud container clusters create-auto autopilot-cluster \
  --region us-central1 \
  --project my-project \
  --release-channel regular \
  --network my-vpc \
  --subnetwork my-subnet \
  --cluster-secondary-range-name pods \
  --services-secondary-range-name services
```

Make sure the networking configuration matches your requirements - same VPC, appropriate firewall rules, and access to any databases or services your workloads need.

## Step 2: Prepare Your Manifests

Update your Kubernetes manifests to be Autopilot-compatible. The main changes are:

Add resource requests to every container:

```yaml
# Before: no resource requests (works on Standard, fails on Autopilot)
containers:
  - name: my-app
    image: my-image:v1

# After: explicit resource requests for Autopilot
containers:
  - name: my-app
    image: my-image:v1
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: 250m
        memory: 512Mi
```

Replace DaemonSets with alternative approaches. For logging agents, use GKE's built-in Cloud Logging integration. For monitoring, use managed Prometheus. For other DaemonSets, consider sidecar containers or moving the functionality into your application.

Remove any privileged security contexts:

```yaml
# Before: privileged container (not allowed on Autopilot)
securityContext:
  privileged: true

# After: use specific capabilities instead
securityContext:
  capabilities:
    add: ["NET_ADMIN"]
```

## Step 3: Deploy to the Autopilot Cluster

Switch your kubectl context to the new cluster and deploy:

```bash
# Get credentials for the new Autopilot cluster
gcloud container clusters get-credentials autopilot-cluster \
  --region us-central1 \
  --project my-project

# Deploy your namespaces first
kubectl apply -f namespaces/

# Deploy ConfigMaps and Secrets
kubectl apply -f configs/

# Deploy your workloads
kubectl apply -f deployments/
```

Wait for all pods to be running and healthy:

```bash
# Check that all pods are running on the new cluster
kubectl get pods --all-namespaces --field-selector=status.phase!=Running,status.phase!=Succeeded
```

## Step 4: Test the New Cluster

Before shifting any real traffic, verify your application works correctly on Autopilot. Run your test suite, check logs, and validate connectivity to databases and external services.

```bash
# Port-forward to test individual services
kubectl port-forward svc/my-app 8080:80

# Check application logs for errors
kubectl logs deployment/my-app --tail=100

# Verify database connectivity
kubectl exec deployment/my-app -- curl -s http://localhost:8080/health
```

## Step 5: Shift Traffic

The approach for shifting traffic depends on how you expose your services. Here are the common patterns.

### Using a Global Load Balancer

If you use a Google Cloud global load balancer, you can add the new cluster's backends to the existing load balancer and gradually shift traffic:

```bash
# Create a NEG (Network Endpoint Group) for the Autopilot cluster service
# This happens automatically if using GKE Ingress with NEG annotation

# Then update the backend service to include both clusters
gcloud compute backend-services add-backend my-backend-service \
  --global \
  --network-endpoint-group=autopilot-neg \
  --network-endpoint-group-zone=us-central1-a \
  --balancing-mode=RATE \
  --max-rate-per-endpoint=100
```

### Using Cloud DNS Weighted Routing

Another approach is to use Cloud DNS weighted routing to gradually shift traffic:

```bash
# Add the Autopilot cluster's external IP with a low weight first
gcloud dns record-sets create myapp.example.com \
  --zone=my-zone \
  --type=A \
  --ttl=60 \
  --routing-policy-type=WRR \
  --routing-policy-data="25=10.0.0.1;75=10.0.0.2"
```

Start with 10% to the new cluster, monitor for errors, then gradually increase to 25%, 50%, 75%, and finally 100%.

### Using Multi-Cluster Ingress

If you have multi-cluster Ingress set up, you can manage traffic across both clusters through a single Ingress resource:

```yaml
# multi-cluster-ingress.yaml - Route traffic across both clusters
apiVersion: networking.gke.io/v1
kind: MultiClusterIngress
metadata:
  name: my-app-ingress
  namespace: default
spec:
  template:
    spec:
      backend:
        serviceName: my-app-mcs
        servicePort: 80
```

## Step 6: Monitor and Validate

During the traffic shift, monitor both clusters closely:

```bash
# Watch error rates on the Autopilot cluster
kubectl logs deployment/my-app -f --tail=50

# Check resource usage and scheduling
kubectl top pods
kubectl get events --sort-by='.lastTimestamp'
```

Also monitor from the application level. Check response times, error rates, and business metrics in your monitoring system. Compare them between the two clusters to make sure the Autopilot cluster is performing at least as well.

## Step 7: Decommission the Old Cluster

Once all traffic is on the Autopilot cluster and you have verified everything is stable (give it at least a few days), decommission the Standard cluster:

```bash
# Scale down workloads on the old cluster first
gcloud container clusters get-credentials standard-cluster \
  --zone us-central1-a
kubectl scale deployment --all --replicas=0

# After confirming no traffic is going to the old cluster, delete it
gcloud container clusters delete standard-cluster \
  --zone us-central1-a \
  --project my-project
```

## Common Migration Pitfalls

Watch out for these issues during migration:

Resource requests being too low: Autopilot can increase your requests to meet minimum ratios, which affects scheduling and cost. Test with representative workloads before migrating production.

Persistent volume migration: If your workloads use Persistent Volumes, you need to migrate the data separately. Use a tool like Velero or GKE Backup to snapshot and restore PVs to the new cluster.

Service account differences: Make sure Workload Identity bindings exist for the new cluster's service accounts.

Network policies: Verify that your network policies work correctly on Autopilot, as some node-level networking features behave differently.

The migration from Standard to Autopilot is not a flip-the-switch operation, but with careful planning and a blue-green approach, you can do it without any user-facing downtime. Take it step by step, validate at each stage, and keep the old cluster around until you are confident the new one is solid.
