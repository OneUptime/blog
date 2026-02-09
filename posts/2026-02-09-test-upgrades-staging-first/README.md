# How to Test Kubernetes Upgrades in Staging Environment First

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Testing, Staging

Description: Implement comprehensive staging environment testing for Kubernetes upgrades including environment parity, automated test suites, and production-like validation before upgrading production clusters.

---

Testing Kubernetes upgrades in staging before touching production is not optional. It's the difference between a smooth upgrade and a catastrophic production outage. A proper staging environment lets you discover breaking changes, compatibility issues, and performance regressions before they impact your users.

## Why Staging Environment Testing is Critical

Production Kubernetes upgrades involve changing the control plane, node versions, addons, and potentially API versions that your applications depend on. Without staging validation, you're essentially testing in production, which is a recipe for disaster.

Staging environments should mirror production as closely as possible in terms of Kubernetes version, node specifications, network configuration, and deployed applications. The more similar your staging is to production, the more confidence you have that the upgrade will work.

## Creating Production-Like Staging Clusters

Your staging cluster needs to replicate production conditions accurately. This includes matching Kubernetes versions, node types, cluster addons, networking configuration, storage classes, and security policies.

```bash
# Script to create staging cluster matching production specs
#!/bin/bash
# create-staging-cluster.sh

PROD_CLUSTER="production"
STAGING_CLUSTER="staging"

echo "Fetching production cluster configuration..."

# Get production cluster version
PROD_VERSION=$(kubectl get nodes --context=$PROD_CLUSTER -o json | \
  jq -r '.items[0].status.nodeInfo.kubeletVersion')

# Get production node types and counts
PROD_NODES=$(kubectl get nodes --context=$PROD_CLUSTER -o json | \
  jq -r '.items[] | [.metadata.labels["node.kubernetes.io/instance-type"],
  .metadata.labels["node-role.kubernetes.io/worker"]] | @csv')

echo "Production version: $PROD_VERSION"
echo "Production nodes: $PROD_NODES"

# For EKS, create matching staging cluster
aws eks create-cluster \
  --name $STAGING_CLUSTER \
  --version $PROD_VERSION \
  --role-arn $(aws eks describe-cluster --name $PROD_CLUSTER \
    --query 'cluster.roleArn' --output text) \
  --resources-vpc-config subnetIds=$(aws eks describe-cluster \
    --name $PROD_CLUSTER --query 'cluster.resourcesVpcConfig.subnetIds' \
    --output text)

echo "Staging cluster created matching production configuration"
```

## Synchronizing Application Deployments

Your staging environment needs the same applications running as production to test upgrade compatibility.

```yaml
# GitOps configuration for environment sync
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: app-sync
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - env: production
        cluster: production-cluster
      - env: staging
        cluster: staging-cluster
  template:
    metadata:
      name: '{{env}}-myapp'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/myapp
        targetRevision: main
        path: k8s/overlays/{{env}}
      destination:
        server: '{{cluster}}'
        namespace: myapp
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

Create a script to verify staging matches production deployments:

```bash
#!/bin/bash
# verify-staging-parity.sh

PROD_CTX="production"
STAGING_CTX="staging"

echo "Verifying staging environment parity with production..."

# Compare namespaces
prod_ns=$(kubectl get ns --context=$PROD_CTX -o json | \
  jq -r '.items[].metadata.name' | sort)
staging_ns=$(kubectl get ns --context=$STAGING_CTX -o json | \
  jq -r '.items[].metadata.name' | sort)

diff <(echo "$prod_ns") <(echo "$staging_ns")

# Compare deployments in each namespace
for ns in $(echo "$prod_ns"); do
  echo "Checking namespace: $ns"

  prod_deploys=$(kubectl get deploy -n $ns --context=$PROD_CTX \
    -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | sort)
  staging_deploys=$(kubectl get deploy -n $ns --context=$STAGING_CTX \
    -o jsonpath='{.items[*].metadata.name}' | tr ' ' '\n' | sort)

  if ! diff <(echo "$prod_deploys") <(echo "$staging_deploys") > /dev/null; then
    echo "WARNING: Deployment mismatch in namespace $ns"
  fi
