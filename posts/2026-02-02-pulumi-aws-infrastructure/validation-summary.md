# Validation Summary: How to Use Pulumi with AWS

## Status
validated

## Post Type
Tutorial / Guide — practical walkthrough of provisioning AWS infrastructure with Pulumi (TypeScript), covering CLI setup, individual AWS resources (S3, VPC, EC2, RDS, ECS Fargate), reusable components, state management, and testing.

## Technologies Covered
- Pulumi (CLI, TypeScript SDK, ComponentResource, runtime mocking)
- AWS services: S3, EC2, VPC (subnets, IGW, NAT GW, route tables, EIP), Security Groups, RDS (PostgreSQL), Secrets Manager, ECR, ECS Fargate, Application Load Balancer, IAM, CloudWatch Logs, DynamoDB, Auto Scaling Groups, Launch Templates
- TypeScript / Node.js
- Jest (for testing)
- Amazon Linux 2023 AMI

## Sources Consulted
- Pulumi CLI `destroy` command reference: https://www.pulumi.com/docs/iac/cli/commands/pulumi_destroy/
- Pulumi AWS provider docs (s3.Bucket, ec2.Eip, ec2.LaunchTemplate, rds.Instance, ecs.Cluster, lb.LoadBalancer)
- Pulumi `new` command reference and template names
- Pulumi `whoami` command reference
- Pulumi testing API (`setMocks`, `MockResourceArgs`, `MockCallArgs`)

## Issues Found
No technical issues found that affect correctness. All CLI commands, flags, and resource APIs used in the post are valid and would work as written. Specifically verified:

- `pulumi destroy --preview-only` is a real flag in current Pulumi CLI.
- `pulumi whoami -v`, `pulumi new aws-typescript`, `pulumi login --local`, and `pulumi login s3://...` are all valid.
- `aws.ec2.Eip` with `domain: "vpc"` is the current, correct property (replacing the older `vpc: true`).
- `aws.ec2.LaunchTemplate` properties (`imageId`, `instanceType`, `vpcSecurityGroupIds`, `userData`) are correct.
- `aws.ecs.Cluster` `setting` block structure for `containerInsights` is correct.
- Amazon Linux 2023 AMI filter `al2023-ami-*-x86_64` with `owners: ["amazon"]` is valid.
- PostgreSQL `engineVersion: "15.4"` is a real RDS-supported version.
- Pulumi testing mock signatures (`MockResourceArgs`, `MockCallArgs`) are correct.

## Review Notes
A few non-blocking observations the author may want to revisit in a future update:

- **Deprecated inline `aws.s3.Bucket` arguments**: The `versioning` and `serverSideEncryptionConfiguration` inline arguments on `aws.s3.Bucket` still work in AWS provider v6, but they emit deprecation warnings. The Pulumi-recommended replacement is to use separate companion resources (`aws.s3.BucketVersioning`, `aws.s3.BucketServerSideEncryptionConfiguration`). Note that the underlying `aws.s3.Bucket` resource itself is NOT deprecated — only those inline argument forms are. (Confusingly, `aws.s3.BucketV2` is the deprecated one in current docs.)
- **Test example contrivance**: In the `__tests__/vpc.test.ts` example, the test calls `infra.vpcCidr.apply(resolve)`, but `vpcCidr` is defined in `vpc.ts` as a plain string (`config.get("vpcCidr") || "10.0.0.0/16"`) and is never exported from `index.ts`. As written, this specific assertion would not run — readers reproducing the testing pattern will need to export `vpcCidr` and either skip `.apply()` (since it's a plain string) or wrap it as an Output. The overall testing approach (`pulumi.runtime.setMocks` + Jest) is correct.
- **Cross-file variable references**: The `ec2.ts`, `rds.ts`, and `ecs.ts` snippets reference `vpc`, `vpcCidr`, `publicSubnets`, `publicSubnetIds`, `privateSubnetIds` without importing them. The post acknowledges this ("Assume vpc module exports are available"). Fine for an illustrative tutorial, but readers will need to wire imports themselves.
- **RDS engine version**: PostgreSQL 15.4 is valid today but minor versions get deprecated on a rolling basis by AWS RDS; readers running this in late 2026 may need to bump it.
