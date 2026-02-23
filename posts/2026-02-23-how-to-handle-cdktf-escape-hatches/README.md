# How to Handle CDKTF Escape Hatches

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Escape Hatches, Infrastructure as Code, Advanced

Description: Learn how to use CDKTF escape hatches to access raw Terraform functionality when the typed bindings do not cover your needs or when working around limitations.

---

CDKTF generates typed bindings for Terraform providers, which covers the vast majority of use cases. But sometimes the generated bindings are incomplete, out of date, or do not expose a specific feature you need. That is where escape hatches come in. Escape hatches let you drop down to raw Terraform JSON to set any property, override generated values, or add configuration that the typed bindings do not support. This guide covers when and how to use them.

## What Are Escape Hatches?

Escape hatches are methods on CDKTF resources that let you bypass the typed API and set raw Terraform configuration directly. They exist because:

- New provider features may not be reflected in the generated bindings yet
- Some complex nested configurations are hard to model in typed APIs
- You might need to set meta-arguments that are not exposed in the typed interface
- Provider-specific quirks may require raw JSON manipulation

Think of escape hatches as the "break glass in case of emergency" feature of CDKTF. You should not need them often, but when you do, they are invaluable.

## The addOverride Method

The most common escape hatch is `addOverride`, which sets any property in the generated JSON:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Instance } from "@cdktf/provider-aws/lib/instance";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const server = new Instance(this, "server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: "t3.micro",
    });

    // Use addOverride to set properties not in the typed interface
    // The path is relative to the resource in the JSON output
    server.addOverride("metadata_options.http_tokens", "required");
    server.addOverride("metadata_options.http_endpoint", "enabled");
    server.addOverride(
      "metadata_options.http_put_response_hop_limit",
      1
    );
  }
}
```

The `addOverride` path uses dot notation to navigate the JSON structure. The first argument is the path, and the second is the value.

## Override Use Cases

### Setting Lifecycle Rules

Sometimes lifecycle rules need to be set via override:

```typescript
const database = new DbInstance(this, "database", {
  engine: "postgres",
  instanceClass: "db.t3.medium",
  allocatedStorage: 50,
});

// Override lifecycle to prevent destruction
database.addOverride("lifecycle.prevent_destroy", true);

// Override to ignore specific changes
database.addOverride("lifecycle.ignore_changes", [
  "engine_version",
  "tags",
]);
```

### Adding Provisioners

If the typed interface does not support provisioners cleanly:

```typescript
const server = new Instance(this, "server", {
  ami: "ami-0c55b159cbfafe1f0",
  instanceType: "t3.micro",
});

// Add a remote-exec provisioner via override
server.addOverride("provisioner.remote-exec.inline", [
  "sudo apt-get update",
  "sudo apt-get install -y nginx",
]);

server.addOverride("provisioner.remote-exec.connection.type", "ssh");
server.addOverride("provisioner.remote-exec.connection.user", "ubuntu");
```

### Setting Depends On

Explicit dependencies can be set via override:

```typescript
const bucket = new S3Bucket(this, "bucket", {
  bucket: "my-bucket",
});

const policy = new S3BucketPolicy(this, "policy", {
  bucket: bucket.id,
  policy: "...",
});

// Force explicit dependency (usually implicit deps are enough)
policy.addOverride("depends_on", [
  `aws_s3_bucket.${bucket.node.id}`,
]);
```

### Accessing New Provider Features

When a provider adds a new attribute that is not yet in the generated bindings:

```typescript
const instance = new Instance(this, "server", {
  ami: "ami-0c55b159cbfafe1f0",
  instanceType: "t3.micro",
});

// New feature not yet in bindings
instance.addOverride("enable_primary_ipv6", true);
instance.addOverride("private_dns_name_options.hostname_type", "resource-name");
```

## The resetOverride Method

You can also reset overrides that were previously set:

```typescript
const server = new Instance(this, "server", {
  ami: "ami-0c55b159cbfafe1f0",
  instanceType: "t3.micro",
});

// Set an override
server.addOverride("ebs_optimized", true);

// Later, remove it
server.resetOverride("ebs_optimized");
```

## Raw JSON Overrides

For complex nested structures, you can override entire blocks:

```typescript
const lb = new Lb(this, "alb", {
  name: "my-alb",
  internal: false,
  loadBalancerType: "application",
});

// Override an entire block with raw JSON
lb.addOverride("access_logs", {
  bucket: "my-lb-logs",
  prefix: "alb-logs",
  enabled: true,
});
```

## Overriding Provider Configuration

You can also use escape hatches on providers:

```typescript
const provider = new AwsProvider(this, "aws", {
  region: "us-east-1",
});