done

# Compare ConfigMaps and Secrets count
echo "Comparing ConfigMaps and Secrets..."
kubectl get cm,secrets --all-namespaces --context=$PROD_CTX | wc -l
kubectl get cm,secrets --all-namespaces --context=$STAGING_CTX | wc -l

echo "Parity check complete"
```

## Upgrading Staging Cluster First

Once your staging cluster is ready, perform the upgrade following the same procedure you'll use in production.

```bash
#!/bin/bash
# upgrade-staging-cluster.sh

STAGING_CLUSTER="staging"
TARGET_VERSION="1.29"

echo "Starting staging cluster upgrade to version $TARGET_VERSION"

# Create pre-upgrade backup
echo "Creating pre-upgrade backup..."
kubectl get all --all-namespaces -o yaml > staging-pre-upgrade-backup.yaml

# Backup etcd (for self-managed clusters)
ETCDCTL_API=3 etcdctl snapshot save staging-snapshot-$(date +%Y%m%d).db

# Upgrade control plane (EKS example)
echo "Upgrading control plane..."
aws eks update-cluster-version \
  --name $STAGING_CLUSTER \
  --kubernetes-version $TARGET_VERSION

# Wait for control plane upgrade to complete
echo "Waiting for control plane upgrade..."
while true; do
  status=$(aws eks describe-cluster --name $STAGING_CLUSTER \
    --query 'cluster.status' --output text)
  if [ "$status" == "ACTIVE" ]; then
    break
  fi
  echo "Status: $status - waiting..."
  sleep 30
done

# Upgrade node groups
echo "Upgrading node groups..."
for nodegroup in $(aws eks list-nodegroups --cluster-name $STAGING_CLUSTER \
  --query 'nodegroups' --output text); do

  echo "Upgrading node group: $nodegroup"
  aws eks update-nodegroup-version \
    --cluster-name $STAGING_CLUSTER \
    --nodegroup-name $nodegroup \
    --kubernetes-version $TARGET_VERSION

  # Wait for node group upgrade
  while true; do
    status=$(aws eks describe-nodegroup \
      --cluster-name $STAGING_CLUSTER \
      --nodegroup-name $nodegroup \
      --query 'nodegroup.status' --output text)
    if [ "$status" == "ACTIVE" ]; then
      break
    fi
    sleep 30
  done
done

echo "Staging cluster upgrade complete"
```

## Running Automated Test Suites

After upgrading staging, run comprehensive automated tests to validate functionality.

```bash
#!/bin/bash
# run-staging-tests.sh

STAGING_CONTEXT="staging"
TEST_RESULTS_DIR="test-results-$(date +%Y%m%d-%H%M%S)"

mkdir -p $TEST_RESULTS_DIR

echo "Running test suite on upgraded staging cluster..."

# Test 1: API compatibility tests
echo "Testing API compatibility..."
kubectl api-resources --context=$STAGING_CONTEXT > $TEST_RESULTS_DIR/api-resources.txt

# Check for deprecated APIs
kubectl get all --all-namespaces --context=$STAGING_CONTEXT \
  -o json | jq -r '.items[] | select(.apiVersion |
  contains("v1beta1")) | [.kind, .metadata.name, .apiVersion] | @csv' \
  > $TEST_RESULTS_DIR/deprecated-apis.csv

# Test 2: Pod health checks
echo "Checking pod health..."
kubectl get pods --all-namespaces --context=$STAGING_CONTEXT \
  --field-selector=status.phase!=Running \
  -o json > $TEST_RESULTS_DIR/unhealthy-pods.json

unhealthy_count=$(cat $TEST_RESULTS_DIR/unhealthy-pods.json | jq '.items | length')
if [ $unhealthy_count -gt 0 ]; then
  echo "WARNING: Found $unhealthy_count unhealthy pods"
