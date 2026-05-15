# Validation Summary: How to Set Up a Multi-Broker Kafka Cluster on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache Kafka
- Kafka KRaft mode
- Java 17
- systemd

## Sources Consulted
- Apache Kafka 3.7 KRaft documentation: https://kafka.apache.org/37/operations/kraft/
- Apache Kafka 3.7 configuration documentation: https://kafka.apache.org/37/configuration/
- Apache Kafka 3.7 `config/kraft/server.properties` sample: https://raw.githubusercontent.com/apache/kafka/3.7/config/kraft/server.properties
- Apache Kafka archive for Kafka 3.7.2 binaries: https://archive.apache.org/dist/kafka/3.7.2/
- Red Hat Streams for Apache Kafka on RHEL documentation: https://docs.redhat.com/en/documentation/red_hat_streams_for_apache_kafka/2.9/html-single/using_streams_for_apache_kafka_on_rhel_in_kraft_mode/index

## Issues Found
- The Kafka download URL used `downloads.apache.org` for Kafka 3.7.0, which now returns 404. Updated the tutorial to Kafka 3.7.2 from the Apache archive so the command points to an available 3.7.x binary.
- The installation commands did not create `/var/lib/kafka/data` or assign it to the `kafka` user. Added directory creation and ownership commands so `kafka-storage.sh format` can write to the configured `log.dirs` path.
- The KRaft configuration omitted `listener.security.protocol.map`. Added `listener.security.protocol.map=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT`, matching Apache Kafka's KRaft sample configuration for named controller listeners.
- The `systemctl enable --now kafka` command assumed a `kafka.service` unit existed, but the Apache Kafka tarball does not install one. Added a minimal systemd unit before enabling the service.
- The verification command used `kafka-metadata.sh`, which is not the documented Kafka 3.7 metadata inspection tool. Replaced it with `kafka-metadata-quorum.sh --bootstrap-server node1:9092 describe --status`, which is documented for checking the KRaft metadata quorum.
- The conclusion described the combined broker/controller setup as the minimum recommended production deployment. Apache Kafka documentation says combined mode is for small or development-style deployments and should be avoided for critical deployments, so the conclusion now recommends dedicated controllers for critical production use.

## Review Notes
Kafka 3.7.x is an older release line as of this review date. The tutorial is now technically consistent for Kafka 3.7.x, but a future revision could update the guide to the current Kafka release and its current KRaft quorum configuration guidance.
