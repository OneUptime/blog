# Validation Summary: How to Deploy Zipkin for Trace Collection via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Zipkin
- Portainer
- Docker Compose / Docker stacks
- MySQL
- Cassandra
- Python
- py_zipkin
- OpenTelemetry Collector

## Sources Consulted
- OpenZipkin server documentation: https://github.com/openzipkin/zipkin/blob/master/zipkin-server/README.md
- OpenZipkin Docker image documentation: https://github.com/openzipkin/zipkin/blob/master/docker/README.md
- OpenZipkin MySQL compose example: https://github.com/openzipkin/zipkin/blob/master/docker/examples/docker-compose-mysql.yml
- OpenZipkin Cassandra compose example: https://github.com/openzipkin/zipkin/blob/master/docker/examples/docker-compose-cassandra.yml
- OpenZipkin `zipkin-mysql` image docs: https://github.com/openzipkin/zipkin/blob/master/docker/test-images/zipkin-mysql/README.md
- OpenZipkin `zipkin-mysql` image install script: https://github.com/openzipkin/zipkin/blob/master/docker/test-images/zipkin-mysql/install.sh
- OpenZipkin `zipkin-cassandra` image install script: https://github.com/openzipkin/zipkin/blob/master/docker/test-images/zipkin-cassandra/install.sh
- OpenZipkin `zipkin-cassandra` image startup script: https://github.com/openzipkin/zipkin/blob/master/docker/test-images/zipkin-cassandra/start-cassandra
- OpenZipkin releases: https://github.com/openzipkin/zipkin/releases
- py_zipkin README: https://github.com/Yelp/py_zipkin/blob/master/README.md
- py_zipkin transport implementation: https://github.com/Yelp/py_zipkin/blob/master/py_zipkin/transport.py
- OpenTelemetry Collector Zipkin exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/zipkinexporter/README.md

## Issues Found
- The MySQL example used `MYSQL_PASS=zipkin_secret`, but the official `zipkin-mysql` test image is preconfigured for `zipkin` / `zipkin`. I changed the Zipkin service credentials to the documented values.
- The MySQL service set `MYSQL_ROOT_PASSWORD`, but the custom `zipkin-mysql` image does not use the stock MySQL Docker entrypoint that consumes that variable. I removed that unsupported setting.
- The MySQL volume mount targeted `/var/lib/mysql`, but the `zipkin-mysql` image stores its data under `/mysql/data`. I corrected the mount path so persistence matches the image layout.
- The UI URL pointed to `http://<host>:9411`, while the upstream server documentation uses the `/zipkin` UI path. I changed the access URL to `http://<host>:9411/zipkin`.
- The `py_zipkin` example defined a transport helper but never supplied a `transport_handler` or `sample_rate` to the root span decorator, so it would not report spans correctly. I replaced it with the documented `SimpleHTTPTransport` usage and explicit V2 JSON encoding.
- The OpenTelemetry section incorrectly stated that Zipkin accepts OTLP traces through a compatibility endpoint. I corrected the wording to describe exporting to Zipkin with the Collector's Zipkin exporter, which sends to `/api/v2/spans`.
- The Cassandra section presented `zipkin-cassandra` as a production-oriented path even though OpenZipkin documents it as a test image. I changed the wording to describe it as demo/integration-test oriented.
- The Cassandra example mounted `/var/lib/cassandra`, but the official test image stores its data under `/cassandra/data`. I corrected the volume mount.
- The Cassandra example omitted `CASSANDRA_ENSURE_SCHEMA=false`, which OpenZipkin sets when using the pre-seeded `zipkin-cassandra` test image. I added that setting.
- The post pinned older `3.2` image tags. I updated the examples to `3.6.1`, which was the latest Zipkin release on 2026-05-01, and aligned the image references with current GHCR-hosted upstream examples.

## Review Notes
- The post is now technically correct, but both `zipkin-mysql` and `zipkin-cassandra` are upstream test images rather than production-grade database deployment guidance.
- The OpenTelemetry snippet is a partial Collector fragment. A complete Collector configuration still needs at least one traces receiver, and typically processors, elsewhere in the config.
