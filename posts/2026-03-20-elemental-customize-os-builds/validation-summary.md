# Validation Summary: How to Customize Elemental OS Builds

## Status
validated

## Post Type
Guide

## Technologies Covered
- SUSE Rancher Prime: OS Manager / Elemental
- SUSE Linux Micro container images
- Docker
- systemd
- GitHub Actions
- Go
- Datadog Agent

## Sources Consulted
- SUSE Rancher Prime: OS Manager custom OS image guide: https://documentation.suse.com/cloudnative/os-manager/1.7/en/operator-operational-tasks/custom-images.html
- SUSE Rancher Prime: OS Manager installation customization guide: https://documentation.suse.com/cloudnative/os-manager/1.9/en/installation/customize-installation/custom-install.html
- Elemental toolkit documentation overview: https://rancher.github.io/elemental-toolkit/docs/
- systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- sysctl.d manual: https://www.freedesktop.org/software/systemd/man/sysctl.d.html
- Datadog Agent install on limited-connectivity hosts: https://docs.datadoghq.com/agent/guide/installing-the-agent-on-a-server-with-limited-internet-connectivity/
- Datadog standalone role repository defaults: https://docs.datadoghq.com/agent/guide/ansible_standalone_role/
- Datadog SUSE Agent commands: https://docs.datadoghq.com/es/agent/basic_agent_usage/suse/
- GitHub `actions/checkout` README: https://github.com/actions/checkout
- Docker `login-action` README: https://github.com/docker/login-action
- Go release history and support policy: https://go.dev/doc/devel/release

## Issues Found
- The post used outdated Elemental base image references such as `registry.suse.com/rancher/sle-micro:latest`. I replaced them with the current documented SL Micro OS container image family under `registry.suse.com/suse/sl-micro/6.1/baremetal-os-container:latest`.
- The Dockerfile examples omitted the documented `/etc/os-release` metadata updates and `elemental init` rerun required to keep customized Elemental images bootable and upgradeable. I added those steps to each customization example.
- The Prometheus node exporter package and service names were written with hyphens. SUSE documentation uses `prometheus-node_exporter`, so I corrected both the install and `systemctl enable` lines.
- The multi-stage example used `golang:1.21`, which is no longer a supported Go release. I updated it to `golang:1.26` based on Go’s current support policy and release history.
- The configuration example tried to run `sysctl --system` during the image build. That applies kernel settings to the build environment, not to future boots of the installed OS. I removed that command and kept the persistent `sysctl.d` configuration file example.
- The Datadog example downloaded a specific RPM from an old S3 path and installed it with `rpm -i`, which bypasses normal repository/dependency handling. I replaced it with an install flow that uses Datadog’s official SUSE repository and current RPM signing key.
- The verification command assumed one built image would contain unrelated example artifacts like both node exporter and `my-tool`. I replaced it with a generic verification command that checks the Elemental image metadata and CLI presence.
- The GitHub Actions workflow did not fetch tag history, did not authenticate to the registry before `docker push`, and did not pass the build arguments now required by the corrected Dockerfile pattern. I added `fetch-depth: 0`, `docker/login-action@v3`, and the `IMAGE_REPO` / `IMAGE_TAG` build arguments.

## Review Notes
- The examples use the `baremetal-os-container` flavor. Readers targeting virtual machines or real-time workloads should switch to the matching `kvm` or `rt` image flavor from the OS Manager image catalog.
- The Datadog example now follows Datadog’s documented SUSE package flow, but production users should still confirm vendor support for the exact SL Micro / Elemental release they deploy.
- For production reproducibility, pinning immutable container tags is safer than relying on `:latest`.
- The workflow’s `paths` filter still only watches `Dockerfile.elemental-custom` and `config/**`. Real builds that depend on `systemd/**`, `scripts/**`, or similar inputs should include those paths too.
