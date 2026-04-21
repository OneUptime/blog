# Validation Summary: How to Test IPv6 Migration in a Staging Environment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 migration testing
- Docker bridge networking and IPv6-only user-defined networks
- curl
- Python `socket`, `urllib.request`, `ipaddress`, and `xml.etree.ElementTree`
- pytest and JUnit XML reports
- DNS testing with `dig` and `host`
- Happy Eyeballs and dual-stack behavior

## Sources Consulted
- Docker Engine networking overview: https://docs.docker.com/engine/network/
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker `docker network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker `docker container run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- curl man page for `--ipv6` and Happy Eyeballs behavior: https://curl.se/docs/manpage.html
- everything curl container image documentation: https://everything.curl.dev/install/container.html
- Python `urllib.request` documentation: https://docs.python.org/3/library/urllib.request.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Python `xml.etree.ElementTree` documentation: https://docs.python.org/3/library/xml.etree.elementtree.html
- pytest JUnit XML output documentation: https://docs.pytest.org/en/stable/how-to/output.html#creating-junitxml-format-files
- BIND 9 manual pages for `dig` and `host`: https://bind9.readthedocs.io/en/latest/manpages.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 8305, Happy Eyeballs Version 2: https://www.rfc-editor.org/rfc/rfc8305

## Issues Found
- The Docker subnet `fd00:staging::/64` and DNS example `fd00:staging::10` were invalid IPv6 notation because IPv6 fields must use hexadecimal digits. I changed them to `fd00:172:28::/64` and `fd00:172:28::10`.
- The Docker network was described as IPv6-only, but the command assigned an IPv4 subnet. I changed the network creation command to use `--ipv4=false`, removed the IPv4 subnet, and adjusted the inspection command to show the configured IPv6 IPAM data.
- The curl test container invocation used an extra `curl` argument with a curl container image. I changed the example to use `curlimages/curl:latest -6 ...`, matching the official curl container usage.
- The log verification test only checked for `":"`, which could pass on timestamps or unrelated log text. I updated it to parse candidate tokens with Python's `ipaddress` module and verify that at least one valid IPv6 address appears.
- The report script counted every JUnit `<testcase>` element as passed, including failed tests. I changed it to parse the JUnit XML with `xml.etree.ElementTree` and compute passed, failed, errored, and skipped counts from `<testsuite>` attributes.

## Review Notes
- Docker is not installed in this environment, so Docker commands could not be executed locally. Docker behavior was checked against official Docker documentation.
- The local Python snippets compile and the Bash snippets parse with `bash -n`. The full pytest suite could not be run because `pytest` is not installed in this environment and the sample app is a placeholder.
- The API paths in the test suite are application-specific examples; a real staging app must provide matching endpoints.
- The `X-Forwarded-For` IPv6 example is valid for parser testing, but production systems should only trust forwarding headers from known trusted proxies.
