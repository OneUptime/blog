# Validation Summary: How to Tune Calico on OpenShift Hosted Control Planes for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- OpenShift Hosted Control Planes
- HyperShift
- Kubernetes API server
- Felix
- Calico IPAM
- Prometheus metrics

## Sources Consulted
- Calico documentation: Install Calico on an OpenShift HCP cluster - https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/hostedcontrolplanes
- Red Hat OpenShift documentation: Hosted control planes - https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html-single/hosted_control_planes/
- Kubernetes documentation: API health endpoints - https://kubernetes.io/docs/reference/using-api/health-checks
- Calico documentation: calicoctl patch - https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configure MTU to maximize network performance - https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Change IP pool block size - https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found
- Replaced the Kubernetes API server latency check from deprecated `/healthz` to `/readyz`, because Kubernetes has deprecated `/healthz` since v1.16.
- Removed the hard 10ms latency rule and replaced it with a production-target baseline recommendation, because the reviewed sources do not define 10ms as a universal HCP threshold.
- Corrected the Felix tuning section so it describes local dataplane refresh intervals rather than datastore polling/API server call reduction. `routeRefreshInterval` and `iptablesRefreshInterval` verify dataplane state.
- Increased the sample `routeRefreshInterval` and `iptablesRefreshInterval` values above their documented defaults, because the original values were equal to or lower than defaults and would not reduce background work.
- Updated the MTU patch command to target `installation.operator.tigera.io`, matching Tigera's operator documentation.
- Replaced the invalid IPPool `blockSize` patch with guidance to recreate the pool using Calico's documented process, because `blockSize` can only be set when an IP pool is created.
- Corrected the Felix metric name from `felix_exec_time_seconds` to `felix_exec_time_micros`, matching the current Calico metric reference.

## Review Notes
- The MTU value `1450` is technically plausible for IPv4 VXLAN over a 1500-byte underlay, but production clusters should calculate MTU from the actual underlay and enabled encapsulation modes.
- Exposing Felix metrics on a worker node IP should be access-controlled in production.
