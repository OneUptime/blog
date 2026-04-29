# Validation Summary: How to Set Up K3s for Factory Floor IoT

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- K3s
- Kubernetes
- Industrial IoT / IIoT
- OPC UA
- Modbus
- MQTT
- TimescaleDB
- Grafana Helm chart
- Linux real-time kernels

## Sources Consulted
- K3s configuration options: https://docs.k3s.io/installation/configuration
- K3s advanced configuration and node labels: https://docs.k3s.io/advanced
- K3s Helm controller / `HelmChart` CRD: https://docs.k3s.io/add-ons/helm
- K3s packaged components and disabling Traefik: https://docs.k3s.io/networking/networking-services
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes volumes and `hostPath` types: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes CronJobs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CPU manager policies: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes topology manager: https://kubernetes.io/docs/tasks/administer-cluster/topology-manager
- Kubernetes reserved compute resources: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Debian `linux-image-rt-amd64` package reference: https://packages.debian.org/bookworm/linux-image-rt-amd64
- Ubuntu real-time kernel enablement: https://documentation.ubuntu.com/real-time/latest/how-to/enable-real-time-ubuntu/
- TimescaleDB Docker installation docs: https://docs.timescale.com/self-hosted/latest/install/installation-docker/
- Grafana Helm installation docs: https://grafana.com/docs/grafana/latest/installation/helm/

## Issues Found
- The real-time kernel install line was written as if `apt-get install linux-image-rt-amd64` applied to both Debian and Ubuntu. I changed it to a Debian x86_64-specific instruction because that package name is the Debian metapackage; Ubuntu uses a different real-time kernel enablement path.
- The OPC-UA Deployment used `hostNetwork: true` while still referencing a cluster service name (`local-mqtt-broker`) but did not set `dnsPolicy: ClusterFirstWithHostNet`. I added that DNS policy so cluster DNS resolution remains available.
- The Modbus Bridge, Predictive Maintenance, and Quality Inspection `apps/v1` Deployments were missing required `.spec.selector` fields and matching pod template labels. I added selectors and labels so the manifests are valid for `apps/v1`.
- The Modbus Bridge `hostPath` mount targeted `/dev/ttyS0` without declaring the device type. I added `type: CharDevice` to make the intent explicit and align with Kubernetes `hostPath` volume typing.
- The TimescaleDB StatefulSet was missing the governing Service setup and matching pod template labels. I added a headless `Service`, `serviceName: timescaledb`, and pod labels so the StatefulSet matches Kubernetes requirements.

## Review Notes
- `kubelet-arg` is still supported by K3s, but the K3s docs note that kubelet configuration files / drop-ins are the preferred path on newer releases.
- The post still uses placeholder images, hostnames, and application-specific environment variables for the industrial services. Those are acceptable as examples, but operators would need to supply real registry images, credentials, and endpoint details.
- The TimescaleDB image tag and Grafana chart version are valid examples, though pinning exact immutable versions is safer than relying on moving `latest-*` style tags in production.
