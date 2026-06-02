# Validation Summary: How to Set Up Keyspaces On-Demand vs Provisioned Capacity

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Keyspaces for Apache Cassandra
- AWS CLI
- Application Auto Scaling
- Amazon CloudWatch
- Python DataStax Cassandra driver
- SigV4 authentication for Amazon Keyspaces

## Sources Consulted
- Amazon Keyspaces AWS CLI create-table command reference: https://docs.aws.amazon.com/cli/latest/reference/keyspaces/create-table.html
- Amazon Keyspaces on-demand capacity mode documentation: https://docs.aws.amazon.com/keyspaces/latest/devguide/ReadWriteCapacityMode.OnDemand.html
- Amazon Keyspaces capacity mode switching documentation: https://docs.aws.amazon.com/keyspaces/latest/devguide/ReadWriteCapacityMode.SwitchReadWriteCapacityMode.html
- Amazon Keyspaces Python driver documentation: https://docs.aws.amazon.com/keyspaces/latest/devguide/using_python_driver.html
- Application Auto Scaling integration for Amazon Keyspaces: https://docs.aws.amazon.com/autoscaling/application/userguide/services-that-can-integrate-keyspaces.html
- Application Auto Scaling put-scaling-policy command reference: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/put-scaling-policy.html
- Amazon Keyspaces auto scaling documentation: https://docs.aws.amazon.com/keyspaces/latest/devguide/autoscaling.html
- Amazon Keyspaces CloudWatch metrics and dimensions: https://docs.aws.amazon.com/keyspaces/latest/devguide/metrics-dimensions.html
- Amazon Keyspaces pricing page: https://aws.amazon.com/keyspaces/pricing/
- AWS Price List API for AmazonMCS us-east-1 pricing: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonMCS/current/us-east-1/index.json
- AWS Database Savings Plans pricing: https://aws.amazon.com/savingsplans/database-pricing

## Issues Found
- The post described on-demand scaling as handling any burst instantly. Updated wording to match AWS documentation: on-demand capacity instantly accommodates up to double the previous peak, with automatic scaling beyond that and possible insufficient throughput if the table exceeds double its previous peak within 30 minutes.
- The Python snippet used an older single Starfield certificate file and omitted the `datetime` import. Updated it to use a combined `keyspaces-bundle.pem`, `ssl.create_default_context`, and timezone-aware `datetime.now(timezone.utc)`.
- The on-demand cost examples used outdated us-east-1 Keyspaces prices. Updated the examples to use current AWS Price List API rates of $0.125 per million RRUs and $0.625 per million WRUs, and recalculated the totals.
- The throttling alarm used a non-existent `ThrottledRequests` metric. Replaced it with the documented `ReadThrottleEvents` metric and added the required `Operation=SELECT` dimension.
- The auto-scaling timing note claimed scaling reacts in 1-2 minutes. Updated it to match AWS documentation that Keyspaces auto scaling modifies provisioned throughput only after workload changes are sustained for several minutes.
- The capacity mode switching note said modes can be switched once every 24 hours. Updated it to clarify that switching from on-demand to provisioned can be done at any time, while switching from provisioned to on-demand is limited to once in 24 hours.
- The decision framework referenced Reserved Capacity. Updated it to Database Savings Plans, which the current Amazon Keyspaces pricing page documents for committed usage discounts.
- The idle-period note implied all on-demand costs are zero without traffic. Clarified that this applies to read/write throughput, since storage and other features can still incur charges.

## Review Notes
The AWS CLI command shapes, Keyspaces capacity-specification fields, Application Auto Scaling service namespace, scalable dimensions, predefined metric names, and CloudWatch consumed capacity metrics were validated against official AWS documentation. The AWS CLI was not installed in the local environment, so command verification was performed against official AWS CLI references and AWS documentation rather than local `aws --help` output.
