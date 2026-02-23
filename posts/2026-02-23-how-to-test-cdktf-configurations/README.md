# How to Test CDKTF Configurations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Testing, Infrastructure as Code, TypeScript

Description: Learn how to write unit tests and snapshot tests for your CDKTF configurations to catch infrastructure errors before deployment.

---

Testing infrastructure code has always been tricky. With traditional Terraform, you either test by deploying (slow and expensive) or use tools like Terratest that spin up real resources. CDKTF changes the game because your infrastructure is defined in a real programming language, which means you can use real testing frameworks. You can write unit tests that verify your configuration without deploying anything, snapshot tests that catch unexpected changes, and integration tests that validate real infrastructure. This guide covers all three approaches.

## Why Test Infrastructure Code?

Infrastructure bugs are expensive. A misconfigured security group can expose your database to the internet. A wrong subnet configuration can take down your application. A missing encryption setting can lead to a compliance violation. Testing catches these issues before they reach production.

CDKTF makes testing practical because:
- You can instantiate stacks in a test environment without deploying
- The synthesized output can be inspected as JSON
- Standard testing frameworks (Jest, Mocha, pytest) work out of the box
- CDKTF provides built-in testing utilities

## Setting Up Testing

For TypeScript projects, Jest is the standard choice:

```bash
# Install testing dependencies
npm install --save-dev jest @types/jest ts-jest

# Install CDKTF testing utilities
npm install --save-dev cdktf
```

Configure Jest in your `package.json`:

```json
{
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/*.test.ts"]
  }
}
```

## Unit Testing with Snapshot Tests

Snapshot tests capture the synthesized Terraform JSON output and compare it against a stored snapshot. If anything changes, the test fails:

```typescript
// __tests__/main.test.ts
import { Testing } from "cdktf";
import { MyStack } from "../main";

describe("MyStack", () => {
  // Snapshot test - captures the full synthesized output
  it("should match the snapshot", () => {
    const app = Testing.app();
    const stack = new MyStack(app, "test-stack");
    const synthesized = Testing.synth(stack);

    // This creates a snapshot file on first run
    // On subsequent runs, it compares against the snapshot
    expect(synthesized).toMatchSnapshot();
  });
});
```

Run the test:

```bash
# Run tests
npm test

# Update snapshots when intentional changes are made
npm test -- --updateSnapshot
```

## Testing Resource Existence

Use CDKTF's testing utilities to verify that specific resources are created:

```typescript
import { Testing } from "cdktf";
import { MyStack } from "../main";

describe("MyStack", () => {
  it("should create an S3 bucket", () => {
    const app = Testing.app();
    const stack = new MyStack(app, "test-stack");
    const synthesized = Testing.synth(stack);

    // Check that the synthesized output contains an S3 bucket
    expect(synthesized).toHaveResource("aws_s3_bucket");
  });

  it("should create a VPC", () => {
    const app = Testing.app();
    const stack = new MyStack(app, "test-stack");
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResource("aws_vpc");
  });
});
```

## Testing Resource Properties

You can verify specific properties on resources:

```typescript
import { Testing } from "cdktf";
import { MyStack } from "../main";

describe("MyStack", () => {
  it("should create a VPC with correct CIDR block", () => {
    const app = Testing.app();
    const stack = new MyStack(app, "test-stack");
    const synthesized = Testing.synth(stack);

    // Check that the VPC has the expected CIDR block
    expect(synthesized).toHaveResourceWithProperties("aws_vpc", {
      cidr_block: "10.0.0.0/16",
      enable_dns_hostnames: true,
      enable_dns_support: true,
    });
  });

  it("should create an encrypted S3 bucket", () => {
    const app = Testing.app();
    const stack = new MyStack(app, "test-stack");
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(
      "aws_s3_bucket_server_side_encryption_configuration",
      {
        rule: [
          {
            apply_server_side_encryption_by_default: {
              sse_algorithm: "aws:kms",
            },
          },
        ],
      }
    );
  });

  it("should block public access on S3 buckets", () => {
    const app = Testing.app();
    const stack = new MyStack(app, "test-stack");
    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(
      "aws_s3_bucket_public_access_block",
      {
        block_public_acls: true,
        block_public_policy: true,
        ignore_public_acls: true,
        restrict_public_buckets: true,
      }
    );
  });
});
```

## Testing Data Sources

