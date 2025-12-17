# Resource Detection in OpenTelemetry: Automatic Metadata Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Resource Detection, Observability, Kubernetes, AWS, Cloud

Description: A comprehensive guide to OpenTelemetry resource detection- automatically discovering and attaching cloud, container, and host metadata to your telemetry for richer context without manual configuration.

---

> Resource detection automatically enriches your telemetry with infrastructure metadata. One line of code adds cloud region, Kubernetes pod name, and host details to every span and metric.

This guide covers OpenTelemetry's resource detection capabilities- what resources are, how detection works, and how to configure it for different environments.

---

## Table of Contents

1. What Are Resources?
2. Why Resource Detection Matters
3. Built-in Resource Detectors
4. AWS Resource Detection
5. GCP Resource Detection
6. Azure Resource Detection
7. Kubernetes Resource Detection
8. Container Resource Detection
9. Host and OS Detection
10. Custom Resource Detectors
11. Resource Merging Strategies
12. Performance Considerations
13. Troubleshooting

---

## 1. What Are Resources?

Resources are **immutable metadata** that describe the entity producing telemetry. They're attached to all signals (traces, metrics, logs) and don't change during the lifetime of a process.

### Resource vs Attributes

| Aspect | Resource | Span Attributes |
|--------|----------|-----------------|
| Scope | Process/service level | Individual operation |
| Mutability | Immutable after init | Can vary per span |
| Examples | `service.name`, `k8s.pod.name` | `http.method`, `user.id` |
| When set | Application startup | During operation |

### Resource structure

```json
{
  "resource": {
    "attributes": [
      { "key": "service.name", "value": { "stringValue": "order-service" } },
      { "key": "service.version", "value": { "stringValue": "1.2.3" } },
      { "key": "k8s.pod.name", "value": { "stringValue": "order-service-abc123" } },
      { "key": "k8s.namespace.name", "value": { "stringValue": "production" } },
      { "key": "cloud.provider", "value": { "stringValue": "aws" } },
      { "key": "cloud.region", "value": { "stringValue": "us-east-1" } }
    ]
  }
}
```

---

## 2. Why Resource Detection Matters

### Without resource detection

```typescript
// Manual configuration everywhere
const resource = new Resource({
  'service.name': 'order-service',
  'service.version': '1.2.3',
  'k8s.pod.name': process.env.POD_NAME,
  'k8s.namespace.name': process.env.POD_NAMESPACE,
  'cloud.provider': 'aws',
  'cloud.region': process.env.AWS_REGION,
  // ... dozens more attributes
});
```

### With resource detection

```typescript
// Automatic discovery
const resource = await detectResources({
  detectors: [awsEc2Detector, containerDetector, hostDetector],
});
```

### Benefits

| Benefit | Description |
|---------|-------------|
| Zero configuration | Detects cloud/container metadata automatically |
| Consistency | Same detection logic across all services |
| Completeness | Captures metadata you might forget |
| Accuracy | Uses official APIs/metadata services |
| Maintenance | Updates with OpenTelemetry releases |

---

## 3. Built-in Resource Detectors

### Node.js detectors

```bash
npm install @opentelemetry/resource-detector-aws
npm install @opentelemetry/resource-detector-gcp
npm install @opentelemetry/resource-detector-azure
npm install @opentelemetry/resource-detector-container
npm install @opentelemetry/resource-detector-alibaba-cloud
```

### Available detectors

| Detector | Package | Detects |
|----------|---------|---------|
| AWS EC2 | `@opentelemetry/resource-detector-aws` | Instance ID, region, AZ |
| AWS ECS | `@opentelemetry/resource-detector-aws` | Task ARN, container |
| AWS EKS | `@opentelemetry/resource-detector-aws` | Cluster name |
| AWS Lambda | `@opentelemetry/resource-detector-aws` | Function name, version |
| GCP | `@opentelemetry/resource-detector-gcp` | Project, zone, instance |
| Azure | `@opentelemetry/resource-detector-azure` | VM, App Service |
| Container | `@opentelemetry/resource-detector-container` | Container ID, runtime |
| Host | `@opentelemetry/resources` | Hostname, OS |
| Process | `@opentelemetry/resources` | PID, command |

### Basic setup

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource, detectResources, envDetector, hostDetector, processDetector } from '@opentelemetry/resources';
import { awsEc2Detector, awsEcsDetector } from '@opentelemetry/resource-detector-aws';
import { containerDetector } from '@opentelemetry/resource-detector-container';

