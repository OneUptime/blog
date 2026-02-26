# How to Test RBAC Policies with argocd admin settings rbac

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Testing

Description: Learn how to use the argocd admin settings rbac command to validate and test ArgoCD RBAC policies before applying them to production, preventing access control mistakes.

---

Deploying a broken RBAC policy to your ArgoCD instance can lock out users, give unintended access, or break CI/CD pipelines. The `argocd admin settings rbac` command lets you test policies offline before applying them. You can verify that specific roles have the right permissions, catch misconfigurations, and build confidence that your policy does what you think it does.

This guide covers every way to use this command for RBAC validation.

## The Basic Can Command

The most useful subcommand is `can`, which tests whether a subject is allowed to perform a specific action:

```bash
argocd admin settings rbac can <subject> <action> <resource> <object> [flags]
```

Here is a concrete example:

```bash
argocd admin settings rbac can role:deployer sync applications 'frontend/web-app' \
  --policy-file policy.csv \
  --default-role ''
```

This outputs either `Yes` or `No`, telling you whether the `role:deployer` can sync the `frontend/web-app` application.

## Testing Against a Policy File

Create a policy file and test it without touching your cluster:

```bash
# Create a test policy file
cat > /tmp/test-policy.csv << 'EOF'
p, role:deployer, applications, get, */*, allow
p, role:deployer, applications, sync, frontend/*, allow
p, role:deployer, applications, action, frontend/*, allow

p, role:viewer, applications, get, */*, allow
p, role:viewer, logs, get, */*, allow

g, dev-user@company.com, role:deployer
g, qa-user@company.com, role:viewer
EOF

# Test permissions
argocd admin settings rbac can role:deployer sync applications 'frontend/web-app' \
  --policy-file /tmp/test-policy.csv \
  --default-role ''
# Output: Yes

argocd admin settings rbac can role:deployer sync applications 'backend/api' \
  --policy-file /tmp/test-policy.csv \
  --default-role ''
# Output: No

argocd admin settings rbac can role:viewer sync applications 'frontend/web-app' \
  --policy-file /tmp/test-policy.csv \
  --default-role ''
# Output: No
```

## Testing Against the Live Cluster

To test against the actual RBAC configuration on your cluster:

```bash
# Test using the live ConfigMap
argocd admin settings rbac can role:deployer sync applications 'frontend/web-app' \
  --namespace argocd

# Or specify the kubeconfig
argocd admin settings rbac can role:deployer sync applications 'frontend/web-app' \
  --namespace argocd \
  --kubeconfig ~/.kube/config
```

This reads the `argocd-rbac-cm` ConfigMap directly from the cluster and evaluates the policy.

## Testing Specific Users

Test what a specific user can do:

```bash
# Test a user mapped through group assignment
argocd admin settings rbac can dev-user@company.com sync applications 'frontend/web-app' \
  --policy-file /tmp/test-policy.csv \
  --default-role ''
# Output: Yes (because dev-user is mapped to role:deployer)

# Test a user not in any group
argocd admin settings rbac can random-user@company.com sync applications 'frontend/web-app' \
  --policy-file /tmp/test-policy.csv \
  --default-role ''
# Output: No
```

## Testing with Default Role

The `--default-role` flag simulates the `policy.default` setting:

```bash
# Test with readonly as default
argocd admin settings rbac can unknown-user get applications 'frontend/web-app' \
  --policy-file /tmp/test-policy.csv \
  --default-role 'role:readonly'
# Output: Yes (readonly allows get)

# Test with no default
argocd admin settings rbac can unknown-user get applications 'frontend/web-app' \
  --policy-file /tmp/test-policy.csv \
  --default-role ''
# Output: No
```

This is important because `policy.default` often catches people by surprise. A user you think has no access might actually inherit permissions from the default role.

## The Validate Subcommand

The `validate` subcommand checks your policy file for syntax errors:

```bash
argocd admin settings rbac validate --policy-file /tmp/test-policy.csv
```

This catches issues like:
- Malformed policy lines
- Invalid resource types
- Missing fields in policy rules
- Duplicate rules

## Building a Test Suite

Create a comprehensive test script that validates all your roles:

