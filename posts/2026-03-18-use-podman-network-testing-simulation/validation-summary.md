# Validation Summary: How to Use Podman for Network Testing and Simulation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Container networking
- Linux traffic control (`tc`)
- `iptables`
- `tcpdump`
- `iperf3`
- Python 3

## Sources Consulted
- Podman `podman-network-create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-network-connect` documentation: https://docs.podman.io/en/stable/markdown/podman-network-connect.1.html
- Podman `podman-create` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Python `subprocess` documentation: https://docs.python.org/3/library/subprocess.html
- Python `urllib.request` documentation: https://docs.python.org/3/library/urllib.request.html
- Python `http.server` documentation: https://docs.python.org/3/library/http.server.html

## Issues Found
- The explanation of `podman network create --internal` overstated the behavior. I updated it to reflect current Podman behavior: no default route and DNS limited to container-name lookups on that network, rather than a blanket claim of a "fully isolated" environment.
- The cross-network example described a multi-homed container as a router/bridge and then tried to ping `web-server`, which is not part of that example. I corrected the description, updated the test commands to check reachability to `alpha-only` and `beta-only`, and normalized the `podman network create` commands to the documented option ordering.
- The `nettools` image used `ENTRYPOINT ["/bin/bash"]`, which would break later examples such as `nettools bash -c ...`, `nettools tcpdump ...`, and `nettools iperf3 -s`. I changed it to `CMD ["/bin/bash"]` so the later `podman run` examples work as written.
- The bandwidth section suggested `iperf3 -c target-server`, but `target-server` is an `nginx` container, not an `iperf3` server. I corrected the note to point at `iperf-server`.
- The Python automation example used `fedora:latest` as the client container even though the code relies on `curl` and `ping`. I changed the client image to `nettools`, which includes the required utilities, and removed the unused `port`, `json`, and `sys` code paths.
- The load-testing section claimed to run multiple concurrent connections, but the original loop issued requests sequentially. I replaced it with an asynchronous `httpx.AsyncClient` example that actually runs concurrent requests.
- The microservices section labeled the `nginx` container as an API gateway even though it was only acting as a public placeholder. I clarified that wording so the example matches what it configures.
- The firewall section mentioned both `iptables` and `nftables`, but the example only exercised `iptables`. I corrected the text to describe it as firewall-rule testing.
- The cleanup script missed several containers and networks created earlier in the post. I expanded the name filters so it now matches the resources introduced by the examples.

## Review Notes
- The examples were reviewed against current official documentation and corrected accordingly, but they were not executed in this environment because `podman` is not installed here.
- Examples that manipulate `tc` or firewall rules still depend on Linux container networking features and the required capabilities such as `NET_ADMIN`.
