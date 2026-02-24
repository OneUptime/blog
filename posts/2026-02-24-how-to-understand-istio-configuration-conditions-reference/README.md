# How to Understand Istio Configuration Conditions Reference

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Configuration, Troubleshooting, Status Conditions, Kubernetes

Description: A practical guide to understanding Istio configuration status conditions, what each condition means, and how to troubleshoot common configuration issues.

---

When you apply an Istio resource like a VirtualService or DestinationRule, Istio validates and processes it. If something goes wrong - a reference to a non-existent host, a conflicting policy, or an invalid field - Istio reports the problem through status conditions and analysis messages. Understanding these conditions helps you catch and fix configuration issues quickly.

## How Istio Reports Configuration Status

Istio uses two main mechanisms to communicate configuration health:

1. Resource status conditions (similar to Kubernetes conditions)
2. Analysis messages from `istioctl analyze`

Both tell you different things. Status conditions show whether a specific resource was accepted and is being applied. Analysis messages detect issues across your entire configuration, including cross-resource problems.

## Configuration Analysis Messages

When you run `istioctl analyze`, it returns messages with codes like `IST0101`, `IST0106`, etc. Each code corresponds to a specific type of issue. Here are the most important ones you will encounter.

### IST0101 - ReferencedResourceNotFound

```
Warning [IST0101] (VirtualService default/my-vs) Referenced gateway not found: "my-gateway"
```

This means your VirtualService references a Gateway that does not exist. Common causes:

- Typo in the gateway name
- Gateway is in a different namespace and you forgot to qualify it
- Gateway has not been created yet

Fix:

```bash
# Check available gateways
kubectl get gateways -A

# Make sure the name matches
kubectl get gateway my-gateway -n istio-system
```

### IST0106 - SchemaValidationError

```
Error [IST0106] (VirtualService default/my-vs) Schema validation error: unknown field "matchs"
```

A field in your YAML does not match the expected schema. This is usually a typo. The message tells you exactly which field is problematic.

### IST0108 - UnknownAnnotation

```
Warning [IST0108] (Pod default/my-pod) Unknown annotation: networking.istio.io/exportToo
```

You used an Istio-related annotation that is not recognized. Again, usually a typo.

### IST0104 - GatewayPortNotOnWorkload

```
Warning [IST0104] (Gateway istio-system/my-gateway) The gateway refers to a port that is not exposed on the workload
```

Your Gateway defines a port that the gateway pod does not actually listen on. Check the gateway deployment's service definition:

```bash
kubectl get svc istio-ingressgateway -n istio-system -o yaml
```

### IST0109 - ConflictingMeshGatewayVirtualServiceHosts

```
Warning [IST0109] (VirtualService default/vs-a) Conflicting hosts for mesh gateway: reviews is also used by VirtualService default/vs-b
```

Two VirtualServices are trying to route traffic for the same hostname on the mesh gateway. This creates ambiguity. Either merge them into one VirtualService or use different hosts.

### IST0110 - ConflictingSidecarWorkloadSelectors

```
Warning [IST0110] (Sidecar default/sidecar-a) Conflicting sidecar workload selectors: sidecar-b also selects the same workload
```

Multiple Sidecar resources are targeting the same workload. Only one Sidecar should match any given workload.

### IST0112 - ConflictingTelemetryWorkloadSelectors

```
Warning [IST0112] (Telemetry default/telemetry-a) Multiple Telemetry resources select the same workload
```

Same as IST0110 but for Telemetry resources.

### IST0113 - ConflictingPeerAuthentication

```
Warning [IST0113] Multiple PeerAuthentication policies match workload X
```

Multiple PeerAuthentication policies without workload selectors exist in the same namespace. Only one namespace-default policy is allowed.

### IST0116 - DeploymentAssociatedToMultipleServices

```
Info [IST0116] (Deployment default/my-app) Pods associated with multiple services without proper port naming
```

A workload matches multiple Kubernetes services. While this is valid, it can cause confusion with Istio routing if the port names are not consistent.

### IST0118 - DeprecatedAnnotation

```
Warning [IST0118] (Pod default/my-pod) Annotation policy.istio.io/check is deprecated
```

You are using an annotation that has been deprecated in the current Istio version. Check the release notes for the replacement.

### IST0122 - InvalidRegexp

```
Error [IST0122] (VirtualService default/my-vs) Invalid regex in URI match: "[invalid"
```

