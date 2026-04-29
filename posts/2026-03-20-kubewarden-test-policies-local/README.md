# How to Test Kubewarden Policies Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Testing, Policy as Code, Kubernetes, Kwctl, SUSE Rancher, Quality Assurance

Description: Learn how to test Kubewarden admission policies locally using kwctl and the bats testing framework before deploying them to a Kubernetes cluster.

---

Testing Kubewarden policies locally saves time by catching policy logic errors before they affect a running cluster. The `kwctl` tool can run Kubewarden policies against synthetic admission requests before you deploy them to a Kubernetes cluster.

---

## Tools Required

```bash
# Install helper tools
sudo apt-get update
sudo apt-get install -y unzip bats jq

# Install kwctl

curl -LO https://github.com/kubewarden/kwctl/releases/latest/download/kwctl-linux-x86_64.zip
unzip kwctl-linux-x86_64.zip
chmod +x kwctl-linux-x86_64
sudo mv kwctl-linux-x86_64 /usr/local/bin/kwctl

# Verify installation
kwctl --version
```

---

## Step 1: Run a Policy Against a Test Request

Pull a policy from an OCI registry reference and test it:

```bash
# Pull the policy locally
kwctl pull registry://ghcr.io/kubewarden/policies/pod-privileged:v0.2.5

# Create a test request - a pod requesting privileged mode
cat > test-privileged-pod.json << EOF
{
  "uid": "test-001",
  "kind": {"group":"","version":"v1","kind":"Pod"},
  "resource": {"group":"","version":"v1","resource":"pods"},
  "operation": "CREATE",
  "userInfo": {
    "username": "test-user",
    "groups": ["system:authenticated"]
  },
  "object": {
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": {"name": "test-pod"},
    "spec": {
      "containers": [{
        "name": "test",
        "image": "nginx:1.24",
        "securityContext": {
          "privileged": true
        }
      }]
    }
  }
}
EOF

# Run the policy
kwctl run \
  registry://ghcr.io/kubewarden/policies/pod-privileged:v0.2.5 \
  --request-path test-privileged-pod.json

# Expected output: {"uid":"test-001","allowed":false,"status":{"message":"..."}}
```

---

## Step 2: Test a Policy with Settings

Some policies accept settings. Provide them as a JSON file:

```bash
# Create a test request
cat > test-labeled-pod.json << EOF
{
  "uid": "test-003",
  "kind": {"group":"","version":"v1","kind":"Pod"},
  "resource": {"group":"","version":"v1","resource":"pods"},
  "operation": "CREATE",
  "userInfo": {
    "username": "test-user",
    "groups": ["system:authenticated"]
  },
  "object": {
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": {
      "name": "labeled-pod",
      "labels": {
        "priority": "5"
      }
    },
    "spec": {
      "containers": [{
        "name": "test",
        "image": "nginx:1.24"
      }]
    }
  }
}
EOF

# Create settings
cat > settings.json << EOF
{
  "constrained_labels": {
    "priority": "[123]"
  }
}
EOF

# Run policy with settings
kwctl run \
  registry://ghcr.io/kubewarden/policies/safe-labels:v0.1.5 \
  --request-path test-labeled-pod.json \
  --settings-path settings.json
```

---

## Step 3: Create a Structured Test Suite with bats

`bats` (Bash Automated Testing System) provides organized test suites:

```bash
# tests/test_pod_privileged.bats
#!/usr/bin/env bats

POLICY_URI="registry://ghcr.io/kubewarden/policies/pod-privileged:v0.2.5"

@test "reject privileged container" {
  run kwctl run "$POLICY_URI" \
    --request-path tests/fixtures/privileged-pod.json
  [ "$status" -eq 0 ]
  echo "$output" | grep -q '"allowed":false'
}

@test "accept non-privileged container" {
  run kwctl run "$POLICY_URI" \
    --request-path tests/fixtures/normal-pod.json
  [ "$status" -eq 0 ]
  echo "$output" | grep -q '"allowed":true'
}

@test "accept when no securityContext defined" {
  run kwctl run "$POLICY_URI" \
    --request-path tests/fixtures/no-security-context.json
  [ "$status" -eq 0 ]
  echo "$output" | grep -q '"allowed":true'
}
```

Run the tests:

```bash
bats tests/test_pod_privileged.bats
```

---

## Step 4: Validate Policy Settings

```bash
# Test that invalid settings are rejected
cat > invalid-settings.json << EOF
{
  "constrained_labels": {
    "priority": "["
  }
}
EOF

kwctl run \
  registry://ghcr.io/kubewarden/policies/safe-labels:v0.1.5 \
  --request-path test-labeled-pod.json \
  --settings-path invalid-settings.json

# Should output a settings validation error
```

---

## Step 5: Test Mutation Policies

For policies that mutate resources, verify the mutated output:

```bash
# Create settings for a mutating policy
cat > user-group-settings.json << EOF
{
  "run_as_user": {
    "rule": "MustRunAs",
    "ranges": [
      {"min": 1000, "max": 2000},
      {"min": 3000, "max": 4000}
    ]
  },
  "run_as_group": {
    "rule": "RunAsAny"
  },
  "supplemental_groups": {
    "rule": "RunAsAny"
  }
}
EOF

# Create a pod request without a securityContext
cat > test-user-group-pod.json << EOF
{
  "uid": "test-004",
  "kind": {"group":"","version":"v1","kind":"Pod"},
  "resource": {"group":"","version":"v1","resource":"pods"},
  "operation": "CREATE",
  "userInfo": {
    "username": "test-user",
    "groups": ["system:authenticated"]
  },
  "object": {
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": {"name": "pause-user-group"},
    "spec": {
      "containers": [{
        "name": "pause",
        "image": "registry.k8s.io/pause"
      }]
    }
  }
}
EOF

# Run mutation policy
kwctl run \
  registry://ghcr.io/kubewarden/policies/user-group-psp:v0.1.5 \
  --request-path test-user-group-pod.json \
  --settings-path user-group-settings.json

# Extract the patch from the response
kwctl run \
  registry://ghcr.io/kubewarden/policies/user-group-psp:v0.1.5 \
  --request-path test-user-group-pod.json \
  --settings-path user-group-settings.json \
  | jq -r '.patch' | base64 -d | jq .
```

---

## CI Integration

Add policy tests to your CI pipeline:

```yaml
# .github/workflows/test-policies.yml
- name: Test Kubewarden policies
  run: |
    sudo apt-get update
    sudo apt-get install -y bats unzip
    curl -LO https://github.com/kubewarden/kwctl/releases/latest/download/kwctl-linux-x86_64.zip
    unzip kwctl-linux-x86_64.zip
    chmod +x kwctl-linux-x86_64
    sudo mv kwctl-linux-x86_64 /usr/local/bin/kwctl
    bats tests/
```

---

## Best Practices

- Test both accepting (allowed) and rejecting (denied) scenarios for every policy.
- Include edge cases: empty specs, missing fields, multiple containers.
- Run policy tests in CI before any policy changes are merged to the main branch.
