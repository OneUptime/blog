# How to Write Snapshot Tests for CDK Stacks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Testing, TypeScript

Description: Learn how to use snapshot testing with CDK to detect unintended changes in your synthesized CloudFormation templates and protect against accidental infrastructure drift.

---

Snapshot testing is a safety net for your CDK stacks. It captures the synthesized CloudFormation template and saves it as a reference. On subsequent test runs, if the template changes in any way, the test fails. This catches accidental changes that unit tests might miss - like a dependency update quietly changing default values.

Think of it as a diff check for your infrastructure. Any change, intentional or not, gets flagged for review.

## How Snapshot Testing Works

The concept is simple. You synthesize your stack, serialize the CloudFormation template, and compare it against a stored snapshot. If there's no snapshot yet, one gets created. If there is one and the template has changed, the test fails until you explicitly approve the change.

```typescript
// test/snapshot.test.ts
// Basic snapshot test for a CDK stack
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MyStack } from '../lib/my-stack';

test('MyStack matches snapshot', () => {
  const app = new cdk.App();
  const stack = new MyStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  // Compare the entire template against the stored snapshot
  expect(template.toJSON()).toMatchSnapshot();
});
```

The first time you run this test, Jest creates a snapshot file in a `__snapshots__` directory. It contains the full CloudFormation JSON. Every subsequent run compares the current output against this stored snapshot.

## Setting Up Snapshot Tests

Snapshot tests use the same Jest setup as unit tests. No additional dependencies needed.

```bash
# Run snapshot tests (same as running any Jest test)
npm test

# Update snapshots when you've made intentional changes
npm test -- --updateSnapshot
# Or the short form
npm test -- -u
```

The snapshot file gets committed to your repository. This is important - it means code reviewers can see exactly what changed in the generated CloudFormation template.

## Practical Snapshot Test Patterns

### Full Stack Snapshot

The most common approach captures the entire stack template.

```typescript
// test/snapshots/all-stacks.test.ts
// Snapshot tests for every stack in the application
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NetworkStack } from '../../lib/network-stack';
import { DatabaseStack } from '../../lib/database-stack';
import { ApplicationStack } from '../../lib/application-stack';

describe('Stack snapshots', () => {
  const app = new cdk.App();

  test('NetworkStack matches snapshot', () => {
    const stack = new NetworkStack(app, 'Network');
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('DatabaseStack matches snapshot', () => {
    // Create dependencies first
    const network = new NetworkStack(app, 'NetworkForDb');
    const stack = new DatabaseStack(app, 'Database', {
      vpc: network.vpc,
    });
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });

  test('ApplicationStack matches snapshot', () => {
    const network = new NetworkStack(app, 'NetworkForApp');
    const database = new DatabaseStack(app, 'DatabaseForApp', {
      vpc: network.vpc,
    });
    const stack = new ApplicationStack(app, 'Application', {
      vpc: network.vpc,
      database: database.cluster,
    });
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});
```

### Per-Environment Snapshots

If your stacks produce different output based on environment, test each configuration.

```typescript
// Test snapshots for each environment configuration
describe('Environment-specific snapshots', () => {
  const environments = ['dev', 'staging', 'production'];

  for (const env of environments) {
    test(`${env} stack matches snapshot`, () => {
      const app = new cdk.App({
        context: { environment: env },
      });
      const stack = new MyStack(app, `${env}-Stack`, {
        environment: env,
      });
      const template = Template.fromStack(stack);
      expect(template.toJSON()).toMatchSnapshot();
    });
  }
});
```

### Partial Snapshots

Sometimes the full template is too noisy. You can snapshot specific sections.

