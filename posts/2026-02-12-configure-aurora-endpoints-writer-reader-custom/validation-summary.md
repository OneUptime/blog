# Validation Summary: How to Configure Aurora Endpoints (Writer, Reader, Custom)

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Amazon Aurora
- Amazon RDS endpoints
- AWS CLI
- Terraform AWS provider
- Python SQLAlchemy
- PyMySQL
- Node.js mysql2
- RDS Proxy

## Sources Consulted
- Amazon Aurora endpoint connections: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.Endpoints.html
- Amazon Aurora cluster endpoints: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Cluster.html
- Amazon Aurora reader endpoints: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Reader.html
- Amazon Aurora custom endpoints: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Custom.html
- AWS CLI create-db-cluster-endpoint: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster-endpoint.html
- AWS CLI describe-db-clusters: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-clusters.html
- AWS CLI describe-db-instances: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- Amazon Aurora editing custom endpoints: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-endpoint-editing.html
- Amazon Aurora best practices for DNS caching: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.BestPractices.html
- Amazon RDS Proxy concepts and failover behavior: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy.howitworks.html
- Terraform AWS provider aws_rds_cluster_endpoint: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_endpoint
- SQLAlchemy connection pooling: https://docs.sqlalchemy.org/en/21/core/pooling.html
- MySQL2 quickstart and pool configuration: https://sidorares.github.io/node-mysql2/docs
- PyMySQL connection arguments: https://pymysql.readthedocs.io/

## Issues Found
- The AWS CLI instance endpoint query labeled `DBInstanceStatus` as `Role`. `DBInstanceStatus` returns lifecycle status values such as `available`, not writer/reader role. Changed the output label from `Role` to `Status`.
- The Node.js mysql2 analytics pool used a pool-level `timeout: 300000` option and described it as a 5-minute timeout for heavy queries. MySQL2's documented pool configuration includes connection and pool options such as `connectionLimit`, `connectTimeout`, `enableKeepAlive`, and `keepAliveInitialDelay`; a pool-level query timeout is not documented. Removed the misleading option and comment.

## Review Notes
- Aurora reader endpoints balance connections, not individual queries. The post's guidance is accurate, but future revisions could explicitly mention this distinction.
- The post correctly warns about DNS caching. AWS currently documents Aurora DNS zones as using a short TTL and recommends keeping client DNS caching below 30 seconds when clients cache DNS.