```bash
#!/bin/bash
# test-rbac.sh - Comprehensive RBAC validation script

POLICY_FILE="argocd-rbac-cm.yaml"
PASS=0
FAIL=0

test_permission() {
  local subject=$1
  local action=$2
  local resource=$3
  local object=$4
  local expected=$5
  local description=$6

  result=$(argocd admin settings rbac can "$subject" "$action" "$resource" "$object" \
    --policy-file "$POLICY_FILE" \
    --default-role '' 2>&1)

  if [ "$result" = "$expected" ]; then
    echo "PASS: $description"
    ((PASS++))
  else
    echo "FAIL: $description (expected: $expected, got: $result)"
    ((FAIL++))
  fi
}

echo "=== Testing Deployer Role ==="
test_permission "role:deployer" "get" "applications" "*/web-app" "Yes" \
  "Deployer can view apps"
test_permission "role:deployer" "sync" "applications" "frontend/web-app" "Yes" \
  "Deployer can sync frontend apps"
test_permission "role:deployer" "sync" "applications" "backend/api" "No" \
  "Deployer cannot sync backend apps"
test_permission "role:deployer" "delete" "applications" "frontend/web-app" "No" \
  "Deployer cannot delete apps"

echo ""
echo "=== Testing Viewer Role ==="
test_permission "role:viewer" "get" "applications" "*/web-app" "Yes" \
  "Viewer can view apps"
test_permission "role:viewer" "sync" "applications" "frontend/web-app" "No" \
  "Viewer cannot sync apps"
test_permission "role:viewer" "delete" "applications" "frontend/web-app" "No" \
  "Viewer cannot delete apps"

echo ""
echo "=== Testing Admin Role ==="
test_permission "role:admin" "delete" "applications" "production/critical-app" "Yes" \
  "Admin can delete any app"
test_permission "role:admin" "sync" "applications" "*/web-app" "Yes" \
  "Admin can sync any app"

echo ""
echo "=== Testing Group Mappings ==="
test_permission "dev-user@company.com" "sync" "applications" "frontend/web-app" "Yes" \
  "Dev user can sync (via group mapping)"
test_permission "qa-user@company.com" "sync" "applications" "frontend/web-app" "No" \
  "QA user cannot sync"

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ $FAIL -gt 0 ]; then
  exit 1
fi
```

Run this as part of your CI pipeline whenever the RBAC policy changes:

```bash
chmod +x test-rbac.sh
./test-rbac.sh
```

## Testing All Available Actions

Here are all the actions you can test for each resource type:

```bash
# Application actions
argocd admin settings rbac can role:test get applications 'proj/app' --policy-file policy.csv
argocd admin settings rbac can role:test create applications 'proj/app' --policy-file policy.csv
argocd admin settings rbac can role:test update applications 'proj/app' --policy-file policy.csv
argocd admin settings rbac can role:test delete applications 'proj/app' --policy-file policy.csv
argocd admin settings rbac can role:test sync applications 'proj/app' --policy-file policy.csv
argocd admin settings rbac can role:test action applications 'proj/app' --policy-file policy.csv
argocd admin settings rbac can role:test override applications 'proj/app' --policy-file policy.csv

# Cluster actions
argocd admin settings rbac can role:test get clusters '*' --policy-file policy.csv
argocd admin settings rbac can role:test create clusters '*' --policy-file policy.csv
argocd admin settings rbac can role:test update clusters '*' --policy-file policy.csv
argocd admin settings rbac can role:test delete clusters '*' --policy-file policy.csv

# Repository actions
argocd admin settings rbac can role:test get repositories '*' --policy-file policy.csv
argocd admin settings rbac can role:test create repositories '*' --policy-file policy.csv
argocd admin settings rbac can role:test update repositories '*' --policy-file policy.csv
argocd admin settings rbac can role:test delete repositories '*' --policy-file policy.csv

# Log and exec actions
argocd admin settings rbac can role:test get logs 'proj/app' --policy-file policy.csv
argocd admin settings rbac can role:test create exec 'proj/app' --policy-file policy.csv
```

## Testing Deny Rules

Deny rules require special attention since they override allow rules:

```bash
# Policy with deny rule
cat > /tmp/deny-test.csv << 'EOF'
p, role:deployer, applications, *, production/*, allow
p, role:deployer, applications, delete, production/*, deny
EOF

# The wildcard allows everything...
argocd admin settings rbac can role:deployer sync applications 'production/app' \
  --policy-file /tmp/deny-test.csv --default-role ''
# Output: Yes

# ...but deny overrides for delete
argocd admin settings rbac can role:deployer delete applications 'production/app' \
  --policy-file /tmp/deny-test.csv --default-role ''
# Output: No
```

## Integrating RBAC Tests in CI/CD

Add RBAC validation to your GitOps pipeline. When the RBAC policy is stored in Git (as it should be), run tests on every pull request:

```yaml
# .github/workflows/rbac-test.yml
name: Test RBAC Policy
on:
  pull_request:
    paths:
      - 'argocd/argocd-rbac-cm.yaml'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x argocd
          sudo mv argocd /usr/local/bin/

      - name: Validate RBAC syntax
        run: |
          argocd admin settings rbac validate \
            --policy-file argocd/argocd-rbac-cm.yaml

      - name: Run RBAC tests
        run: ./scripts/test-rbac.sh
```

## Debugging Unexpected Results

If a test returns an unexpected result:

1. **Check the policy file for typos** - A misspelled project or role name silently fails
2. **Check the default role** - The default role might be granting unexpected permissions
3. **Check group mappings** - Ensure the user is mapped to the expected role
4. **Check for conflicting rules** - Multiple rules for the same subject can interact unexpectedly
5. **Check deny rules** - A deny rule elsewhere might be blocking an allow

```bash
# Verbose output to see which rule matched
argocd admin settings rbac can role:deployer sync applications 'frontend/web-app' \
  --policy-file policy.csv \
  --default-role '' \
  -v
```

## Summary

The `argocd admin settings rbac can` command is your most important tool for RBAC management. Use it to test every permission scenario before deploying policies, build automated test suites that run in CI, and verify that changes to your policy produce the expected results. Never push an RBAC change to production without testing it first.
