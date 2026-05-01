# Validation Summary: How to Deploy ZeroMQ-Based Applications via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- ZeroMQ
- PyZMQ
- Portainer
- Docker Compose / Portainer stacks
- Docker CLI
- Python 3

## Sources Consulted
- ZeroMQ Get started: https://zeromq.org/get-started/
- ZeroMQ Socket API: https://zeromq.org/socket-api/?language=cpp&library=cppzmq
- PyZMQ stable API reference: https://pyzmq.readthedocs.io/en/stable/api/zmq.html
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networking: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker container logs reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker `exec` reference: https://docs.docker.com/engine/reference/commandline/exec
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer known issue for Compose `build` steps on remote environments: https://docs.portainer.io/faqs/known-issues/docker-compose-files-including-build-steps-fail

## Issues Found
1. **Obsolete Compose `version` field.** The stack example used `version: "3.8"`, which current Docker Compose documentation marks as obsolete. I removed the field so the example matches the current Compose specification.
2. **Dockerfile example was too publisher-specific for the later stack.** The post introduced a generic service Dockerfile, but the example only copied `publisher.py` while the stack also built a separate subscriber image. I clarified that each service directory needs its own Dockerfile, labeled the example as `publisher/Dockerfile`, and added the matching note for the subscriber image.
3. **Logging examples did not fully support the verification steps.** The publisher example did not log each published message, and the subscriber code ignored the `SUBSCRIBER_ID` environment variable set in the stack. I added publisher message logging, wired the subscriber to `SUBSCRIBER_ID`, and set `PYTHONUNBUFFERED=1` so `docker logs` reflects activity promptly.
4. **Missing Portainer caveat for Compose `build:`.** Portainer documents that Compose `build` steps are not supported for remote Docker environments. I added a short note telling readers to prebuild and push images, then switch to `image:` references when deploying that way.
5. **The ZeroMQ smoke test was unreliable.** The original `docker exec` example created a fresh `SUB` socket and immediately called `recv_string(flags=zmq.NOBLOCK)`, which can raise `ZMQError` when no message is ready yet. I replaced it with a `poll(5000)` check plus a blocking receive and kept the topic subscription explicit.
6. **Conclusion wording was too absolute.** The post claimed ZeroMQ delivers "millions of messages/second" and said to "Never expose ZeroMQ ports externally." I changed this to the technically safer statements that ZeroMQ is capable of very high throughput and that internal-only networking is a preference unless external clients actually need access.

## Review Notes
- The core descriptions of PUB/SUB, PUSH/PULL, and REQ/REP match the official ZeroMQ socket pattern documentation.
- Using Docker service names such as `publisher` as hostnames on a shared Compose network is correct and aligns with Docker's networking model.
- The worker-pool section is technically correct as Python/ZeroMQ example code, but readers still need corresponding Portainer stack service definitions if they want to deploy that section as containers.
