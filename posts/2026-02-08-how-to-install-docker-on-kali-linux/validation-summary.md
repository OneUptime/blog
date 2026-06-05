# Validation Summary: How to Install Docker on Kali Linux

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Kali Linux
- Debian APT repositories
- systemd
- WSL
- OWASP ZAP
- Metasploit
- Nmap
- DVWA
- OWASP Juice Shop
- Docker networking

## Sources Consulted
- Docker Engine install documentation for Debian: https://docs.docker.com/engine/install/debian/
- Docker Engine install overview for derivative distributions: https://docs.docker.com/engine/install/
- Docker Linux post-installation documentation: https://docs.docker.com/engine/install/linux-postinstall/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker packet filtering and firewall documentation: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker nftables documentation: https://docs.docker.com/engine/network/firewall-nftables/
- Docker run reference: https://docs.docker.com/engine/containers/run/
- Kali Linux updating documentation: https://www.kali.org/docs/general-use/updating-kali/
- Kali Linux branches documentation: https://www.kali.org/docs/general-use/kali-branches/
- Kali Linux relationship with Debian documentation: https://www.kali.org/docs/policy/kali-linux-relationship-with-debian/
- Kali Linux official Docker image documentation: https://www.kali.org/docs/containers/official-kalilinux-docker-images/
- Microsoft WSL advanced settings documentation: https://learn.microsoft.com/windows/wsl/wsl-config
- ZAP Docker documentation: https://www.zaproxy.org/docs/docker/
- ZAP Docker user guide: https://www.zaproxy.org/docs/docker/about/
- Rapid7 Metasploit Framework repository: https://github.com/rapid7/metasploit-framework

## Issues Found
- The Kali update command used `apt-get full-upgrade`. Kali's current update documentation recommends `dist-upgrade` for normal safe updates, with `full-upgrade` described as a fallback. Changed the command to `sudo apt-get update && sudo apt-get dist-upgrade -y`.
- The conflicting-package removal command included obsolete package names and could fail when packages such as `docker-engine` are not known to APT. Replaced it with Docker's current `dpkg --get-selections ... | cut -f1` removal pattern for conflicting packages.
- The Docker repository setup hard-coded Debian Bookworm and described Bookworm packages as compatible with Kali rolling. Docker's current Debian guidance supports Debian Trixie and advises derivative distributions such as Kali to substitute a corresponding Debian release codename. Updated the text and command to use `trixie`.
- The OWASP ZAP daemon example exposed the API port but omitted the API address and API key configuration shown in ZAP's Docker guide for API access. Added `api.addrs` and `api.key` configuration flags.
- The troubleshooting section suggested pinning Docker 27 packages, which is outdated relative to current Docker package versions. Replaced it with the current Docker pattern of listing available versions and installing a selected matching `docker-ce` and `docker-ce-cli` version.
- The iptables troubleshooting section said Docker works better with legacy iptables. Docker's current documentation says Docker supports both `iptables-nft` and `iptables-legacy`, while direct `nft` rules are not supported by the default iptables firewall backend. Updated the wording and commands to inspect the active iptables backends instead of switching unconditionally to legacy.
- The summary repeated the outdated Bookworm guidance. Updated it to refer to a supported Debian codename such as Trixie.

## Review Notes
The remaining commands and snippets are technically plausible for a Docker-on-Kali workflow. Some container images used for vulnerable labs and security tools are third-party or training images rather than Docker/Kali-maintained installation components, so future reviews should re-check image availability if the post is updated.
