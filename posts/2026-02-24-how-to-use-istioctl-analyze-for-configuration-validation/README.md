# How to Use istioctl analyze for Configuration Validation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, istioctl, Configuration, Validation, Troubleshooting

Description: A comprehensive guide to using istioctl analyze to detect configuration issues, warnings, and best practice violations in your Istio mesh.

---

`istioctl analyze` is the most powerful validation tool in the Istio toolbox. It goes beyond simple schema checking and actually understands the relationships between your Istio resources, Kubernetes resources, and the running state of your mesh. It catches issues that no other tool can find, like VirtualServices pointing to non-existent hosts, Gateways with selectors that don't match any pods, or DestinationRules with conflicting mTLS settings.

## Basic Usage

Run analyze against your current namespace:

```bash
istioctl analyze
```

Run it against a specific namespace:

```bash
istioctl analyze -n production
```

Run it against all namespaces:

```bash
istioctl analyze --all-namespaces
```

The output looks like this:

```
Info [IST0102] (Namespace default) The namespace is not enabled for Istio injection.
Warning [IST0101] (VirtualService production/api-routes) Referenced host not found: "api-service-typo"
Error [IST0134] (DestinationRule production/api-dr) This subset references a host with no endpoints
```

Messages are categorized as Info, Warning, or Error, each with a unique code (like IST0101) that you can look up for more details.

## Analyzing Local Files

You don't need a running cluster to use analyze. You can validate local YAML files:

```bash
# Analyze a single file
istioctl analyze -f virtual-service.yaml

# Analyze multiple files
istioctl analyze -f virtual-service.yaml -f destination-rule.yaml

# Analyze a directory
istioctl analyze -f ./istio-config/
```

## Analyzing Local Files Against Cluster State

The most powerful mode combines local files with cluster state. This tells you if your new configuration will cause issues with existing resources:

```bash
istioctl analyze -f new-virtual-service.yaml --use-kube
```

The `--use-kube` flag tells analyze to also check the live cluster resources. So if your new VirtualService references a subset defined in an existing DestinationRule, analyze will find it.

Without `--use-kube`, analyze can only check relationships between the files you provide. It won't know about resources already in the cluster.

## Common Analysis Messages

Here are the most frequent messages you'll encounter and what to do about them:

### IST0101: ReferencedResourceNotFound

```
Warning [IST0101] (VirtualService default/my-vs) Referenced host not found: "payment-svc"
```

Your VirtualService references a host that doesn't match any Kubernetes Service. Fix: check the host name matches the actual service name. For cross-namespace references, use the fully qualified name:

```yaml
hosts:
  - payment-svc.production.svc.cluster.local
```

### IST0104: GatewayPortNotOnWorkload

```
Warning [IST0104] (Gateway default/my-gateway) The gateway refers to a port that is not exposed by the gateway workload
```

Your Gateway resource specifies a port that the gateway pod doesn't listen on. Fix: check the port numbers in your Gateway match the ports exposed by the ingress gateway deployment.

### IST0106: SchemaValidationError

```
Error [IST0106] (VirtualService default/my-vs) Schema validation error: unknown field "matchh" in v1beta1.HTTPMatchRequest
```

A typo in your YAML. Fix: correct the field name.

### IST0108: UnknownAnnotation

```
Warning [IST0108] (Pod default/my-pod) Unknown annotation: networking.istio.io/exportToo
```

An annotation that Istio doesn't recognize. Usually a typo.

### IST0128: NoServerCertificateVerificationDestinationLevel

```
Warning [IST0128] (DestinationRule default/my-dr) DestinationRule enables TLS but doesn't configure caCertificates
```

You've enabled TLS in your DestinationRule but didn't provide CA certificates for verification. Fix: add the `caCertificates` field or use `ISTIO_MUTUAL` mode which handles certificates automatically.

### IST0131: VirtualServiceIneffectiveMatch

