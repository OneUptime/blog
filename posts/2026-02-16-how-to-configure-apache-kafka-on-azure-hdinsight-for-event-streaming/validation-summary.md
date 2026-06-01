# Validation Summary: How to Configure Apache Kafka on Azure HDInsight for Event Streaming

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Kafka
- Azure HDInsight
- Azure CLI
- Azure Virtual Network
- Apache Ambari REST API
- kafka-python

## Sources Consulted
- Microsoft Learn: Azure CLI `az hdinsight create` reference - https://learn.microsoft.com/en-us/cli/azure/hdinsight?view=azure-cli-latest
- Microsoft Learn: HDInsight 5.x component versions - https://learn.microsoft.com/en-us/azure/hdinsight/hdinsight-5x-component-versioning
- Microsoft Learn: Quickstart: Set up Apache Kafka on HDInsight - https://learn.microsoft.com/en-us/azure/hdinsight/kafka/apache-kafka-get-started
- Microsoft Learn: Connect to Apache Kafka using virtual networks - https://learn.microsoft.com/en-us/azure/hdinsight/kafka/apache-kafka-connect-vpn-gateway
- Microsoft Learn: Create an Apache Kafka REST proxy enabled cluster in HDInsight using Azure CLI - https://learn.microsoft.com/en-us/azure/hdinsight/kafka/tutorial-cli-rest-proxy
- Microsoft Learn: Configure Apache Kafka policies in HDInsight with Enterprise Security Package - https://learn.microsoft.com/en-us/azure/hdinsight/domain-joined/apache-domain-joined-run-kafka
- Apache Kafka 3.2 documentation - https://kafka.apache.org/32/documentation/
- kafka-python KafkaProducer documentation - https://kafka-python.readthedocs.io/en/2.0.4/apidoc/KafkaProducer.html

## Issues Found
- The cluster creation examples used `--storage-default-container`, which is not a current `az hdinsight create` option. Changed it to `--storage-container`, matching the Azure CLI documentation.
- The cluster examples specified `Kafka=2.4` without an HDInsight version. Kafka 2.4.1 maps to HDInsight 5.0, which reached retirement on March 31, 2025. Updated the examples to `--version 5.1` and `--component-version kafka=3.2`, matching the currently documented HDInsight 5.1 Kafka component version.
- The broker-list extraction command used the Ambari JSON path `Hosts.host_name`. Microsoft examples for the same KAFKA_BROKER endpoint use `host_components[].HostRoles.host_name`. Updated the Python command accordingly and used `python3`.
- The networking section suggested advertising public Kafka broker IP addresses. Azure HDInsight documentation emphasizes same-VNet access, VPN/peering/ExpressRoute style private connectivity, and Kafka REST Proxy for HTTP access. Replaced the public-IP suggestion with Kafka REST Proxy.

## Review Notes
The Kafka topic, producer, consumer, retention, and compaction commands align with HDInsight and Apache Kafka documentation. Azure CLI was not installed in the local environment, so CLI validation was performed against Microsoft Learn rather than local `az --help` output.
