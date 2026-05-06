# Validation Summary: How to Configure AWS ECR Access over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Amazon ECR
- Amazon ECR Public
- AWS CLI
- Amazon VPC
- AWS PrivateLink
- Amazon S3 gateway endpoints
- Docker
- IPv6
- IAM

## Sources Consulted
- Amazon ECR: Making requests to Amazon ECR registries — https://docs.aws.amazon.com/AmazonECR/latest/userguide/ecr-requests.html
- Amazon ECR: Amazon ECR interface VPC endpoints (AWS PrivateLink) — https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- AWS General Reference: Amazon ECR endpoints and quotas — https://docs.aws.amazon.com/general/latest/gr/ecr.html
- Amazon ECR: Private registry authentication in Amazon ECR — https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Amazon ECR Public: Making requests to Amazon ECR Public registries — https://docs.aws.amazon.com/AmazonECR/latest/public/public-ecr-requests.html
- AWS General Reference: Amazon ECR Public endpoints and quotas — https://docs.aws.amazon.com/general/latest/gr/ecr-public.html
- Amazon ECR Public: Registry authentication in Amazon ECR public — https://docs.aws.amazon.com/AmazonECR/latest/public/public-registry-auth.html
- AWS CLI Command Reference: create-vpc-endpoint — https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CLI User Guide: Using endpoints in the AWS CLI — https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-endpoints.html
- AWS SDKs and Tools Reference Guide: Dual-stack and FIPS endpoints — https://docs.aws.amazon.com/sdkref/latest/guide/feature-endpoints.html

## Issues Found
- The post treated the standard `amazonaws.com` and `public.ecr.aws` hostnames as IPv6 endpoints. I updated the IPv6 examples to the documented dual-stack hostnames: `ecr.<region>.api.aws`, `<registry-id>.dkr-ecr.<region>.on.aws`, `ecr-public.us-east-1.api.aws`, and `ecr-public.aws.com`.
- The DNS and connectivity checks queried the wrong hostnames for IPv6 validation. I replaced the `dig` and `curl` examples with checks against the documented dual-stack endpoints.
- The AWS CLI section implied plain `aws ecr` commands would use IPv6 without additional configuration. I added `aws configure set default.ecr.use_dualstack_endpoint true` and aligned Docker login with the dual-stack registry hostname.
- The VPC endpoint section omitted required setup details for practical private image pulls. I added `--private-dns-enabled` to the ECR interface endpoints and added the dual-stack Amazon S3 gateway endpoint required for layer downloads.
- The VPC networking section omitted the required endpoint security-group rule and used a third-party IP-check command. I noted the required inbound HTTPS rule and replaced the connectivity test with a direct check against an ECR dual-stack endpoint.
- The public ECR section used IPv4-oriented hostnames and a specific sample image path that was not documented by AWS. I rewrote the examples to use the documented dual-stack ECR Public hostnames and a generic repository alias.
- The IAM section said policies are not IP-version specific without the documented source-IP caveat. I clarified that policies using source IP conditions must include IPv6 CIDR ranges and added `ecr:DescribeRepositories` so the policy matches the earlier CLI example.
- The registry/account ID placeholders used a 9-digit value. I standardized them to a 12-digit AWS account ID format.

## Review Notes
- Amazon ECR dual-stack API endpoints were introduced in April 2025, so older examples that use the IPv4-only `amazonaws.com` internet endpoints are outdated for explicit IPv6 guidance.
- For VPC endpoint-based private access, the standard ECR hostnames can resolve privately when private DNS is enabled. For public internet IPv6 access, AWS documents the dual-stack `api.aws` and `on.aws` hostnames instead.
- The ECR Public Docker login hostname was aligned with `ecr-public.aws.com` based on AWS documentation that Docker should authenticate to the registry URI being used, combined with the IPv6 documentation that identifies `ecr-public.aws.com` as the dual-stack Docker/OCI registry hostname.
