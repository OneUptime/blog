# Validation Summary: Installing Portainer CE on CentOS with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- CentOS Stream
- Docker Engine
- Portainer CE
- firewalld
- SELinux

## Sources Consulted
- Docker Docs: Install Docker Engine on CentOS — https://docs.docker.com/engine/install/centos/
- Docker Docs: Linux post-installation steps for Docker Engine — https://docs.docker.com/engine/install/linux-postinstall
- Portainer Docs: Install Portainer CE with Docker on Linux — https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Docs: My host is using SELinux. Can I use Portainer? — https://docs.portainer.io/sts/faqs/installing/my-host-is-using-selinux.-can-i-use-portainer
- Portainer Docs: Updating on Docker Standalone — https://docs.portainer.io/start/upgrade/docker
- firewalld Documentation: `firewall-cmd` man page — https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld Documentation: Open a Port or Service — https://firewalld.org/documentation/howto/open-a-port-or-service

## Issues Found
- The prerequisites listed CentOS Stream 8, but Docker's official CentOS installation documentation currently supports CentOS Stream 9 and 10. I updated the prerequisite to match the supported versions.
- The Docker installation step used Docker's convenience script. Docker documents the RPM repository method as the recommended approach for CentOS, and reserves the convenience script for testing and development environments. I replaced the install commands with the repository-based workflow.
- The Portainer deployment command did not account for SELinux, which is commonly enabled on CentOS. Portainer's documentation states that local Docker deployments on SELinux-enabled hosts require the `--privileged` flag, so I added it to the `docker run` command and corrected the SELinux troubleshooting guidance.
- The firewall step treated port `8000/tcp` as mandatory. Portainer documents port 8000 as optional and only needed for Edge Agent communication, so I marked it as optional.
- The troubleshooting section recommended `chmod 666 /var/run/docker.sock`, which is insecure and not Docker's documented approach. I replaced it with Docker's group-membership fix and clarified that it applies to running Docker commands as a non-root user.

## Review Notes
- The post is a technical installation guide and includes shell commands, deployment commands, and platform-specific configuration details, so it was reviewed as a code-oriented tutorial rather than a non-code blog post.
- Portainer documentation distinguishes between STS and LTS release streams. This post still uses the `latest` image tag, which is valid, but a future revision could pin to an explicit stream or version for more predictable upgrade behavior.
