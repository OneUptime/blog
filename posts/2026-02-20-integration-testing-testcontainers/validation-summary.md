# Validation Summary: How to Write Integration Tests with Testcontainers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- pytest
- Testcontainers for Python
- PostgreSQL
- Redis
- Apache Kafka
- Docker Compose
- GitHub Actions

## Sources Consulted
- Testcontainers for Python documentation: https://testcontainers-python.readthedocs.io/en/testcontainers-v4.7.2/
- Testcontainers for Python PostgresContainer documentation: https://testcontainers-python.readthedocs.io/en/testcontainers-v4.7.0/modules/postgres/README.html
- Testcontainers for Python RedisContainer documentation: https://testcontainers-python.readthedocs.io/en/testcontainers-v4.7.0/modules/redis/README.html
- Testcontainers for Python KafkaContainer documentation: https://testcontainers-python.readthedocs.io/en/testcontainers-v4.7.0/modules/kafka/README.html
- Testcontainers for Python DockerCompose/Core documentation: https://testcontainers-python.readthedocs.io/en/testcontainers-v4.14.2/core/README.html
- Docker Testcontainers overview and Python guide: https://docs.docker.com/testcontainers/ and https://docs.docker.com/guides/testcontainers-python-getting-started/
- pytest fixture documentation: https://pytest.org/en/stable/yieldfixture.html
- kafka-python KafkaProducer and KafkaConsumer documentation: https://kafka-python.readthedocs.io/en/2.1.3/apidoc/KafkaProducer.html and https://kafka-python.readthedocs.io/en/2.2.17/apidoc/KafkaConsumer.html
- GitHub-hosted runners documentation: https://docs.github.com/en/actions/reference/github-hosted-runners-reference
- GitHub Actions runner images documentation: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md

## Issues Found
- The PostgreSQL example passed the default `PostgresContainer.get_connection_url()` result directly to `psycopg2.connect()`. Testcontainers returns a SQLAlchemy-style URL with the `postgresql+psycopg2` driver by default, so I changed the container setup to `PostgresContainer("postgres:16-alpine", driver=None)` to produce a libpq-compatible URL for psycopg2.
- The Kafka example said it was using KRaft mode but did not call the Testcontainers Python `with_kraft()` API. I changed the fixture to `KafkaContainer("confluentinc/cp-kafka:7.6.0").with_kraft()`.
- The Kafka producer fixture returned a producer without closing it. I changed it to a `yield` fixture and call `producer.close()` during teardown, matching pytest fixture teardown behavior and kafka-python's close API.
- The Docker Compose example used `filepath="."`, but current Testcontainers Python documents the constructor argument as `context`. I changed it to `context="."`.

## Review Notes
The examples are syntactically valid Python after the fixes. The Kafka example still uses a short `time.sleep(2)` for simplicity; in production tests, a poll loop or explicit readiness/message assertion is usually less timing-sensitive.
