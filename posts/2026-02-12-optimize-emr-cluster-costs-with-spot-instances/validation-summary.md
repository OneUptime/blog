# Validation Summary: How to Optimize EMR Cluster Costs with Spot Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EMR
- Amazon EC2 Spot Instances
- AWS CLI
- EMR instance groups and instance fleets
- EMR managed scaling
- Apache Spark on YARN
- CloudWatch and AWS cost allocation tags

## Sources Consulted
- AWS CLI Command Reference: `emr create-cluster` - https://docs.aws.amazon.com/cli/latest/reference/emr/create-cluster.html
- AWS CLI Command Reference: `emr add-tags` - https://docs.aws.amazon.com/cli/latest/reference/emr/add-tags.html
- AWS CLI Command Reference: `ec2 describe-spot-price-history` - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/describe-spot-price-history.html
- Amazon EMR Management Guide: instance fleets and allocation strategies - https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-instance-fleet.html
- Amazon EMR Management Guide: uniform instance groups - https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-uniform-instance-group.html
- Amazon EMR API Reference: `SpotProvisioningSpecification` - https://docs.aws.amazon.com/emr/latest/APIReference/API_SpotProvisioningSpecification.html
- Amazon EMR API Reference: `ComputeLimits` - https://docs.aws.amazon.com/emr/latest/APIReference/API_ComputeLimits.html
- Amazon EMR Management Guide: managed scaling - https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-managed-scaling.html
- Amazon EMR Release Guide: EMR 7.0.0 - https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-700-release.html
- Amazon EC2 User Guide: Spot interruption notices - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html
- Amazon EC2 User Guide: Spot best practices - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html
- Apache Spark 3.5.4 Configuration - https://spark.apache.org/docs/3.5.4/configuration.html
- Apache Spark 3.5.0 Core Migration Guide - https://archive.apache.org/dist/spark/docs/3.5.0/core-migration-guide.html
- Amazon EC2 On-Demand Pricing - https://aws.amazon.com/ec2/pricing/on-demand/
- Amazon EMR Pricing - https://aws.amazon.com/emr/pricing/

## Issues Found
- The introduction described Spot Instances as something users "bid" on. AWS now describes Spot as spare EC2 capacity requested at Spot prices, with optional maximum prices. Changed the wording to "request unused EC2 capacity."
- The cost example did not state its pricing scope and could be read as a full EMR bill. Clarified that the $7.68/hour figure is us-east-1 EC2 compute only and excludes EMR service charges, EBS, S3 storage, and data transfer.
- The instance fleet example and best-practice text used `capacity-optimized`. For EMR 7-era releases, AWS recommends and defaults to `price-capacity-optimized` for Spot allocation. Updated the fleet configuration, explanation, cost table label, and checklist wording.
- The Spark shuffle-service explanation overstated resilience after node loss. External shuffle service preserves shuffle files after executor exit only while the node running the service remains available; decommissioning is what attempts migration before termination. Updated the explanation accordingly.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI/API documentation and by parsing the JSON payloads with `jq`.
- The example commands use placeholder values such as `my-keypair`, `s3://my-emr-logs/clusters/`, and `j-XXXXXXXXXXXXX`; these must be replaced with real account resources before execution.
- The cost table remains an illustrative estimate because EC2 Spot prices vary by Region, Availability Zone, instance pool, and time.
