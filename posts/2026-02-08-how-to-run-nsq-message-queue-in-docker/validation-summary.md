# Validation Summary: How to Run NSQ Message Queue in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NSQ
- Docker
- Docker Compose
- Go
- go-nsq
- Python
- gnsq
- curl

## Sources Consulted
- NSQ Docker deployment documentation: https://nsq.io/deployment/docker.html
- NSQ nsqd component and HTTP API documentation: https://nsq.io/components/nsqd.html
- NSQ nsqlookupd component and HTTP API documentation: https://nsq.io/components/nsqlookupd.html
- NSQ nsqadmin component documentation: https://nsq.io/components/nsqadmin.html
- NSQ utilities documentation for nsq_tail: https://nsq.io/components/utilities.html
- NSQ features, guarantees, and design documentation: https://nsq.io/overview/features_and_guarantees.html and https://nsq.io/overview/design.html
- NSQ client libraries documentation: https://nsq.io/clients/client_libraries.html
- Official go-nsq package documentation: https://pkg.go.dev/github.com/nsqio/go-nsq
- gnsq Consumer documentation: https://gnsq.readthedocs.io/en/latest/consumer.html
- Docker Compose command reference: https://docs.docker.com/reference/cli/docker/compose/ps/

## Issues Found
- The Docker Compose verification comment said `docker compose ps` verifies services are healthy. Because the sample Compose file defines no healthchecks, this command only shows service/container status. Changed the comment to say it verifies services are running.
- The monitoring example piped `/stats` into `python3 -m json.tool`, but NSQ's `/stats` endpoint defaults to text output. Changed the URL to `http://localhost:4151/stats?format=json` so the command returns JSON.
- The volume comment said it persists message data to disk. With `--mem-queue-size=10000`, NSQ remains primarily in memory and writes overflow/disk-backed queue data to `--data-path`. Changed the comment to "Persist disk-backed message data."

## Review Notes
- NSQ's Docker commands, default ports, `nsqd`, `nsqlookupd`, `nsqadmin`, `nsq_tail`, HTTP publishing examples, and channel/topic management endpoints matched the current NSQ documentation.
- The Go producer and consumer snippets use the official `github.com/nsqio/go-nsq` APIs correctly.
- The Python snippet uses `gnsq`, which is listed as a community Python client by NSQ. The official Python client listed by NSQ is `pynsq`; the example remains technically plausible for `gnsq`, but future updates could consider using the official client.
- NSQ messages are not durable by default and NSQ has no built-in replication. The post's persistence example improves disk-backed behavior, but production guidance should still account for NSQ's documented durability tradeoffs.