async function setupTelemetry() {
  const detectedResource = await detectResources({
    detectors: [
      envDetector,
      processDetector,
      hostDetector,
      containerDetector,
      awsEc2Detector,
      awsEcsDetector,
    ],
  });

  const manualResource = new Resource({
    'service.name': 'order-service',
    'service.version': '1.2.3',
  });

  const resource = manualResource.merge(detectedResource);

  const sdk = new NodeSDK({
    resource,
    // ... other config
  });

  await sdk.start();
}
```

---

## 4. AWS Resource Detection

### EC2 detection

```typescript
import { awsEc2Detector } from '@opentelemetry/resource-detector-aws';

// Detects from EC2 instance metadata service (IMDS)
const resource = await detectResources({
  detectors: [awsEc2Detector],
});

// Detected attributes:
// - cloud.provider: "aws"
// - cloud.platform: "aws_ec2"
// - cloud.region: "us-east-1"
// - cloud.availability_zone: "us-east-1a"
// - cloud.account.id: "123456789012"
// - host.id: "i-0abc123def456"
// - host.type: "t3.medium"
// - host.name: "ip-10-0-1-100.ec2.internal"
```

### ECS detection

```typescript
import { awsEcsDetector } from '@opentelemetry/resource-detector-aws';

// Detects from ECS task metadata endpoint
const resource = await detectResources({
  detectors: [awsEcsDetector],
});

// Detected attributes:
// - cloud.provider: "aws"
// - cloud.platform: "aws_ecs"
// - cloud.region: "us-east-1"
// - cloud.account.id: "123456789012"
// - aws.ecs.cluster.arn: "arn:aws:ecs:..."
// - aws.ecs.task.arn: "arn:aws:ecs:..."
// - aws.ecs.task.family: "my-task"
// - aws.ecs.task.revision: "5"
// - aws.ecs.container.arn: "arn:aws:ecs:..."
// - container.id: "abc123..."
// - container.name: "my-container"
```

### EKS detection

```typescript
import { awsEksDetector } from '@opentelemetry/resource-detector-aws';

// Detects EKS cluster info via AWS APIs
const resource = await detectResources({
  detectors: [awsEksDetector],
});

// Detected attributes:
// - cloud.provider: "aws"
// - cloud.platform: "aws_eks"
// - k8s.cluster.name: "production-cluster"
```

### Lambda detection

```typescript
import { awsLambdaDetector } from '@opentelemetry/resource-detector-aws';

// Detects from Lambda environment variables
const resource = await detectResources({
  detectors: [awsLambdaDetector],
});

// Detected attributes:
// - cloud.provider: "aws"
// - cloud.platform: "aws_lambda"
// - cloud.region: "us-east-1"
// - faas.name: "my-function"
// - faas.version: "$LATEST"
// - faas.instance: "2023/01/01/[$LATEST]abc123"
// - faas.max_memory: "512"
```

### Combined AWS setup

```typescript
import {
  awsEc2Detector,
  awsEcsDetector,
  awsEksDetector,
  awsLambdaDetector,
  awsBeanstalkDetector,
} from '@opentelemetry/resource-detector-aws';

const resource = await detectResources({
  detectors: [
    awsLambdaDetector,  // Check Lambda first (fastest)
    awsEcsDetector,     // Then ECS
    awsEksDetector,     // Then EKS
    awsBeanstalkDetector,
    awsEc2Detector,     // EC2 last (fallback)
  ],
});
```

---

## 5. GCP Resource Detection

### GCP detector

```typescript
import { gcpDetector } from '@opentelemetry/resource-detector-gcp';

const resource = await detectResources({
  detectors: [gcpDetector],
});

// GCE (Compute Engine):
// - cloud.provider: "gcp"
// - cloud.platform: "gcp_compute_engine"
// - cloud.account.id: "my-project-id"
// - cloud.region: "us-central1"
// - cloud.availability_zone: "us-central1-a"
// - host.id: "1234567890"
// - host.name: "my-instance"
// - host.type: "n1-standard-1"

// GKE (Kubernetes Engine):
// - cloud.provider: "gcp"
// - cloud.platform: "gcp_kubernetes_engine"
// - k8s.cluster.name: "my-cluster"
// - k8s.namespace.name: from downward API
// - k8s.pod.name: from downward API

// Cloud Run:
// - cloud.provider: "gcp"
// - cloud.platform: "gcp_cloud_run"
// - faas.name: "my-service"
// - faas.version: "revision-id"

