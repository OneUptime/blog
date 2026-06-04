# Validation Summary: How to Run TFTP Server in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- TFTP / tftpd-hpa
- dnsmasq DHCP/PXE configuration
- PXE boot
- Cisco IOS SNMP configuration copy
- iptables firewall rules
- Alpine Linux container images

## Sources Consulted
- RFC 1350, The TFTP Protocol (Revision 2): https://datatracker.ietf.org/doc/html/rfc1350
- RFC 2132, DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Docker iptables documentation: https://docs.docker.com/engine/network/firewall-iptables/
- Docker port publishing documentation: https://docs.docker.com/engine/network/port-publishing/
- dnsmasq man page: https://manpages.ubuntu.com/manpages/trusty/en/man8/dnsmasq.8.html
- tftpd-hpa in.tftpd man page: https://manpages.debian.org/bookworm/tftpd-hpa/in.tftpd.8.en.html
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Cisco guide for CISCO-CONFIG-COPY-MIB: https://www.cisco.com/c/en/us/support/docs/ip/simple-network-management-protocol-snmp/15217-copy-configs-snmp.html

## Issues Found
- The Docker Compose examples used `version: "3.8"`, which Docker Compose now treats as obsolete. Removed the `version` key from both Compose snippets.
- The custom Alpine image used `alpine:3.19`, which is past its official support date as of this review. Updated it to `alpine:3.23`.
- The custom `in.tftpd` command omitted `--listen`, so it was not explicit about standalone socket binding inside the container. Added `--listen` to the Dockerfile command.
- The PXE Compose example mixed bridge networking, a Docker-only static IP, host networking, and port mappings. Updated the example so both DHCP and TFTP use host networking, which is the practical pattern for DHCP/PXE broadcast traffic.
- The dnsmasq example advertised the Docker bridge-only address `192.168.100.2` as the TFTP server and used `enable-tftp=false`, which is not the right way to disable dnsmasq TFTP service. Updated the example to use the host TFTP server address and omit `enable-tftp`.
- The Cisco SNMP backup script had `ccCopyServerAddress` and `ccCopyFileName` swapped, and used `active(1)` instead of `createAndGo(4)` for row creation. Corrected the OID value types and row status.
- The firewall example used the host `INPUT` chain, which is not the documented place to restrict Docker-published bridge-network ports. Replaced it with a `DOCKER-USER` rule matching the original destination port.
- The claim that PXE boot requires TFTP was too absolute for modern network boot variants. Reworded it to say traditional PXE boot commonly uses TFTP.

## Review Notes
- The Docker Hub image `pghalliday/tftp:latest` could not be pulled in this environment because Docker Hub returned an unauthenticated pull rate limit. The surrounding Docker and Compose syntax was still validated locally.
- The dnsmasq configuration was checked with `dnsmasq --test`.
- The updated Compose snippets were checked with `docker compose config`.
- The updated Alpine/tftpd-hpa command was checked in an `alpine:3.23` container.
