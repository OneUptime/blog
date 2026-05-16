# Validation Summary: How to Set Up MQTT Broker on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Eclipse Mosquitto
- MQTT
- EMQX Operator
- cert-manager
- Kafka Connect

## Sources Consulted
- Eclipse Mosquitto `mosquitto.conf` manual: https://mosquitto.org/man/mosquitto-conf-5.html
- Eclipse Mosquitto `mosquitto_passwd` manual: https://mosquitto.org/man/mosquitto_passwd-1.html
- Eclipse Mosquitto authentication methods: https://mosquitto.org/documentation/authentication-methods/
- Eclipse Mosquitto 2.0 migration notes: https://mosquitto.org/documentation/migrating-to-2-0/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- EMQX Operator compatibility and v2beta1 API reference: https://docs.emqx.com/en/emqx-operator/2.2.22/ and https://docs.emqx.com/en/emqx-operator/latest/reference/v2beta1-reference.html
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Confluent Kafka Connect Docker image configuration reference: https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Talos Linux official site: https://www.talos.dev/

## Issues Found
- The post claimed Talos Linux means broker infrastructure cannot be compromised at the OS level. Changed this to a narrower and accurate statement about reducing OS-level attack surface and configuration drift.
- The Mosquitto configuration used `message_size_limit`. Mosquitto now recommends `max_packet_size` for MQTT packet limits, so the example was updated.
- The ConfigMap included placeholder password hashes even though the deployment mounted a Secret at the password file path. Removed the unused placeholder password data.
- The password generation command attempted to write and then update `/dev/stdout` as a password file, which fails in the Eclipse Mosquitto 2.0 container. Replaced it with a temporary password file generated in the pod, then created the Kubernetes Secret with `--from-file`.
- The TLS example referenced `/mosquitto/certs/ca.crt` even though a cert-manager ACME TLS Secret is not guaranteed to contain that file and it is not required for server-side TLS when client certificates are not required. Removed the `cafile` line and added a note to mount the generated Secret at `/mosquitto/certs`.
- The Kafka Connect example only set bootstrap servers and group ID, which is not enough for the Confluent Kafka Connect container to start as a distributed worker. Added the required internal topic, converter, advertised host, and plugin path environment variables.
- The Kafka Connect section implied the Deployment alone bridged MQTT to Kafka. Clarified that the image must include an MQTT source connector plugin and still needs connector configuration.

## Review Notes
- `kubectl` is not installed in the local workspace, so Kubernetes CLI behavior was checked against the official kubectl reference rather than by executing cluster commands.
- The Mosquitto password generation shell sequence was tested locally with the `eclipse-mosquitto:2.0` container image and produced valid hashed password entries.
- YAML snippets in the post were parsed successfully after edits.
