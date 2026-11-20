# Validation Summary: Fix Aerospike `INVALID_NODE_ERROR` in Docker and Testcontainers

## Status

validated

## Post Type

Troubleshooting guide with shell commands, server configuration, and Java connection examples.

## Technologies Covered

- Aerospike Database and Aerospike Tools
- Aerospike Java client
- Docker port publishing
- Testcontainers for Java
- Cluster discovery and alternate service endpoints

## Sources Consulted

- [Aerospike strong consistency and client error explanations](https://aerospike.com/docs/database/learn/strong-consistency/)
- [Aerospike Java client connection documentation](https://aerospike.com/docs/develop/client/java/connect/)
- [Aerospike configuration reference](https://aerospike.com/docs/database/reference/config/)
- [Aerospike info command reference](https://aerospike.com/docs/database/reference/info/)
- [Aerospike network configuration](https://aerospike.com/docs/database/manage/network/)
- [Aerospike Java client NodeValidator source](https://github.com/aerospike/aerospike-client-java/blob/master/client/src/com/aerospike/client/cluster/NodeValidator.java)
- [Aerospike Java ClientPolicy source](https://github.com/aerospike/aerospike-client-java/blob/master/client/src/com/aerospike/client/policy/ClientPolicy.java)
- [AerospikeClient constructors and Closeable implementation](https://github.com/aerospike/aerospike-client-java/blob/master/client/src/com/aerospike/client/AerospikeClient.java)
- [Aerospike Docker image configuration](https://github.com/aerospike/aerospike-server.docker)
- [Published Aerospike Community Edition Docker tags](https://hub.docker.com/r/aerospike/aerospike-server/tags)
- [Docker port publishing and mapping](https://docs.docker.com/engine/network/port-publishing/)
- [Testcontainers networking](https://java.testcontainers.org/features/networking/)
- [Testcontainers startup and wait strategies](https://java.testcontainers.org/features/startup_and_waits/)
- [Testcontainers GenericContainer source](https://github.com/testcontainers/testcontainers-java/blob/main/core/src/main/java/org/testcontainers/containers/GenericContainer.java)

## Issues Found

- The original title exceeded the repository's 80-character limit. Shortened it while retaining the Aerospike error identifier and Docker/Testcontainers scope.
- No technical issues found in the article's commands, configuration, code examples, or explanations.

## Review Notes

- Confirmed that INVALID_NODE_ERROR is a client-side lack-of-node condition that can arise from incorrect seeds, connectivity failures, unavailable partitions, or strong-consistency roster problems. The article correctly requires diagnosis before assuming an address advertisement problem.
- Verified all four non-TLS service and peer discovery commands. The server's alternate address and port are static service settings, and the Java client's useServicesAlternate selects their discovery responses.
- Confirmed the Java client's loopback seed handling, fallback to the original seed when advertised endpoints are unreachable, address-only ipMap substitution, and testing-only forceSingleNode behavior against the official source.
- Both AerospikeClient constructor overloads exist, and its Closeable implementation supports try-with-resources. GenericContainer's String constructor remains supported and is not deprecated.
- Verified that the pinned Community Edition image tag 7.2.0.22-14 is published for linux/amd64 and linux/arm64. The Docker image supports passing --config-file after the image name.
- Testcontainers documentation confirms that getMappedPort must follow startup, getHost handles non-local Docker environments, and its default port wait does not establish application readiness. The article explicitly calls for a bounded database readiness check and does not present the connection snippet as a complete fixture.
- This review used official documentation and source inspection. The Java examples and Docker configuration were not executed against a running Aerospike server during this review.
