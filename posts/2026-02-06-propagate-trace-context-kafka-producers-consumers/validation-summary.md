# Validation Summary: How to Propagate Trace Context Across Kafka Producers and Consumers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing and context propagation
- Apache Kafka producers, consumers, and message headers
- OpenTelemetry Java Kafka client instrumentation
- OpenTelemetry Python kafka-python instrumentation
- Manual OpenTelemetry TextMap propagation in Python
- OpenTelemetry Collector configuration

## Sources Consulted
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Java instrumentation supported libraries: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md
- OpenTelemetry Java KafkaTelemetry 2.2.0-alpha Javadocs: https://javadoc.io/doc/io.opentelemetry.instrumentation/opentelemetry-kafka-clients-2.6/2.2.0-alpha/io/opentelemetry/instrumentation/kafkaclients/v2_6/KafkaTelemetry.html
- OpenTelemetry Java KafkaTelemetry and KafkaTelemetryBuilder source for v2.2.0: https://github.com/open-telemetry/opentelemetry-java-instrumentation/tree/v2.2.0/instrumentation/kafka/kafka-clients/kafka-clients-2.6/library
- OpenTelemetry Python kafka-python instrumentation source/docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/kafka.html
- OpenTelemetry Python propagation docs: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- Apache Kafka ProducerRecord Javadocs: https://kafka.apache.org/26/javadoc/org/apache/kafka/clients/producer/ProducerRecord.html
- kafka-python KafkaProducer docs: https://kafka-python.readthedocs.io/en/2.2.13/apidoc/KafkaProducer.html
- OpenTelemetry Collector processor docs: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector groupbytrace processor docs: https://pkg.go.dev/go.opentelemetry.io/collector/processor/groupbytraceprocessor

## Issues Found
- The post stated that messaging consumers typically use span links and that the Java/Python automatic examples create spans linked to the producer span. This was too broad. OpenTelemetry messaging conventions allow both links and parent-child relationships, Java `KafkaTelemetry.create(openTelemetry)` defaults to extracted parent context for processing spans, and Python kafka-python instrumentation starts the consumer span with the extracted context as parent. Updated the explanation and comments to distinguish default parent-child behavior from configurations that use span links.
- The Java producer example ended the custom publish span only in the Kafka send callback. If `producer.send(...)` throws synchronously, that span could remain open. Wrapped the send call in `try/catch` so synchronous failures are recorded, the span is ended, and the exception is rethrown.
- The manual Python propagation snippet used `opentelemetry.context.propagation.get_global_textmap_propagator`, which is not the current documented Python API. Replaced it with `opentelemetry.propagate.inject` and `opentelemetry.propagate.extract`.
- The manual Python `KafkaHeaderCarrier` adapter did not match the current OpenTelemetry Python getter/setter method signatures. Updated `get`, `set`, and `keys` to accept the carrier argument and return values in the expected shape.
- The Collector configuration used `groupbytrace` without noting that it is a contrib processor. Added a note that this requires the OpenTelemetry Collector Contrib distribution rather than the core-only collector.

## Review Notes
The Java dependency versions shown are older than current releases as of 2026-06-05, but the APIs used exist for the versions listed. The OpenTelemetry messaging semantic conventions remain marked development, so exact attribute names and span topology defaults can vary across instrumentation versions.
