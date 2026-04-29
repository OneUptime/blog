# Validation Summary: How to Build an IPv6 Test Lab in GNS3

## Status
validated

## Post Type
Guide

## Technologies Covered
- GNS3
- FRRouting (FRR)
- IPv6
- OSPFv3
- BGP
- Docker
- Python
- GNS3 REST API

## Sources Consulted
- GNS3 Linux installation docs: https://docs.gns3.com/docs/getting-started/installation/linux/
- GNS3 Docker support docs: https://docs.gns3.com/docs/emulators/docker-support-in-gns3/
- GNS3 NAT node docs: https://docs.gns3.com/docs/using-gns3/advanced/the-nat-node/
- GNS3 API docs for projects: https://api.gns3.net/en/latest/api/v2/controller/project/projects.html
- GNS3 API docs for templates: https://api.gns3.net/en/2.2/api/v2/controller/template/templates.html
- GNS3 API docs for creating a node from a template: https://api.gns3.net/en/stable/api/v2/controller/template/projectsprojectidtemplatestemplateid.html
- GNS3 API curl examples: https://api.gns3.net/en/stable/curl.html
- FRR OSPFv3 docs: https://docs.frrouting.org/en/latest/ospf6d.html
- FRR BGP docs: https://docs.frrouting.org/en/latest/bgp.html
- FRR vtysh docs: https://docs.frrouting.org/en/latest/vtysh.html
- FRR Zebra/basic route display docs: https://docs.frrouting.org/en/latest/zebra.html
- Official FRR Docker image pages: https://hub.docker.com/r/frrouting/frr and https://hub.docker.com/r/frrouting/frr-debian

## Issues Found
- The post claimed Cloud/NAT nodes provided internet IPv6 access as a single category. GNS3's official NAT-node documentation describes IPv4 NAT-based internet access, while Cloud nodes are the documented path for bridging upstream connectivity. I corrected the wording to separate those roles.
- The Docker example pulled `frrouting/frr:latest` and then used `apt-get` in a derived Dockerfile. The official `frrouting/frr` image is Alpine-based, so that package-manager choice would fail. I changed the example to use the official Debian-based FRR image before installing additional tools.
- The FRR OSPFv3 configuration used `ipv6 router ospf6` and a Cisco-style `router-id` line. FRR documents OSPFv3 under `router ospf6`, with `ospf6 router-id` shown in the sample configuration. I corrected the OSPFv3 process syntax and removed the unnecessary area-range line from the single-area example.
- The FRR configuration save command was shown as `write`. Current FRR documentation explicitly documents `write file` and integrated-config write behavior in `vtysh`. I updated the examples to use `write file`.
- The BGP example advertised `2001:db8:1::/48` even though the post configured only `2001:db8:1::1/128` on the loopback. That would not match the shown addressing. I changed the advertised prefix to `2001:db8:1::1/128`.
- The GNS3 API example created nodes by POSTing to `/v2/projects/{project_id}/nodes` with a `template_id` in the payload. Official GNS3 API docs provide a dedicated `POST /v2/projects/{project_id}/templates/{template_id}` endpoint for creating a node from a template. I updated the script to use the documented endpoint and added basic HTTP status checks.
- The verification block said the commands were run in `vtysh` but used `traceroute6` and a generic `ping` form. FRR documents `ping ipv6 ...` and `traceroute ipv6 ...` in `vtysh`, so I updated the examples accordingly.

## Review Notes
- The post description mentions dual-stack configurations, but the body examples are IPv6-only. This is not a correctness bug in the existing commands, but the wording is broader than the technical coverage shown.
