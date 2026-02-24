# How to Manage Istio Configuration with Pulumi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Pulumi, Kubernetes, Infrastructure as Code, TypeScript

Description: Manage Istio service mesh configuration using Pulumi with real programming languages for type-safe, testable infrastructure code.

---

Pulumi takes a different approach to infrastructure as code. Instead of writing HCL or YAML, you use real programming languages like TypeScript, Python, or Go. For Istio configuration, this means you get type checking, IDE autocompletion, loops, conditionals, and all the other things that make code maintainable.

This guide shows how to manage Istio resources with Pulumi using TypeScript, though the concepts translate to any language Pulumi supports.

## Getting Started

Initialize a new Pulumi project:

```bash
pulumi new kubernetes-typescript
```

Install the Kubernetes provider:

```bash
npm install @pulumi/kubernetes
```

## Installing Istio with Pulumi and Helm

Use the Helm Release resource to install Istio charts:

```typescript
import * as k8s from "@pulumi/kubernetes";

// Create the istio-system namespace
const istioNamespace = new k8s.core.v1.Namespace("istio-system", {
    metadata: {
        name: "istio-system",
    },
});

// Install Istio base chart (CRDs)
const istioBase = new k8s.helm.v3.Release("istio-base", {
    chart: "base",
    version: "1.22.0",
    repositoryOpts: {
        repo: "https://istio-release.storage.googleapis.com/charts",
    },
    namespace: istioNamespace.metadata.name,
    values: {
        defaultRevision: "default",
    },
});

// Install istiod
const istiod = new k8s.helm.v3.Release("istiod", {
    chart: "istiod",
    version: "1.22.0",
    repositoryOpts: {
        repo: "https://istio-release.storage.googleapis.com/charts",
    },
    namespace: istioNamespace.metadata.name,
    values: {
        pilot: {
            autoscaleEnabled: true,
            autoscaleMin: 2,
            autoscaleMax: 5,
            resources: {
                requests: {
                    cpu: "500m",
                    memory: "2Gi",
                },
            },
        },
        meshConfig: {
            accessLogFile: "/dev/stdout",
            enableAutoMtls: true,
            defaultConfig: {
                holdApplicationUntilProxyStarts: true,
            },
        },
    },
}, { dependsOn: [istioBase] });

// Install ingress gateway
const ingressNamespace = new k8s.core.v1.Namespace("istio-ingress", {
    metadata: {
        name: "istio-ingress",
        labels: {
            "istio-injection": "enabled",
        },
    },
});

const istioIngress = new k8s.helm.v3.Release("istio-ingress", {
    chart: "gateway",
    version: "1.22.0",
    repositoryOpts: {
        repo: "https://istio-release.storage.googleapis.com/charts",
    },
    namespace: ingressNamespace.metadata.name,
    values: {
        service: {
            type: "LoadBalancer",
        },
        autoscaling: {
            enabled: true,
            minReplicas: 2,
            maxReplicas: 10,
        },
    },
}, { dependsOn: [istiod] });
```

## Defining Istio Resources with Custom Resource Definitions

Pulumi can create any Kubernetes custom resource using the `apiextensions` package:

```typescript
import * as k8s from "@pulumi/kubernetes";

// Gateway resource
const gateway = new k8s.apiextensions.CustomResource("main-gateway", {
    apiVersion: "networking.istio.io/v1",
    kind: "Gateway",
    metadata: {
        name: "main-gateway",
        namespace: "istio-ingress",
    },
    spec: {
        selector: {
            istio: "ingress",
        },
        servers: [
            {
                port: {
                    number: 443,
                    name: "https",
                    protocol: "HTTPS",
                },
                hosts: ["*.example.com"],
                tls: {
                    mode: "SIMPLE",
                    credentialName: "wildcard-tls",
                },
            },
            {
                port: {
                    number: 80,
                    name: "http",
                    protocol: "HTTP",
                },
                hosts: ["*.example.com"],
                tls: {
                    httpsRedirect: true,
                },
            },
        ],
    },
});
```

## Building Reusable Components

Here is where Pulumi really shines. You can build component resources that encapsulate common Istio patterns:

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

interface IstioServiceArgs {
    namespace: string;
    port: number;
    externalHost?: string;
    gateway?: string;
    timeout?: string;
    retryAttempts?: number;
    maxConnections?: number;
    outlierDetection?: {
        consecutive5xxErrors: number;
        interval: string;
        baseEjectionTime: string;
    };
    allowedCallers?: string[];
}

class IstioService extends pulumi.ComponentResource {
    public virtualService: k8s.apiextensions.CustomResource;
    public destinationRule: k8s.apiextensions.CustomResource;
    public authPolicy?: k8s.apiextensions.CustomResource;

