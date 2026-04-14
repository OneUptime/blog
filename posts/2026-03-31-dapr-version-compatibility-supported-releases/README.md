# How to Check Dapr Version Compatibility and Supported Releases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Version, Compatibility, Upgrade, Support

Description: Check Dapr version compatibility between the runtime, SDKs, CLI, and Kubernetes to plan upgrades and stay within the supported release window.

---

Dapr has a compatibility matrix between its runtime, SDKs, CLI, and dashboard components. Running mismatched versions causes subtle failures that are difficult to diagnose. This guide shows how to check and maintain version alignment.

## Dapr's Support Policy

Dapr supports the current release and the previous two minor releases (N-2). For example, if the current release is 1.15, then 1.13 and 1.14 are also supported.

Check the current supported versions:
- https://docs.dapr.io/operations/support/support-release-policy/

## Checking Installed Versions

```bash
# CLI version
dapr --version

# Runtime version in Kubernetes
kubectl get deployment -n dapr-system dapr-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Sidecar version running alongside your app
kubectl get pod -n default -l app=myapp \
  -o jsonpath='{.items[0].spec.containers[?(@.name=="daprd")].image}'

# Dashboard version
kubectl get deployment -n dapr-system dapr-dashboard \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## SDK Version Compatibility

SDK versions are not always identical to the runtime version. Check the compatibility table:

```bash
# Python SDK - check pyproject.toml or requirements.txt
pip show dapr

# JavaScript SDK
npm list @dapr/dapr

# Go SDK - check go.mod
grep "dapr/go-sdk" go.mod

# .NET SDK
dotnet list package | grep Dapr
```

The Dapr SDK compatibility matrix is at:
- https://docs.dapr.io/developing-applications/sdks/

## Minimum Runtime Version for SDK Features

Some SDK methods require a minimum runtime version. Verify before using:

```python
# Query the Dapr sidecar metadata to get runtime version
import httpx
response = httpx.get("http://localhost:3500/v1.0/metadata")
runtime_version = response.json().get("runtimeVersion")
print(f"Dapr runtime: {runtime_version}")
```

## Kubernetes-Specific Compatibility

Dapr requires a minimum Kubernetes version. Check the matrix before upgrading either:

```bash
# Check Kubernetes version
kubectl version

# Check Dapr's minimum Kubernetes requirement for your target version
# https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
```

## Upgrade Path Considerations

Dapr supports single minor version upgrades only. Do not skip minor versions:

```bash
# Correct: 1.13 -> 1.14 -> 1.15
# Incorrect: 1.13 -> 1.15

# Check current runtime version in Kubernetes
dapr status -k

# Upgrade to next minor version
dapr upgrade --runtime-version 1.14.0 -k
kubectl rollout status deployment/dapr-operator -n dapr-system
```

## Verifying Post-Upgrade Compatibility

After upgrading, verify the sidecar version on running pods:

```bash
# Check all sidecars are on the expected version
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.image}{"\n"}{end}{end}' | grep daprd
```

Restart deployments to pick up the new sidecar version:

```bash
kubectl rollout restart deployment/myapp -n default
```

## Summary

Maintaining Dapr version compatibility requires checking the runtime, CLI, SDKs, and Kubernetes version together against the official compatibility matrix. Dapr's N-2 support policy means you should upgrade within 2 minor releases of the latest. Always upgrade one minor version at a time and verify that running sidecar versions match the control plane version after each upgrade.
