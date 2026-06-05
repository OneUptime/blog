# Validation Summary: How to Use SQLCommenter to Correlate Application Traces with Database Query Logs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- SQLCommenter
- OpenTelemetry
- Django
- Node.js
- Sequelize
- Express
- Java
- Hibernate
- Spring Boot JPA
- PostgreSQL
- MySQL Performance Schema
- W3C Trace Context

## Sources Consulted
- OpenTelemetry SQLCommenter Django documentation: https://open-telemetry.github.io/opentelemetry-sqlcommenter/python/django/
- OpenTelemetry SQLCommenter Django middleware source: https://github.com/open-telemetry/opentelemetry-sqlcommenter/blob/main/python/sqlcommenter-python/opentelemetry/sqlcommenter/django/middleware.py
- OpenTelemetry SQLCommenter Django OpenTelemetry helper source: https://github.com/open-telemetry/opentelemetry-sqlcommenter/blob/main/python/sqlcommenter-python/opentelemetry/sqlcommenter/opentelemetry.py
- OpenTelemetry SQLCommenter Sequelize documentation: https://open-telemetry.github.io/opentelemetry-sqlcommenter/node-js/sequelize/
- OpenTelemetry SQLCommenter Sequelize source: https://github.com/open-telemetry/opentelemetry-sqlcommenter/blob/main/nodejs/sqlcommenter-nodejs/packages/sqlcommenter-sequelize/index.js
- OpenTelemetry SQLCommenter Hibernate documentation: https://open-telemetry.github.io/opentelemetry-sqlcommenter/java/hibernate/
- OpenTelemetry SQLCommenter Hibernate source: https://github.com/open-telemetry/opentelemetry-sqlcommenter/blob/main/java/sqlcommenter-java/src/main/java/io/opentelemetry/sqlcommenter/schibernate/SCHibernate.java
- OpenTelemetry JavaScript Node SDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- PostgreSQL logging configuration documentation: https://www.postgresql.org/docs/current/runtime-config-logging.html
- MySQL Performance Schema events_statements_history_long documentation: https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-statements-history-long-table.html
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The Django middleware path used the older Google package path. Changed it to `opentelemetry.sqlcommenter.django.middleware.SqlCommenter`.
- The Django settings included non-existent or inaccurate flags such as `SQLCOMMENTER_WITH_DJANGO`. Replaced them with source-supported flags: `SQLCOMMENTER_WITH_CONTROLLER`, `SQLCOMMENTER_WITH_FRAMEWORK`, `SQLCOMMENTER_WITH_ROUTE`, `SQLCOMMENTER_WITH_APP_NAME`, `SQLCOMMENTER_WITH_OPENTELEMETRY`, and `SQLCOMMENTER_WITH_DB_DRIVER`.
- The Django output example put the SQL comment before the query and used an unsupported `application` field. Updated the example to append the comment and use documented fields, including `traceparent`.
- The sequence diagram used an invalid W3C `traceparent` value and an unsupported `app` field. Replaced it with a valid traceparent-shaped value and a route field.
- The Node.js example used the wrong package name, `@google-cloud/sqlcommenter-sequelize`. Changed it to `@opentelemetry/sqlcommenter-sequelize`.
- The Sequelize middleware example passed options in the wrong shape and used incorrect field names such as `dbDriver` and `application`. Updated it to use the documented `include` object and `{ TraceProvider: "OpenTelemetry" }`.
- The OpenTelemetry JavaScript example used older APIs such as direct `NodeTracerProvider` setup and `addSpanProcessor`. Replaced it with the current `@opentelemetry/sdk-node` `NodeSDK` setup.
- The Java Hibernate example referenced a non-existent `SCHibernate6StatementInspector` class under the old Google package. Updated it to `io.opentelemetry.sqlcommenter.schibernate.SCHibernate`.
- The performance section claimed zero execution impact. Adjusted it to state that comments are ignored for execution but still add transmitted, parsed, and logged SQL text.
- The SQL comment explanation said everything after `/*` is a comment. Corrected it to say the comment is the text between `/*` and `*/`.

## Review Notes
The hosted OpenTelemetry SQLCommenter Django docs are partially stale and still mention OpenCensus in places, but the current repository source supports `SQLCOMMENTER_WITH_OPENTELEMETRY`. The Node SQLCommenter package documentation examples are older than current OpenTelemetry JS SDK guidance, so the tracing setup was aligned with the current OpenTelemetry Node SDK documentation.
