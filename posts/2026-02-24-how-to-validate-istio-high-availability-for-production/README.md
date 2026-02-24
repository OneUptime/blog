# How to Validate Istio High Availability for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, High Availability, Kubernetes, Production, Resilience

Description: A practical guide to validating Istio high availability configuration for production environments including control plane redundancy and failure testing.

---

If istiod goes down and takes your entire mesh with it, you have a bad day ahead. The good news is that existing proxy configurations persist even when the control plane is unavailable, so traffic keeps flowing. But new deployments, configuration changes, and certificate rotations all stop. For production, you need a highly available Istio deployment, and you need to validate that it actually works under failure conditions.

## Validate Control Plane Redundancy

The most critical piece is istiod. You need multiple replicas running across different nodes.

Check current replica count:

```bash
kubectl get deployment istiod -n istio-system
```

You should see at least 2 replicas. Configure this in your IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        hpaSpec:
          minReplicas: 3
          maxReplicas: 7
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization: 80
```

Three replicas is the sweet spot. It gives you fault tolerance during rolling updates and node failures.

## Validate Pod Anti-Affinity

Having three replicas on the same node does not help when that node dies. Verify that anti-affinity rules are spreading pods across nodes:

```bash
kubectl get pods -n istio-system -l app=istiod -o wide
```

Each istiod pod should be on a different node. Configure anti-affinity:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                podAffinityTerm:
                  labelSelector:
                    matchExpressions:
                      - key: app
                        operator: In
                        values:
                          - istiod
                  topologyKey: kubernetes.io/hostname
```

Using `preferredDuringSchedulingIgnoredDuringExecution` instead of `required` avoids scheduling failures when you have fewer nodes than replicas.

## Validate Ingress Gateway HA

Your ingress gateways handle all external traffic. They need the same HA treatment as the control plane:

```bash
kubectl get deployment istio-ingressgateway -n istio-system
kubectl get hpa istio-ingressgateway -n istio-system
```

Configure gateway HA:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          replicaCount: 3
          hpaSpec:
            minReplicas: 3
            maxReplicas: 10
            metrics:
              - type: Resource
                resource:
                  name: cpu
                  target:
                    type: Utilization
                    averageUtilization: 70
          affinity:
            podAntiAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight: 100
                  podAffinityTerm:
                    labelSelector:
                      matchExpressions:
                        - key: app
                          operator: In
                          values:
                            - istio-ingressgateway
                    topologyKey: kubernetes.io/hostname
```

## Validate Pod Disruption Budgets

PodDisruptionBudgets prevent Kubernetes from taking down too many pods at once during node drains or upgrades:

```bash
kubectl get pdb -n istio-system
```

If you do not see PDBs, create them:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod-pdb
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: istiod
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ingressgateway-pdb
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: istio-ingressgateway
```

## Test Control Plane Failure

The only way to know if HA works is to test it. Kill an istiod pod and verify the mesh keeps working:

```bash
# Get current istiod pods
kubectl get pods -n istio-system -l app=istiod

# Kill one pod
kubectl delete pod -n istio-system -l app=istiod --field-selector=status.phase=Running --grace-period=0 --force 2>/dev/null | head -1

# Immediately check if traffic still flows
kubectl exec deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/get
```

The request should succeed. Also verify that configuration changes still work while one pod is down:

```bash
# Apply a configuration change
kubectl apply -f test-virtualservice.yaml

# Verify it was picked up
istioctl proxy-config routes deploy/sleep | grep test-service
```

## Validate Multi-Zone Deployment

If you are running across multiple availability zones, make sure Istio components are spread across zones:

```bash
kubectl get pods -n istio-system -l app=istiod -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.nodeName}{"\n"}{end}'

# Check which zones those nodes are in
for node in $(kubectl get pods -n istio-system -l app=istiod -o jsonpath='{.items[*].spec.nodeName}'); do
  zone=$(kubectl get node "$node" -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}')
  echo "$node: $zone"
done
```

For multi-zone awareness, use topology spread constraints:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        topologySpreadConstraints:
          - maxSkew: 1
            topologyKey: topology.kubernetes.io/zone
            whenUnsatisfiable: ScheduleAnyway
            labelSelector:
              matchLabels:
                app: istiod
```

## Validate Proxy Resilience

When istiod goes down, existing proxy configurations should continue working. Test this:

```bash
# Scale istiod to 0
kubectl scale deployment istiod -n istio-system --replicas=0

# Wait a moment
sleep 10

# Verify traffic still works
for i in $(seq 1 10); do
  kubectl exec deploy/sleep -- curl -s -o /dev/null -w "%{http_code}\n" http://httpbin:8000/get
done

# Restore istiod
kubectl scale deployment istiod -n istio-system --replicas=3
```

All 10 requests should return 200. This confirms that the data plane is resilient to control plane outages.

## Validate Certificate Rotation Under Failure

Certificates have a limited lifetime. If istiod is down when a certificate needs rotation, that workload will lose mTLS connectivity:

```bash
# Check certificate TTL
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/certs | python3 -m json.tool | grep -A2 "valid_from"
```

The default certificate lifetime is 24 hours. Make sure istiod can recover within that window. For extra safety, you can increase the certificate lifetime:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: 48h0m0s
```

## Validate Resource Headroom

HA means nothing if your nodes do not have room to reschedule pods. Check available resources:

```bash
kubectl describe nodes | grep -A5 "Allocated resources"
```

Make sure each node has enough spare capacity to absorb the load from a failed node. If your cluster is running at 90% utilization, a node failure will cause cascading evictions.

## HA Validation Checklist

Run through this before signing off on production readiness:

- [ ] istiod running with 3+ replicas across different nodes
- [ ] Ingress gateway running with 3+ replicas
- [ ] Pod anti-affinity configured for istiod and gateways
- [ ] PodDisruptionBudgets in place
- [ ] Tested control plane pod failure - traffic continues
- [ ] Tested complete control plane outage - traffic continues
- [ ] Verified configuration changes work with degraded control plane
- [ ] Certificate rotation validated
- [ ] Node failure scenario tested
- [ ] Resource headroom verified across all nodes

High availability is not something you configure once and forget. Test your failure scenarios regularly, ideally through automated chaos engineering. The last thing you want is to discover your HA setup does not work during an actual outage.
