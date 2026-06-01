# Validation Summary: How to Use Neptune Serverless

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Neptune Serverless
- AWS CLI
- Amazon VPC and security groups
- CloudWatch metrics and alarms
- Gremlin with Python
- openCypher with Python HTTP requests
- Neptune bulk loader with Amazon S3

## Sources Consulted
- Amazon Neptune Serverless overview: https://docs.aws.amazon.com/neptune/latest/userguide/neptune-serverless.html
- Capacity scaling in a Neptune Serverless DB cluster: https://docs.aws.amazon.com/neptune/latest/userguide/neptune-serverless-capacity-scaling.html
- Using Amazon Neptune Serverless: https://docs.aws.amazon.com/neptune/latest/userguide/neptune-serverless-using.html
- AWS CLI create-db-cluster command reference: https://docs.aws.amazon.com/cli/latest/reference/neptune/create-db-cluster.html
- Amazon Neptune openCypher HTTPS endpoint: https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-opencypher-queries.html
- Examples of openCypher parameterized queries: https://docs.aws.amazon.com/neptune/latest/userguide/opencypher-parameterized-queries.html
- openCypher specification compliance in Amazon Neptune: https://docs.aws.amazon.com/neptune/latest/userguide/feature-opencypher-compliance.html
- Accessing a Neptune graph with Gremlin: https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-gremlin.html
- Gremlin standards compliance in Amazon Neptune: https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-gremlin-differences.html
- Connecting to Neptune using IAM authentication: https://docs.aws.amazon.com/neptune/latest/userguide/iam-auth-connecting.html
- Neptune bulk load example: https://docs.aws.amazon.com/neptune/latest/userguide/bulk-load-data.html
- Adding the IAM role to a Neptune cluster: https://docs.aws.amazon.com/neptune/latest/userguide/bulk-load-tutorial-IAM-add-role-cluster.html
- AWS CLI add-role-to-db-cluster command reference: https://docs.aws.amazon.com/cli/latest/reference/neptune/add-role-to-db-cluster.html

## Issues Found
- The cluster creation command enabled IAM database authentication, but the Gremlin, openCypher, and loader examples did not sign requests with AWS Signature Version 4. Removed `--iam-database-authentication-enabled` so the examples are internally consistent. If IAM auth is enabled, those client examples need SigV4 signing.
- The autoscaling trigger list included concurrent connections and query complexity as direct scaling inputs. AWS documents Neptune Serverless as tracking CPU, memory, and network utilization, so the list was changed to network utilization and overall query workload.
- The openCypher Python helper posted JSON with a Python object in `parameters`. Neptune's documented HTTPS endpoint examples use form fields, with `parameters` serialized as JSON text. Updated the helper to send `data=payload`, serialize parameters with `json.dumps`, and call `raise_for_status()`.
- The openCypher path example used `shortestPath()`, which Neptune openCypher does not currently support. Replaced it with a bounded variable-length path query ordered by `length(path)` with a static `LIMIT 1`.
- The recommendation example used `LIMIT $limit`. Neptune openCypher does not support non-static values for `LIMIT`, so the code now converts `limit` to an integer and interpolates it as a literal while keeping `userId` parameterized.
- The bulk loader example supplied an `iamRoleArn` but did not attach that role to the Neptune DB cluster. Added the required `aws neptune add-role-to-db-cluster` command before starting the loader.

## Review Notes
- The examples assume they are run from a host that can reach the Neptune VPC endpoint, such as an EC2 instance in the same VPC or a connected private network.
- The AWS CLI was not installed in the local environment, so CLI verification was performed against the official AWS CLI command reference instead of local `--help` output.