```typescript
// Snapshot only specific resource types
test('IAM roles match snapshot', () => {
  const template = Template.fromStack(stack);
  const roles = template.findResources('AWS::IAM::Role');
  expect(roles).toMatchSnapshot();
});

test('Security groups match snapshot', () => {
  const template = Template.fromStack(stack);
  const sgs = template.findResources('AWS::EC2::SecurityGroup');
  expect(sgs).toMatchSnapshot();
});

test('Lambda configurations match snapshot', () => {
  const template = Template.fromStack(stack);
  const functions = template.findResources('AWS::Lambda::Function');
  expect(functions).toMatchSnapshot();
});
```

This is useful when you want snapshots for security-critical resources but don't want noise from frequently changing resources.

## Dealing with Dynamic Values

CDK generates some values dynamically - like asset hashes, logical IDs that include hash suffixes, and timestamps. These change on every synthesis and break snapshot tests. You can strip them out before comparing.

```typescript
// Sanitize dynamic values before snapshot comparison
function sanitizeTemplate(template: any): any {
  const json = JSON.stringify(template);

  // Replace asset hashes with a stable placeholder
  const sanitized = json
    .replace(/[a-f0-9]{64}\.zip/g, 'ASSET_HASH.zip')
    .replace(/[a-f0-9]{64}/g, 'HASH_PLACEHOLDER')
    .replace(/cdk-[a-z0-9]+-assets-/g, 'cdk-QUALIFIER-assets-');

  return JSON.parse(sanitized);
}

test('stack matches snapshot (sanitized)', () => {
  const template = Template.fromStack(stack);
  const sanitized = sanitizeTemplate(template.toJSON());
  expect(sanitized).toMatchSnapshot();
});
```

A cleaner approach is to use Jest's custom serializers.

```typescript
// jest.config.js - Add a custom serializer for CDK templates
module.exports = {
  snapshotSerializers: ['./test/cdk-snapshot-serializer.js'],
};
```

```javascript
// test/cdk-snapshot-serializer.js
// Custom serializer that normalizes CDK-generated hashes
module.exports = {
  test(val) {
    return val && typeof val === 'object' && val.Resources;
  },
  serialize(val) {
    const json = JSON.stringify(val, null, 2);
    return json.replace(/[a-f0-9]{64}/g, '[HASH]');
  },
};
```

## Reviewing Snapshot Changes

When a snapshot test fails, Jest shows a diff of what changed. This is where snapshots really shine during code review.

```bash
# When a test fails, review the diff
npm test

# If the change is intentional, update the snapshot
npm test -- -u

# Update only snapshots for a specific test file
npm test -- --testPathPattern snapshot -u
```

In your pull request, the snapshot diff shows exactly what changed in the CloudFormation template. Reviewers can verify that a "small change" to your CDK code doesn't have unexpected ripple effects.

## When Snapshot Tests Help vs. Hurt

Snapshot tests are great for:
- Catching unintended side effects of code changes
- Detecting the impact of CDK library upgrades
- Documenting what your stack actually produces
- Protecting security-critical configurations (IAM, security groups)

Snapshot tests can be annoying when:
- Your stacks change frequently (constant snapshot updates)
- Asset hashes change on every build
- You have large templates that make diffs hard to read

The sweet spot is combining snapshot tests with targeted unit tests. Use unit tests for specific assertions ("this bucket must have versioning") and snapshots as a catch-all for unexpected changes.

```typescript
// Best practice: combine unit tests and snapshot tests
describe('StorageStack', () => {
  // Specific assertions for critical properties
  test('bucket has encryption enabled', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: Match.objectLike({
        ServerSideEncryptionConfiguration: Match.anyValue(),
      }),
    });
  });

  // Snapshot catches everything else
  test('template matches snapshot', () => {
    expect(template.toJSON()).toMatchSnapshot();
  });
});
```

For more on specific property assertions, see the post on [writing unit tests for CDK stacks](https://oneuptime.com/blog/post/write-unit-tests-for-cdk-stacks/view). For testing the actual deployed behavior, check out [integration tests for CDK stacks](https://oneuptime.com/blog/post/write-integration-tests-for-cdk-stacks/view).
