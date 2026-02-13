# How to Synthesize and Diff CDK Changes Before Deployment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, DevOps, Deployment

Description: Master the cdk synth and cdk diff commands to preview infrastructure changes before deploying, catch dangerous modifications, and build safer deployment workflows.

---

Deploying infrastructure changes blind is a recipe for disaster. One wrong property and your database gets replaced, your security group opens to the world, or your load balancer drops all traffic. CDK's `synth` and `diff` commands let you see exactly what's going to happen before it happens.

This isn't optional - it should be a mandatory step in every deployment workflow. Let's dig into how these commands work and how to use them effectively.

## What cdk synth Does

The `synth` command converts your CDK code into a CloudFormation template. It runs your TypeScript (or Python, Java, etc.) code, resolves all the constructs, and produces the final template that CloudFormation will execute.

```bash
# Synthesize the CloudFormation template
cdk synth
```

This outputs the template to stdout and saves it to the `cdk.out` directory. For a simple stack, the output might look something like this.

```yaml
Resources:
  MyBucketF68F3FF0:
    Type: AWS::S3::Bucket
    Properties:
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
    UpdateReplacePolicy: Retain
    DeletionPolicy: Retain
```

## When synth Fails

If `cdk synth` fails, your code has a problem that needs fixing before you can deploy. Common causes include:

```bash
# Missing context values - CDK needs to look up existing resources
cdk synth
# Error: Cannot determine value of context key vpc-provider:...

# Fix: provide context explicitly or let CDK look it up
cdk synth -c vpc-id=vpc-12345

# Or use --context to provide values
cdk synth --context environment=production
```

Type errors and missing properties also show up during synthesis. That's one of CDK's advantages over raw CloudFormation - you catch these mistakes at build time, not deploy time.

## What cdk diff Does

The `diff` command compares your synthesized template against the currently deployed stack. It shows you exactly what will be created, updated, or deleted.

```bash
# Show what would change if you deployed right now
cdk diff
```

Here's what typical diff output looks like.

```
Stack MyStack
IAM Statement Changes
+-----+------------------+--------+-----------+-----------------------------------------+
| +   | ${MyFunc/Servic  | Allow  | sts:Assum | Service:lambda.amazonaws.com             |
|     | eRole.Arn}       |        | eRole     |                                          |
+-----+------------------+--------+-----------+-----------------------------------------+

Resources
[+] AWS::Lambda::Function MyFunc MyFunc3BAA72D1
[+] AWS::IAM::Role MyFunc/ServiceRole MyFuncServiceRole123456
[~] AWS::S3::Bucket MyBucket MyBucketF68F3FF0
 +-- [+] VersioningConfiguration
     +-- [+] Status: Enabled
[-] AWS::SNS::Topic OldTopic OldTopicABC123
```

The symbols tell you what's happening:

- `[+]` - Resource will be created
- `[-]` - Resource will be deleted
- `[~]` - Resource will be modified
- `[+]` under `[~]` - Property being added
- `[-]` under `[~]` - Property being removed

## Spotting Dangerous Changes

The most important thing to watch for in diffs is resource replacement. Some property changes can't be done in-place - CloudFormation has to delete the old resource and create a new one. This is indicated by the resource being marked with both `[-]` and `[+]`.

Resource replacements are dangerous because:

- Databases lose their data
- S3 buckets lose their contents
- Load balancers get new DNS names
- Security groups disconnect from instances

Here's an example of a dangerous diff.

```
Resources
[-] AWS::RDS::DBInstance MyDatabase MyDatabaseABC123 (will be destroyed)
[+] AWS::RDS::DBInstance MyDatabase MyDatabaseDEF456 (will be created)
```

If you see this for a database, stop. Figure out why the resource is being replaced and fix your CDK code to avoid it.

## Using diff with Specific Stacks

If your app has multiple stacks, you can diff a specific one.

```bash
# Diff a specific stack
cdk diff MyStack

# Diff all stacks
cdk diff --all

# Diff with more detail
cdk diff --no-change-set  # Faster, but slightly less accurate
```

## Saving Diffs for Review

For code reviews and audit trails, save the diff output.

```bash
# Save diff to a file for review
cdk diff 2>&1 | tee cdk-diff-output.txt

# Or use the CloudFormation template directly
cdk synth > template.yaml
# Then compare with the previous version in your VCS
```

## Security Change Detection

CDK diff highlights IAM and security group changes prominently. This is intentional - these are the changes most likely to cause security incidents.

```
IAM Statement Changes
+-----+------------------+--------+------------------+------------------+
| +   | ${Role.Arn}      | Allow  | *                | *                |
+-----+------------------+--------+------------------+------------------+

Security Group Changes
+-----+-----------+--------+------------------+------------------+
| +   | MySecGrp  | Ingr   | 0.0.0.0/0        | TCP 22           |
+-----+-----------+--------+------------------+------------------+
```

If you see `*` in the actions or resources column of IAM changes, or `0.0.0.0/0` in security group rules, that should trigger a careful review.

## Automating Diff in CI/CD

Here's how to integrate diff into your pipeline so changes get reviewed before deployment.

```yaml
# GitHub Actions workflow
name: CDK Diff on PR
on:
  pull_request:
    branches: [main]

jobs:
  diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: CDK Diff
        run: |
          npx cdk diff 2>&1 | tee diff-output.txt
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: us-east-1

      # Post the diff as a PR comment
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const diff = fs.readFileSync('diff-output.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## CDK Diff\n\`\`\`\n${diff}\n\`\`\``,
            });
```

This posts the diff as a comment on every pull request, making it easy for reviewers to see what infrastructure changes will happen.

## Using Approval Steps

For production deployments, CDK has a built-in approval mechanism.

```bash
# Require manual approval before deploying
cdk deploy --require-approval broadening

# Options:
# never       - Never ask for approval
# any-change  - Ask for any change
# broadening  - Ask only for security changes (IAM, security groups)
```

The `broadening` level is a good default for production - it lets routine changes through but stops when security is involved.

## Snapshots for Regression Testing

You can use CDK's snapshot testing to catch unintended changes in your test suite.

```typescript
import { Template } from 'aws-cdk-lib/assertions';
import { App } from 'aws-cdk-lib';
import { MyStack } from '../lib/my-stack';

test('stack matches snapshot', () => {
  const app = new App();
  const stack = new MyStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  // This will fail if the template changes unexpectedly
  expect(template.toJSON()).toMatchSnapshot();
});
```

Run this in your test suite, and any unexpected changes to the generated template will be caught before they reach deployment.

## Best Practices

Always run `cdk diff` before every deploy. Make it a habit, make it a pipeline step, make it impossible to skip.

Review security changes carefully. IAM and security group changes are the highest-risk modifications you can make.

When you see resource replacements, understand why. Sometimes it's expected (like renaming a resource). Often it's a bug in your code that would cause data loss.

Keep your `cdk.out` directory in `.gitignore`. It contains generated templates and isn't useful in version control.

For monitoring your deployed infrastructure after changes, consider using [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) to catch issues that the diff couldn't predict - like performance regressions or unexpected cost increases.

## Wrapping Up

`cdk synth` and `cdk diff` are your safety net. Synthesis catches code errors early, and diff catches infrastructure changes before they hit production. Build both into your workflow, automate them in CI/CD, and never deploy without reviewing the diff first. The few minutes it takes to review a diff can save you hours of incident response.

For more CDK safety practices, see our guide on [using CDK Nag for security checks](https://oneuptime.com/blog/post/2026-02-12-use-cdk-nag-for-security-best-practice-checks/view).
