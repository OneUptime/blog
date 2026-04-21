# Validation Summary: How to Test IPv6 Connectivity in CI/CD Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 networking
- Linux sysctl and iproute2
- curl
- BIND dig
- Docker Engine IPv6 networking
- GitHub Actions
- GitLab CI
- Python socket module
- pytest

## Sources Consulted
- Linux kernel IPv6 documentation: https://docs.kernel.org/networking/ipv6.html
- Docker Engine IPv6 networking documentation: https://docs.docker.com/engine/daemon/ipv6/
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker network create CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Python socket module documentation: https://docs.python.org/3/library/socket.html
- pytest skip and skipif documentation: https://docs.pytest.org/en/stable/how-to/skipping.html
- curl man page: https://curl.se/docs/manpage.html
- BIND 9 dig manual: https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility
- GitHub Actions Python build/test documentation: https://docs.github.com/en/actions/tutorials/build-and-test-code/python
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/

## Issues Found
- The shell script treated every non-zero or unavailable `net.ipv6.conf.all.disable_ipv6` check as a warning. I changed it to fail when the sysctl is present and reports IPv6 disabled, while still warning when the sysctl is unavailable in a container.
- The external IPv6 shell check called `curl` twice and did not validate that the response looked like an IPv6 address. I changed it to capture the response once with `curl -6`, fail on HTTP errors, and check for an IPv6-style address.
- The GitHub Actions Docker example used the same IPv6 subnet for Docker's default bridge allocation and the user-defined test network, which can create overlapping network pools. I changed the example to use separate ULA `/64` subnets.
- The Docker daemon configuration step used `systemctl reload docker`, but Docker's IPv6 documentation instructs restarting Docker for daemon IPv6 configuration changes. I changed it to `sudo systemctl restart docker`.
- The pytest snippet referenced `_has_global_ipv6()` before the helper was defined, which would raise `NameError` during test collection. I replaced it with a helper defined before the decorator.
- The external pytest skip condition only checked for a global-scope IPv6 address, which does not prove external IPv6 reachability. I changed it to check external IPv6 reachability before running the external connectivity test.
- The dual-stack pytest test configured a socket but did not actually prove it accepted both IPv4 and IPv6 connections. I changed it to use `socket.create_server(..., dualstack_ipv6=True)` and connect via both `::1` and `127.0.0.1`.
- The GitLab CI example ran `python3 -m pytest` but did not install pytest in the `ubuntu:22.04` image. I added the `python3-pytest` package to the install command.

## Review Notes
- The GitHub Actions example uses ULA Docker subnets, so it validates container IPv6 addressing and socket behavior, not public IPv6 egress from the container.
- External IPv6 connectivity remains environment-dependent in hosted CI, so keeping it optional/skipped is appropriate.
