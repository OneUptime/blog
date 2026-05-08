# Validate Calico Profile Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Profiles, Validation

Description: How to validate Calico Profile resources to confirm label inheritance is working correctly, profile rules are being applied to the intended endpoints, and the policy evaluation order behaves as...

---

## Introduction

Validating Calico Profile resources requires confirming three things: the profile specification matches the intended configuration, the profile is assigned to the correct workload endpoints, and the labels applied by the profile are effective for those endpoints (making them matchable by policy selectors). In Kubernetes, profile validation is primarily about verifying that namespace-profile synchronization is correct and that the auto-generated profiles have not been modified unexpectedly.

## Prerequisites

- Calico installed with workload endpoints
- `calicoctl` with cluster admin access
- Test workloads to verify label inheritance

## Step 1: Verify Profile Exists and Is Correct

```bash
# List all profiles

calicoctl get profiles

# Check a specific profile's specification
calicoctl get profile kns.production -o yaml

# Verify the labelsToApply field
calicoctl get profile kns.production -o json | python3 -c "
import json, sys
p = json.load(sys.stdin)
print('Labels to apply:')
for k, v in p.get('spec', {}).get('labelsToApply', {}).items():
    print(f'  {k}: {v}')
"
```

## Step 2: Verify Profile Assigned to Workload Endpoints

```bash
# List workload endpoints and their assigned profiles
calicoctl get workloadendpoints -A -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for ep in data['items']:
    name = ep['metadata']['name']
    ns = ep['metadata']['namespace']
    profiles = ep['spec'].get('profiles', [])
    print(f'{ns}/{name}: profiles = {profiles}')
"
```

## Step 3: Verify Label Inheritance

```bash
# Check that endpoints reference the namespace profile that supplies namespace labels
python3 - <<'PY'
import json, subprocess

profile = json.loads(subprocess.check_output([
    "calicoctl", "get", "profile", "kns.production", "-o", "json"
]))
labels_to_apply = profile.get("spec", {}).get("labelsToApply", {})
ns_label = labels_to_apply.get("pcns.projectcalico.org/name", "MISSING")
print(f"kns.production labelsToApply namespace label = {ns_label}")

endpoints = json.loads(subprocess.check_output([
    "calicoctl", "get", "workloadendpoint", "-n", "production", "-o", "json"
]))
for ep in endpoints["items"]:
    name = ep["metadata"]["name"]
    profiles = ep["spec"].get("profiles", [])
    status = "present" if "kns.production" in profiles else "MISSING"
    print(f"{name}: kns.production profile = {status}")
PY
```

```mermaid
graph TD
    A[Validate Profile] --> B{Profile exists?}
    B -->|No| C[Create or sync profile]
    B -->|Yes| D{Assigned to endpoints?}
    D -->|No| E[Check Calico CNI and profile synchronization]
    D -->|Yes| F{Labels inherited?}
    F -->|Labels missing| G[Check labelsToApply in profile spec]
    F -->|Labels present| H{Traffic behavior correct?}
    H -->|Unexpected allow/deny| I[Review profile ingress/egress rules and ordering]
    H -->|Correct| J[Validation passed]
```

## Step 4: Test Traffic Behavior with Profile Rules

```bash
# Deploy test pods to verify profile-based policy allows expected traffic
kubectl run sender --image=busybox -n production -l role=test -- sleep 3600
kubectl run receiver --image=nginx -n production -l role=test --port=80
kubectl wait --for=condition=Ready pod/sender pod/receiver -n production --timeout=60s
kubectl expose pod receiver --port=80 --target-port=80 -n production

# Test intra-namespace traffic (should be allowed by default profile)
kubectl exec -n production sender -- wget -qO- http://receiver.production.svc.cluster.local

# Cleanup
kubectl delete service receiver -n production
kubectl delete pod sender receiver -n production
```

## Step 5: Verify No Unexpected Profile Modifications

```bash
# Compare current profile state with expected configuration
calicoctl get profile kns.production -o yaml > current-profile.yaml
diff expected-profile.yaml current-profile.yaml
```

## Conclusion

Profile validation in Kubernetes clusters focuses on verifying that namespace profiles are synchronized correctly and that auto-generated profiles match the expected namespace label set. The most critical validation is confirming label inheritance - if `labelsToApply` is incorrect, policy selectors that depend on namespace labels will fail silently, allowing or blocking traffic in unexpected ways. Always test both allowed and denied traffic paths after any profile change.
