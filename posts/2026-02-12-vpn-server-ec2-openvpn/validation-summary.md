# Validation Summary: How to Set Up a VPN Server on EC2 with OpenVPN

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2
- AWS CLI
- Amazon Linux 2023
- OpenVPN
- Easy-RSA
- iptables
- Linux systemd and sysctl

## Sources Consulted
- AWS CLI `run-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI `modify-instance-attribute` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS CLI `create-route` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS VPC NAT instance documentation, including source/destination check requirements: https://docs.aws.amazon.com/vpc/latest/userguide/work-with-nat-instances.html
- Amazon EC2 infrastructure security documentation for source/destination checks: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/infrastructure-security.html
- Amazon Linux 2023 EPEL guidance: https://docs.aws.amazon.com/linux/al2023/ug/epel.html
- Amazon Linux 2023 package list: https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.11.html
- OpenVPN 2.6 manual: https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/
- Easy-RSA upstream releases: https://github.com/OpenVPN/easy-rsa/releases
- AWS VPC pricing for public IPv4 addresses: https://aws.amazon.com/vpc/pricing/

## Issues Found
- The Amazon Linux installation commands used the Fedora EPEL 9 release RPM with `yum`. Amazon Linux 2023 does not have binary-compatible EPEL repositories, while OpenVPN and `iptables-services` are available in Amazon Linux 2023 packages. Changed the commands to use `dnf` for Amazon Linux 2023 packages and to install Easy-RSA from the upstream OpenVPN Easy-RSA release.
- The Easy-RSA setup block assumed `/usr/share/easy-rsa/3/*` from a distro package. After switching to the upstream Easy-RSA release, removed the symlink commands and kept the workflow in `~/easy-rsa`.
- The server and logrotate examples used `sudo cat > protected-file`, which would fail because shell redirection runs as the non-root user. Replaced those with `sudo tee ... > /dev/null`.
- The server configuration directory was not guaranteed to exist before writing `server.conf`. Added `sudo mkdir -p /etc/openvpn/server /var/log/openvpn`.
- OpenVPN 2.6 treats `cipher` as legacy for TLS data-channel cipher negotiation. Replaced `cipher AES-256-GCM` with `data-ciphers AES-256-GCM` in both server and client examples.
- The NAT rule masqueraded all VPN client traffic leaving the instance, which conflicted with the later route-table guidance that return traffic should route back to `10.8.0.0/24`. Changed the NAT rule to exclude the example VPC CIDR and determine the primary network interface dynamically instead of assuming `eth0`.
- The client config script block showed script contents but did not actually create `/home/ec2-user/make-client-config.sh`. Wrapped it in a heredoc command so the following `chmod` and execution commands work as written.
- The active connection count used `grep "^10.8.0"`, which does not match the normal OpenVPN status file client rows. Changed it to count `CLIENT_LIST` rows.
- The cost claim said the setup costs under `$10/month`. Updated it to a region-dependent `$10-12/month before data transfer` because AWS charges for public IPv4 addresses and EC2 pricing varies by Region.

## Review Notes
- The security group example still allows SSH from `0.0.0.0/0`. That is syntactically valid, but a production deployment should restrict SSH to trusted source IPs or use AWS Systems Manager Session Manager.
- The tutorial uses `nopass` keys for operational simplicity. That is valid for unattended services, but production environments should protect private keys carefully and consider the team’s certificate handling process.
