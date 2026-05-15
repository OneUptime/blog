# Validation Summary: How to Install and Configure Apache ActiveMQ on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache ActiveMQ Classic
- Java 17 / OpenJDK
- systemd
- firewalld

## Sources Consulted
- Apache ActiveMQ Classic download page: https://activemq.apache.org/components/classic/download/
- Apache ActiveMQ Classic 6.2.5 release page: https://activemq.apache.org/components/classic/download/classic-06-02-05
- Apache ActiveMQ Classic 6.1.0 release page: https://activemq.apache.org/components/classic/download/classic-06-01-00
- Apache ActiveMQ Classic Getting Started Guide: https://activemq.apache.org/components/classic/documentation/getting-started
- Apache ActiveMQ Classic Web Console documentation: https://activemq.apache.org/components/classic/documentation/web-console
- Apache ActiveMQ Classic command-line tools reference: https://activemq.apache.org/components/classic/documentation/activemq-classic-command-line-tools-reference
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat RHEL 9 OpenJDK guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_compilers-and-development-tools_considerations-in-adopting-rhel-9

## Issues Found
- The post installed Apache ActiveMQ Classic 6.1.0 from `downloads.apache.org`. ActiveMQ Classic 6.1.x is now deprecated, and the specific 6.1.0 artifact is no longer available from the live downloads host. Updated the commands to install ActiveMQ Classic 6.2.5, the current supported 6.2.x release listed by Apache as of this review.
- The extraction command used `tar xz` with piped input. GNU tar can read from standard input, but `tar xzf -` is the explicit and conventional form for a gzip archive streamed from `curl`; updated the command accordingly.

## Review Notes
- The Java 17 requirement is correct for ActiveMQ Classic 6.2.5.
- The web console URL and default `admin/admin` credentials match Apache ActiveMQ Classic documentation.
- The OpenWire and web console firewall commands use valid `firewall-cmd --permanent --add-port=PORT/tcp` syntax. Additional ports would be required only if the administrator exposes AMQP, STOMP, MQTT, or other configured connectors.
