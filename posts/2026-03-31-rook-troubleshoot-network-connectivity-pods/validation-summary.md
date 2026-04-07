# Validation Summary: How to Troubleshoot Network Connectivity Between Rook-Ceph Pods

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage)
- Kubernetes (kubectl, pods, services, endpoints, network policies)
- Linux networking tools (ip, ping, nc, tcpdump, nslookup)

## Sources Consulted
- Ceph official documentation: health checks (MON_DOWN, OSD_DOWN, SLOW_OPS) — https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph monitor ports: v1 (6789) and v2/msgr2 (3300) — https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph OSD default port range (6800+) — https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph Manager Prometheus module (default port 9283) — https://docs.ceph.com/en/latest/mgr/prometheus/
- Rook toolbox documentation — https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Rook pod label conventions (app=rook-ceph-mon, app=rook-ceph-osd) — https://rook.io/docs/rook/latest/
- Kubernetes kubectl reference — https://kubernetes.io/docs/reference/kubectl/

## Issues Found
No technical issues found.

## Review Notes
- All Ceph CLI commands (`ceph -s`, `ceph health detail`, `ceph mon dump`) are correct and standard.
- Monitor ports 6789 (v1/legacy) and 3300 (v2/msgr2) are both correct and worth testing.
- The Rook pod label selectors (`app=rook-ceph-mon`, `app=rook-ceph-osd`) match Rook's labeling conventions.
- The mgr Prometheus metrics endpoint on port 9283 is the correct default.
- Health check codes MON_DOWN, OSD_DOWN, and SLOW_OPS are all valid Ceph health check identifiers.
- The `tcpdump` port 6800 is appropriate for OSD traffic capture, as OSDs bind to ports starting at 6800.
- Note that tools like `tcpdump`, `ip`, `ping`, and `nc` may not be available in all container images. The Rook toolbox image typically includes these, but OSD pod images may not. The post correctly uses the tools pod for most commands, though the tcpdump step targets an OSD pod directly where these tools may need to be installed or an ephemeral container used.
- The `kubectl cp` command syntax is correct for copying files from pods.
