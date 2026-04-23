# Validation Summary: How to Set Up Rancher for Automotive - For

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- K3s
- Helm
- Apache Kafka
- CARLA Simulator
- Eclipse hawkBit
- NVIDIA GPU scheduling
- Automotive edge and OTA workloads

## Sources Consulted
- Rancher: https://ranchermanager.docs.rancher.com/v2.11/reference-guides/rancher-manager-architecture/communicating-with-downstream-user-clusters
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes GPU scheduling: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus
- K3s configuration and install script usage: https://docs.k3s.io/installation/configuration
- K3s private registry configuration: https://docs.k3s.io/installation/private-registry
- Bitnami Kafka chart README: https://github.com/bitnami/charts/blob/main/bitnami/kafka/README.md
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- CARLA Docker docs: https://carla.readthedocs.io/en/0.9.13/build_docker/
- CARLA package and port requirements: https://carla.readthedocs.io/en/0.9.16/getting_started/
- Eclipse hawkBit getting started: https://eclipse.dev/hawkbit/gettingstarted/
- Eclipse hawkBit run guide: https://eclipse.dev/hawkbit/guides/runhawkbit/

## Issues Found
- The Kubernetes `Deployment` manifests were invalid because `apps/v1` Deployments require an explicit `.spec.selector` that matches `.spec.template.metadata.labels`. I added matching selectors and labels to the ADAS, telemetry, and factory deployments.
- The `DaemonSet` manifest was invalid for the same reason. I added a selector and matching pod-template labels to the watchdog DaemonSet.
- The Job manifests omitted `restartPolicy`, and the ADAS Job also omitted `completions` even though it was described as running 10 scenarios in parallel. I added `restartPolicy: Never` to both Jobs and `completions: 10` to the ADAS Job so it behaves as a fixed-count parallel Job.
- The CARLA image name was incorrect. I changed `carlasimulator/carla:0.9.15` to the official `carlasim/carla:0.9.15`.
- The CARLA container startup was modeled with Kubernetes `args` in a way that would not reliably invoke `CarlaUE4.sh`. I changed it to use `command` plus `args`, matching CARLA's documented Docker invocation style.
- The CARLA test job referenced `carla-simulator` as a host but no Kubernetes `Service` existed. I added a Service so the Job has a stable in-cluster endpoint.
- CARLA uses two default TCP ports. I exposed ports `2000` and `2001` and added required port names on the multi-port Service.
- The GPU examples were missing an operational prerequisite. I added comments noting that `nvidia.com/gpu` requires the NVIDIA device plugin on cluster nodes.
- The Kafka install example used outdated or incorrect chart details for the current Bitnami Kafka chart. I switched it to the official OCI chart reference, added `--create-namespace`, and replaced the old persistence setting with `controller.persistence.size`.
- The K3s installer example was too loose for current install-script guidance and used a label value that could easily violate Kubernetes label syntax. I made the server role explicit, switched to `sh -s -`, used the documented `--disable=traefik` form, and changed the model label example to `MODEL_CODE`.
- The hawkBit Helm command implied an external chart without saying it was internal. I clarified that it is an example internal Helm chart and added `--create-namespace` so the install command is complete.
- Two sections mixed shell and YAML under a single `yaml` fence. I separated the Helm commands into `bash` blocks and kept manifests in `yaml` blocks so the snippets are syntactically coherent.

## Review Notes
- The post is technically relevant and salvageable, but it is more Kubernetes-focused than Rancher-specific; Rancher is discussed accurately at the cluster-management level rather than through Rancher-specific manifests or UI steps.
- The `myregistry/*` images and the hawkBit chart are clearly internal placeholders after the fixes, so they are acceptable as examples but are not directly runnable without the author's own registry assets.
- The functional-safety caveat is directionally correct: Kubernetes should not be presented as hosting safety-critical automotive control logic, and the post now stays on the non-safety side of that boundary.