```
Warning [IST0131] (VirtualService default/my-vs) This match clause is not used because a previous match clause (HTTP route 0) is a superset
```

A match rule in your VirtualService is unreachable because a broader rule above it catches all the same traffic. Fix: reorder your match rules from most specific to least specific.

## Suppressing Messages

If you've acknowledged an issue and want to suppress it, use the `--suppress` flag:

```bash
istioctl analyze --suppress "IST0102=Namespace default"
```

Or suppress all messages of a type:

```bash
istioctl analyze --suppress "IST0102"
```

You can also suppress messages through annotations on the resource:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: default
  annotations:
    galley.istio.io/analyze-suppress: "IST0102"
```

## Output Formats

Analyze supports different output formats:

```bash
# Default human-readable format
istioctl analyze

# JSON output (useful for CI/CD)
istioctl analyze -o json

# YAML output
istioctl analyze -o yaml
```

The JSON output is especially useful in CI/CD pipelines where you want to parse the results programmatically:

```bash
# Check for errors in CI
ERRORS=$(istioctl analyze -o json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
errors = [m for m in data if m.get('level') == 'Error']
print(len(errors))
")

if [ "$ERRORS" -gt 0 ]; then
  echo "Found $ERRORS configuration errors"
  exit 1
fi
```

## Integrating with CI/CD

Here is a complete CI/CD integration that fails the build on errors but allows warnings:

```bash
#!/bin/bash
set -e

echo "Running Istio configuration analysis..."

# Run analyze and capture output
OUTPUT=$(istioctl analyze -f ./istio-config/ -o json 2>&1)

# Count errors and warnings
ERRORS=$(echo "$OUTPUT" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    errors = [m for m in data if m.get('level') == 'Error']
    print(len(errors))
except:
    print(0)
")

WARNINGS=$(echo "$OUTPUT" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    warnings = [m for m in data if m.get('level') == 'Warning']
    print(len(warnings))
except:
    print(0)
")

echo "Found $ERRORS errors and $WARNINGS warnings"

# Show the human-readable output
istioctl analyze -f ./istio-config/

# Fail on errors, warn on warnings
if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: Configuration has errors that must be fixed"
  exit 1
fi

if [ "$WARNINGS" -gt 0 ]; then
  echo "WARNING: Configuration has warnings that should be reviewed"
fi

echo "Configuration analysis passed"
```

## Analyzing Specific Resource Types

You can focus analysis on specific resource types:

```bash
# Only analyze VirtualServices
istioctl analyze --meshConfigFile /dev/null -f vs.yaml

# Analyze resources in a specific revision
istioctl analyze --revision canary
```

## Remote Cluster Analysis

If you manage multiple clusters, you can analyze a remote cluster by setting the kubeconfig:

```bash
KUBECONFIG=~/.kube/config-production istioctl analyze --all-namespaces
```

This is useful for automated health checks across all your clusters.

## Best Practices

1. **Run analyze before every apply.** Make it a habit, or better yet, make it part of your CI/CD pipeline.

2. **Treat errors as blockers.** Never apply configuration with analysis errors. Warnings are worth investigating but might be acceptable in some cases.

3. **Use `--use-kube` in staging.** Before promoting configuration to production, analyze it against the staging cluster to catch interaction issues.

4. **Keep istioctl updated.** New analysis rules are added with each Istio release. An outdated istioctl might miss new categories of issues.

5. **Don't suppress too aggressively.** Suppressed messages hide real problems. Only suppress messages you've investigated and confirmed are false positives.

## Summary

`istioctl analyze` is the most comprehensive validation tool for Istio configuration. It checks schema correctness, cross-resource references, and best practice adherence. Use it locally during development, in CI/CD pipelines for automated checks, and with `--use-kube` for cluster-aware analysis. Pay attention to the message codes, fix errors before applying, and investigate warnings to maintain a healthy mesh configuration.
