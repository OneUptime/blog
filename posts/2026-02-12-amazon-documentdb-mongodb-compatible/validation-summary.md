# Validation Summary: How to Set Up Amazon DocumentDB (MongoDB-Compatible)

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Amazon DocumentDB
- MongoDB API, MongoDB shell, and MongoDB drivers
- AWS CLI
- AWS CloudFormation
- Python and PyMongo
- Node.js MongoDB driver
- Amazon CloudWatch

## Sources Consulted
- Amazon DocumentDB compatibility with MongoDB: https://docs.aws.amazon.com/documentdb/latest/developerguide/compatibility.html
- Supported MongoDB APIs, operations, and data types in Amazon DocumentDB: https://docs.aws.amazon.com/documentdb/latest/developerguide/mongo-apis.html
- Amazon DocumentDB how it works: https://docs.aws.amazon.com/documentdb/latest/developerguide/how-it-works.html
- Connecting programmatically to Amazon DocumentDB: https://docs.aws.amazon.com/documentdb/latest/developerguide/connect_programmatically.html
- Using change streams with Amazon DocumentDB: https://docs.aws.amazon.com/documentdb/latest/developerguide/change_streams.html
- Profiling Amazon DocumentDB operations: https://docs.aws.amazon.com/documentdb/latest/developerguide/profiling.html
- Amazon DocumentDB cluster parameters reference: https://docs.aws.amazon.com/documentdb/latest/developerguide/cluster_parameter_groups-list_of_parameters.html
- Amazon DocumentDB text indexes: https://docs.aws.amazon.com/documentdb/latest/developerguide/indexes-text.html
- Amazon DocumentDB TTL index property: https://docs.aws.amazon.com/documentdb/latest/developerguide/index-property-expireafterseconds.html
- AWS CloudFormation AWS::DocDB::DBCluster reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-docdb-dbcluster.html
- AWS CloudFormation AWS::DocDB::DBInstance reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-docdb-dbinstance.html
- Amazon DocumentDB Extended Support: https://docs.aws.amazon.com/documentdb/latest/developerguide/extended-support.html

## Issues Found
- The post listed MongoDB 3.6, 4.0, and 5.0 compatibility but omitted MongoDB 8.0 and did not mention that DocumentDB 3.6 standard support ended on March 30, 2026. Updated the compatibility wording to include 4.0, 5.0, and 8.0, with a 3.6 Extended Support note.
- The post said Amazon DocumentDB does not support client-side field-level encryption. AWS documents client-side FLE support with limitations, so the unsupported-feature example was changed to retryable writes.
- The shell example used the older `mongo` shell. Updated it to current `mongosh` syntax and included `--retryWrites false`, matching AWS guidance for Amazon DocumentDB.
- The Python and Node.js connection strings omitted the documented `replicaSet=rs0` and `readPreference=secondaryPreferred` options. Added them while preserving `retryWrites=false`.
- The parameter-group section labeled a retention-duration change as enabling change streams. Changed the comment to describe it as setting change stream log retention.
- The profiler example enabled profiler parameters but did not enable CloudWatch profiler log export on the cluster. Added `--enable-cloudwatch-logs-exports profiler` to the cluster modification command.

## Review Notes
The CloudFormation template is structurally valid for the shown DocumentDB resources, but a real production stack would normally include VPC security groups, deletion protection, log exports, explicit engine version pinning, and secret management rather than a plain password parameter.