// Cloud Functions:
// - cloud.provider: "gcp"
// - cloud.platform: "gcp_cloud_functions"
// - faas.name: "my-function"
```

### GCP-specific configuration

```typescript
import { gcpDetector } from '@opentelemetry/resource-detector-gcp';

// GCP detector auto-detects the platform type
// No additional configuration needed

const sdk = new NodeSDK({
  resourceDetectors: [gcpDetector],
});
```

---

## 6. Azure Resource Detection

### Azure detector

```typescript
import { azureAppServiceDetector, azureVmDetector, azureFunctionsDetector } from '@opentelemetry/resource-detector-azure';

const resource = await detectResources({
  detectors: [
    azureFunctionsDetector,
    azureAppServiceDetector,
    azureVmDetector,
  ],
});

// Azure VM:
// - cloud.provider: "azure"
// - cloud.platform: "azure_vm"
// - cloud.region: "eastus"
// - host.id: "vm-id"
// - host.name: "my-vm"
// - host.type: "Standard_D2s_v3"

// Azure App Service:
// - cloud.provider: "azure"
// - cloud.platform: "azure_app_service"
// - cloud.region: "eastus"
// - service.name: from WEBSITE_SITE_NAME
// - service.instance.id: from WEBSITE_INSTANCE_ID

// Azure Functions:
// - cloud.provider: "azure"
// - cloud.platform: "azure_functions"
// - faas.name: from FUNCTIONS_WORKER_RUNTIME
```

---

## 7. Kubernetes Resource Detection

### Using environment variables (Downward API)

```yaml
# Kubernetes deployment with downward API
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "k8s.namespace.name=$(K8S_NAMESPACE),k8s.pod.name=$(K8S_POD_NAME),k8s.node.name=$(K8S_NODE_NAME)"
            - name: K8S_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: K8S_POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: K8S_NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: K8S_POD_UID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.uid
```

### Custom K8s detector

```typescript
import { Detector, Resource, ResourceDetectionConfig } from '@opentelemetry/resources';

class KubernetesDetector implements Detector {
  async detect(_config?: ResourceDetectionConfig): Promise<Resource> {
    // Check if running in Kubernetes
    if (!process.env.KUBERNETES_SERVICE_HOST) {
      return Resource.empty();
    }

    return new Resource({
      'k8s.namespace.name': process.env.K8S_NAMESPACE || process.env.POD_NAMESPACE,
      'k8s.pod.name': process.env.K8S_POD_NAME || process.env.POD_NAME || process.env.HOSTNAME,
      'k8s.pod.uid': process.env.K8S_POD_UID,
      'k8s.node.name': process.env.K8S_NODE_NAME,
      'k8s.deployment.name': process.env.K8S_DEPLOYMENT_NAME,
      'k8s.container.name': process.env.K8S_CONTAINER_NAME,
    });
  }
}

export const k8sDetector = new KubernetesDetector();
```

### Complete Kubernetes setup

```typescript
import { envDetector, hostDetector, processDetector } from '@opentelemetry/resources';
import { containerDetector } from '@opentelemetry/resource-detector-container';

const resource = await detectResources({
  detectors: [
    envDetector,           // OTEL_RESOURCE_ATTRIBUTES
    processDetector,       // process.pid, process.command
    hostDetector,          // host.name
    containerDetector,     // container.id
    k8sDetector,           // k8s.* from env vars
  ],
});
```

---

## 8. Container Resource Detection

### Container detector

```typescript
import { containerDetector } from '@opentelemetry/resource-detector-container';

const resource = await detectResources({
  detectors: [containerDetector],
});

// Detected attributes:
// - container.id: "abc123def456789..."
// - container.runtime: "docker" | "containerd" | "cri-o"
```

### How it works

The container detector reads:
1. `/proc/self/cgroup` - extracts container ID from cgroup path
2. `/proc/self/mountinfo` - identifies container runtime
3. Container runtime socket if available

### Docker-specific detection

```typescript
import { Detector, Resource } from '@opentelemetry/resources';
import * as fs from 'fs';

class DockerDetector implements Detector {
  async detect(): Promise<Resource> {
    try {
      // Read container ID from cgroup
      const cgroup = fs.readFileSync('/proc/self/cgroup', 'utf8');
      const match = cgroup.match(/docker\/([a-f0-9]{64})/);
      const containerId = match?.[1];

      // Get container name from hostname (often set to container ID prefix)
      const containerName = process.env.HOSTNAME;

      return new Resource({
        'container.id': containerId,
        'container.name': containerName,
        'container.runtime': 'docker',
        'container.image.name': process.env.CONTAINER_IMAGE,
        'container.image.tag': process.env.CONTAINER_TAG,
      });
    } catch {
      return Resource.empty();
    }
  }
}
```

---

## 9. Host and OS Detection

### Built-in host detector

```typescript
import { hostDetector, osDetector } from '@opentelemetry/resources';

