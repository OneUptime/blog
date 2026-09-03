# Validation Summary: How to Run kube-hunter Remotely Against a Kubernetes Cluster Without Exposing the Scanner

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- kube-hunter remote scanning and passive versus active hunting
- Kubernetes network exposure and NetworkPolicy
- Docker container isolation and bridge networking
- Linux routing, DNS resolution, and TLS connectivity checks
- Cloud firewall and security-group egress controls

## Sources Consulted

- [kube-hunter documentation: scanning, active hunting, output, and deployment](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)
- [kube-hunter argument parser](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/conf/parser.py)
- [kube-hunter port discovery source](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/ports.py)
- [kube-hunter base report implementation](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/base.py)
- [kube-hunter JSON reporter implementation](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/report/json.py)
- [kube-hunter container definition](https://github.com/aquasecurity/kube-hunter/blob/main/Dockerfile)
- [Docker `docker container run` reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Kubernetes NetworkPolicy documentation](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes ports and protocols](https://kubernetes.io/docs/reference/networking/ports-and-protocols/)

## Issues Found
No technical issues found.

## Review Notes

- The example image digest is deliberately non-executable until the reader substitutes an approved real digest, and the post clearly states this.
- The current kube-hunter parser accepts one or more values for `--remote`, supports `--report json`, `--log-file`, `--active`, and a JWT value for `--service-account-token` as described.
- The current port-discovery implementation uses a fixed list of Kubernetes-associated ports. The post correctly treats this as revision-specific implementation detail rather than a stable interface.
- The JSON report currently has distinct `services` and `vulnerabilities` collections, supporting the post's warning that service discovery alone is not proof of exploitability.
- `getent`, `timeout`, and `ip route get` are Linux-oriented utilities, consistent with the Linux runner and Docker context of the guide. Operators using other runner operating systems need equivalent tools.
- Docker bridge traffic is normally source-NATed by the Docker host before leaving it, so the instruction to verify the source address observed at the target is important and technically sound.
