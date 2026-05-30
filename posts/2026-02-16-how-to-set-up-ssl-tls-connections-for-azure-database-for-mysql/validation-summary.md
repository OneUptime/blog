# Validation Summary: How to Set Up SSL/TLS Connections for Azure Database for MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for MySQL Flexible Server
- Azure CLI
- MySQL client TLS/SSL options
- MySQL Connector/Python
- Node.js mysql2
- MySQL Connector/J
- MySQL Connector/NET
- OpenSSL and keytool

## Sources Consulted
- Microsoft Learn: Transport Layer Security (TLS) in Azure Database for MySQL, https://learn.microsoft.com/en-us/azure/mysql/flexible-server/security-tls
- Microsoft Learn: Connect to Azure Database for MySQL - Flexible Server with encrypted connections, https://learn.microsoft.com/en-us/azure/mysql/flexible-server/security-tls-how-to-connect
- Microsoft Learn Azure CLI reference: az mysql flexible-server parameter, https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/parameter
- MySQL Reference Manual: Command Options for Connecting to the Server, https://dev.mysql.com/doc/refman/9.2/en/connection-options.html
- MySQL Connector/Python Developer Guide: Connection Arguments, https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html
- mysql2 project documentation: SSL, https://sidorares.github.io/node-mysql2/docs/documentation/ssl
- MySQL Connector/J Developer Guide: Security connection properties, https://dev.mysql.com/doc/connector-j/en/connector-j-connp-props-security.html
- MySQL Connector/J Developer Guide: Setting up Server Authentication, https://dev.mysql.com/doc/connector-j/en/connector-j-server-authentication.html
- MySQL Connector/NET Developer Guide: Connection Options Reference, https://dev.mysql.com/doc/connector-net/en/connector-net-8-0-connection-options.html
- Microsoft PKI repository, https://www.microsoft.com/pkiops/docs/repository.htm

## Issues Found
- The post stated that Azure Database for MySQL uses only the DigiCert Global Root G2 certificate. Microsoft currently documents Azure Database for MySQL certificate chains anchored by both DigiCert Global Root G2 and Microsoft RSA Root CA 2017, so I updated the explanation and examples to use a combined CA bundle.
- The CA download example used only one root certificate. I added the Microsoft RSA Root CA 2017 download and PEM conversion, then updated client examples to reference the combined bundle.
- The TLS version command used `TLSv1.2`. Microsoft documentation describes the Azure server parameter value as `TLS 1.2`, so I updated the CLI example accordingly.
- The TLS section did not mention the current Microsoft recommendation that TLS 1.3 is preferred for MySQL Flexible Server version 8.0 and later. I added that caveat without restructuring the section.
- The Java Connector/J example used deprecated legacy properties (`useSSL`, `requireSSL`, and `verifyServerCertificate`). I changed it to the current `sslMode=VERIFY_IDENTITY` property and updated the truststore import to include both root CAs.
- The certificate rotation section implied that only the leaf certificate changes and that the CA always remains DigiCert Global Root G2. I corrected this to reflect Azure's documented routine intermediate CA and server certificate rotations, while keeping the recommendation against certificate pinning.

## Review Notes
- The MySQL client `--ssl-mode` table and the Python, Node.js, and .NET examples are aligned with official connector behavior after the CA bundle path updates.
- The Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn rather than local `az --help` output.
