# How to Implement Pulumi Policy Packs for Kubernetes Resource Compliance Enforcement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Pulumi, Kubernetes, Infrastructure as Code, Compliance, Security

Description: Learn how to use Pulumi Policy Packs to enforce compliance rules and security policies across Kubernetes resources before deployment, preventing configuration drift and policy violations.

---

Infrastructure as code tools deploy resources fast, but speed without guardrails leads to security vulnerabilities and compliance violations. Pulumi Policy Packs solve this by validating resource configurations before deployment, blocking non-compliant changes automatically. This guide shows you how to implement policy enforcement for Kubernetes resources.

## Understanding Pulumi Policy as Code

Pulumi Policy Packs enable policy as code using familiar programming languages. Policies run during `pulumi preview` and `pulumi up`, analyzing resource configurations before any cloud API calls occur. This shift-left approach catches violations early, preventing security issues before they reach production.

Policy Packs consist of individual policies written in TypeScript, Python, or Go. Each policy validates specific aspects of resource configuration and can either warn users or block deployment based on severity. Policies have access to the complete resource configuration, enabling complex validation logic.

## Creating Your First Policy Pack

Start by initializing a Policy Pack project. This creates the scaffolding needed to write and enforce policies.

```bash
# Create a new Policy Pack
mkdir kubernetes-compliance-pack
cd kubernetes-compliance-pack
pulumi policy new aws-typescript

# This creates:
# - PulumiPolicy.yaml (pack metadata)
# - index.ts (policy definitions)
# - package.json (dependencies)
```

Define basic policies that enforce Kubernetes best practices:

```typescript
// index.ts
import * as policy from "@pulumi/policy";
import * as k8s from "@pulumi/kubernetes";

const policies = new policy.PolicyPack("kubernetes-compliance", {
    policies: [
        {
            name: "container-no-privileged",
            description: "Prohibits containers from running in privileged mode",
            enforcementLevel: "mandatory",
            validateResource: policy.validateResourceOfType(
                k8s.core.v1.Pod,
                (pod, args, reportViolation) => {
                    const containers = pod.spec.containers || [];
                    const initContainers = pod.spec.initContainers || [];

                    const allContainers = [...containers, ...initContainers];

                    allContainers.forEach((container, idx) => {
                        if (container.securityContext?.privileged === true) {
                            reportViolation(
                                `Container '${container.name}' at index ${idx} is running in privileged mode. ` +
                                `This violates security policy. Set securityContext.privileged to false.`
                            );
                        }
                    });
                }
            ),
        },
        {
            name: "required-labels",
            description: "Ensures resources have required labels",
            enforcementLevel: "mandatory",
            validateResource: [
                policy.validateResourceOfType(k8s.apps.v1.Deployment, validateLabels),
                policy.validateResourceOfType(k8s.core.v1.Service, validateLabels),
                policy.validateResourceOfType(k8s.core.v1.ConfigMap, validateLabels),
            ],
        },
    ],
});

function validateLabels(resource: any, args: policy.ResourceValidationArgs, reportViolation: policy.ReportViolation) {
    const requiredLabels = ["app", "team", "environment"];
    const labels = resource.metadata?.labels || {};

    const missingLabels = requiredLabels.filter(label => !labels[label]);

    if (missingLabels.length > 0) {
        reportViolation(
            `Resource is missing required labels: ${missingLabels.join(", ")}. ` +
            `All Kubernetes resources must include app, team, and environment labels.`
        );
    }
}
```

These policies run automatically whenever Pulumi evaluates Kubernetes resources, blocking deployments that violate rules.

## Implementing Resource Limits Enforcement

Prevent resource exhaustion by enforcing CPU and memory limits on all containers.

