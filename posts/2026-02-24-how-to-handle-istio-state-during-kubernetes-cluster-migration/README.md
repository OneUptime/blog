# How to Handle Istio State During Kubernetes Cluster Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Migration, Cluster Management, Service Mesh

Description: A complete guide to migrating Istio service mesh state between Kubernetes clusters, covering configuration, certificates, traffic management, and zero-downtime strategies.

---

Migrating a Kubernetes cluster is already a complex operation. When Istio is in the mix, it adds another layer of state that needs to be carefully handled. You've got routing rules, security policies, certificates, and mesh configuration that all need to make it to the new cluster intact and working.

The good news is that Istio's configuration is declarative and stored as Kubernetes resources, which makes it fundamentally portable. The challenge is in the details: certificate continuity, traffic cutover, and making sure nothing falls through the cracks.

## Planning the Migration

Before you start, inventory everything:

```bash
# Count all Istio resources
echo "=== Istio Resource Inventory ==="
for group in networking.istio.io security.istio.io telemetry.istio.io; do
  resources=$(kubectl api-resources --api-group="$group" -o name 2>/dev/null)
  for resource in $resources; do
    count=$(kubectl get "$resource" --all-namespaces --no-headers 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
      echo "$resource: $count"
    fi
  done
done

# Check Istio version
istioctl version

# Check mesh configuration
kubectl get configmap istio -n istio-system -o yaml
```

Document:
- The Istio version running on the source cluster
- Whether you're using custom CA certificates
- Any EnvoyFilters or custom extensions
- The IstioOperator or Helm values used for installation
- External integrations (Prometheus, Grafana, Jaeger, etc.)

## Migration Strategy Options

There are three main approaches to migrating Istio between clusters:

**1. Big Bang Migration**: Export everything, set up the new cluster, import everything, switch DNS/load balancer.

**2. Gradual Migration with Multi-Cluster**: Run both clusters simultaneously with Istio multi-cluster, gradually shift traffic from old to new.

**3. Blue-Green Cluster**: Set up the new cluster as a complete replica, test it, then switch all traffic at once.

For most teams, option 1 or 3 is the most practical. Multi-cluster Istio works but adds significant complexity.

## Exporting State from the Source Cluster

Start with a comprehensive export:

```bash
#!/bin/bash
EXPORT_DIR="migration-export-$(date +%Y%m%d)"
mkdir -p "$EXPORT_DIR"

# 1. Istio installation configuration
echo "Exporting installation config..."
kubectl get istiooperators --all-namespaces -o yaml > "$EXPORT_DIR/istiooperator.yaml"
kubectl get configmap istio -n istio-system -o yaml > "$EXPORT_DIR/mesh-configmap.yaml"

# 2. All Istio CRD instances
echo "Exporting CRD instances..."
RESOURCES="virtualservices destinationrules gateways serviceentries sidecars envoyfilters workloadentries workloadgroups peerauthentications requestauthentications authorizationpolicies proxyconfigs"
for resource in $RESOURCES; do
  kubectl get "$resource" --all-namespaces -o yaml > "$EXPORT_DIR/$resource.yaml" 2>/dev/null
done

# 3. Telemetry
kubectl get telemetry --all-namespaces -o yaml > "$EXPORT_DIR/telemetry.yaml" 2>/dev/null

# 4. Certificates (if using custom CA)
echo "Exporting certificates..."
kubectl get secret cacerts -n istio-system -o yaml > "$EXPORT_DIR/cacerts.yaml" 2>/dev/null
kubectl get secret istio-ca-secret -n istio-system -o yaml > "$EXPORT_DIR/istio-ca-secret.yaml" 2>/dev/null

# 5. Namespace configurations
echo "Exporting namespaces..."
kubectl get namespaces -o yaml > "$EXPORT_DIR/namespaces.yaml"

# 6. Istio gateway deployments and services
kubectl get deployment -n istio-system -o yaml > "$EXPORT_DIR/istio-system-deployments.yaml"
kubectl get service -n istio-system -o yaml > "$EXPORT_DIR/istio-system-services.yaml"

echo "Export complete: $EXPORT_DIR"
```

## Handling Certificates

Certificate continuity is critical. If the new cluster uses different CA certificates, mTLS between services migrated at different times will break.

**Option A: Use the same CA on both clusters (recommended)**

Export the CA from the source cluster:

```bash
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | base64 -d > ca-cert.pem
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-key\.pem}' | base64 -d > ca-key.pem
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.root-cert\.pem}' | base64 -d > root-cert.pem
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.cert-chain\.pem}' | base64 -d > cert-chain.pem
```

