# Validation Summary: How to Set Up Ubuntu Server on a DigitalOcean Droplet from Scratch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server 24.04 LTS
- DigitalOcean Droplets and Backups
- OpenSSH server (socket-activated on Ubuntu 22.10+)
- ssh-keygen (ed25519)
- adduser / usermod
- rsync (--chown)
- UFW (Uncomplicated Firewall)
- hostnamectl / timedatectl
- Fail2ban
- unattended-upgrades
- fallocate / mkswap / swapon / sysctl (vm.swappiness)
- do-agent (DigitalOcean monitoring agent)

## Sources Consulted
- Ubuntu Discourse: "SSHd now uses socket-based activation (Ubuntu 22.10 and later)" — https://discourse.ubuntu.com/t/sshd-now-uses-socket-based-activation-ubuntu-22-10-and-later/30189
- Launchpad Bug #2069041 — Changing Port in sshd_config requires `systemctl daemon-reload` — https://bugs.launchpad.net/ubuntu/+source/openssh/+bug/2069041
- DigitalOcean Docs — Install the Metrics Agent — https://docs.digitalocean.com/products/monitoring/how-to/install-metrics-agent/
- digitalocean/do-agent on GitHub — https://github.com/digitalocean/do-agent
- DigitalOcean Docs — Backups Pricing — https://docs.digitalocean.com/products/backups/details/pricing/
- DigitalOcean Backups pricing page — https://www.digitalocean.com/pricing/backups
- DigitalOcean blog: "Introducing the next evolution of DigitalOcean Backups" — https://www.digitalocean.com/blog/introducing-enhanced-backups
- `ufw(8)`, `sshd_config(5)`, `fail2ban-client(1)` manual pages

## Issues Found

1. **Incorrect SSH restart procedure for Ubuntu 22.10+/24.04.** The post recommended `systemctl restart sshd` after editing `/etc/ssh/sshd_config`. Two problems with this on Ubuntu 24.04:
   - The unit on Ubuntu is `ssh.service`, not `sshd.service` (sshd is the Red Hat naming convention; the alias is not reliably present on modern Ubuntu).
   - Since Ubuntu 22.10, OpenSSH is socket-activated by default. The actual listener is held by `ssh.socket`, and a systemd generator parses `sshd_config` to produce `ListenStream=` drop-ins. Changing the `Port` directive therefore requires `systemctl daemon-reload && systemctl restart ssh.socket`; restarting only the service does not move the listener to the new port.

   Replaced the single `systemctl restart sshd` command with the correct three-step sequence (`daemon-reload`, restart `ssh.socket`, restart `ssh`) and added a brief note explaining when the socket restart is needed and the correct Ubuntu unit name.

2. **Outdated DigitalOcean backups pricing claim.** The post stated backups "add 20% to the cost but give you automated weekly snapshots." This was historically true but DigitalOcean has since introduced multiple tiers: weekly (20%), daily (30%), and usage-based intra-day plans (every 12h, 6h, or 4h) billed per restorable GiB/month. Updated the sentence to mention all current tiers so readers can choose based on RPO.

## Review Notes

- `ssh-keygen -t ed25519 -C "..."` is the recommended modern key type and the command is correct.
- `rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy` is correct — `--archive` preserves the 700/600 permissions for `.ssh` and `authorized_keys`, and `--chown` (requires rsync 3.1.0+, present on Ubuntu 24.04) handles ownership in one step.
- The UFW sequence correctly opens 2222/tcp *before* `ufw enable`, with an explicit warning in the post about lockout risk — this is the right order.
- The fail2ban approach (`cp jail.conf jail.local`) works but the fail2ban project recommends creating a minimal `jail.local` with only the overrides rather than copying the entire `jail.conf`. Both are functional; this is stylistic only.
- The do-agent install URL `https://repos.insights.digitalocean.com/install.sh` is confirmed current per DigitalOcean's official docs (May 2026).
- `127.0.1.1 web-prod-01` follows the Debian/Ubuntu `/etc/hosts` convention for the local hostname (not `127.0.0.1`), which is correct.
- The swap file sequence (`fallocate` → `chmod 600` → `mkswap` → `swapon` → `/etc/fstab`) and `vm.swappiness=10` for server workloads are standard and correct.
- `Unattended-Upgrade::Automatic-Reboot` and `Automatic-Reboot-Time` keys are accurate against the comments in `/etc/apt/apt.conf.d/50unattended-upgrades` on Ubuntu 24.04.