const resource = await detectResources({
  detectors: [hostDetector, osDetector],
});

// Host attributes:
// - host.name: "server-01.example.com"
// - host.id: unique identifier
// - host.arch: "amd64"

// OS attributes:
// - os.type: "linux" | "windows" | "darwin"
// - os.description: "Ubuntu 22.04 LTS"
// - os.name: "Linux"
// - os.version: "5.15.0-1234-aws"
```

### Process detector

```typescript
import { processDetector } from '@opentelemetry/resources';

const resource = await detectResources({
  detectors: [processDetector],
});

// Process attributes:
// - process.pid: 1234
// - process.executable.name: "node"
// - process.executable.path: "/usr/bin/node"
// - process.command: "node server.js"
// - process.command_args: ["node", "server.js", "--port", "3000"]
// - process.owner: "appuser"
// - process.runtime.name: "nodejs"
// - process.runtime.version: "18.17.0"
// - process.runtime.description: "Node.js"
```

---

## 10. Custom Resource Detectors

### Implementing a detector

```typescript
import { Detector, Resource, ResourceDetectionConfig } from '@opentelemetry/resources';

interface GitInfo {
  commit: string;
  branch: string;
  repository: string;
}

class GitDetector implements Detector {
  async detect(_config?: ResourceDetectionConfig): Promise<Resource> {
    const gitInfo = this.getGitInfo();

    if (!gitInfo) {
      return Resource.empty();
    }

    return new Resource({
      'vcs.repository.url': gitInfo.repository,
      'vcs.branch': gitInfo.branch,
      'vcs.commit.id': gitInfo.commit,
    });
  }

  private getGitInfo(): GitInfo | null {
    // From environment variables (CI/CD)
    if (process.env.GIT_COMMIT) {
      return {
        commit: process.env.GIT_COMMIT,
        branch: process.env.GIT_BRANCH || 'unknown',
        repository: process.env.GIT_REPOSITORY || 'unknown',
      };
    }

    // From build-time injection
    if (process.env.BUILD_COMMIT) {
      return {
        commit: process.env.BUILD_COMMIT,
        branch: process.env.BUILD_BRANCH || 'unknown',
        repository: process.env.BUILD_REPOSITORY || 'unknown',
      };
    }

    return null;
  }
}

export const gitDetector = new GitDetector();
```

### Async detector with external API

```typescript
import { Detector, Resource } from '@opentelemetry/resources';

class InstanceMetadataDetector implements Detector {
  private timeout: number;

  constructor(timeout = 1000) {
    this.timeout = timeout;
  }

  async detect(): Promise<Resource> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch('http://169.254.169.254/latest/meta-data/', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return Resource.empty();
      }

      // Fetch individual metadata fields
      const [instanceId, instanceType, region] = await Promise.all([
        this.fetchMetadata('instance-id'),
        this.fetchMetadata('instance-type'),
        this.fetchMetadata('placement/region'),
      ]);

      return new Resource({
        'host.id': instanceId,
        'host.type': instanceType,
        'cloud.region': region,
      });
    } catch {
      return Resource.empty();
    }
  }

  private async fetchMetadata(path: string): Promise<string | undefined> {
    try {
      const response = await fetch(`http://169.254.169.254/latest/meta-data/${path}`);
      return response.ok ? response.text() : undefined;
    } catch {
      return undefined;
    }
  }
}
```

---

## 11. Resource Merging Strategies

### Merge order matters

```typescript
import { Resource, detectResources, envDetector } from '@opentelemetry/resources';

// Manual resource (highest priority)
const manualResource = new Resource({
  'service.name': 'order-service',
  'service.version': '1.2.3',
});

// Detected resources
const detectedResource = await detectResources({
  detectors: [envDetector, hostDetector, awsEc2Detector],
});

// Merge: manual attributes override detected
const finalResource = detectedResource.merge(manualResource);

