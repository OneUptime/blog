# Validation Summary: How to Set Up Elemental with USB Boot

## Status
validated

## Post Type
Guide

## Technologies Covered
- SUSE Rancher Prime: OS Manager (Elemental)
- Rancher MachineRegistration and SeedImage resources
- Kubernetes and `kubectl`
- SLE Micro / SL Micro seed images
- USB image writing with `dd` and Rufus

## Sources Consulted
- SUSE Rancher Prime: OS Manager installation overview: https://documentation.suse.com/cloudnative/os-manager/1.8/en/installation/installation.html
- SUSE Rancher Prime: OS Manager quickstart (command line): https://documentation.suse.com/cloudnative/os-manager/1.9/en/quickstarts/quickstart-cli.html
- SUSE Rancher Prime: OS Manager SeedImage reference: https://documentation.suse.com/cloudnative/os-manager/1.9/en/references/seedimage-reference.html
- SUSE Rancher Prime: OS Manager MachineRegistration reference: https://documentation.suse.com/cloudnative/os-manager/latest/en/references/machineregistration-reference.html
- SUSE Rancher Prime: OS Manager troubleshooting and verification: https://documentation.suse.com/cloudnative/os-manager/latest/en/troubleshooting/troubleshooting-verification.html
- SUSE Rancher Prime: OS Manager with Rancher and VMware: https://documentation.suse.com/cloudnative/os-manager/latest/en/node-operational-tasks/rancher-vmware.html
- SUSE Rancher Prime: OS Manager authentication / TPM behavior: https://documentation.suse.com/cloudnative/os-manager/1.9/en/rancher-os-management/authentication.html

## Issues Found
- The post used an outdated local `elemental-cli` image-building flow with `build-iso --config` and `build-disk --config`. Current SUSE OS Manager documentation uses `SeedImage` resources to build downloadable ISO or raw media tied to a `MachineRegistration`, so I replaced the build steps with the current `MachineRegistration` + `SeedImage` workflow.
- The registration configuration example used the wrong structure for current OS Manager usage. I replaced the standalone YAML with a proper `MachineRegistration` manifest and moved `ssh_authorized_keys` under the user entry so the cloud-config matches current cloud-init usage in Elemental examples.
- The post implied that manually extracting the registration URL and CA certificate was the normal USB boot path. Current docs show the operator-generated registration data being injected into the seed image through `registrationRef`, so I removed the manual CA extraction flow.
- The original image references and container paths were outdated or incorrect for the documented workflow. I replaced them with current `SeedImage` examples from SUSE documentation for ISO and raw media.
- The post omitted two important operational requirements from current documentation: TPM-backed registration by default and UEFI boot for x86-64 ISO boot. I added the TPM prerequisite and the UEFI boot requirement.
- The monitoring example used a less standard inventory listing command. I updated it to `kubectl get machineinventories -n fleet-default --watch` to match the resource naming used in current documentation.

## Review Notes
- The `baseImage` values in the post are version-specific examples taken from the current SUSE documentation as of 2026-05-01. They should be updated if your environment standardizes on a different SL Micro / Elemental image release.
- USB boot does not require PXE infrastructure, but the node still needs network connectivity to Rancher during registration and installation.
