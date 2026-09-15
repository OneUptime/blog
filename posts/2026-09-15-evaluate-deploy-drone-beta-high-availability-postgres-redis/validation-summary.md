# Validation Summary: How to Evaluate and Deploy Drone's Beta High-Availability Mode with PostgreSQL, Redis, and a Load Balancer

## Status
validated

## Post Type
Technical deployment and evaluation guide

## Technologies Covered

- Drone server and runners
- Drone beta high-availability mode
- PostgreSQL
- Redis
- HAProxy
- TLS and certificate verification
- Failure testing and recovery planning

## Sources Consulted

- [Drone high-availability overview](https://docs.drone.io/server/ha/overview/)
- [Drone HA local development setup](https://docs.drone.io/server/ha/developer-setup/)
- [Drone database documentation](https://docs.drone.io/server/storage/database/)
- [Drone database datasource reference](https://docs.drone.io/server/reference/drone-database-datasource/)
- [Drone database encryption documentation](https://docs.drone.io/server/storage/encryption/)
- [Drone cookie documentation](https://docs.drone.io/server/cookie/)
- [Drone Docker runner installation documentation](https://docs.drone.io/runner/docker/installation/linux/)
- [PostgreSQL connection-string documentation](https://www.postgresql.org/docs/18/libpq-connect.html)
- [PostgreSQL SSL documentation](https://www.postgresql.org/docs/18/libpq-ssl.html)
- [HAProxy backend configuration guide](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/backends/)
- [HAProxy health-check documentation](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [HAProxy server-side encryption documentation](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/server-side-encryption/)

## Issues Found
No technical issues found.

## Review Notes
Drone's official documentation still labels high availability as Beta and says it may not be suitable for production workloads. The official database page still states PostgreSQL 9.6 as its minimum, but PostgreSQL 9.6 is obsolete; the post correctly advises using a supported database release instead. Redis authentication and encrypted-transport capabilities can vary with the exact Drone build and Redis client, so the post appropriately requires version-specific verification. The HAProxy example is a valid basic configuration, and its TCP-only health-check limitation is correctly identified.