A regex pattern in your configuration is not valid. Test your regex separately before putting it in the YAML.

### IST0128 - NoServerCertificateVerificationPortLevel

```
Warning [IST0128] (DestinationRule default/my-dr) No server certificate verification for port 443
```

Your DestinationRule configures TLS to an upstream but does not specify `subjectAltNames` or CA certificates for verification. This means the proxy will not validate the server's identity.

### IST0129 - NoServerCertificateVerificationDestinationLevel

Same as IST0128 but at the destination level rather than port level.

### IST0131 - VirtualServiceUnreachableRule

```
Warning [IST0131] (VirtualService default/my-vs) Rule 2 is unreachable because a previous rule matches the same traffic
```

A routing rule in your VirtualService will never be reached because an earlier rule catches all the same traffic. Review the order of your match conditions.

### IST0132 - VirtualServiceIneffectiveMatch

```
Warning [IST0132] (VirtualService default/my-vs) This match duplicates a match in a previous rule
```

Similar to IST0131 - you have duplicate match conditions.

### IST0134 - ServiceEntryAddressesRequired

```
Warning [IST0134] (ServiceEntry default/my-se) Addresses required for TCP ServiceEntries with NONE resolution
```

TCP ServiceEntries with `resolution: NONE` need addresses to route traffic properly.

### IST0138 - ConflictingGateways

```
Warning [IST0138] (Gateway istio-system/gw-a) Conflicting listeners on port 443
```

Multiple gateways define listeners on the same port and host, creating a conflict.

### IST0139 - InvalidGatewayCredential

```
Error [IST0139] (Gateway istio-system/my-gw) The credential referenced by gateway is not found or is not valid
```

The TLS secret referenced by your Gateway does not exist or has the wrong format:

```bash
# Check if the secret exists
kubectl get secret my-tls-secret -n istio-system

# Verify it has the right keys
kubectl get secret my-tls-secret -n istio-system -o jsonpath='{.data}'
```

### IST0145 - HostAlreadyDefined

```
Warning [IST0145] (VirtualService default/my-vs) Host already defined in another VirtualService
```

Multiple VirtualServices define the same host, which can cause routing conflicts.

### IST0151 - AutoMTLSEnabled and IST0152 - NamespaceMTLSMismatch

These relate to mTLS configuration mismatches between PeerAuthentication and DestinationRule settings.

## Checking Resource Status

Some Istio resources have status fields that report their processing state:

```bash
kubectl get virtualservice my-vs -n default -o yaml
```

Look for the `status` section:

```yaml
status:
  conditions:
    - lastTransitionTime: "2024-01-15T10:00:00Z"
      message: "Route was valid"
      reason: ReconcileSucceeded
      status: "True"
      type: Reconciled
```

For Gateway API resources (if using the Kubernetes Gateway API integration), conditions are more detailed:

```yaml
status:
  conditions:
    - type: Accepted
      status: "True"
      reason: Accepted
    - type: Programmed
      status: "True"
      reason: Programmed
```

## Practical Troubleshooting Workflow

When you suspect a configuration issue:

```bash
# Step 1: Run analysis on the namespace
istioctl analyze -n <namespace>

# Step 2: Check specific resource status
kubectl get virtualservice <name> -n <namespace> -o yaml | grep -A 20 status

# Step 3: Check proxy sync status
istioctl proxy-status

# Step 4: Describe the affected workload
istioctl x describe pod <pod-name> -n <namespace>

# Step 5: Validate a file before applying
istioctl analyze my-config.yaml

# Step 6: Check istiod logs for processing errors
kubectl logs deployment/istiod -n istio-system --since=5m | grep "error\|warn"
```

## Preventing Configuration Issues

A few practices help avoid these issues:

Run `istioctl analyze` in your CI/CD pipeline before deploying any Istio configuration:

```bash
istioctl analyze -n target-namespace my-configs/ --failure-threshold Warning
```

Use `--failure-threshold` to fail the pipeline on warnings, not just errors.

Keep your istioctl version matched to your control plane. New analysis rules are added in each release.

Use namespace isolation with `exportTo` on your resources to prevent cross-namespace conflicts:

```yaml
spec:
  exportTo:
    - "."
```

Understanding Istio configuration conditions saves you from chasing phantom bugs that turn out to be simple misconfigurations. Make `istioctl analyze` a regular part of your workflow.
