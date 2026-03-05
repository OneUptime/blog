# How to Test Multi-Tenancy Isolation in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Testing, Security, Isolation

Description: Learn how to systematically test and validate multi-tenancy isolation in Flux CD to ensure tenants cannot access each other's resources or escape their boundaries.

---

Testing multi-tenancy isolation is critical to ensure that your Flux CD setup properly prevents tenants from accessing each other's resources, escalating privileges, or escaping their namespace boundaries. This guide provides a systematic approach to testing RBAC, network, resource quota, and source isolation.

## Why Testing Isolation Matters

Configuration errors in RBAC, network policies, or Flux resources can create security holes that allow tenants to:

- Read or modify another tenant's resources
- Consume more than their allocated resources
- Access unauthorized Git repositories or Helm registries
- Communicate with other tenant pods over the network

Regular testing catches these issues before they become security incidents.

## Step 1: Test RBAC Isolation

Verify that tenant service accounts can only access their own namespace.

```bash
#!/bin/bash
# test-rbac-isolation.sh - Test RBAC boundaries between tenants

TENANT_A="team-alpha"
TENANT_B="team-beta"

echo "=== Testing RBAC Isolation ==="

# Test 1: Tenant A can create resources in their own namespace
echo "Test 1: Tenant A can create in own namespace"
kubectl auth can-i create deployments \
  --as=system:serviceaccount:${TENANT_A}:${TENANT_A} \
  -n ${TENANT_A}
# Expected: yes

# Test 2: Tenant A cannot create resources in Tenant B's namespace
echo "Test 2: Tenant A cannot create in Tenant B namespace"
kubectl auth can-i create deployments \
  --as=system:serviceaccount:${TENANT_A}:${TENANT_A} \
  -n ${TENANT_B}
# Expected: no

# Test 3: Tenant A cannot access flux-system namespace
echo "Test 3: Tenant A cannot access flux-system"
kubectl auth can-i get pods \
  --as=system:serviceaccount:${TENANT_A}:${TENANT_A} \
  -n flux-system
# Expected: no

# Test 4: Tenant A cannot create cluster-scoped resources
echo "Test 4: Tenant A cannot create namespaces"
kubectl auth can-i create namespaces \
  --as=system:serviceaccount:${TENANT_A}:${TENANT_A}
# Expected: no

# Test 5: Tenant A cannot create RBAC resources (privilege escalation)
echo "Test 5: Tenant A cannot create roles"
kubectl auth can-i create roles \
  --as=system:serviceaccount:${TENANT_A}:${TENANT_A} \
  -n ${TENANT_A}
# Expected: no (if using restricted role)

# Test 6: Tenant A cannot read Tenant B's secrets
echo "Test 6: Tenant A cannot read Tenant B secrets"
kubectl auth can-i get secrets \
  --as=system:serviceaccount:${TENANT_A}:${TENANT_A} \
  -n ${TENANT_B}
# Expected: no
```

## Step 2: Test Network Isolation

Verify that network policies prevent cross-tenant communication.

```bash
#!/bin/bash
# test-network-isolation.sh - Test network boundaries between tenants

TENANT_A="team-alpha"
TENANT_B="team-beta"

echo "=== Testing Network Isolation ==="

# Deploy a test server in Tenant A
kubectl run test-server --image=nginx --port=80 -n ${TENANT_A}
kubectl expose pod test-server --port=80 -n ${TENANT_A}

# Wait for the pod to be ready
kubectl wait --for=condition=ready pod/test-server -n ${TENANT_A} --timeout=60s

# Test 1: Tenant A can reach its own services
echo "Test 1: Intra-tenant connectivity"
kubectl run test-client --rm -it --image=busybox -n ${TENANT_A} \
  --restart=Never -- wget -qO- --timeout=5 http://test-server.${TENANT_A}.svc.cluster.local
# Expected: success (HTML response)

# Test 2: Tenant B cannot reach Tenant A's services
echo "Test 2: Cross-tenant connectivity blocked"
kubectl run test-client --rm -it --image=busybox -n ${TENANT_B} \
  --restart=Never -- wget -qO- --timeout=5 http://test-server.${TENANT_A}.svc.cluster.local
# Expected: timeout or connection refused

# Clean up
kubectl delete pod test-server -n ${TENANT_A}
kubectl delete service test-server -n ${TENANT_A}
```

## Step 3: Test Resource Quota Enforcement

Verify that tenants cannot exceed their resource quotas.

```bash
#!/bin/bash
# test-quota-enforcement.sh - Test resource quota limits

TENANT="team-alpha"

echo "=== Testing Resource Quota Enforcement ==="

# Check current quota usage
kubectl describe resourcequota -n ${TENANT}

# Test 1: Try to create a pod that exceeds limits
echo "Test 1: Pod exceeding memory limit"
kubectl run quota-test --image=nginx -n ${TENANT} \
  --overrides='{"spec":{"containers":[{"name":"nginx","image":"nginx","resources":{"requests":{"memory":"100Gi"}}}]}}' \
  --restart=Never 2>&1
# Expected: Error - exceeded quota

# Test 2: Try to create more pods than allowed
echo "Test 2: Exceeding pod count"
for i in $(seq 1 60); do
  kubectl run pod-test-$i --image=busybox --command -- sleep 3600 \
    -n ${TENANT} --restart=Never 2>&1 | \
    grep -q "forbidden" && echo "Quota hit at pod $i" && break
done

# Clean up test pods
kubectl delete pods -l run=pod-test -n ${TENANT} --ignore-not-found
kubectl delete pod quota-test -n ${TENANT} --ignore-not-found
```

