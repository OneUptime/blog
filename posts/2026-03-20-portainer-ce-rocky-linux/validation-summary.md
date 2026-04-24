# Validation Summary: How to Install Portainer CE on Rocky Linux with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rocky Linux 8
- Rocky Linux 9
- Docker CE
- Portainer CE
- SELinux
- firewalld
- dnf-automatic
- cgroups

## Sources Consulted
- Rocky Linux Docker installation guide: https://docs.rockylinux.org/gemstones/containers/docker/
- Rocky Linux SELinux guide: https://docs.rockylinux.org/guides/security/learning_selinux/
- Docker Engine installation on CentOS: https://docs.docker.com/engine/install/centos/
- Docker cgroup v2 behavior and detection: https://docs.docker.com/engine/containers/runmetrics/
- Portainer CE install with Docker on Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer SELinux FAQ: https://docs.portainer.io/2.33-lts/faqs/installing/my-host-is-using-selinux.-can-i-use-portainer
- Red Hat DNF automatic security updates guide: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_and_monitoring_security_updates/index
- Red Hat RHEL 8 cgroups v2 documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/using-cgroups-v2-to-control-distribution-of-cpu-time-for-applications_managing-monitoring-and-updating-the-kernel
- Red Hat RHEL 9 cgroups v2 documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_containers_considerations-in-adopting-rhel-9
- Red Hat Python in RHEL 8: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/htmlsingle/considerations_in_adopting_rhel_8/identity-management_considerations-in-adopting-rhel-8
- Red Hat Python in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/assembly_installing-and-using-python_installing-and-using-dynamic-programming-languages

## Issues Found
- The Docker repository URL used the CentOS path. I changed it to Docker's RHEL repository URL, which is what Rocky Linux's official documentation now uses.
- The conflicting-package removal command was outdated and incomplete. I replaced it with Docker's current documented package list for removing older Docker packages before installation.
- The guide used `newgrp docker` immediately after `usermod`. Rocky Linux's documentation says the user must log out and back in for the group membership to take effect, so I updated the instructions and switched the immediate verification command to `sudo docker run hello-world`.
- The SELinux guidance was incorrect. Portainer's current documentation says SELinux-enabled hosts require `--privileged`; using a `:z` label alone is not the documented Portainer approach. I updated the SELinux explanation, the deployment command, and the conclusion accordingly.
- The Portainer deployment command used the `latest` tag. I changed it to `portainer/portainer-ce:lts`, which matches Portainer's current installation documentation.
- The `dnf-automatic` step did not actually enable automatic installation as written. I changed the timer to `dnf-automatic-install.timer`, which is the documented systemd timer for downloading and installing updates automatically.
- The cgroups detection example was reversed. Docker's documentation states that `/sys/fs/cgroup/cgroup.controllers` being present means cgroups v2, not v1. I replaced the example with a correct detection snippet.
- The troubleshooting section claimed Rocky Linux 9 with cgroups v2 needs a manual `containerd` reconfiguration. Current Docker documentation instead says Docker supports cgroups v2 and uses the `systemd` cgroup driver by default on cgroups v2 hosts, so I replaced that section with a verification step.
- The prerequisites included a specific RAM and disk minimum that I could not verify in the official Rocky Linux, Docker, or Portainer documentation consulted, so I removed that unsupported requirement.

## Review Notes
- Port `8000` is optional in Portainer and is only needed for Edge Agent tunnels. The post still opens it because the original guide exposed that port, but readers who do not use Edge features can omit it.
- The Rocky Linux 8 versus 9 table is broadly accurate for the covered topics, but the Python entries describe the default platform version rather than every Python stream available in AppStream.
