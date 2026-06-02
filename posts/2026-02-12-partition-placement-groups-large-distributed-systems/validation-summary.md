# Validation Summary: How to Use Partition Placement Groups for Large Distributed Systems

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS EC2 partition placement groups
- AWS CLI
- EC2 Instance Metadata Service
- Terraform AWS provider
- Apache Cassandra rack-aware configuration
- Apache Hadoop HDFS rack awareness
- Apache Kafka broker rack awareness

## Sources Consulted
- AWS EC2 User Guide: Placement strategies for placement groups - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-strategies.html
- AWS EC2 User Guide: Instance metadata categories - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
- AWS CLI Command Reference: create-placement-group - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-placement-group.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Terraform Registry: aws_placement_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/placement_group
- Terraform Registry: aws_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Apache Cassandra Documentation: cassandra-rackdc.properties file - https://cassandra.apache.org/doc/stable/cassandra/managing/configuration/cass_rackdc_file.html
- Apache Hadoop Documentation: Rack Awareness - https://hadoop.apache.org/docs/r3.3.6/hadoop-project-dist/hadoop-common/RackAwareness.html
- Apache Kafka Documentation: Balancing Replicas Across Racks - https://kafka.apache.org/0100/operations/basic-kafka-operations/
- Apache Kafka Documentation: broker.rack broker config - https://kafka.apache.org/40/configuration/broker-configs/

## Issues Found
- Clarified the EC2 partition placement group hardware guarantee. AWS documents that different partitions do not share the same racks; the post previously said instances in different partitions are guaranteed to be on different racks, which was close but less precise.
- Replaced "each partition can hold as many instances as you want" with the official limitation that instance count is constrained by account limits and available distinct hardware.
- Changed the AWS auto-assignment wording from "AWS distributes instances" to "AWS tries to distribute instances evenly" because AWS does not guarantee perfectly even partition distribution.
- Clarified the Cassandra section to require a rack-aware snitch such as `GossipingPropertyFileSnitch` and `NetworkTopologyStrategy`, since Cassandra only uses the `cassandra-rackdc.properties` rack mapping for rack-aware snitches and rack-aware replica placement depends on an appropriate replication strategy.

## Review Notes
The AWS CLI and Terraform snippets use current option and attribute names. The HDFS and Kafka rack-awareness examples match the official configuration concepts. The AWS CLI and Terraform binaries were not installed locally, so command syntax was validated against official documentation instead of local `--help` output.
