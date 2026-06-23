# Validation Summary: How to Write Integration Tests for Node.js APIs with Testcontainers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- Testcontainers for Node.js
- PostgreSQL
- Redis
- Express
- Supertest
- Docker and Docker Compose
- Apache Kafka / Confluent Platform Docker image
- Elasticsearch
- Jest
- GitHub Actions
- Faker

## Sources Consulted
- Testcontainers for Node.js install documentation: https://node.testcontainers.org/quickstart/install/
- Testcontainers for Node.js PostgreSQL module documentation: https://node.testcontainers.org/modules/postgresql/
- Testcontainers for Node.js containers documentation: https://node.testcontainers.org/features/containers/
- Testcontainers for Node.js Docker Compose documentation: https://node.testcontainers.org/features/compose/
- Testcontainers for Node.js wait strategies documentation: https://node.testcontainers.org/features/wait-strategies/
- Testcontainers for Node.js configuration documentation: https://node.testcontainers.org/configuration/
- Confluent Platform Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- GitHub-hosted runners documentation: https://docs.github.com/actions/using-github-hosted-runners/about-github-hosted-runners
- Docker Compose specification: https://docs.docker.com/reference/compose-file/

## Issues Found
- The setup command installed `testcontainers` but omitted `@testcontainers/postgresql`, even though the PostgreSQL examples import `PostgreSqlContainer` from that package. Updated the install command to include `@testcontainers/postgresql`.
- The Docker Compose Testcontainers example used service names (`postgres`, `redis`, `kafka`) for `withWaitStrategy()` and `getContainer()`. Current Testcontainers for Node.js expects compose container names, typically `<service>-1` for the first replica. Updated the example to use `postgres-1`, `redis-1`, and `kafka-1`.
- The Kafka Compose service did not include required Confluent KRaft configuration such as `KAFKA_CONTROLLER_LISTENER_NAMES`, listener security protocol mapping, advertised listeners, inter-broker listener, and single-node offsets topic replication factor. Added the required settings and replaced the invalid sample `CLUSTER_ID` with a valid example ID.
- The `package.json` snippet was marked as JSON but included a JavaScript comment, making it invalid JSON. Removed the comment from inside the JSON code block.

## Review Notes
- The examples are tutorial snippets and depend on application-specific functions and classes such as `UserRepository`, `runMigrations`, and `createApp`; those are reasonable placeholders for the article's context.
- `version: '3.8'` in Docker Compose files is still commonly accepted, but modern Compose follows the Compose Specification and no longer requires the top-level `version` field.
- Disabling Ryuk in CI is supported by Testcontainers, but keeping Ryuk enabled is often preferable when the CI environment allows it because it provides automatic cleanup during abnormal test exits.