// Result: service.name from manual, everything else from detection
```

### Conditional merging

```typescript
function createResource(): Resource {
  let resource = new Resource({
    'service.name': process.env.SERVICE_NAME || 'unknown',
    'service.version': process.env.SERVICE_VERSION || '0.0.0',
  });

  // Add environment-specific attributes
  if (process.env.NODE_ENV === 'production') {
    resource = resource.merge(new Resource({
      'deployment.environment': 'production',
    }));
  }

  // Add cloud-specific if detected
  if (process.env.AWS_REGION) {
    resource = resource.merge(new Resource({
      'cloud.provider': 'aws',
      'cloud.region': process.env.AWS_REGION,
    }));
  }

  return resource;
}
```

### Handling conflicts

```typescript
// Later merges override earlier values
const resource1 = new Resource({ 'service.name': 'from-detector' });
const resource2 = new Resource({ 'service.name': 'from-config' });

// resource2's value wins
const merged = resource1.merge(resource2);
// merged.attributes['service.name'] === 'from-config'
```

---

## 12. Performance Considerations

### Detection timing

```typescript
// Async detection with timeout
const resource = await detectResourcesSync({
  detectors: [awsEc2Detector],
  detectionTimeout: 5000, // 5 second timeout
});

// Or handle timeouts manually
async function detectWithTimeout(detectors: Detector[], timeout: number): Promise<Resource> {
  const detection = detectResources({ detectors });
  const timeoutPromise = new Promise<Resource>((resolve) => {
    setTimeout(() => resolve(Resource.empty()), timeout);
  });

  return Promise.race([detection, timeoutPromise]);
}
```

### Caching detected resources

```typescript
// Resources are immutable - detect once at startup
let cachedResource: Resource | null = null;

export async function getResource(): Promise<Resource> {
  if (cachedResource) {
    return cachedResource;
  }

  cachedResource = await detectResources({
    detectors: [envDetector, hostDetector, containerDetector],
  });

  return cachedResource;
}
```

### Lazy detection

```typescript
import { Resource } from '@opentelemetry/resources';

class LazyResourceDetector {
  private resource: Resource | null = null;
  private detecting = false;
  private waiters: ((r: Resource) => void)[] = [];

  async getResource(): Promise<Resource> {
    if (this.resource) {
      return this.resource;
    }

    if (this.detecting) {
      return new Promise((resolve) => {
        this.waiters.push(resolve);
      });
    }

    this.detecting = true;

    this.resource = await detectResources({
      detectors: [/* your detectors */],
    });

    this.waiters.forEach((resolve) => resolve(this.resource!));
    this.waiters = [];

    return this.resource;
  }
}
```

---

## 13. Troubleshooting

### Debug resource detection

```typescript
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Enable debug logging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const resource = await detectResources({
  detectors: [awsEc2Detector],
});

console.log('Detected resource:', JSON.stringify(resource.attributes, null, 2));
```

### Common issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Empty resource | Detector not applicable | Check if running in expected environment |
| Timeout | Metadata service slow | Increase timeout, use local cache |
| Missing attributes | Permissions | Grant IAM/RBAC permissions for metadata |
| Wrong values | Stale cache | Restart application, clear metadata cache |

### Verifying detection

```typescript
// Log detected resources at startup
const resource = await detectResources({ detectors: [...] });

const attrs = resource.attributes;
console.log('Resource Detection Results:');
console.log('- Service:', attrs['service.name']);
console.log('- Cloud:', attrs['cloud.provider'], attrs['cloud.region']);
console.log('- K8s:', attrs['k8s.namespace.name'], attrs['k8s.pod.name']);
console.log('- Container:', attrs['container.id']);
console.log('- Host:', attrs['host.name']);
```

---

## Summary

| Environment | Detectors |
|-------------|-----------|
| AWS EC2 | `awsEc2Detector` |
| AWS ECS | `awsEcsDetector` |
| AWS Lambda | `awsLambdaDetector` |
| GCP | `gcpDetector` |
| Azure | `azureVmDetector`, `azureAppServiceDetector` |
| Kubernetes | `envDetector` + downward API |
| Docker | `containerDetector` |
| Any host | `hostDetector`, `processDetector` |

Resource detection eliminates manual configuration and ensures consistent, complete metadata across your entire fleet.

---

*Ready to enrich your telemetry automatically? Send resource-enriched data to [OneUptime](https://oneuptime.com) for full-context observability.*

---

### See Also

- [OpenTelemetry Semantic Conventions](/blog/post/2025-12-17-opentelemetry-semantic-conventions/)
- [Monitor Kubernetes with OpenTelemetry](/blog/post/2025-11-14-monitor-kubernetes-clusters-with-opentelemetry-and-oneuptime/)
- [OpenTelemetry for Serverless](/blog/post/2025-12-17-opentelemetry-serverless/)
