# Validation Summary: How to Choose Between Colima and Docker Desktop on macOS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Desktop
- Colima
- Docker CLI
- Docker Compose
- Docker Buildx
- Kubernetes
- k3s
- macOS virtualization
- VirtioFS, gRPC FUSE, sshfs, and 9p mounts
- Homebrew

## Sources Consulted
- Docker Desktop documentation: https://docs.docker.com/desktop/
- Docker Desktop for Mac installation documentation: https://docs.docker.com/desktop/setup/install/mac-install/
- Docker Desktop settings documentation: https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Docker Desktop networking and file-sharing architecture documentation: https://docs.docker.com/desktop/features/networking/
- Docker Desktop VMM documentation: https://docs.docker.com/desktop/features/vmm/
- Docker Compose installation documentation: https://docs.docker.com/compose/install/
- Docker pricing page: https://www.docker.com/pricing/
- Docker pricing FAQ and subscription terms summary: https://www.docker.com/pricing/faq/
- Colima commands documentation: https://colima.run/docs/commands/
- Colima configuration documentation: https://colima.run/docs/configuration/
- Colima profiles documentation: https://colima.run/docs/profiles/
- Colima Homebrew formula: https://formulae.brew.sh/formula/colima

## Issues Found
- The Colima default disk size was listed as 60GB. Current Colima command documentation lists the default disk size as 100 GiB, so the installation comment was updated.
- Several Colima resource examples used `--cpu`. Current Colima documentation uses `--cpus`, so the examples were corrected.
- The performance section said both tools run a Linux VM on Apple's Virtualization framework. Current Docker Desktop supports multiple VMMs, and Colima defaults to QEMU unless started with `--vm-type vz`, so the wording was made more precise.
- The VirtioFS Colima example omitted `--vm-type vz`. Colima documents VirtioFS as requiring VZ on macOS 13+, so the command was changed to `colima start --vm-type vz --mount-type virtiofs`.
- The post said `colima template` opens a YAML configuration file. Colima documents `colima template` as printing a template, while `colima start --edit` edits configuration, so the command and explanation were corrected.
- Docker Desktop pricing was outdated at $5/user/month. Current Docker pricing lists paid tiers starting at $9/user/month on an annual plan or $11/user/month on a monthly plan, so the pricing text was updated.
- The Rosetta comparison said Docker Desktop has built-in Rosetta support and Colima requires manual setup. Current docs describe Docker Desktop's Rosetta option with Apple Virtualization framework and Colima's `--vm-type vz --vz-rosetta` flag, so the table was corrected.
- The Docker Desktop VM wording was narrowed from a LinuxKit-based custom VM to a Linux VM because current Docker Desktop documentation emphasizes multiple VMM choices.

## Review Notes
The post is technically relevant and remains a useful practical comparison. Some benchmark percentages are workload-dependent and not sourced from official docs, but they are presented as variable estimates rather than strict guarantees.
