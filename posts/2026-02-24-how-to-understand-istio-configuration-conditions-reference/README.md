# How to Understand Istio Configuration Conditions Reference

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Configuration, Troubleshooting, Status Conditions, Kubernetes

Description: A practical guide to understanding Istio configuration status conditions, what each condition means, and how to troubleshoot common configuration issues.

---

When you apply an Istio resource like a VirtualService or DestinationRule, Istio validates and processes it. If something goes wrong - a reference to a non-existent host, a conflicting policy, or an invalid field - Istio reports the problem through analysis messages, and can write some of that information to resource status when status reporting is enabled. Understanding these messages and conditions helps you catch and fix configuration issues quickly.

## How Istio Reports Configuration Status

Istio uses two main mechanisms to communicate configuration health:

1. Resource status conditions and validation messages (when status reporting is enabled)
2. Analysis messages from `istioctl analyze`

Both tell you different things. Istio resource status can show background analysis results for a specific resource. Gateway API resources also use standard Gateway API conditions such as `Accepted` and `Programmed`. Analysis messages detect issues across your entire configuration, including cross-resource problems.

## Configuration Analysis Messages

When you run `istioctl analyze`, it returns messages with codes like `IST0101`, `IST0106`, etc. Each code corresponds to a specific type of issue. Here are the most important ones you will encounter.

### IST0101 - ReferencedResourceNotFound

```text
Warning [IST0101] (VirtualService my-vs.default) Referenced gateway not found: "my-gateway"
```

This means your VirtualService references a Gateway that does not exist. Common causes:

- Typo in the gateway name
- Gateway is in a different namespace and you forgot to qualify it
- Gateway has not been created yet

Fix:

```bash
# Check available gateways

kubectl get gateways.networking.istio.io -A

# Make sure the name matches
kubectl get gateway.networking.istio.io my-gateway -n istio-system
```

### IST0106 - SchemaValidationError

```text
Error [IST0106] (VirtualService my-vs.default) Schema validation error: unknown field "matchs"
```

A field in your YAML does not match the expected schema. This is usually a typo. The message tells you exactly which field is problematic.

### IST0108 - UnknownAnnotation

```text
Warning [IST0108] (Pod my-pod.default) Unknown annotation: networking.istio.io/exportToo
```

You used an Istio-related annotation that is not recognized. Again, usually a typo.

### IST0162 - GatewayPortNotDefinedOnService

```text
Warning [IST0162] (Gateway my-gateway.istio-system) Gateway port not exposed by service
```

Your Gateway defines a port that is not exposed by the Kubernetes Service selected by the gateway workload. Check the gateway service definition:

```bash
kubectl get svc istio-ingressgateway -n istio-system -o yaml
```

### IST0109 - ConflictingMeshGatewayVirtualServiceHosts

```text
Warning [IST0109] (VirtualService vs-a.default) Conflicting hosts for mesh gateway: reviews is also used by VirtualService vs-b.default
```

Two VirtualServices are trying to route traffic for the same hostname on the mesh gateway. This creates ambiguity. Either merge them into one VirtualService or use different hosts.

### IST0110 - ConflictingSidecarWorkloadSelectors

```text
Warning [IST0110] (Sidecar sidecar-a.default) Conflicting sidecar workload selectors: sidecar-b also selects the same workload
```

Multiple Sidecar resources are targeting the same workload. Only one Sidecar should match any given workload.

### IST0112 - VirtualServiceDestinationPortSelectorRequired

```text
Error [IST0112] (VirtualService my-vs.default) VirtualService routes to a service with more than one port exposed, but does not specify which to use
```

Your VirtualService routes to a Kubernetes Service that exposes multiple ports, but the route does not specify a destination port. Add a `port` selector to the VirtualService destination so Istio knows which service port to use.

### IST0159 - ConflictingTelemetryWorkloadSelectors

```text
Error [IST0159] (Telemetry telemetry-a.default) Multiple Telemetry resources select the same workload
```