```typescript
{
    name: "container-resource-limits",
    description: "Requires all containers to specify resource limits",
    enforcementLevel: "mandatory",
    validateResource: policy.validateResourceOfType(
        k8s.core.v1.Pod,
        (pod, args, reportViolation) => {
            const containers = pod.spec.containers || [];

            containers.forEach((container) => {
                const limits = container.resources?.limits;

                if (!limits) {
                    reportViolation(
                        `Container '${container.name}' does not specify resource limits. ` +
                        `Add resources.limits.cpu and resources.limits.memory.`
                    );
                    return;
                }

                if (!limits.cpu) {
                    reportViolation(
                        `Container '${container.name}' does not specify CPU limit. ` +
                        `Add resources.limits.cpu (e.g., "1000m").`
                    );
                }

                if (!limits.memory) {
                    reportViolation(
                        `Container '${container.name}' does not specify memory limit. ` +
                        `Add resources.limits.memory (e.g., "512Mi").`
                    );
                }

                // Validate reasonable limits
                if (limits.cpu && parseInt(limits.cpu) > 4000) {
                    reportViolation(
                        `Container '${container.name}' CPU limit exceeds 4 cores. ` +
                        `Contact platform team if higher limits are required.`
                    );
                }

                if (limits.memory) {
                    const memoryMb = parseMemory(limits.memory);
                    if (memoryMb > 16384) {
                        reportViolation(
                            `Container '${container.name}' memory limit exceeds 16GB. ` +
                            `Contact platform team if higher limits are required.`
                        );
                    }
                }
            });
        }
    ),
}

function parseMemory(memory: string): number {
    const units: { [key: string]: number } = {
        Ki: 1024,
        Mi: 1024 * 1024,
        Gi: 1024 * 1024 * 1024,
        K: 1000,
        M: 1000 * 1000,
        G: 1000 * 1000 * 1000,
    };

    const match = memory.match(/^(\d+)([A-Za-z]+)?$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2] || "";

    return unit in units ? value * units[unit] / (1024 * 1024) : value;
}
```

This policy ensures every container has proper resource constraints, preventing runaway processes from affecting other workloads.

## Validating Security Context Requirements

Enforce security best practices by requiring specific security context settings on all pods.

```typescript
{
    name: "pod-security-context",
    description: "Enforces security context requirements for pods",
    enforcementLevel: "mandatory",
    validateResource: policy.validateResourceOfType(
        k8s.core.v1.Pod,
        (pod, args, reportViolation) => {
            const securityContext = pod.spec.securityContext;

            // Require non-root user
            if (securityContext?.runAsNonRoot !== true) {
                reportViolation(
                    "Pod must set securityContext.runAsNonRoot to true. " +
                    "Containers should not run as root user."
                );
            }

            // Require read-only root filesystem where possible
            const containers = pod.spec.containers || [];
            containers.forEach((container) => {
                const containerSecContext = container.securityContext;

                // Check for host namespaces
                if (pod.spec.hostNetwork === true) {
                    reportViolation(
                        "Pod cannot use host network (hostNetwork: true). " +
                        "This creates security risks."
                    );
                }

                if (pod.spec.hostPID === true) {
                    reportViolation(
                        "Pod cannot use host PID namespace (hostPID: true)."
                    );
                }

                // Validate capability drops
                const capabilities = containerSecContext?.capabilities;
                if (!capabilities?.drop || !capabilities.drop.includes("ALL")) {
                    reportViolation(
                        `Container '${container.name}' should drop all capabilities. ` +
                        `Set securityContext.capabilities.drop to ["ALL"].`
                    );
                }
            });
        }
    ),
}
```

These security-focused policies prevent common misconfigurations that expose clusters to attacks.

## Implementing Network Policy Requirements

Ensure network isolation by requiring Network Policies for all namespaces with services.

```typescript
{
    name: "namespace-network-policy",
    description: "Requires namespaces with services to have network policies",
    enforcementLevel: "advisory",
    validateStack: (args, reportViolation) => {
        const resources = args.resources;

        // Find all namespaces and services
        const namespaces = new Set<string>();
        const namespacesWithNetworkPolicies = new Set<string>();

        resources.forEach((resource) => {
            if (resource.type === "kubernetes:core/v1:Service") {
                const namespace = resource.props.metadata?.namespace || "default";
                namespaces.add(namespace);
            }

            if (resource.type === "kubernetes:networking.k8s.io/v1:NetworkPolicy") {
                const namespace = resource.props.metadata?.namespace || "default";
                namespacesWithNetworkPolicies.add(namespace);
            }
        });

        // Check for missing network policies
        const missing = Array.from(namespaces).filter(
            ns => !namespacesWithNetworkPolicies.has(ns)
        );

        if (missing.length > 0) {
            reportViolation(
                `Namespaces [${missing.join(", ")}] contain services but no NetworkPolicy. ` +
                `Add NetworkPolicy resources to control ingress/egress traffic.`
            );
        }
    },
}
```

Stack-level validation examines relationships between resources, enabling policies that span multiple resource types.

## Creating Environment-Specific Policies

Apply different policy strictness based on environment using policy configuration.

