# How to Build a Pulumi Component Resource for Standardized Kubernetes Namespace Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Pulumi, Kubernetes, Infrastructure-as-Code

Description: Learn how to create reusable Pulumi component resources that provision Kubernetes namespaces with standardized quotas, network policies, RBAC rules, and monitoring configuration for consistent multi-tenant cluster management.

---

Kubernetes namespaces provide logical separation in clusters. Production environments need consistent namespace configuration with resource quotas, network policies, RBAC, and monitoring labels. Creating these manually for each namespace leads to inconsistency and errors.

Pulumi component resources solve this by encapsulating best practices into reusable abstractions. Platform teams define namespace provisioning logic once, and application teams use it repeatedly with consistent results.

## Understanding Pulumi Component Resources

Component resources are custom abstractions that bundle multiple cloud resources together. Unlike cloud provider resources that map to specific APIs, components are pure Pulumi constructs that exist only in your program.

A namespace component might create the namespace itself, resource quotas, limit ranges, network policies, role bindings, and monitoring configuration. Users interact with a single high-level interface rather than managing individual resources.

## Building a Basic Namespace Component

Start with a simple TypeScript component:

```typescript
// components/namespace.ts
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface NamespaceArgs {
  name: string;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
}

export class Namespace extends pulumi.ComponentResource {
  public readonly namespace: k8s.core.v1.Namespace;
  public readonly name: pulumi.Output<string>;

  constructor(name: string, args: NamespaceArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:k8s:Namespace", name, {}, opts);

    // Create namespace with standard labels
    this.namespace = new k8s.core.v1.Namespace(name, {
      metadata: {
        name: args.name,
        labels: {
          ...args.labels,
          "managed-by": "pulumi",
          "created-at": new Date().toISOString()
        },
        annotations: args.annotations
      }
    }, { parent: this });

    this.name = this.namespace.metadata.name;

    this.registerOutputs({
      namespace: this.namespace,
      name: this.name
    });
  }
}
```

Use it in your program:

```typescript
// index.ts
import { Namespace } from "./components/namespace";

const appNamespace = new Namespace("app-ns", {
  name: "application",
  labels: {
    environment: "production",
    team: "platform"
  }
});

export const namespaceName = appNamespace.name;
```

This creates a namespace with consistent labeling.

## Adding Resource Quotas

Extend the component with quotas:

```typescript
// components/namespace.ts (extended)
export interface NamespaceArgs {
  name: string;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
  quota?: {
    cpu: string;
    memory: string;
    pods: number;
    services: number;
    persistentVolumeClaims: number;
  };
}

export class Namespace extends pulumi.ComponentResource {
  public readonly namespace: k8s.core.v1.Namespace;
  public readonly quota?: k8s.core.v1.ResourceQuota;
  public readonly name: pulumi.Output<string>;

  constructor(name: string, args: NamespaceArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:k8s:Namespace", name, {}, opts);

    // Create namespace
    this.namespace = new k8s.core.v1.Namespace(name, {
      metadata: {
        name: args.name,
        labels: {
          ...args.labels,
          "managed-by": "pulumi"
        },
        annotations: args.annotations
      }
    }, { parent: this });

    // Create resource quota if specified
    if (args.quota) {
      this.quota = new k8s.core.v1.ResourceQuota(`${name}-quota`, {
        metadata: {
          namespace: this.namespace.metadata.name,
          name: "resource-quota"
        },
        spec: {
          hard: {
            "requests.cpu": args.quota.cpu,
            "requests.memory": args.quota.memory,
            "limits.cpu": args.quota.cpu,
            "limits.memory": args.quota.memory,
            pods: args.quota.pods.toString(),
            services: args.quota.services.toString(),
            persistentvolumeclaims: args.quota.persistentVolumeClaims.toString()
          }
        }
      }, { parent: this });
    }

    this.name = this.namespace.metadata.name;

    this.registerOutputs({
      namespace: this.namespace,
      quota: this.quota,
      name: this.name
    });
  }
}
```

Use with quotas:

```typescript
const limitedNamespace = new Namespace("limited-ns", {
  name: "team-alpha",
  quota: {
    cpu: "4",
    memory: "8Gi",
    pods: 50,
    services: 10,
    persistentVolumeClaims: 5
  }
});
```

## Implementing Network Policies

Add network isolation:

```typescript
export interface NamespaceArgs {
  name: string;
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
  quota?: QuotaConfig;
  networkPolicy?: {
    enabled: boolean;
    allowIngressFrom?: string[];
    allowEgressTo?: string[];
    denyAllIngress?: boolean;
    denyAllEgress?: boolean;
  };
}

export class Namespace extends pulumi.ComponentResource {
  // ... previous fields ...
  public readonly networkPolicies: k8s.networking.v1.NetworkPolicy[];

  constructor(name: string, args: NamespaceArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:k8s:Namespace", name, {}, opts);

    // Create namespace
    this.namespace = new k8s.core.v1.Namespace(name, {
      metadata: {
        name: args.name,
        labels: {
          ...args.labels,
          "managed-by": "pulumi"
        }
      }
    }, { parent: this });

    // Create resource quota
    if (args.quota) {
      this.quota = new k8s.core.v1.ResourceQuota(`${name}-quota`, {
        metadata: {
          namespace: this.namespace.metadata.name,
          name: "resource-quota"
        },
        spec: {
          hard: {
            "requests.cpu": args.quota.cpu,
            "requests.memory": args.quota.memory,
            pods: args.quota.pods.toString()
          }
        }
      }, { parent: this });
    }

    // Create network policies
    this.networkPolicies = [];

    if (args.networkPolicy?.enabled) {
      // Default deny all ingress
      if (args.networkPolicy.denyAllIngress) {
        this.networkPolicies.push(new k8s.networking.v1.NetworkPolicy(`${name}-deny-ingress`, {
          metadata: {
            namespace: this.namespace.metadata.name,
            name: "deny-all-ingress"
          },
          spec: {
            podSelector: {},
            policyTypes: ["Ingress"]
          }
        }, { parent: this }));
      }

      // Default deny all egress
      if (args.networkPolicy.denyAllEgress) {
        this.networkPolicies.push(new k8s.networking.v1.NetworkPolicy(`${name}-deny-egress`, {
          metadata: {
            namespace: this.namespace.metadata.name,
            name: "deny-all-egress"
          },
          spec: {
            podSelector: {},
            policyTypes: ["Egress"]
          }
        }, { parent: this }));
      }

      // Allow ingress from specific namespaces
      if (args.networkPolicy.allowIngressFrom && args.networkPolicy.allowIngressFrom.length > 0) {
        this.networkPolicies.push(new k8s.networking.v1.NetworkPolicy(`${name}-allow-ingress`, {
          metadata: {
            namespace: this.namespace.metadata.name,
            name: "allow-ingress"
          },
          spec: {
            podSelector: {},
            policyTypes: ["Ingress"],
            ingress: args.networkPolicy.allowIngressFrom.map(ns => ({
              from: [{
                namespaceSelector: {
                  matchLabels: {
                    name: ns
                  }
                }
              }]
            }))
          }
        }, { parent: this }));
      }

      // Allow egress to specific namespaces
      if (args.networkPolicy.allowEgressTo && args.networkPolicy.allowEgressTo.length > 0) {
        this.networkPolicies.push(new k8s.networking.v1.NetworkPolicy(`${name}-allow-egress`, {
          metadata: {
            namespace: this.namespace.metadata.name,
            name: "allow-egress"
          },
          spec: {
            podSelector: {},
            policyTypes: ["Egress"],
            egress: [
              // Allow DNS
              {
                to: [{
                  namespaceSelector: {
                    matchLabels: {
                      name: "kube-system"
                    }
                  }
                }],
                ports: [{
                  protocol: "UDP",
                  port: 53
                }]
              },
              // Allow to specified namespaces
              ...args.networkPolicy.allowEgressTo.map(ns => ({
                to: [{
                  namespaceSelector: {
                    matchLabels: {
                      name: ns
                    }
                  }
                }]
              }))
            ]
          }
        }, { parent: this }));
      }
    }

    this.name = this.namespace.metadata.name;

    this.registerOutputs({
      namespace: this.namespace,
      quota: this.quota,
      networkPolicies: this.networkPolicies,
      name: this.name
    });
  }
}
```