You can also test that data sources are properly configured:

```typescript
it("should look up the latest Amazon Linux AMI", () => {
  const app = Testing.app();
  const stack = new MyStack(app, "test-stack");
  const synthesized = Testing.synth(stack);

  expect(synthesized).toHaveDataSource("aws_ami");
  expect(synthesized).toHaveDataSourceWithProperties("aws_ami", {
    most_recent: true,
    owners: ["amazon"],
  });
});
```

## Testing Custom Constructs

When testing custom constructs, you can test them in isolation without a full stack:

```typescript
import { Testing } from "cdktf";
import { TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { SecureBucket } from "../constructs/secure-bucket";

describe("SecureBucket construct", () => {
  it("should create a bucket with encryption enabled", () => {
    const app = Testing.app();
    // Create a minimal stack just for testing the construct
    const stack = new TerraformStack(app, "test");
    new AwsProvider(stack, "aws", { region: "us-east-1" });

    // Instantiate the construct
    new SecureBucket(stack, "test-bucket", {
      bucketName: "test-bucket",
      environment: "test",
    });

    const synthesized = Testing.synth(stack);

    // Verify the construct creates all expected resources
    expect(synthesized).toHaveResource("aws_s3_bucket");
    expect(synthesized).toHaveResource("aws_s3_bucket_versioning");
    expect(synthesized).toHaveResource(
      "aws_s3_bucket_server_side_encryption_configuration"
    );
    expect(synthesized).toHaveResource("aws_s3_bucket_public_access_block");
  });

  it("should apply the correct tags", () => {
    const app = Testing.app();
    const stack = new TerraformStack(app, "test");
    new AwsProvider(stack, "aws", { region: "us-east-1" });

    new SecureBucket(stack, "test-bucket", {
      bucketName: "test-bucket",
      environment: "production",
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties("aws_s3_bucket", {
      tags: {
        Environment: "production",
        ManagedBy: "cdktf",
      },
    });
  });
});
```

## Testing with Different Configurations

Use parameterized tests to verify behavior across different inputs:

```typescript
describe("ApplicationStack", () => {
  const testCases = [
    {
      name: "development",
      instanceType: "t3.micro",
      multiAz: false,
    },
    {
      name: "staging",
      instanceType: "t3.small",
      multiAz: false,
    },
    {
      name: "production",
      instanceType: "t3.medium",
      multiAz: true,
    },
  ];

  testCases.forEach((testCase) => {
    it(`should configure ${testCase.name} correctly`, () => {
      const app = Testing.app();
      const stack = new ApplicationStack(app, "test", {
        environment: testCase.name,
        instanceType: testCase.instanceType,
        multiAz: testCase.multiAz,
      });
      const synthesized = Testing.synth(stack);

      expect(synthesized).toHaveResourceWithProperties("aws_instance", {
        instance_type: testCase.instanceType,
      });

      if (testCase.multiAz) {
        expect(synthesized).toHaveResourceWithProperties("aws_db_instance", {
          multi_az: true,
        });
      }
    });
  });
});
```

## Testing Resource Count

Verify that the correct number of resources are created:

```typescript
it("should create three subnets", () => {
  const app = Testing.app();
  const stack = new NetworkStack(app, "test");
  const synthesized = Testing.synth(stack);

  // Parse the synthesized JSON to count resources
  const config = JSON.parse(synthesized);
  const subnets = Object.keys(config.resource?.aws_subnet || {});
  expect(subnets.length).toBe(3);
});
```

## Running Tests in CI/CD

Add testing to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Test CDKTF Configuration
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
```

## Best Practices

1. **Test constructs in isolation**. Test your custom constructs independently from the full stack. This makes tests faster and easier to debug.

2. **Use snapshot tests as a safety net**. They catch any unexpected changes, even ones you might not think to write explicit tests for.

3. **Test security properties explicitly**. Always have tests that verify encryption, public access blocking, and security group rules.

4. **Test different configurations**. Use parameterized tests to verify your stacks work correctly with different inputs.

5. **Keep tests fast**. Unit tests should not deploy any infrastructure. Save integration testing for a separate pipeline.

Testing CDKTF configurations is one of the biggest advantages of using a real programming language for infrastructure. Take advantage of it. For more on testing with specific frameworks, see our guide on [CDKTF with testing frameworks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-with-testing-frameworks/view).