fi

# Test 3: Service connectivity tests
echo "Testing service connectivity..."
cat > connectivity-test.yaml << 'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: connectivity-test
spec:
  containers:
  - name: test
    image: curlimages/curl:latest
    command: ['sleep', '3600']
  restartPolicy: Never
EOF

kubectl apply -f connectivity-test.yaml --context=$STAGING_CONTEXT -n default
kubectl wait --for=condition=ready pod/connectivity-test \
  --context=$STAGING_CONTEXT -n default --timeout=60s

# Test internal service connectivity
kubectl exec connectivity-test --context=$STAGING_CONTEXT -n default -- \
  curl -s kubernetes.default.svc.cluster.local:443 -k > /dev/null

if [ $? -eq 0 ]; then
  echo "Service connectivity: PASS"
else
  echo "Service connectivity: FAIL"
fi

# Test 4: DNS resolution
echo "Testing DNS resolution..."
kubectl exec connectivity-test --context=$STAGING_CONTEXT -n default -- \
  nslookup kubernetes.default.svc.cluster.local > $TEST_RESULTS_DIR/dns-test.txt

# Test 5: Storage provisioning
echo "Testing storage provisioning..."
cat > storage-test.yaml << 'EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
EOF

kubectl apply -f storage-test.yaml --context=$STAGING_CONTEXT -n default
sleep 10

pvc_status=$(kubectl get pvc test-pvc --context=$STAGING_CONTEXT -n default \
  -o jsonpath='{.status.phase}')

if [ "$pvc_status" == "Bound" ]; then
  echo "Storage provisioning: PASS"
else
  echo "Storage provisioning: FAIL (Status: $pvc_status)"
fi

# Cleanup test resources
kubectl delete pod connectivity-test --context=$STAGING_CONTEXT -n default
kubectl delete pvc test-pvc --context=$STAGING_CONTEXT -n default

# Test 6: Run application-specific integration tests
echo "Running application integration tests..."
./run-integration-tests.sh $STAGING_CONTEXT > $TEST_RESULTS_DIR/integration-tests.log

# Test 7: Performance benchmarks
echo "Running performance benchmarks..."
kubectl run performance-test --context=$STAGING_CONTEXT \
  --image=williamyeh/hey --rm -it --restart=Never -- \
  -n 1000 -c 10 http://myapp.default.svc.cluster.local/api/health \
  > $TEST_RESULTS_DIR/performance-test.log

# Generate test report
cat > $TEST_RESULTS_DIR/summary.md << EOF
# Staging Upgrade Test Results

Date: $(date)
Cluster: $STAGING_CONTEXT

## Summary
- Unhealthy Pods: $unhealthy_count
- Service Connectivity: $([ $? -eq 0 ] && echo "PASS" || echo "FAIL")
- DNS Resolution: PASS
- Storage Provisioning: $pvc_status

## Deprecated APIs Found
See deprecated-apis.csv for details.

## Next Steps
$([ $unhealthy_count -eq 0 ] && echo "Proceed with production upgrade" || echo "Fix issues before production upgrade")
EOF

echo "Test results saved to $TEST_RESULTS_DIR"
cat $TEST_RESULTS_DIR/summary.md
```

## Load Testing Upgraded Staging

Perform load testing to ensure the upgraded cluster can handle production traffic patterns.

```bash
#!/bin/bash
# load-test-staging.sh

STAGING_ENDPOINT="https://staging-api.example.com"

echo "Running load test against staging environment..."

# Install k6 if not present
if ! command -v k6 &> /dev/null; then
  echo "Installing k6..."
  brew install k6
fi

# Create load test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '5m', target: 100 }, // Ramp up to 100 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 200 }, // Ramp up to 200 users
    { duration: '10m', target: 200 }, // Stay at 200 users
    { duration: '5m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'], // Less than 1% failure rate
  },
};