    constructor(
        name: string,
        args: IstioServiceArgs,
        opts?: pulumi.ComponentResourceOptions
    ) {
        super("custom:istio:Service", name, {}, opts);

        const host = `${name}.${args.namespace}.svc.cluster.local`;

        // VirtualService
        const vsSpec: any = {
            hosts: [host],
            http: [{
                route: [{
                    destination: {
                        host: host,
                        port: { number: args.port },
                    },
                }],
            }],
        };

        if (args.externalHost) {
            vsSpec.hosts.push(args.externalHost);
        }

        if (args.gateway) {
            vsSpec.gateways = [args.gateway, "mesh"];
        }

        if (args.timeout) {
            vsSpec.http[0].timeout = args.timeout;
        }

        if (args.retryAttempts) {
            vsSpec.http[0].retries = {
                attempts: args.retryAttempts,
                perTryTimeout: "10s",
                retryOn: "5xx,reset,connect-failure",
            };
        }

        this.virtualService = new k8s.apiextensions.CustomResource(
            `${name}-vs`,
            {
                apiVersion: "networking.istio.io/v1",
                kind: "VirtualService",
                metadata: { name, namespace: args.namespace },
                spec: vsSpec,
            },
            { parent: this }
        );

        // DestinationRule
        this.destinationRule = new k8s.apiextensions.CustomResource(
            `${name}-dr`,
            {
                apiVersion: "networking.istio.io/v1",
                kind: "DestinationRule",
                metadata: { name, namespace: args.namespace },
                spec: {
                    host: host,
                    trafficPolicy: {
                        connectionPool: {
                            tcp: {
                                maxConnections: args.maxConnections || 100,
                            },
                        },
                        outlierDetection: args.outlierDetection || {
                            consecutive5xxErrors: 5,
                            interval: "30s",
                            baseEjectionTime: "30s",
                        },
                    },
                },
            },
            { parent: this }
        );

        // AuthorizationPolicy
        if (args.allowedCallers && args.allowedCallers.length > 0) {
            this.authPolicy = new k8s.apiextensions.CustomResource(
                `${name}-authz`,
                {
                    apiVersion: "security.istio.io/v1",
                    kind: "AuthorizationPolicy",
                    metadata: {
                        name: `${name}-policy`,
                        namespace: args.namespace,
                    },
                    spec: {
                        selector: {
                            matchLabels: { app: name },
                        },
                        action: "ALLOW",
                        rules: args.allowedCallers.map(caller => ({
                            from: [{
                                source: {
                                    principals: [
                                        `cluster.local/ns/${args.namespace}/sa/${caller}`,
                                    ],
                                },
                            }],
                        })),
                    },
                },
                { parent: this }
            );
        }

        this.registerOutputs({});
    }
}
```

## Using the Component

Now deploying a service with full Istio configuration is just a few lines:

```typescript
const apiGateway = new IstioService("api-gateway", {
    namespace: "production",
    port: 8080,
    externalHost: "api.example.com",
    gateway: "istio-ingress/main-gateway",
    timeout: "30s",
    retryAttempts: 3,
    maxConnections: 200,
    outlierDetection: {
        consecutive5xxErrors: 3,
        interval: "10s",
        baseEjectionTime: "60s",
    },
    allowedCallers: ["frontend"],
});

const userService = new IstioService("user-service", {
    namespace: "production",
    port: 8080,
    timeout: "5s",
    retryAttempts: 2,
    allowedCallers: ["api-gateway", "order-service"],
});

const orderService = new IstioService("order-service", {
    namespace: "production",
    port: 8080,
    timeout: "10s",
    retryAttempts: 3,
    allowedCallers: ["api-gateway"],
});
```

## Configuration Management with Pulumi Config

Use Pulumi's configuration system for environment-specific values:

```typescript
const config = new pulumi.Config();
const environment = config.require("environment");
const istioVersion = config.get("istioVersion") || "1.22.0";
const enableCanary = config.getBoolean("enableCanary") || false;
```

Set values per stack:

```bash
pulumi config set environment production
pulumi config set istioVersion 1.22.0
pulumi config set enableCanary true
```

## Preview and Deploy

Pulumi gives you a preview before making changes, similar to Terraform plan:

```bash
pulumi preview
```

Deploy the changes:

```bash
pulumi up
```

Roll back to a previous state if something goes wrong:

```bash
pulumi stack history
pulumi stack export --version 5 | pulumi stack import
```

## Testing Your Configuration

Since Pulumi uses real programming languages, you can write unit tests:

```typescript
import * as pulumi from "@pulumi/pulumi";
import { IstioService } from "./istio-service";

// Mock Pulumi runtime
pulumi.runtime.setMocks({
    newResource: (args) => ({ id: args.name + "-id", state: args.inputs }),
    call: (args) => ({}),
});

describe("IstioService", () => {
    it("creates a VirtualService with correct host", async () => {
        const svc = new IstioService("test-svc", {
            namespace: "default",
            port: 8080,
        });

        const vs = await new Promise<any>((resolve) => {
            svc.virtualService.spec.apply(spec => {
                resolve(spec);
            });
        });

        expect(vs.hosts).toContain("test-svc.default.svc.cluster.local");
    });
});
```

Pulumi is a strong choice for teams that want the full power of a programming language behind their infrastructure code. The ability to create reusable components, write tests, and leverage IDE tooling makes managing complex Istio configurations significantly more productive than working with raw YAML files.