## Step 4: Test Source Isolation

Verify that tenants can only use approved Git and Helm sources.

```bash
#!/bin/bash
# test-source-isolation.sh - Test source access controls

TENANT="team-alpha"

echo "=== Testing Source Isolation ==="

# Test 1: Check that tenant cannot create GitRepository resources
echo "Test 1: Tenant cannot create GitRepository"
kubectl create -n ${TENANT} -f - \
  --as=system:serviceaccount:${TENANT}:${TENANT} <<EOF 2>&1
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: unauthorized-repo
spec:
  interval: 1m
  url: https://github.com/malicious/repo
  ref:
    branch: main
EOF
# Expected: forbidden

# Test 2: Check that tenant cannot create HelmRepository resources
echo "Test 2: Tenant cannot create HelmRepository"
kubectl create -n ${TENANT} -f - \
  --as=system:serviceaccount:${TENANT}:${TENANT} <<EOF 2>&1
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: unauthorized-helm
spec:
  interval: 10m
  url: https://malicious-charts.example.com
EOF
# Expected: forbidden

# Test 3: Verify tenant can read their approved sources
echo "Test 3: Tenant can read approved sources"
kubectl get gitrepositories -n ${TENANT} \
  --as=system:serviceaccount:${TENANT}:${TENANT}
# Expected: list of approved sources
```

## Step 5: Test Flux Kustomization Isolation

Verify that tenant Kustomizations cannot deploy resources outside their namespace.

```yaml
# test-manifests/cross-namespace-deploy.yaml
# A malicious manifest that tries to create a resource in another namespace
apiVersion: apps/v1
kind: Deployment
metadata:
  name: malicious-app
  # Trying to deploy to another tenant's namespace
  namespace: team-beta
spec:
  replicas: 1
  selector:
    matchLabels:
      app: malicious
  template:
    metadata:
      labels:
        app: malicious
    spec:
      containers:
        - name: app
          image: nginx
```

If this manifest is in team-alpha's Git repository and their Kustomization has `serviceAccountName: team-alpha` and `targetNamespace: team-alpha`, Flux will either override the namespace to `team-alpha` (due to `targetNamespace`) or reject the deployment due to RBAC.

```bash
# Verify the deployment did not appear in team-beta
kubectl get deployment malicious-app -n team-beta 2>&1
# Expected: not found
```

## Step 6: Create an Automated Test Suite

Combine all tests into an automated script that runs periodically.

```bash
#!/bin/bash
# test-multi-tenancy.sh - Comprehensive multi-tenancy isolation test suite

set -e

PASS=0
FAIL=0

assert_yes() {
  if [ "$1" = "yes" ]; then
    PASS=$((PASS + 1))
    echo "  PASS: $2"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: $2 (expected yes, got $1)"
  fi
}

assert_no() {
  if [ "$1" = "no" ]; then
    PASS=$((PASS + 1))
    echo "  PASS: $2"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: $2 (expected no, got $1)"
  fi
}

TENANTS=("team-alpha" "team-beta")

for tenant in "${TENANTS[@]}"; do
  echo "Testing tenant: ${tenant}"

  # RBAC: Can access own namespace
  result=$(kubectl auth can-i create deployments \
    --as=system:serviceaccount:${tenant}:${tenant} \
    -n ${tenant} 2>/dev/null)
  assert_yes "$result" "${tenant} can create deployments in own namespace"

  # RBAC: Cannot access flux-system
  result=$(kubectl auth can-i get pods \
    --as=system:serviceaccount:${tenant}:${tenant} \
    -n flux-system 2>/dev/null)
  assert_no "$result" "${tenant} cannot access flux-system"

  # RBAC: Cannot create namespaces
  result=$(kubectl auth can-i create namespaces \
    --as=system:serviceaccount:${tenant}:${tenant} 2>/dev/null)
  assert_no "$result" "${tenant} cannot create namespaces"
done

# Cross-tenant isolation
for tenant_a in "${TENANTS[@]}"; do
  for tenant_b in "${TENANTS[@]}"; do
    if [ "$tenant_a" != "$tenant_b" ]; then
      result=$(kubectl auth can-i get secrets \
        --as=system:serviceaccount:${tenant_a}:${tenant_a} \
        -n ${tenant_b} 2>/dev/null)
      assert_no "$result" "${tenant_a} cannot access ${tenant_b} secrets"
    fi
  done
done

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
```

## Step 7: Run Tests as a CronJob

Deploy the test suite as a Kubernetes CronJob for continuous validation.

```yaml
# infrastructure/testing/isolation-test-job.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: multi-tenancy-test
  namespace: flux-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: isolation-tester
          containers:
            - name: tester
              image: bitnami/kubectl:latest
              command: ["/bin/bash", "/scripts/test-multi-tenancy.sh"]
              volumeMounts:
                - name: test-scripts
                  mountPath: /scripts
          volumes:
            - name: test-scripts
              configMap:
                name: isolation-test-scripts
          restartPolicy: OnFailure
```

## Summary

Testing multi-tenancy isolation in Flux CD requires systematic validation of RBAC boundaries, network policies, resource quotas, and source access controls. Build automated test suites that verify each isolation layer and run them regularly to catch configuration drift. The key areas to test are: cross-namespace RBAC access, network connectivity between tenant namespaces, resource quota enforcement, and source creation restrictions. Automated testing ensures that isolation remains effective as your multi-tenant environment evolves.