export default function () {
  const res = http.get(__ENV.STAGING_ENDPOINT + '/api/v1/test');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
EOF

# Run load test
k6 run --env STAGING_ENDPOINT=$STAGING_ENDPOINT load-test.js

if [ $? -eq 0 ]; then
  echo "Load test PASSED"
else
  echo "Load test FAILED - do not proceed with production upgrade"
  exit 1
fi
```

## Chaos Engineering in Staging

Introduce failures in staging to test resilience of the upgraded cluster.

```bash
#!/bin/bash
# chaos-test-staging.sh

STAGING_CONTEXT="staging"

echo "Running chaos tests on staging cluster..."

# Install chaos-mesh if not present
kubectl apply -f https://mirrors.chaos-mesh.org/latest/chaos-mesh.yaml \
  --context=$STAGING_CONTEXT

# Test 1: Pod failure chaos
cat > pod-failure-chaos.yaml << 'EOF'
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-failure-test
  namespace: default
spec:
  action: pod-failure
  mode: one
  duration: '30s'
  selector:
    namespaces:
      - production
    labelSelectors:
      'app': 'myapp'
EOF

kubectl apply -f pod-failure-chaos.yaml --context=$STAGING_CONTEXT

# Monitor application recovery
sleep 35
kubectl get pods -n production --context=$STAGING_CONTEXT

# Test 2: Network latency chaos
cat > network-latency-chaos.yaml << 'EOF'
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-latency-test
  namespace: default
spec:
  action: delay
  mode: one
  selector:
    namespaces:
      - production
    labelSelectors:
      'app': 'myapp'
  delay:
    latency: '100ms'
    correlation: '100'
    jitter: '0ms'
  duration: '60s'
EOF

kubectl apply -f network-latency-chaos.yaml --context=$STAGING_CONTEXT

# Monitor application performance under latency
sleep 65

# Cleanup chaos experiments
kubectl delete podchaos pod-failure-test --context=$STAGING_CONTEXT
kubectl delete networkchaos network-latency-test --context=$STAGING_CONTEXT

echo "Chaos testing complete"
```

## Documenting Staging Test Results

Create detailed documentation of your staging test results to guide the production upgrade.

```bash
#!/bin/bash
# generate-upgrade-report.sh

REPORT_FILE="staging-upgrade-report-$(date +%Y%m%d).md"

cat > $REPORT_FILE << EOF
# Staging Cluster Upgrade Report

## Upgrade Details
- Date: $(date)
- Source Version: 1.28
- Target Version: 1.29
- Cluster: staging
- Upgraded By: $(whoami)

## Pre-Upgrade State
- Node Count: $(kubectl get nodes --context=staging -o json | jq '.items | length')
- Pod Count: $(kubectl get pods --all-namespaces --context=staging -o json | jq '.items | length')
- Service Count: $(kubectl get svc --all-namespaces --context=staging -o json | jq '.items | length')

## Upgrade Duration
- Control Plane: 15 minutes
- Node Groups: 45 minutes
- Total: 60 minutes

## Test Results
- API Compatibility: PASS
- Pod Health: PASS (0 unhealthy pods)
- Service Connectivity: PASS
- DNS Resolution: PASS
- Storage Provisioning: PASS
- Load Test: PASS (95th percentile: 385ms)
- Chaos Testing: PASS (application recovered successfully)

## Issues Encountered
None

## Recommendations for Production
1. Schedule upgrade during maintenance window
2. Follow same upgrade procedure used in staging
3. Monitor metrics closely during upgrade
4. Have rollback plan ready

## Sign-Off
Staging upgrade successful. Approved for production deployment.
EOF

echo "Upgrade report generated: $REPORT_FILE"
cat $REPORT_FILE
```

Testing Kubernetes upgrades in staging is your safety net against production disasters. By creating production-like staging environments, running comprehensive test suites, and documenting results thoroughly, you build confidence that your production upgrade will succeed. Never skip staging testing, no matter how small the upgrade seems.
