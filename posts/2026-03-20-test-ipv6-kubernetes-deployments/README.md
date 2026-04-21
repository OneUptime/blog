# How to Test IPv6 Kubernetes Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Testing, Networking, Dual-Stack, CI/CD

Description: A comprehensive guide to testing IPv6 functionality in Kubernetes deployments, covering address assignment, connectivity, and service reachability.

Validating IPv6 in a Kubernetes deployment requires testing at multiple layers: pod address assignment, pod-to-pod connectivity, service discovery, and external accessibility. This guide walks through a complete test suite.

## Test 1: Verify Pod IPv6 Address Assignment

```bash
# Deploy a test workload

kubectl create deployment ipv6-test --image=nginx:stable --replicas=2

# Wait for pods to be ready
kubectl rollout status deployment/ipv6-test

# Confirm each pod has an IPv6 address
kubectl get pods -l app=ipv6-test -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.podIPs}{"\n"}{end}'
```

Expected output should show both IPv4 and IPv6 entries in `podIPs` for dual-stack, or a single IPv6 entry for IPv6-only clusters.

## Test 2: Pod-to-Pod IPv6 Connectivity

```bash
# Get the IPv6 address of the second pod
POD_B=$(kubectl get pods -l app=ipv6-test -o jsonpath='{.items[1].metadata.name}')
POD_B_IPV6=$(kubectl get pod "$POD_B" -o jsonpath='{.status.podIPs[*].ip}' | tr ' ' '\n' | grep ':' | head -n1)

# Ping from a temporary pod to pod B using IPv6
kubectl run ping-test --image=busybox:1.36 --restart=Never \
  --rm --attach --command -- ping -6 -c 5 "$POD_B_IPV6"
```

## Test 3: Service IPv6 ClusterIP Connectivity

```bash
# Expose the deployment as a dual-stack service
kubectl expose deployment ipv6-test --port=80 --target-port=80
kubectl patch svc ipv6-test -p '{"spec":{"ipFamilyPolicy":"RequireDualStack"}}'

# Get the IPv6 ClusterIP
SVC_IPV6=$(kubectl get svc ipv6-test -o jsonpath='{.spec.clusterIPs[*]}' | tr ' ' '\n' | grep ':' | head -n1)
echo "Service IPv6 ClusterIP: $SVC_IPV6"

# Test connectivity via the IPv6 ClusterIP from another pod
kubectl run curl-test --image=curlimages/curl:latest --restart=Never \
  --rm --attach -- -6 --max-time 5 "http://[$SVC_IPV6]/"
```

## Test 4: DNS AAAA Record Resolution

```bash
# Verify that the service has a AAAA DNS record
kubectl run dns-test --image=busybox:1.36 --restart=Never \
  --rm --attach --command -- \
  nslookup -type=AAAA ipv6-test.default.svc.cluster.local
```

## Test 5: External IPv6 Connectivity from Pods

```bash
# Test that pods can reach an external IPv6 address
kubectl run egress-test --image=busybox:1.36 --restart=Never \
  --rm --attach --command -- ping -6 -c 3 2001:4860:4860::8888
```

## Test 6: Network Policy Enforcement

```bash
# Apply a deny-all policy
# Requires a network plugin that enforces Kubernetes NetworkPolicy.
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-test
spec:
  podSelector:
    matchLabels:
      app: ipv6-test
  policyTypes: [Ingress]
EOF

# Verify traffic is now blocked
kubectl run blocked-test --image=curlimages/curl:latest --restart=Never \
  --rm --attach -- -6 --max-time 3 "http://[$SVC_IPV6]/"
# Should fail or time out

# Clean up the deny policy
kubectl delete networkpolicy deny-all-test
```

## Test 7: LoadBalancer IPv6 Endpoint

```bash
# Patch the service to LoadBalancer type
# Requires a provider that supports IPv6 LoadBalancer addresses.
kubectl patch svc ipv6-test -p '{"spec":{"type":"LoadBalancer"}}'

# Wait for an external IPv6 to be assigned
kubectl get svc ipv6-test --watch

# Test from outside the cluster; providers may report an IP or a DNS name
LB_IPV6=$(kubectl get svc ipv6-test -o jsonpath='{.status.loadBalancer.ingress[*].ip}' | tr ' ' '\n' | grep ':' | head -n1)
if [ -n "$LB_IPV6" ]; then
  curl -6 "http://[$LB_IPV6]/"
else
  LB_HOSTNAME=$(kubectl get svc ipv6-test -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
  curl -6 "http://$LB_HOSTNAME/"
fi
```

## Automating Tests in CI/CD

Wrap these commands in a shell script and run them as a post-deploy step in your pipeline:

```bash
#!/bin/bash
# validate-ipv6.sh - Run after deployment to validate IPv6 functionality

set -e

echo "[1/4] Checking pod IPv6 assignment..."
kubectl get pods -l app=ipv6-test -o jsonpath='{range .items[*].status.podIPs[*]}{.ip}{"\n"}{end}' | grep -q ':'

echo "[2/4] Testing pod-to-pod IPv6..."
POD_B=$(kubectl get pods -l app=ipv6-test -o jsonpath='{.items[1].metadata.name}')
POD_B_IP=$(kubectl get pod "$POD_B" -o jsonpath='{.status.podIPs[*].ip}' | tr ' ' '\n' | grep ':' | head -n1)
kubectl run pod-ping-test --image=busybox:1.36 --restart=Never \
  --rm --attach --command -- ping -6 -c 3 "$POD_B_IP"

echo "[3/4] Testing service IPv6 ClusterIP..."
SVC_IP=$(kubectl get svc ipv6-test -o jsonpath='{.spec.clusterIPs[*]}' | tr ' ' '\n' | grep ':' | head -n1)
kubectl run svc-test --image=curlimages/curl:latest --restart=Never \
  --rm --attach -- -6 --max-time 5 "http://[$SVC_IP]/"

echo "[4/4] All IPv6 tests passed."
```

Running systematic IPv6 tests at each layer ensures your Kubernetes deployments are truly IPv6-ready before traffic reaches production.
