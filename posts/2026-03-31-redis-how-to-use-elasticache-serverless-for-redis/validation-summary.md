# Validation Summary: How to Use ElastiCache Serverless for Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ElastiCache Serverless (Redis engine)
- AWS CLI (`elasticache` and `cloudwatch` subcommands)
- Terraform AWS provider (`aws_elasticache_serverless_cache` resource)
- Python redis-py client
- Node.js ioredis client
- AWS CloudWatch metrics
- Python boto3 SDK

## Sources Consulted
- AWS ElastiCache Serverless pricing page (ECPU definition: 1 ECPU = 1 read or write of ≤1 KB, linear scaling for larger payloads)
- AWS CLI reference for `create-serverless-cache` (parameter names: `--snapshot-arns-to-restore`, not `--snapshot-names-to-restore`)
- AWS ElastiCache Serverless documentation (endpoint format, TLS requirement, CloudWatch metrics)
- Terraform AWS provider documentation for `aws_elasticache_serverless_cache` resource
- redis-py documentation (ssl/TLS parameters)
- ioredis documentation (TLS configuration)

## Issues Found

1. **GET ECPU values incorrect (lines 138-139)**: Post stated GET (hit) and GET (miss) consume 0.5 ECPU each. Per AWS documentation, 1 ECPU = 1 read request of ≤1 KB data. Changed both to 1 ECPU.

2. **SET (100 KB) ECPU value incorrect (line 141)**: Post stated ~12 ECPUs. AWS documentation specifies linear scaling — larger payloads are charged proportionally per KB. A 100 KB write consumes approximately 100 ECPUs. Changed to ~100 ECPUs.

3. **Billing calculation incorrect (lines 149-151)**: The example calculated 500 ECPUs/sec for 1,000 GETs/sec (based on the wrong 0.5 ECPU per GET). Corrected to 1,000 ECPUs/sec = 86.4M ECPUs/day = ~$294/day.

4. **Storage pricing unit wrong (line 147)**: Post stated "$0.125 per GB-hour" which would equal ~$91/GB/month — far too expensive. The correct unit is "$0.125 per GB-month". Changed accordingly.

5. **Migration CLI parameter wrong (line 236)**: `--snapshot-names-to-restore` is not a valid parameter for `create-serverless-cache`. The correct parameter is `--snapshot-arns-to-restore`, which accepts snapshot ARNs. Changed the parameter name and provided an example ARN value.

## Review Notes
- The claim "Scales instantly from zero to thousands of requests per second" is slightly misleading — ElastiCache Serverless does not scale to zero cost (there is a minimum baseline), and scaling is not truly instant. However, this is a general marketing-style description rather than a technical error.
- The SCAN ECPU value ("1 ECPU per 10 keys returned") could not be verified against official documentation. Since SCAN returns key names (not values), the data transfer is minimal, making this plausible but unverified.
- The ECPU pricing rate ($0.0000034/ECPU) and storage rate ($0.125/GB-month after correction) are approximate and may vary by region or change over time. Readers should check current AWS pricing.
- The Python and JavaScript connection examples are syntactically correct and use appropriate TLS configuration for ElastiCache Serverless.
- The Terraform configuration uses correct resource and attribute names per the AWS provider.
- The CloudWatch metric names and dimensions appear correct for ElastiCache Serverless monitoring.