Create the secret on the target cluster before installing Istio:

```bash
kubectl create namespace istio-system
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem \
  --from-file=ca-key.pem \
  --from-file=root-cert.pem \
  --from-file=cert-chain.pem
```

**Option B: Use a shared root CA with different intermediate CAs**

This gives each cluster its own intermediate CA while maintaining trust through the shared root. This is the recommended approach for multi-cluster setups.

## Setting Up the Target Cluster

On the new cluster, install Istio with the same configuration:

```bash
# 1. Create istio-system namespace (if not done for certs)
kubectl create namespace istio-system

# 2. Install Istio
istioctl install -f migration-export/istiooperator.yaml

# 3. Wait for readiness
kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=300s
```

## Importing Configuration

Clean the exported resources and import them:

```bash
#!/bin/bash
IMPORT_DIR="migration-export-cleaned"

# Apply in dependency order
echo "Importing security resources..."
kubectl apply -f "$IMPORT_DIR/peerauthentications.yaml" 2>/dev/null
kubectl apply -f "$IMPORT_DIR/requestauthentications.yaml" 2>/dev/null

echo "Importing service entries..."
kubectl apply -f "$IMPORT_DIR/serviceentries.yaml" 2>/dev/null
kubectl apply -f "$IMPORT_DIR/workloadentries.yaml" 2>/dev/null

echo "Importing traffic management..."
kubectl apply -f "$IMPORT_DIR/destinationrules.yaml" 2>/dev/null
kubectl apply -f "$IMPORT_DIR/gateways.yaml" 2>/dev/null
kubectl apply -f "$IMPORT_DIR/virtualservices.yaml" 2>/dev/null

echo "Importing authorization..."
kubectl apply -f "$IMPORT_DIR/authorizationpolicies.yaml" 2>/dev/null

echo "Importing advanced config..."
kubectl apply -f "$IMPORT_DIR/sidecars.yaml" 2>/dev/null
kubectl apply -f "$IMPORT_DIR/envoyfilters.yaml" 2>/dev/null
kubectl apply -f "$IMPORT_DIR/telemetry.yaml" 2>/dev/null
```

## Handling the Traffic Cutover

The traffic cutover depends on your setup:

**DNS-based cutover:**

```bash
# Point the DNS record from old cluster's load balancer to new cluster's
# This can be done gradually with weighted DNS records
```

**Load balancer cutover:**

```bash
# Get the new cluster's ingress gateway external IP
kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

**Gradual cutover with external load balancer:**

If you have an external load balancer in front of both clusters, you can shift traffic gradually:

```text
Old cluster: 90% -> 70% -> 50% -> 30% -> 10% -> 0%
New cluster: 10% -> 30% -> 50% -> 70% -> 90% -> 100%
```

## Validation Checklist

After migration, run through this checklist:

```bash
# 1. Verify all Istio resources exist
echo "=== Resource Counts ==="
for resource in virtualservices destinationrules gateways serviceentries peerauthentications authorizationpolicies; do
  count=$(kubectl get "$resource" --all-namespaces --no-headers 2>/dev/null | wc -l)
  echo "  $resource: $count"
done

# 2. Check for configuration errors
istioctl analyze --all-namespaces

# 3. Verify proxy sync
istioctl proxy-status

# 4. Test mTLS
kubectl exec deploy/sleep -n default -- curl -s http://httpbin.default:8080/get

# 5. Verify ingress
curl -v https://my-app.example.com/health

# 6. Check certificates
istioctl proxy-config secret deploy/my-app -n default
```

## Rollback Plan

Always have a rollback plan. Keep the old cluster running until you're confident the migration is successful:

```bash
# Quick rollback: switch DNS/LB back to old cluster
# The old cluster should remain fully functional
# Only decommission after validation period (recommend 1-2 weeks)
```

## Common Pitfalls

A few things that commonly go wrong during Istio migrations:

1. Forgetting EnvoyFilters. These are often added ad-hoc and not tracked in version control.
2. Certificate mismatch between clusters causing mTLS failures during gradual migration.
3. Different Istio versions with incompatible API changes.
4. Missing namespace labels for sidecar injection.
5. ServiceEntry resources pointing to the old cluster's internal IPs.

Cluster migration with Istio is very doable when you plan ahead. Export everything, validate the export, set up the target cluster carefully, import in the right order, and test thoroughly before cutting over traffic. Keep the old cluster as a safety net until you're fully confident in the new one.