Create isolated namespaces:

```typescript
const secureNamespace = new Namespace("secure-ns", {
  name: "secure-app",
  networkPolicy: {
    enabled: true,
    denyAllIngress: true,
    denyAllEgress: true,
    allowIngressFrom: ["ingress-namespace"],
    allowEgressTo: ["database-namespace"]
  }
});
```

## Adding RBAC Configuration

Include role bindings:

```typescript
export interface NamespaceArgs {
  // ... previous fields ...
  rbac?: {
    adminGroups?: string[];
    developerGroups?: string[];
    viewerGroups?: string[];
  };
}

export class Namespace extends pulumi.ComponentResource {
  // ... previous fields ...
  public readonly roleBindings: k8s.rbac.v1.RoleBinding[];

  constructor(name: string, args: NamespaceArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:k8s:Namespace", name, {}, opts);

    // ... previous resource creation ...

    // Create RBAC role bindings
    this.roleBindings = [];

    if (args.rbac) {
      // Admin role binding
      if (args.rbac.adminGroups && args.rbac.adminGroups.length > 0) {
        this.roleBindings.push(new k8s.rbac.v1.RoleBinding(`${name}-admin`, {
          metadata: {
            namespace: this.namespace.metadata.name,
            name: "namespace-admins"
          },
          roleRef: {
            apiGroup: "rbac.authorization.k8s.io",
            kind: "ClusterRole",
            name: "admin"
          },
          subjects: args.rbac.adminGroups.map(group => ({
            apiGroup: "rbac.authorization.k8s.io",
            kind: "Group",
            name: group
          }))
        }, { parent: this }));
      }

      // Developer role binding
      if (args.rbac.developerGroups && args.rbac.developerGroups.length > 0) {
        this.roleBindings.push(new k8s.rbac.v1.RoleBinding(`${name}-developer`, {
          metadata: {
            namespace: this.namespace.metadata.name,
            name: "namespace-developers"
          },
          roleRef: {
            apiGroup: "rbac.authorization.k8s.io",
            kind: "ClusterRole",
            name: "edit"
          },
          subjects: args.rbac.developerGroups.map(group => ({
            apiGroup: "rbac.authorization.k8s.io",
            kind: "Group",
            name: group
          }))
        }, { parent: this }));
      }

      // Viewer role binding
      if (args.rbac.viewerGroups && args.rbac.viewerGroups.length > 0) {
        this.roleBindings.push(new k8s.rbac.v1.RoleBinding(`${name}-viewer`, {
          metadata: {
            namespace: this.namespace.metadata.name,
            name: "namespace-viewers"
          },
          roleRef: {
            apiGroup: "rbac.authorization.k8s.io",
            kind: "ClusterRole",
            name: "view"
          },
          subjects: args.rbac.viewerGroups.map(group => ({
            apiGroup: "rbac.authorization.k8s.io",
            kind: "Group",
            name: group
          }))
        }, { parent: this }));
      }
    }

    this.registerOutputs({
      namespace: this.namespace,
      quota: this.quota,
      networkPolicies: this.networkPolicies,
      roleBindings: this.roleBindings,
      name: this.name
    });
  }
}
```

Use with RBAC:

```typescript
const teamNamespace = new Namespace("team-ns", {
  name: "team-alpha",
  rbac: {
    adminGroups: ["team-alpha-leads"],
    developerGroups: ["team-alpha-developers"],
    viewerGroups: ["team-alpha-viewers", "management"]
  }
});
```

## Creating Environment-Specific Configurations

Build a factory function for different environments:

```typescript
// components/namespace-factory.ts
import { Namespace, NamespaceArgs } from "./namespace";

export type Environment = "development" | "staging" | "production";

export function createNamespace(
  name: string,
  env: Environment,
  overrides?: Partial<NamespaceArgs>
): Namespace {
  const baseConfig: Record<Environment, NamespaceArgs> = {
    development: {
      name: `${name}-dev`,
      labels: {
        environment: "development",
        "cost-center": "engineering"
      },
      quota: {
        cpu: "2",
        memory: "4Gi",
        pods: 20,
        services: 5,
        persistentVolumeClaims: 2
      },
      networkPolicy: {
        enabled: false
      }
    },
    staging: {
      name: `${name}-staging`,
      labels: {
        environment: "staging",
        "cost-center": "engineering"
      },
      quota: {
        cpu: "4",
        memory: "8Gi",
        pods: 40,
        services: 10,
        persistentVolumeClaims: 5
      },
      networkPolicy: {
        enabled: true,
        allowIngressFrom: ["ingress-staging"],
        allowEgressTo: ["database-staging"]
      }
    },
    production: {
      name: `${name}-prod`,
      labels: {
        environment: "production",
        "cost-center": "engineering",
        "backup-enabled": "true"
      },
      quota: {
        cpu: "16",
        memory: "32Gi",
        pods: 100,
        services: 20,
        persistentVolumeClaims: 10
      },
      networkPolicy: {
        enabled: true,
        denyAllIngress: true,
        denyAllEgress: true,
        allowIngressFrom: ["ingress-production"],
        allowEgressTo: ["database-production"]
      },
      rbac: {
        adminGroups: ["platform-team"],
        viewerGroups: ["sre-team", "management"]
      }
    }
  };

  const config = { ...baseConfig[env], ...overrides };
  return new Namespace(`${name}-${env}`, config);
}
```

Use the factory:

```typescript
// index.ts
import { createNamespace } from "./components/namespace-factory";

const devNamespace = createNamespace("myapp", "development");
const stagingNamespace = createNamespace("myapp", "staging");
const prodNamespace = createNamespace("myapp", "production", {
  rbac: {
    adminGroups: ["platform-team", "myapp-owners"],
    developerGroups: ["myapp-team"],
    viewerGroups: ["sre-team", "management", "security-team"]
  }
});

export const environments = {
  dev: devNamespace.name,
  staging: stagingNamespace.name,
  prod: prodNamespace.name
};
```

## Adding Monitoring and Logging Labels

Include observability configuration:

```typescript
export interface NamespaceArgs {
  // ... previous fields ...
  monitoring?: {
    enabled: boolean;
    prometheusEnabled?: boolean;
    grafanaEnabled?: boolean;
    logAggregation?: boolean;
  };
}

export class Namespace extends pulumi.ComponentResource {
  // ... previous code ...

  constructor(name: string, args: NamespaceArgs, opts?: pulumi.ComponentResourceOptions) {
    super("custom:k8s:Namespace", name, {}, opts);

    // Build monitoring labels
    const monitoringLabels: { [key: string]: string } = {};
    if (args.monitoring?.enabled) {
      monitoringLabels["monitoring/enabled"] = "true";
      if (args.monitoring.prometheusEnabled) {
        monitoringLabels["prometheus/scrape"] = "true";
      }
      if (args.monitoring.grafanaEnabled) {
        monitoringLabels["grafana/dashboard"] = "true";
      }
      if (args.monitoring.logAggregation) {
        monitoringLabels["logging/enabled"] = "true";
      }
    }

    // Create namespace with monitoring labels
    this.namespace = new k8s.core.v1.Namespace(name, {
      metadata: {
        name: args.name,
        labels: {
          ...args.labels,
          ...monitoringLabels,
          "managed-by": "pulumi"
        },
        annotations: {
          ...args.annotations,
          "monitoring/alert-email": "platform-team@example.com"
        }
      }
    }, { parent: this });

    // ... rest of the implementation ...
  }
}
```

## Summary

Pulumi component resources provide powerful abstractions for Kubernetes namespace provisioning. By encapsulating best practices like resource quotas, network policies, RBAC, and monitoring configuration into reusable components, platform teams ensure consistency across all namespaces. Environment-specific factory functions adapt configuration for development, staging, and production automatically. This approach reduces errors, enforces standards, and makes multi-tenant cluster management scalable and maintainable.
