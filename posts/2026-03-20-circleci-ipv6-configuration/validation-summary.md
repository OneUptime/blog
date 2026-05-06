# Validation Summary: How to Configure CircleCI with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- CircleCI
- CircleCI self-hosted machine runner
- Docker
- IPv6
- CircleCI `config.yml`
- Python `http.server`

## Sources Consulted
- CircleCI FAQ: https://circleci.com/docs/reference/faq/
- CircleCI install machine runner 3 on Linux: https://circleci.com/docs/guides/execution-runner/install-machine-runner-3-on-linux/
- CircleCI machine runner 3 configuration reference: https://circleci.com/docs/guides/execution-runner/machine-runner-3-configuration-reference/
- CircleCI self-hosted runner overview: https://circleci.com/docs/guides/execution-runner/runner-overview/
- CircleCI configuration reference: https://circleci.com/docs/reference/configuration-reference/
- CircleCI run Docker commands: https://circleci.com/docs/guides/execution-managed/building-docker-images/
- Docker IPv6 networking: https://docs.docker.com/engine/daemon/ipv6/
- Docker bridge network driver: https://docs.docker.com/network/drivers/bridge/
- Docker with iptables: https://docs.docker.com/engine/network/firewall-iptables/
- Docker `network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Python `http.server` docs: https://docs.python.org/3/library/http.server.html

## Issues Found
- The post used deprecated CircleCI launch-agent installation steps (`circleci-launch-agent`, `/etc/opt/circleci/launch-agent-config.yaml`, and `circleci.service`). I updated the post to the current machine runner 3 package, config path, and `circleci-runner` service documented by CircleCI.
- The intro overstated cloud IPv6 behavior. CircleCI documents local IPv6 testing for the cloud `machine` executor, but not IPv6 internet traffic in CircleCI Cloud. I corrected that explanation.
- The CircleCI config example used `resource_class: <your-namespace>/<your-runner-name>`, but CircleCI self-hosted jobs target a resource class, not an individual runner name. I changed the placeholder to `<your-namespace>/<your-resource-class>`.
- The self-hosted job example mixed a cloud-style `machine.image` definition with a self-hosted resource class. CircleCI’s self-hosted runner examples use `machine: true`, so I updated the job definitions to that pattern.
- The Docker IPv6 examples used invalid IPv6 values such as `2001:db8:ci::/64` and `2001:db8:test::/64`. Those are not valid IPv6 CIDRs because `ci` and `test` are not hexadecimal hextets. I replaced them with valid ULA ranges under `fd00::/8`, which Docker’s docs also recommend for local experimentation.
- The Docker daemon snippet included `"experimental": true`, which is not required for Docker IPv6 in the current Docker docs. I removed it.
- The `build-and-push-ipv6` job used `setup_remote_docker` with a `machine` executor. CircleCI’s configuration reference says `setup_remote_docker` is not compatible with `machine`, so I removed it.
- The application test examples did not actually prove IPv6 connectivity: one sample only printed container logs, and another depended on an unspecified `app.py` implementation and `LISTEN_ADDR` contract. I replaced them with runnable examples that perform real IPv6 requests.
- The troubleshooting section referenced the old `circleci` systemd unit and manual `ip6tables` NAT rules. I updated it to the current `circleci-runner` service name and Docker-supported IPv6 troubleshooting checks.

## Review Notes
- The container application test still includes app-specific placeholders for the listening port and health endpoint. Those need to be adjusted for a real project, but the sample now accurately shows how to validate IPv6 reachability.
- I did not run `circleci config validate` locally because the CircleCI CLI is not installed in this environment.
