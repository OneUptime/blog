# Validation Summary: How to Install and Configure Apache ActiveMQ on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Apache ActiveMQ Classic
- Jakarta Messaging / JMS
- Java / OpenJDK 17
- systemd
- firewalld
- Jolokia

## Sources Consulted
- Apache ActiveMQ Classic download page: https://activemq.apache.org/components/classic/download/
- Apache ActiveMQ Classic 6.1.0 release page: https://activemq.apache.org/components/classic/download/classic-06-01-00
- Apache ActiveMQ Classic getting started guide: https://activemq.apache.org/components/classic/documentation/getting-started
- Apache ActiveMQ Classic 6.0 feature and requirement notes: https://activemq.apache.org/components/classic/documentation/new-features-in-60
- Apache ActiveMQ Classic 6.2.5 binary distribution files, including `conf/activemq.xml`, `conf/login.config`, `conf/users.properties`, `conf/groups.properties`, `conf/jetty.xml`, and bundled CLI help text in `activemq-console-6.2.5.jar`
- Red Hat OpenJDK 17 installation documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_openjdk/17/html/installing_and_using_red_hat_build_of_openjdk_17_on_rhel/installing-openjdk-on-rhel_openjdk
- firewalld `firewall-cmd` manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post downloaded ActiveMQ Classic 6.1.0 from `downloads.apache.org`. That release is now archived, and the URL returns 404. Updated the tutorial to use ActiveMQ Classic 6.2.5, the current supported 6.2.x release listed by the official ActiveMQ download page.
- The post described ActiveMQ Classic as a JMS-compliant broker. ActiveMQ Classic 6.x uses Jakarta Messaging / JMS APIs, with partial JMS 2.0 operations support in Jakarta Messaging 3.1, so the description was adjusted to "Jakarta Messaging/JMS-compatible."
- The authentication section referenced `/opt/activemq/conf/jetty-realm.properties`, which is not present in ActiveMQ Classic 6.x. The 6.x distribution uses JAAS with `users.properties` and `groups.properties`, so the credential examples were updated to those files and formats.

## Review Notes
The transport connector ports, default KahaDB persistence adapter, web console port, default `admin/admin` credentials, Jolokia `/api/jolokia` path, systemd service shape, `firewall-cmd --add-port --permanent` usage, and `activemq producer` / `activemq consumer` options were checked and are technically consistent with ActiveMQ Classic 6.2.5 and RHEL tooling. Production deployments should still verify Apache release checksums/signatures and tune storage, memory, authentication, and network exposure beyond this introductory guide.
