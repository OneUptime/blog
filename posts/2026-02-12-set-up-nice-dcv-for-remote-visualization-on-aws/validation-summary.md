# Validation Summary: How to Set Up NICE DCV for Remote Visualization on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DCV / NICE DCV
- AWS EC2 GPU instances
- AWS CLI
- Amazon Linux 2
- NVIDIA GPU drivers
- GNOME Desktop
- systemd
- ParaView
- Blender
- MATLAB

## Sources Consulted
- Amazon DCV Administrator Guide: What Is Amazon DCV? https://docs.aws.amazon.com/dcv/latest/adminguide/what-is-dcv.html
- Amazon DCV Administrator Guide: Install the Amazon DCV Server on Linux https://docs.aws.amazon.com/dcv/latest/adminguide/setting-up-installing-linux-server.html
- Amazon DCV Administrator Guide: License the Amazon DCV Server https://docs.aws.amazon.com/dcv/latest/adminguide/setting-up-license.html
- Amazon DCV Administrator Guide: Amazon DCV Server parameter reference https://docs.aws.amazon.com/dcv/latest/adminguide/config-param-ref.html
- Amazon DCV Administrator Guide: Starting Amazon DCV sessions https://docs.aws.amazon.com/dcv/latest/adminguide/managing-sessions-start.html
- Amazon DCV Administrator Guide: Understanding Amazon DCV sessions https://docs.aws.amazon.com/dcv/latest/adminguide/managing-sessions-intro.html
- Amazon DCV Administrator Guide: Enabling session storage https://docs.aws.amazon.com/dcv/latest/adminguide/manage-storage.html
- Amazon DCV Administrator Guide: Performing post-installation checks https://docs.aws.amazon.com/dcv/latest/adminguide/setting-up-installing-linux-checks.html
- Amazon EC2 User Guide: NVIDIA drivers for your Amazon EC2 instance https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/install-nvidia-driver.html
- AWS CLI Command Reference: run-instances https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: authorize-security-group-ingress https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Blender Manual: Installing on Linux https://docs.blender.org/manual/en/latest/getting_started/installing/linux.html
- Blender download index for Blender 4.5 Linux tarballs https://download.blender.org/release/Blender4.5/
- MathWorks documentation: Download and Install MATLAB https://www.mathworks.com/help/install/ug/install-products-with-internet-connection.html
- MathWorks documentation: Install Products Programmatically https://www.mathworks.com/help/install/ug/install-noninteractively-silent-installation.html
- ParaView documentation 5.12.0 https://docs.paraview.org/en/v5.12.0/

## Issues Found
- Updated product naming and licensing language from "NICE DCV license is free" to Amazon DCV / formerly NICE DCV with no additional EC2 server charge, matching current AWS documentation.
- Replaced the invalid AMI placeholder `ami-0abc123dcv` with a syntactically valid placeholder AMI ID and clarified that the user must choose the correct Marketplace AMI for their Region.
- Corrected the Amazon Linux 2 DCV download archive from the generic EL7 archive path to the Amazon Linux 2 archive path and updated the extracted directory pattern.
- Added the `nice-dcv-gl` package because `dcvgldiag` is installed with DCV GL and DCV GL is required for GPU sharing in virtual sessions.
- Removed invalid or misleading `dcv.conf` entries: `quality = high` is not a documented display parameter, `enable-file-transfer = true` is not how session storage is enabled, and `create-session = true` would create an automatic console session that conflicts with the later manual console session.
- Corrected `max-concurrent-clients` wording to describe concurrent clients per session, not concurrent sessions.
- Added `sudo passwd ec2-user` because system authentication uses OS credentials and EC2 Linux users do not have a password set by default.
- Corrected the session creation comment from "virtual session" to "console session" and added `--storage-root` for file transfer/session storage.
- Clarified console versus virtual GPU acceleration: console sessions have direct GPU access, while virtual GPU acceleration requires DCV GL configuration.
- Replaced the Amazon Linux 2 Snap-based Blender install with the official Blender Linux tarball workflow, because the original snap commands are not a reliable Amazon Linux 2 default-package path.
- Fixed the MATLAB install example so it unzips into a directory, changes into it, and then runs `./install -inputFile`, matching MathWorks installer documentation.
- Changed `dcvgldiag` to `sudo dcvgldiag`, matching Amazon DCV post-installation check guidance.
- Replaced the Network Load Balancer TLS termination recommendation with VPN, bastion, or Amazon DCV Session Manager guidance for larger deployments.

## Review Notes
The tutorial is technically valid after the corrections. Future improvements could include adding Region-specific Marketplace AMI lookup instructions and a fuller DCV GL virtual-session setup for multi-user GPU sharing.
