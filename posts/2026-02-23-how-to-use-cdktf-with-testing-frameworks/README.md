# How to Use CDKTF with Testing Frameworks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Testing, Jest, Infrastructure as Code

Description: Learn how to integrate CDKTF with popular testing frameworks like Jest, Mocha, and pytest for comprehensive infrastructure testing at unit, integration, and end-to-end levels.

---

CDKTF code is regular programming language code, which means you can use the same testing frameworks your application developers already know. Jest for TypeScript, pytest for Python, JUnit for Java - they all work. This guide focuses on practical testing patterns with Jest (the most common choice for TypeScript CDKTF projects), covering unit tests, property tests, snapshot tests, and integration tests.

## Setting Up Jest for CDKTF

Start with a properly configured testing environment:

```bash
# Install testing dependencies
npm install --save-dev jest @types/jest ts-jest

# The CDKTF package includes testing utilities
# Make sure cdktf is in your dependencies
npm install cdktf
```

Configure Jest in `jest.config.js`:

```javascript
// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
  // Increase timeout for tests that synthesize large stacks
  testTimeout: 30000,
  // Collect coverage information
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
};
```

Add test scripts to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## CDKTF Testing Utilities

CDKTF provides a `Testing` class with several helpful methods:

```typescript
import { Testing } from "cdktf";

// Testing.app() - Creates a test App instance
const app = Testing.app();

// Testing.synth() - Synthesizes a stack and returns JSON string
const synthesized = Testing.synth(stack);

// Testing.fullSynth() - Full synthesis including terraform init
const fullOutput = Testing.fullSynth(stack);

// Testing matchers for Jest
expect(synthesized).toHaveResource("aws_s3_bucket");
expect(synthesized).toHaveResourceWithProperties("aws_vpc", {
  cidr_block: "10.0.0.0/16",
});
expect(synthesized).toHaveDataSource("aws_ami");
```

## Writing Unit Tests

Unit tests verify that your stacks and constructs produce the expected Terraform configuration:

```typescript
// __tests__/network-stack.test.ts
import { Testing } from "cdktf";
import { NetworkStack } from "../stacks/network-stack";

describe("NetworkStack", () => {
  let synthesized: string;

  beforeEach(() => {
    const app = Testing.app();
    const stack = new NetworkStack(app, "test-network");
    synthesized = Testing.synth(stack);
  });

  it("should create a VPC", () => {
    expect(synthesized).toHaveResource("aws_vpc");
  });

  it("should create the VPC with the correct CIDR block", () => {
    expect(synthesized).toHaveResourceWithProperties("aws_vpc", {
      cidr_block: "10.0.0.0/16",
      enable_dns_hostnames: true,
      enable_dns_support: true,
    });
  });

  it("should create three public subnets", () => {
    const config = JSON.parse(synthesized);
    const subnets = config.resource?.aws_subnet || {};
    const publicSubnets = Object.values(subnets).filter(
      (s: any) => s.map_public_ip_on_launch === true
    );
    expect(publicSubnets.length).toBe(3);
  });

  it("should create an internet gateway", () => {
    expect(synthesized).toHaveResource("aws_internet_gateway");
  });

  it("should create NAT gateway for private subnets", () => {
    expect(synthesized).toHaveResource("aws_nat_gateway");
  });

  it("should output the VPC ID", () => {
    const config = JSON.parse(synthesized);
    expect(config.output).toHaveProperty("vpc-id");
  });
});
```

## Testing Custom Constructs

Test constructs in isolation from full stacks:

```typescript
// __tests__/constructs/secure-bucket.test.ts
import { Testing } from "cdktf";
import { TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { SecureBucket } from "../../constructs/secure-bucket";

describe("SecureBucket", () => {
  function createStack(): string {
    const app = Testing.app();
    const stack = new TerraformStack(app, "test");
    new AwsProvider(stack, "aws", { region: "us-east-1" });

    new SecureBucket(stack, "test-bucket", {
      bucketName: "test-secure-bucket",
      environment: "test",
    });

    return Testing.synth(stack);
  }

  it("should create an S3 bucket", () => {
    const output = createStack();
    expect(output).toHaveResource("aws_s3_bucket");
  });

  it("should enable versioning", () => {
    const output = createStack();
    expect(output).toHaveResourceWithProperties("aws_s3_bucket_versioning", {
      versioning_configuration: {
        status: "Enabled",
      },
    });
  });

  it("should enable server-side encryption", () => {
    const output = createStack();
    expect(output).toHaveResource(
      "aws_s3_bucket_server_side_encryption_configuration"
    );
  });

  it("should block public access", () => {
    const output = createStack();
    expect(output).toHaveResourceWithProperties(
      "aws_s3_bucket_public_access_block",
      {
        block_public_acls: true,
        block_public_policy: true,
        ignore_public_acls: true,
        restrict_public_buckets: true,
      }
    );
  });

  it("should apply the correct tags", () => {
    const output = createStack();
    expect(output).toHaveResourceWithProperties("aws_s3_bucket", {
      tags: {
        Environment: "test",
        ManagedBy: "cdktf",
      },
    });
  });
});
```

## Snapshot Testing

Snapshot tests capture the entire synthesized output and flag any changes:

```typescript
// __tests__/snapshot.test.ts
import { Testing } from "cdktf";
import { MyStack } from "../main";

describe("Infrastructure Snapshots", () => {
  it("NetworkStack should match snapshot", () => {
    const app = Testing.app();
    const stack = new NetworkStack(app, "test-network");
    const synthesized = Testing.synth(stack);

    expect(synthesized).toMatchSnapshot();
  });

  it("ApplicationStack should match snapshot", () => {
    const app = Testing.app();
    const stack = new ApplicationStack(app, "test-app", {
      environment: "test",
      instanceType: "t3.micro",
    });
    const synthesized = Testing.synth(stack);

    expect(synthesized).toMatchSnapshot();
  });
});
```

Update snapshots when intentional changes are made:

```bash
# Update all snapshots
npm test -- --updateSnapshot

# Update snapshots for a specific test file
npm test -- --updateSnapshot __tests__/snapshot.test.ts
```

## Parameterized Testing

Test the same construct or stack with different configurations:

```typescript
// __tests__/environments.test.ts
import { Testing } from "cdktf";
import { ApplicationStack, EnvironmentConfig } from "../stacks/app-stack";

describe("ApplicationStack environments", () => {
  const testCases: { name: string; config: EnvironmentConfig; assertions: any }[] = [
    {
      name: "development",
      config: {
        environment: "dev",
        instanceType: "t3.micro",
        enableMultiAz: false,
        enableEncryption: true,
      },
      assertions: {
        instanceType: "t3.micro",
        multiAz: false,
      },
    },
    {
      name: "production",
      config: {
        environment: "prod",
        instanceType: "t3.large",
        enableMultiAz: true,
        enableEncryption: true,
      },
      assertions: {
        instanceType: "t3.large",
        multiAz: true,
      },
    },
  ];

  testCases.forEach(({ name, config, assertions }) => {
    describe(`${name} environment`, () => {
      let synthesized: string;

      beforeEach(() => {
        const app = Testing.app();
        const stack = new ApplicationStack(app, "test", config);
        synthesized = Testing.synth(stack);
      });

      it(`should use ${assertions.instanceType} instances`, () => {
        expect(synthesized).toHaveResourceWithProperties("aws_instance", {
          instance_type: assertions.instanceType,
        });
      });

      it(`should ${assertions.multiAz ? "enable" : "disable"} multi-AZ`, () => {
        if (assertions.multiAz) {
          expect(synthesized).toHaveResourceWithProperties("aws_db_instance", {
            multi_az: true,
          });
        }
      });

      it("should always enable encryption", () => {
        expect(synthesized).toHaveResourceWithProperties("aws_db_instance", {
          storage_encrypted: true,
        });
      });
    });
  });
});
```

