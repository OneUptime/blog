# Validation Summary: How to Bind Azure Spring Apps to Azure Database for MySQL and Redis Cache

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Spring Apps
- Azure Service Connector
- Azure Database for MySQL Flexible Server
- Azure Cache for Redis
- Azure CLI
- Spring Boot
- Spring Data JPA
- Spring Data Redis
- HikariCP
- Java
- Maven

## Sources Consulted
- Azure Spring Apps retirement announcement: https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/retirement-announcement
- Azure Spring Apps Redis binding documentation: https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-bind-redis
- Service Connector Redis integration documentation: https://learn.microsoft.com/en-us/azure/service-connector/how-to-integrate-redis-cache
- Service Connector MySQL integration documentation: https://learn.microsoft.com/en-us/azure/service-connector/how-to-integrate-mysql
- Azure CLI `az spring connection` documentation: https://learn.microsoft.com/en-us/cli/azure/spring/connection
- Azure CLI `az spring connection create` documentation: https://learn.microsoft.com/en-us/cli/azure/spring/connection/create
- Azure CLI `az mysql flexible-server` documentation: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server
- Azure CLI `az redis create` documentation: https://learn.microsoft.com/en-us/cli/azure/redis
- Spring Boot common application properties: https://docs.spring.io/spring-boot/appendix/application-properties/
- Spring Boot RedisProperties API: https://docs.spring.io/spring-boot/api/java/org/springframework/boot/autoconfigure/data/redis/RedisProperties.html
- Spring Boot 3.0 migration guide: https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide

## Issues Found
- Azure Spring Apps lifecycle context was missing. The post now notes that Azure Spring Apps entered retirement on March 17, 2025 and retires on March 31, 2028, so the tutorial is framed for existing workloads.
- The Redis service connection command omitted the `--secret` authentication option. Added it because Service Connector's Spring Boot client support for Azure Cache for Redis currently uses secret or connection string authentication.
- The connection validation examples used hardcoded connection names that were not created by the earlier commands. Added explicit `--connection` names to the MySQL and Redis creation commands and updated the validation commands to use those names.
- The Redis property list omitted `spring.redis.database`, which Service Connector documents for Redis connection string authentication. Added it to match the `--database 0` binding.
- The manual Redis environment variable names used `SPRING_REDIS_*`, while current Spring Boot uses `spring.data.redis.*`. Updated the manual configuration example to `SPRING_DATA_REDIS_*` names.
- The managed identity guidance implied that both MySQL and Redis Spring Boot bindings could be made passwordless. Updated the wording to state that MySQL can use managed identity, while Redis with Spring Boot currently uses secret or connection string authentication through Service Connector.

## Review Notes
- The Azure CLI `az spring` command group is currently marked deprecated because Azure Spring Apps is in retirement, but the documented commands still exist for supported existing workloads.
- Azure's Service Connector Redis documentation still lists `spring.redis.*` application properties for Spring Boot service bindings, while current Spring Boot documentation uses `spring.data.redis.*` for manual configuration. The post now preserves the Service Connector property names for the binding section and uses current Spring Boot names in the manual configuration section.
