# Validation Summary: How to Set Up a Next.js Production Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Next.js
- Node.js and npm
- systemd
- firewalld
- SELinux

## Sources Consulted
- Next.js deployment documentation: https://nextjs.org/docs/pages/getting-started/deploying
- Next.js CLI documentation: https://nextjs.org/docs/15/pages/api-reference/cli/next
- Red Hat Enterprise Linux 9 DNF module documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9.5 release notes for Node.js 22: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.5_release_notes/new-features
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/254/systemd.service.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux

## Issues Found
- The original package installation commands used `epel-release`, `"Development Tools"`, and `<package-name>`, which did not install the Node.js runtime required for a Next.js production server. Updated the instructions to install the RHEL-supported `nodejs:22` module stream and firewalld.
- The original service configuration used placeholder paths such as `/etc/<service>/config.conf` and did not define a working Next.js service. Replaced this with a concrete `nextjs.service` systemd unit that runs `npm run start` from the application directory as a dedicated non-root user.
- The original start, status, verification, log, firewall, monitoring, and troubleshooting commands used `<service>` placeholders and would not run. Replaced them with concrete `nextjs`, `curl`, `journalctl`, `firewall-cmd --add-port=3000/tcp`, and process-monitoring commands.
- The original guide implied generic RHEL compatibility, but the corrected Node.js 22 module stream is documented for RHEL 9.5 and later. Updated the prerequisite to RHEL 9.5 or later.

## Review Notes
The post is now technically valid for a conventional self-hosted Next.js deployment using `next build` followed by `next start`. In a future revision, the post could add reverse proxy and TLS termination details for serving public traffic on ports 80 and 443.
