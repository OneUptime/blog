# Validation Summary: How to Install Portainer CE on openSUSE with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- openSUSE Leap
- openSUSE Tumbleweed
- Docker
- AppArmor
- firewalld
- zypper

## Sources Consulted
- Portainer CE install docs for Docker on Linux (LTS): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer CE install docs for Docker on Linux (STS): https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Docker Engine installation overview: https://docs.docker.com/engine/install/
- Docker AppArmor documentation: https://docs.docker.com/engine/security/apparmor/
- openSUSE Security and Hardening Guide, firewalld: https://doc.opensuse.org/documentation/leap/security/html/book-security/cha-security-firewall.html
- openSUSE Security and Hardening Guide, AppArmor getting started: https://doc.opensuse.org/documentation/leap/security/html/book-security/cha-apparmor-start.html
- openSUSE Software package page for `docker`: https://software.opensuse.org/package/docker?locale=en
- openSUSE Software install instructions for `docker` from `Virtualization:containers`: https://software.opensuse.org/download/package?package=docker&project=Virtualization%3Acontainers
- openSUSE download page for Leap 15.5 showing EOL status: https://get.opensuse.org/leap/15.5/

## Issues Found
- The post said openSUSE "underpins SUSE Linux Enterprise". I corrected this to reflect the actual relationship: openSUSE is a community distribution sponsored by SUSE, while Leap uses code from SUSE Linux Enterprise.
- The post targeted openSUSE Leap 15.5, which is EOL as of the validation date. I updated the post to use Leap 15.6 instead.
- The Docker installation section used Docker's SLES repository as if it were an official/current openSUSE installation path. That is not documented by Docker as a supported openSUSE install method, and the referenced SLES x86_64 repository path is no longer valid. I replaced it with the current openSUSE `Virtualization:containers` repository commands published on software.opensuse.org.
- The AppArmor section claimed Docker installs a profile that should be reloaded from `/etc/apparmor.d/docker`. Current Docker documentation says Docker automatically generates and loads the `docker-default` container profile, so I changed the instructions to verify `docker-default` instead of loading a non-portable profile path.
- The firewall section referred to "SuSEfirewall2 or firewalld". For the versions covered here, `firewalld` is the default openSUSE firewall manager, so I corrected the wording.
- The Portainer deployment used `portainer/portainer-ce:latest`. Current Portainer installation docs use channel tags such as `lts` and `sts`; I updated the command to `portainer/portainer-ce:lts` to match the official LTS install guidance.
- The AppArmor troubleshooting section suggested `aa-complain /usr/sbin/docker`, which does not match the documented Docker AppArmor behavior on current systems. I replaced it with a safer verification command that checks for the `docker-default` profile.
- The final section repeated outdated Docker CE repository guidance. I rewrote it to match the openSUSE `Virtualization:containers` repository used earlier in the post.

## Review Notes
- Portainer port `8000` is optional and mainly needed for Edge agent features. The post still opens it because that matches Portainer's default Docker installation examples.
- Leap 15.6 itself is close to end of maintenance as of 2026-04-24. A future refresh should move the guide to Leap 16.x once the Docker packaging guidance for that release is intentionally updated again.