Same as IST0110 but for Telemetry resources.

### IST0116 - DeploymentAssociatedToMultipleServices

```text
Info [IST0116] (Deployment my-app.default) Pods associated with multiple services without proper port naming
```

A workload matches multiple Kubernetes services. While this is valid, it can cause confusion with Istio routing if the port names are not consistent.

### IST0118 - PortNameIsNotUnderNamingConvention

```text
Info [IST0118] (Service my-svc.default) Port name grpc-web is not under naming convention
```

Your Kubernetes Service port name does not follow Istio's port naming convention. Protocol detection is applied to the port, but explicit protocol names are safer.

### IST0125 - InvalidAnnotation

```text
Warning [IST0125] (Pod my-pod.default) Invalid annotation value
```

An Istio annotation is recognized but has an invalid value. Check the annotation documentation and correct the value.

### IST0128 - NoServerCertificateVerificationDestinationLevel

```text
Warning [IST0128] (DestinationRule my-dr.default) No server certificate verification configured at destination level
```

Your DestinationRule configures TLS to an upstream but does not specify `subjectAltNames` or CA certificates for verification. This means the proxy will not validate the server's identity.

### IST0129 - NoServerCertificateVerificationPortLevel

Same as IST0128 but for traffic to a specific port rather than the destination level.

### IST0130 - VirtualServiceUnreachableRule

```text
Warning [IST0130] (VirtualService my-vs.default) Rule 2 is unreachable because a previous rule matches the same traffic
```

A routing rule in your VirtualService will never be reached because an earlier rule catches all the same traffic. Review the order of your match conditions.

### IST0131 - VirtualServiceIneffectiveMatch

```text
Warning [IST0131] (VirtualService my-vs.default) This match duplicates a match in a previous rule
```

Similar to IST0130 - you have duplicate match conditions.

### IST0134 - ServiceEntryAddressesRequired

```text
Warning [IST0134] (ServiceEntry my-se.default) Addresses required for TCP ServiceEntries with NONE resolution
```

TCP ServiceEntries with `resolution: NONE` need addresses to route traffic properly.

### IST0138 - GatewayDuplicateCertificate

```text
Warning [IST0138] (Gateway gw-a.istio-system) Duplicate certificate in multiple gateways
```

Multiple gateways use the same certificate. This may cause 404s if clients reuse HTTP/2 connections.

### IST0161 - InvalidGatewayCredential

```text
Error [IST0161] (Gateway my-gw.istio-system) The credential referenced by gateway is not found or is not valid
```

The TLS secret referenced by your Gateway does not exist or has the wrong format:

```bash
# Check if the secret exists
kubectl get secret my-tls-secret -n istio-system

# Verify it has the right keys
kubectl get secret my-tls-secret -n istio-system -o jsonpath='{.data}'
```

### IST0145 - ConflictingGateways

```text
Warning [IST0145] (Gateway gw-a.istio-system) Gateway should not have the same selector, port and matched hosts of server
```

Multiple Gateways define the same selector, port, and matched hosts, which can create listener conflicts.

### IST0151 - EnvoyFilterUsesRelativeOperation and IST0152 - EnvoyFilterUsesReplaceOperationIncorrectly

These relate to EnvoyFilter patches. IST0151 warns about relative patch operations without a priority, and IST0152 reports a `REPLACE` operation used with an unsupported `applyTo` value.

## Checking Resource Status

Some Istio resources have status fields that can report background analysis results when status reporting is enabled:

```bash
kubectl get virtualservice my-vs -n default -o yaml
```

Look for the `status` section:

```yaml
status:
  conditions:
    - lastProbeTime: null
      lastTransitionTime: "2024-01-15T10:00:00Z"
      message: "1 Error found. See validationMessages field for details"
      reason: errorsFound
      status: "False"
      type: PassedAnalysis
  validationMessages:
    - code: IST0101
      level: Error
      message: 'Referenced gateway not found: "bogus-gateway"'
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
