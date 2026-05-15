# Validation Summary: How to Deploy ActiveMQ Artemis as a High-Performance Message Broker on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Apache ActiveMQ Artemis 2.33.0
- Java 17
- systemd
- firewalld
- JMS and messaging protocols including AMQP, STOMP, MQTT, and OpenWire

## Sources Consulted
- Apache ActiveMQ Artemis 2.33.0 Command Line Interface documentation: https://activemq.apache.org/components/artemis/documentation/2.33.0/using-cli.html
- Apache ActiveMQ Artemis 2.33.0 Configuration Reference: https://activemq.apache.org/components/artemis/documentation/2.33.0/configuration-index.html
- Apache ActiveMQ Artemis 2.33.0 Configuring the Transport documentation: https://activemq.apache.org/components/artemis/documentation/2.33.0/configuring-transports.html
- Apache ActiveMQ Artemis 2.33.0 Persistence documentation: https://activemq.apache.org/components/artemis/documentation/2.33.0/persistence.html
- Apache Archive distribution directory for ActiveMQ Artemis 2.33.0: https://archive.apache.org/dist/activemq/activemq-artemis/2.33.0/
- ActiveMQ Artemis 2.33.0 CLI package help metadata from the official binary distribution.

## Issues Found
- The download URL used `downloads.apache.org` for the fixed 2.33.0 tarball, but that host no longer serves this older release and returns 404. Changed the command to use the Apache archive URL for ActiveMQ Artemis 2.33.0.

## Review Notes
- The `artemis create` flags used in the post are valid for Artemis 2.33.0, including `--user`, `--password`, `--role`, `--allow-anonymous`, and `--http-host`.
- The acceptor parameters, address settings, CLI producer/consumer destination syntax, and journal persistence explanation match the Artemis 2.33.0 documentation.
- For production, `--allow-anonymous` and a simple `admin123` password are only suitable for a tutorial or controlled test environment.