## Testing Aspects

Test that your aspects correctly validate and modify resources:

```typescript
// __tests__/aspects/tagging.test.ts
import { Testing, TerraformStack, Aspects } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { TaggingAspect } from "../../aspects/tagging";

describe("TaggingAspect", () => {
  it("should add tags to all resources", () => {
    const app = Testing.app();
    const stack = new TerraformStack(app, "test");
    new AwsProvider(stack, "aws", { region: "us-east-1" });

    new S3Bucket(stack, "bucket", {
      bucket: "test-bucket",
    });

    // Apply the tagging aspect
    Aspects.of(stack).add(
      new TaggingAspect({
        Environment: "test",
        Team: "platform",
      })
    );

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties("aws_s3_bucket", {
      tags: {
        Environment: "test",
        Team: "platform",
      },
    });
  });
});
```

## Testing Negative Cases

Verify that your code rejects invalid inputs:

```typescript
describe("Input validation", () => {
  it("should throw on invalid CIDR block", () => {
    const app = Testing.app();

    expect(() => {
      new NetworkStack(app, "test", {
        cidrBlock: "not-a-cidr",
      });
    }).toThrow("Invalid CIDR block");
  });

  it("should throw on missing required configuration", () => {
    const app = Testing.app();

    expect(() => {
      new ApplicationStack(app, "test", {
        environment: "",
      });
    }).toThrow("Environment must not be empty");
  });
});
```

## Custom Jest Matchers

Create custom matchers for common assertions:

```typescript
// __tests__/matchers.ts
expect.extend({
  toHaveResourceCount(synthesized: string, resourceType: string, count: number) {
    const config = JSON.parse(synthesized);
    const resources = config.resource?.[resourceType] || {};
    const actual = Object.keys(resources).length;

    return {
      pass: actual === count,
      message: () =>
        `Expected ${count} ${resourceType} resources, found ${actual}`,
    };
  },

  toHaveSecureS3Bucket(synthesized: string) {
    const hasEncryption = synthesized.includes(
      "aws_s3_bucket_server_side_encryption_configuration"
    );
    const hasPublicAccessBlock = synthesized.includes(
      "aws_s3_bucket_public_access_block"
    );
    const hasVersioning = synthesized.includes("aws_s3_bucket_versioning");

    const pass = hasEncryption && hasPublicAccessBlock && hasVersioning;

    return {
      pass,
      message: () =>
        `Expected S3 bucket to be secure (encryption: ${hasEncryption}, ` +
        `public access block: ${hasPublicAccessBlock}, versioning: ${hasVersioning})`,
    };
  },
});
```

## Running Tests in CI/CD

```yaml
# .github/workflows/test.yml
name: CDKTF Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm test -- --ci --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./coverage
```

## Best Practices

1. **Test at multiple levels**. Unit tests for constructs, snapshot tests for stacks, and integration tests for critical paths.

2. **Keep tests fast**. Unit and snapshot tests should not make API calls. Save integration tests for a separate pipeline.

3. **Use beforeEach for setup**. Create fresh stacks in each test to avoid state leaking between tests.

4. **Test security requirements explicitly**. Encryption, access controls, and network policies should always have dedicated tests.

5. **Update snapshots deliberately**. Review snapshot changes carefully during code review.

6. **Test edge cases**. What happens with empty lists, zero counts, or missing optional fields?

7. **Maintain test coverage**. Aim for high coverage on custom constructs and business logic.

Testing frameworks are what make CDKTF a production-grade tool. Without tests, infrastructure changes are a gamble. With tests, they are a calculated, verified operation. For more on CDKTF testing, see our guide on [testing CDKTF configurations](https://oneuptime.com/blog/post/2026-02-23-how-to-test-cdktf-configurations/view).
