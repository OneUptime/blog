# Validation Summary: How to Deploy ActiveMQ Artemis as a High-Performance Message Broker on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache ActiveMQ Artemis / Apache Artemis
- Java 17
- systemd
- Linux shell commands
- AMQP, MQTT, STOMP, and OpenWire messaging protocols

## Sources Consulted
- Apache Artemis download page: https://artemis.apache.org/components/artemis/download/
- Apache Artemis latest "Using the Server" documentation: https://artemis.apache.org/components/artemis/documentation/latest/using-server.html
- Apache Artemis latest "Command Line Interface" documentation: https://artemis.apache.org/components/artemis/documentation/latest/using-cli.html
- Apache archive URL for Artemis 2.33.0: https://archive.apache.org/dist/activemq/activemq-artemis/2.33.0/apache-artemis-2.33.0-bin.tar.gz
- Apache downloads URL for Artemis 2.53.0: https://downloads.apache.org/artemis/artemis/2.53.0/apache-artemis-2.53.0-bin.tar.gz

## Issues Found
- The post used the old fixed download URL `https://downloads.apache.org/activemq/activemq-artemis/2.33.0/apache-artemis-2.33.0-bin.tar.gz`, which now returns 404 from the Apache downloads mirror. I updated the tutorial to use Apache Artemis 2.53.0 from the current Apache downloads path and updated the extracted directory symlink command accordingly.

## Review Notes
- The `artemis create` options in the post, including `--user`, `--password`, `--allow-anonymous`, and `--http-host`, match the current official CLI documentation.
- The web console path `/console/`, default web port `8161`, default broker port `61616`, and the producer/consumer CLI commands are consistent with the official documentation.
- Java 17 is correct for the current Apache Artemis release documented as latest at review time.
