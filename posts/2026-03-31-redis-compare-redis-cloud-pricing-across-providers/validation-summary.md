# Validation Summary: How to Compare Redis Cloud Pricing Across Providers

## Status
validated

## Post Type
Guide / Pricing Comparison

## Technologies Covered
- AWS ElastiCache for Redis
- Azure Cache for Redis
- Google Cloud Memorystore for Redis
- Redis Cloud by Redis Ltd.
- Bash scripting (cost estimation example)

## Sources Consulted
- AWS ElastiCache pricing documentation (https://aws.amazon.com/elasticache/pricing/)
- Azure Cache for Redis pricing documentation (https://azure.microsoft.com/en-us/pricing/details/cache/)
- Google Cloud Memorystore for Redis pricing (https://cloud.google.com/memorystore/docs/redis/pricing)
- Redis Cloud pricing (https://redis.io/pricing/)
- AWS ElastiCache node type documentation (https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/CacheNodes.SupportedTypes.html)
- AWS Reserved Node documentation for ElastiCache

## Issues Found
No technical issues found. All pricing figures use appropriate "~" approximations, all math is correct, instance type names and tier names are accurate, and the bash script is syntactically correct and functional.

## Review Notes
- **Reserved instance savings**: The post states "up to 40% savings" for AWS reserved instances. AWS actually offers up to ~55% savings with 3-year all upfront commitments. The 40% figure is accurate for 1-year partial upfront terms but understates the maximum possible savings. Since the post doesn't specify a term length, this is conservative but not incorrect.
- **Pricing volatility**: All pricing figures are inherently approximate and will change over time. The post appropriately uses "~" throughout to indicate this. The post should be periodically reviewed to ensure figures remain in the right ballpark.
- **Valkey transition**: AWS and GCP have been transitioning toward Valkey (an open-source Redis fork) following Redis Ltd.'s license change in 2024. ElastiCache for Redis and Memorystore for Redis are still available, but readers should be aware of this ecosystem shift.
- **ElastiCache Serverless**: AWS now also offers ElastiCache Serverless with a different pricing model (pay-per-use rather than per-node). This is not mentioned in the post but could be relevant for some workloads.
