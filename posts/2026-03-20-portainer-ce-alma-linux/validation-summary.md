# Validation Summary: How to Install Portainer CE on AlmaLinux with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- AlmaLinux 8
- AlmaLinux 9
- Docker CE
- Portainer CE
- SELinux
- firewalld
- DNF / dnf-automatic
- systemd

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Portainer Docs: Install Portainer CE with Docker on Linux - https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Docs: Initial setup - https://docs.portainer.io/start/install-ce/server/setup
- Portainer Docs: My host is using SELinux. Can I use Portainer? - https://docs.portainer.io/2.33-lts/faqs/installing/my-host-is-using-selinux.-can-i-use-portainer
- Portainer Docs: Requirements and prerequisites - https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer Docs: Lifecycle policy - https://docs.portainer.io/start/lifecycle
- DNF documentation: DNF Automatic - https://dnf.readthedocs.io/en/stable/automatic.html
- Red Hat Documentation: RHEL 8 cgroups v2 / default cgroups v1 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/using-cgroups-v2-to-control-distribution-of-cpu-time-for-applications_managing-monitoring-and-updating-the-kernel
- Red Hat Documentation: RHEL 9 cgroupfs / default cgroups v2 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_real_time/9/html/optimizing_rhel_9_for_real_time_for_low_latency_operation/assembly_using-cgroupfs-to-manually-manage-cgroups_optimizing-rhel9-for-real-time-for-low-latency-operation
- AlmaLinux Wiki FAQ - https://wiki.almalinux.org/FAQ.html

## Issues Found
- The Docker cleanup command used an outdated package list and the guide pointed to Docker's CentOS repository. I updated the package removal command to match Docker's current RHEL installation docs and switched the repository URL to `https://download.docker.com/linux/rhel/docker-ce.repo`, which is the closer upstream match for AlmaLinux's RHEL-compatible base.
- The SELinux guidance was incorrect. Portainer's documentation says SELinux-enabled hosts require `--privileged`; using a `:z` label on the Docker socket alone is not the documented fix. I updated both the explanatory note and the `docker run` example.
- The firewall step described port `8000/tcp` as required. Portainer documents `8000/tcp` as optional and only needed for Edge Agents, so I corrected the wording.
- The Portainer deployment example used the mutable `latest` tag. I changed it to `portainer/portainer-ce:lts` so the guide tracks the Long Term Support stream instead of an unqualified moving tag.
- The `dnf-automatic` section did not actually enable automatic installation of security updates. I kept `upgrade_type = security` and changed the enabled timer to `dnf-automatic-install.timer`, which is the timer that downloads and installs updates automatically.
- The overview overstated AlmaLinux as offering "full binary compatibility" with RHEL. I reduced that to plain RHEL compatibility to match AlmaLinux's current wording more closely.

## Review Notes
- As of 2026-04-24, Portainer's lifecycle page lists `2.39 LTS` and `2.40 STS` as the current release streams, and Portainer recommends LTS for production workloads.
- The `2GB RAM, 20GB disk` prerequisite in the post appears to be author guidance rather than a vendor-published minimum in the Docker or Portainer documentation I reviewed.