```typescript
// PulumiPolicy.yaml
policies:
    - name: kubernetes-compliance
      version: 1.0.0
      config:
        enforcementLevel:
          type: string
          default: mandatory
        allowedRegistries:
          type: array
          default:
            - "gcr.io/mycompany"
            - "docker.io/library"

// index.ts
{
    name: "container-registry-whitelist",
    description: "Ensures containers use approved registries",
    enforcementLevel: "mandatory",
    configSchema: {
        properties: {
            allowedRegistries: {
                type: "array",
                items: { type: "string" },
            },
        },
    },
    validateResource: policy.validateResourceOfType(
        k8s.core.v1.Pod,
        (pod, args, reportViolation) => {
            const allowedRegistries = args.getConfig<string[]>("allowedRegistries") || [];
            const containers = pod.spec.containers || [];

            containers.forEach((container) => {
                const image = container.image || "";
                const registry = image.split("/")[0];

                const isAllowed = allowedRegistries.some(allowed =>
                    image.startsWith(allowed)
                );

                if (!isAllowed) {
                    reportViolation(
                        `Container '${container.name}' uses unapproved registry '${registry}'. ` +
                        `Allowed registries: ${allowedRegistries.join(", ")}`
                    );
                }
            });
        }
    ),
}
```

Configuration enables reusing policy packs across environments with different requirements.

## Testing Policies Locally

Create test cases to verify policy logic before deploying to production.

```typescript
// __tests__/policies.test.ts
import * as policy from "@pulumi/policy";

describe("Container Policies", () => {
    test("blocks privileged containers", () => {
        const args: policy.ResourceValidationArgs = {
            type: "kubernetes:core/v1:Pod",
            props: {
                spec: {
                    containers: [{
                        name: "app",
                        image: "nginx",
                        securityContext: {
                            privileged: true,
                        },
                    }],
                },
            },
            urn: "urn:pulumi:dev::myproject::kubernetes:core/v1:Pod::test-pod",
            name: "test-pod",
        };

        const violations: string[] = [];
        const reportViolation = (message: string) => violations.push(message);

        // Run the policy validation
        validatePrivilegedContainers(args.props, args, reportViolation);

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain("privileged mode");
    });
});
```

Automated tests catch policy bugs and document expected behavior.

## Publishing and Enforcing Policy Packs

Publish policies to the Pulumi Service for organization-wide enforcement.

```bash
# Publish the policy pack
pulumi policy publish

# Apply to a specific stack
pulumi policy enable kubernetes-compliance latest --stack production

# Disable a policy pack
pulumi policy disable kubernetes-compliance --stack development

# List enabled policies
pulumi policy ls
```

Centralized policy management ensures consistent enforcement across all teams and projects.

## Handling Policy Violations

When policies detect violations, developers see clear error messages during preview:

```
Previewing update (dev):
     Type                           Name                    Plan       Info
 +   pulumi:pulumi:Stack            myapp-dev               create     2 errors
 +   └─ kubernetes:core/v1:Pod      webapp                  create     2 errors

Diagnostics:
  kubernetes:core/v1:Pod (webapp):
    error: [mandatory] [container-no-privileged] Container 'app' at index 0 is running in privileged mode. This violates security policy. Set securityContext.privileged to false.
    error: [mandatory] [container-resource-limits] Container 'app' does not specify resource limits. Add resources.limits.cpu and resources.limits.memory.
```

Clear messages help developers fix issues quickly without security team involvement.

## Creating Custom Validation Logic

Implement complex business logic using helper functions and external data sources.

```typescript
{
    name: "cost-optimization",
    description: "Warns about expensive resource configurations",
    enforcementLevel: "advisory",
    validateResource: policy.validateResourceOfType(
        k8s.core.v1.PersistentVolumeClaim,
        (pvc, args, reportViolation) => {
            const storageClass = pvc.spec?.storageClassName;
            const requestedStorage = pvc.spec?.resources?.requests?.storage || "";

            // Parse storage size
            const sizeGb = parseStorageSize(requestedStorage);

            // Warn about expensive storage classes
            if (storageClass === "ssd-premium" && sizeGb > 1000) {
                reportViolation(
                    `PVC requests ${sizeGb}GB of premium SSD storage. ` +
                    `Consider using standard SSD for cost savings. ` +
                    `Estimated monthly cost: $${(sizeGb * 0.17).toFixed(2)}`
                );
            }
        }
    ),
}

function parseStorageSize(storage: string): number {
    const match = storage.match(/^(\d+)([A-Za-z]+)?$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2]?.toUpperCase() || "";

    const multipliers: { [key: string]: number } = {
        GI: 1,
        TI: 1024,
        G: 1,
        T: 1000,
    };

    return unit in multipliers ? value * multipliers[unit] : value;
}
```

Advisory policies provide guidance without blocking deployments, balancing safety with flexibility.

Pulumi Policy Packs transform compliance from a manual review bottleneck into automated enforcement that runs with every deployment. By validating configurations before they reach Kubernetes clusters, you prevent security vulnerabilities and policy violations at the source. The programmable nature of Policy Packs enables complex validation logic that adapts to your organization's specific requirements, making policy enforcement a seamless part of the development workflow rather than a separate gate.
