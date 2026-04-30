# Validation Summary: How to Configure GitHub Actions with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitHub Actions
- GitHub-hosted and self-hosted runners
- Docker IPv6 bridge networking
- Python networking tests with `socket` and `requests`
- Kubernetes CLI (`kubectl`)
- IPv6 connectivity checks with `curl` and `ping`

## Sources Consulted
- GitHub Docs: Adding self-hosted runners: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners
- GitHub Docs: Using labels with self-hosted runners: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/apply-labels
- GitHub Docs: Communicating with Docker service containers: https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers
- GitHub Docs: GitHub-hosted runners reference: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
- GitHub Actions `actions/checkout` repository and release documentation: https://github.com/actions/checkout
- GitHub Actions `actions/setup-python` repository and release documentation: https://github.com/actions/setup-python
- GitHub Actions runner releases: https://github.com/actions/runner/releases
- Docker Docs: Use IPv6 networking: https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Networking overview: https://docs.docker.com/engine/network/
- Docker Docs: Publishing and exposing ports: https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: `docker inspect` CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- Python documentation: `socket.getaddrinfo()`: https://docs.python.org/3/library/socket.html#socket.getaddrinfo
- ipify documentation: https://www.ipify.org/

## Issues Found
- The introduction stated that standard GitHub-hosted runners do not provide public IPv6 internet access by default. GitHub’s documentation confirms public internet access, but it does not support that stronger blanket claim, so the wording was changed to the verifiable recommendation: use a self-hosted runner when you need guaranteed native IPv6 connectivity.
- The self-hosted runner install snippet hardcoded runner version `2.312.0`, which is stale relative to current runner releases. It was changed to the versioned command pattern GitHub generates from the "New self-hosted runner" page so the instructions stay current.
- Option 2 described "service containers", but the example actually used direct `docker` commands on the runner. The section title and introductory sentence were corrected so the implementation matches the explanation.
- The Docker workflow rewrote `daemon.json`, used an overlapping IPv6 subnet, reloaded Docker instead of using the documented user-defined IPv6 network flow, and hardcoded `fd00::2` for the application container. The example was corrected to use a dedicated user-defined IPv6 bridge network and hostname-based IPv6 connectivity checks.
- The workflow used older action majors (`actions/checkout@v4` and `actions/setup-python@v5`). These were updated to the current documented majors (`v6`).
- The pytest example could not work as written because `--server-ipv6` was never defined as a pytest option, and the workflow did not install `requests`. The workflow now passes the IPv6 address through `SERVER_IPV6`, installs `requests`, and the Python test reads the environment variable directly.
- The Kubernetes example used an invalid IPv6 literal (`2001:db8:k8s::1`). It was replaced with a syntactically valid documentation-prefix IPv6 address.
- The DNS example was made less provider-specific by switching from `ipv6.google.com` to `example.org` and by constraining `getaddrinfo()` to IPv6/TCP explicitly.

## Review Notes
- `actions/checkout@v6` and `actions/setup-python@v6` require current self-hosted runner versions, which is another reason the post should not pin an old runner tarball.
- The Docker-network technique validates IPv6 behavior inside the CI runner, but it is not a substitute for testing real outbound IPv6 internet connectivity from the runner itself.
