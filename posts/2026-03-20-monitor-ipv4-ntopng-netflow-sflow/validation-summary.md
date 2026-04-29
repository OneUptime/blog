# Validation Summary: How to Monitor IPv4 Traffic with ntopng Using NetFlow and sFlow

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ntopng (community edition)
- nProbe (flow collector)
- NetFlow v5/v9 / IPFIX
- sFlow
- ZeroMQ (ZMQ) transport between nProbe and ntopng
- Cisco IOS NetFlow export commands
- systemd, tcpdump, ss, journalctl

## Sources Consulted
- [ntop Software Installation documentation](https://www.ntop.org/support/documentation/software-installation/)
- [ntop apt-stable package index](https://packages.ntop.org/apt-stable/)
- [ntopng 6.7 — NetFlow/sFlow Monitoring guide](https://www.ntop.org/guides/ntopng/use_cases/netflow_sflow_monitoring.html)
- [ntopng 6.7 — Using ntopng with nProbe](https://www.ntop.org/guides/ntopng/using_with_other_tools/nprobe.html)
- [ntop blog — sFlow Collection and Analysis with nProbe and ntopng](https://www.ntop.org/sflow-collection-and-analysis-with-nprobe-and-ntopng/)
- [ntop blog — HowTo Configure Flow Collection in nProbe and ntopng](https://www.ntop.org/howto-configure-flow-collection-in-nprobe-and-ntopng/)
- [ntopng 6.7 — Lua API documentation](https://www.ntop.org/guides/ntopng/api/lua_c/index.html)
- [ntopng 6.7 — Host Checks API](https://www.ntop.org/guides/ntopng/api/lua_c/host_checks/index.html)

## Issues Found

1. **Step 1 — Deprecated `apt-key` install method.** The original used `curl ... | apt-key add -` plus a hand-built `sources.list.d` entry. `apt-key` is deprecated on modern Ubuntu/Debian and the ntop project ships the `apt-ntop-stable.deb` repository package as the supported install method. Replaced with the documented `wget https://packages.ntop.org/apt-stable/<release>/all/apt-ntop-stable.deb` + `apt install ./apt-ntop-stable.deb` flow.

2. **Step 2 — Incorrect ntopng `-i` syntax for NetFlow.** The post used `-i=netflow:0.0.0.0:2055`, which is not a valid ntopng interface specification. ntopng does not natively collect NetFlow on a UDP socket; it consumes flows from nProbe over ZMQ. Replaced the configuration with `-i=tcp://*:5556c` (probe/collector mode, trailing `c`) and added the matching `nprobe -i none -n none --collector-port 2055 --zmq tcp://127.0.0.1:5556` command, which is the architecture documented by ntop.

3. **Step 2 — Removed `--auth-password=...`.** ntopng does not provide a `--auth-password` CLI/config option; the admin password is set via the web UI on first login. Step 5 was updated to reflect the default `admin`/`admin` credentials and the first-login password change prompt.

4. **Step 3 — Incorrect sFlow `-i` syntax and combined-listener syntax.** The original suggested `-i=sflow:0.0.0.0:6343` and a comma-separated combined form `-i=netflow:...,sflow:...`. Neither is valid ntopng syntax. Replaced with a second `nprobe ... --collector-port 6343 --zmq tcp://127.0.0.1:5556` instance forwarding to the same ntopng ZMQ collector socket (which natively supports multiple nProbe producers in `c` mode).

5. **Step 6 — Fabricated Lua callback example.** The script defined `host.callbackHostTrafficAlert(host_info, flow_info)` and wrote it to `/usr/share/ntopng/scripts/callbacks/host_callbacks.lua`. Neither the function name, signature, nor file path correspond to ntopng's actual user-script API (which uses checks under `scripts/callbacks/checks/hosts/`, hooks, `alert_consts`, and `host.triggerAlert`). Replaced with an accurate description of the web-UI configuration paths (Settings > Notifications, Settings > Checks) and a pointer to the official Lua API guide for custom checks.

6. **Step 7 — Verification commands updated to match the new architecture.** Switched from `netstat -lunp | grep ntopng` (which would not show nProbe's UDP collector socket) to `ss -lunp | grep -E '2055|6343'` for the nProbe collector ports and `ss -ltnp | grep 5556` for the ntopng ZMQ socket.

## Review Notes

- The Cisco IOS NetFlow export commands (`ip flow-export destination`, `ip flow-export version 5`, `ip flow ingress/egress`) are syntactically correct for traditional NetFlow on classic IOS. They have been superseded by Flexible NetFlow (`flow exporter` / `flow monitor` / `ip flow monitor ... input`) on newer platforms, but they remain valid for the use case described.
- nProbe is shipped as a freemium product; the community/demo build will rate-limit export beyond a flow threshold. This is not contradicted in the post but readers running heavy production traffic should be aware that an nProbe license may be needed for sustained collection.
- The default ntopng web port is 3000 and the default sFlow / NetFlow ports (6343 UDP, 2055 UDP) used in the post are correct.
- The Ubuntu release in the install snippet is parameterised (20.04 / 22.04 / 24.04). The 22.04 default was chosen as the most common LTS at time of review; readers on other releases should substitute the matching path under `packages.ntop.org/apt-stable/`.
