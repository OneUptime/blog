# How to Use ipFamilyPolicy (SingleStack, PreferDualStack, RequireDualStack)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, IpFamilyPolicy, Dual-Stack, Service, SingleStack

Description: Understand and use Kubernetes ipFamilyPolicy to control whether services get IPv4 only, IPv6 only, or both address families, and configure ipFamilies to specify address family preference order.

## Introduction

`ipFamilyPolicy` is a Kubernetes Service field that controls how the API server assigns ClusterIPs to a service. It has three values: `SingleStack` (one IP family), `PreferDualStack` (both if available, falls back to single), and `RequireDualStack` (both required, fails if cluster is single-stack). The companion field `ipFamilies` specifies which IP family to use for single-stack or the preference order for dual-stack.

## ipFamilyPolicy Values Explained

```yaml
# Option 1: SingleStack (default for most Services)

# Gets one ClusterIP based on first ipFamilies entry
apiVersion: v1
kind: Service
metadata:
  name: singlestack-v4
spec:
  selector:
    app: myapp
  ports:
    - port: 80
  ipFamilyPolicy: SingleStack
  ipFamilies:
    - IPv4  # Gets IPv4 ClusterIP only
```

```yaml
# Option 2: PreferDualStack
# Gets both IPv4 and IPv6 if dual-stack is enabled
# Falls back gracefully to single-stack if dual-stack is not enabled
apiVersion: v1
kind: Service
metadata:
  name: prefer-dual
spec:
  selector:
    app: myapp
  ports:
    - port: 80
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
```

```yaml
# Option 3: RequireDualStack
# Requires BOTH IPv4 and IPv6 ClusterIPs
# Service creation FAILS on single-stack clusters
apiVersion: v1
kind: Service
metadata:
  name: require-dual
spec:
  selector:
    app: myapp
  ports:
    - port: 80
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv4
    - IPv6
```

## ipFamilies Controls Order and Primary IP

```bash
# ipFamilies[0] is the "primary" IP family
# The first ClusterIP in clusterIPs corresponds to ipFamilies[0]

# IPv4-primary dual-stack service
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: ipv4-primary
spec:
  selector:
    app: test
  ports:
    - port: 80
  ipFamilyPolicy: RequireDualStack
  ipFamilies: [IPv4, IPv6]  # IPv4 primary
EOF

kubectl get svc ipv4-primary -o jsonpath='{.spec.clusterIPs}'
# [10.96.x.x fd00::x]   <-- IPv4 first

# IPv6-primary dual-stack service
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: ipv6-primary
spec:
  selector:
    app: test
  ports:
    - port: 80
  ipFamilyPolicy: RequireDualStack
  ipFamilies: [IPv6, IPv4]  # IPv6 primary
EOF

kubectl get svc ipv6-primary -o jsonpath='{.spec.clusterIPs}'
# [fd00::x 10.96.x.x]   <-- IPv6 first
```

## Practical Examples

```bash
# Check all services and their ipFamilyPolicy
kubectl get svc -A -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data['items']:
    name = item['metadata']['name']
    ns = item['metadata']['namespace']
    policy = item['spec'].get('ipFamilyPolicy', 'unset')
    families = item['spec'].get('ipFamilies', [])
    clusterIPs = item['spec'].get('clusterIPs', [item['spec'].get('clusterIP', '')])
    print(f'{ns}/{name}: policy={policy}, families={families}, IPs={clusterIPs}')
" | sort

# Patch service to upgrade from SingleStack to PreferDualStack
kubectl patch svc my-service -p '{"spec":{"ipFamilyPolicy":"PreferDualStack"}}'

# View the patched service
kubectl get svc my-service -o yaml | grep -A10 "ipFamily"
```

## Default Behavior Without ipFamilyPolicy

```bash
# For most Services, when ipFamilyPolicy is not set, Kubernetes defaults to SingleStack
# Headless Services without selectors are a documented exception and default to RequireDualStack
# The IP family is based on the first configured service-cluster-ip-range (usually IPv4 first)

# Create service without ipFamilyPolicy
kubectl expose deployment myapp --port=80

# Check what was assigned
kubectl get svc myapp -o jsonpath='{.spec.ipFamilyPolicy}'
# SingleStack

kubectl get svc myapp -o jsonpath='{.spec.ipFamilies}'
# [IPv4]  -- default on most clusters

# In IPv6-only clusters, default would be IPv6
```

## Conclusion

`ipFamilyPolicy` controls dual-stack behavior for Kubernetes Services: `SingleStack` (default for most Services, one IP family), `PreferDualStack` (both if available), and `RequireDualStack` (both required). Use `PreferDualStack` for services that should work on both single-stack and dual-stack clusters. Use `RequireDualStack` when your application requires both address families and should fail fast on misconfigured clusters. The `ipFamilies` array determines the primary IP family and the order of `clusterIPs`. Changing `ipFamilyPolicy` on existing services is possible with `kubectl patch`.
