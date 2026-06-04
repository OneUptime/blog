# Validation Summary: How to Configure Database TLS Encryption for In-Transit Data Protection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes StatefulSets, Services, Secrets, ConfigMaps, and Deployments
- cert-manager Certificates, ClusterIssuers, and Helm installation
- PostgreSQL TLS and client certificate verification
- MySQL encrypted connections
- MongoDB TLS configuration
- PrometheusRule certificate expiration alerting

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- PostgreSQL SSL/TLS documentation: https://www.postgresql.org/docs/current/ssl-tcp.html
- PostgreSQL pg_hba.conf client certificate documentation: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- MySQL 8.0 encrypted connection documentation: https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html
- MongoDB 7.0 TLS configuration documentation: https://www.mongodb.com/docs/v7.0/tutorial/configure-ssl/
- MongoDB TLS configuration option reference: https://www.mongodb.com/docs/manual/reference/configuration-options/

## Issues Found
- The cert-manager installation used the older `v1.14.0` chart and manual CRD URL. Updated it to the current documented OCI Helm install pattern with `v1.20.2` and `--set crds.enabled=true`.
- The PostgreSQL section created a client certificate but did not require one in `pg_hba.conf`. Added `clientcert=verify-ca` to the `hostssl` rules so clients must present a trusted certificate.
- The PostgreSQL StatefulSet overrode the image entrypoint with `command: postgres`. Changed it to `args` so the official image entrypoint still performs initialization.
- PostgreSQL and MySQL private key Secret items were mounted as `0600`, which can be unreadable once the official images drop privileges. Added `fsGroup: 999` and changed those key modes to `0640`.
- The MySQL StatefulSet specified `serviceName: mysql` without creating the required governing headless Service. Added the matching `mysql` Service.
- The MongoDB StatefulSet overrode the image entrypoint with `command: mongod`. Changed it to `args` so the official image entrypoint still runs.
- The MongoDB example configured `--tlsCAFile`, which requires client certificates by default, but did not create or pass a MongoDB client certificate. Added `--tlsAllowConnectionsWithoutCertificates` so the example enforces encrypted TLS while matching the provided test command.
- The MongoDB generated PEM file was root-owned and `0600`, which can be unreadable by the MongoDB process. Added `fsGroup: 999`, set the file group, and changed the mode to `0640`.
- The MongoDB StatefulSet specified `serviceName: mongodb` without creating the required governing headless Service. Added the matching `mongodb` Service.
- The PostgreSQL test used `sslmode=require`, did not verify the server hostname, and did not pass a client certificate. Updated it to use `sslmode=verify-full` with certificate, key, and root CA paths.
- The MySQL test inspected server SSL variables rather than proving the session was encrypted. Updated it to connect over the Service DNS name with `--ssl-mode=VERIFY_IDENTITY`, `--ssl-ca`, and `SHOW SESSION STATUS LIKE 'Ssl_cipher';`.

## Review Notes
The examples still assume prerequisite credential Secrets, StorageClass names, database users, and client images are available. For production use, the post could later be expanded with user/Secret creation, automated rollout on certificate renewal, and database-specific hardening choices such as SCRAM for PostgreSQL password authentication.