// Add provider-level overrides
provider.addOverride("ignore_tags.key_prefixes", ["kubernetes.io/"]);
provider.addOverride("default_tags.tags.ManagedBy", "cdktf");
```

## The Escape Hatch Pattern for Constructs

When building constructs that wrap resources, you can expose escape hatches to consumers:

```typescript
interface SecureBucketConfig {
  bucketName: string;
  enableLogging?: boolean;
}

class SecureBucket extends Construct {
  public readonly bucket: S3Bucket;

  constructor(scope: Construct, id: string, config: SecureBucketConfig) {
    super(scope, id);

    this.bucket = new S3Bucket(this, "bucket", {
      bucket: config.bucketName,
    });

    // Standard secure defaults
    new S3BucketPublicAccessBlock(this, "public-access", {
      bucket: this.bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });

    // Consumers can still use escape hatches through the exposed bucket
    // this.bucket.addOverride(...) is available to callers
  }
}

// Usage
const secureBucket = new SecureBucket(this, "data", {
  bucketName: "my-data",
});

// Consumer can add overrides when needed
secureBucket.bucket.addOverride("object_lock_enabled", true);
```

## Working with Dynamic Blocks via Escape Hatches

Sometimes you need dynamic blocks that the typed API does not support well:

```typescript
const sg = new SecurityGroup(this, "sg", {
  name: "dynamic-sg",
  vpcId: vpc.id,
});

// Create dynamic ingress rules via override
const ports = [80, 443, 8080, 8443];

sg.addOverride(
  "ingress",
  ports.map((port) => ({
    from_port: port,
    to_port: port,
    protocol: "tcp",
    cidr_blocks: ["0.0.0.0/0"],
    description: `Allow port ${port}`,
    ipv6_cidr_blocks: [],
    prefix_list_ids: [],
    security_groups: [],
    self: false,
  }))
);
```

## Using Terraform Functions via Escape Hatches

```typescript
import { Fn } from "cdktf";

const server = new Instance(this, "server", {
  ami: "ami-0c55b159cbfafe1f0",
  instanceType: "t3.micro",
});

// Use Terraform functions in overrides
server.addOverride(
  "tags.CreatedAt",
  "${timestamp()}"
);

// Or use the Fn class for a more type-safe approach
server.addOverride(
  "tags.Region",
  Fn.dataAwsRegionCurrent
);
```

## Debugging Escape Hatches

To verify your escape hatches produce the expected configuration:

```bash
# Synthesize and inspect the output
cdktf synth

# Check the generated JSON
cat cdktf.out/stacks/my-stack/cdk.tf.json | jq '.resource.aws_instance'
```

You can also verify in tests:

```typescript
import { Testing } from "cdktf";

it("should apply escape hatch overrides", () => {
  const app = Testing.app();
  const stack = new MyStack(app, "test");
  const synthesized = Testing.synth(stack);
  const config = JSON.parse(synthesized);

  // Verify the override was applied
  const instance = Object.values(config.resource.aws_instance)[0] as any;
  expect(instance.metadata_options.http_tokens).toBe("required");
});
```

## When to Use Escape Hatches

Use escape hatches when:

1. **A provider feature is too new** for the generated bindings
2. **The typed API has a bug** that prevents setting a value correctly
3. **You need raw Terraform expressions** that cannot be expressed through the typed API
4. **Working around temporary issues** while waiting for a provider update

Do not use escape hatches when:

1. The typed API supports what you need (prefer the typed API)
2. You could restructure your code to avoid the need
3. The value should come from a different resource or data source

## Best Practices

1. **Document every escape hatch**. Add a comment explaining why the typed API was not sufficient.

```typescript
// Escape hatch: metadata_options not fully typed in provider v5.30
// Remove when upgrading to v5.35+ which adds full support
server.addOverride("metadata_options.http_tokens", "required");
```

2. **Check if the typed API supports it first**. Provider updates may add support for features you are using escape hatches for.

3. **Test escape hatches**. Verify the generated JSON matches your expectations.

4. **Track escape hatches as tech debt**. Create tickets to remove them when the typed API catches up.

5. **Keep escape hatches close to the resource**. Put the override right after the resource definition, not somewhere else in the constructor.

Escape hatches are a pragmatic feature that acknowledges the reality of infrastructure development: sometimes the abstraction does not fit perfectly, and you need to work around it. Use them sparingly and document them well. For more on CDKTF patterns, see our guide on [CDKTF tokens for lazy values](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-tokens-for-lazy-values/view).
