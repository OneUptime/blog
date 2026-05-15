# Validation Summary: How to Deploy Cypress for End-to-End Testing on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- Node.js
- npm
- Cypress
- JavaScript
- GitHub Actions
- Linux package management with dnf

## Sources Consulted
- Cypress installation and system requirements: https://docs.cypress.io/app/get-started/install-cypress
- Cypress CLI command reference: https://docs.cypress.io/app/references/command-line
- Cypress configuration reference: https://docs.cypress.io/app/references/configuration
- Cypress GitHub Actions guide: https://docs.cypress.io/app/continuous-integration/github-actions
- Red Hat RHEL 9.3 release notes for Node.js 20: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.3_release_notes/new-features
- Red Hat RHEL 9 DNF module installation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool

## Issues Found
- The post listed Node.js 18 or newer and installed `nodejs:18`. Current Cypress documentation requires Node.js 20.x, 22.x, or 24+, so I updated the prerequisite and AppStream command to Node.js 20.
- The Cypress dependency list included older Linux packages such as `GConf2` and omitted the current dnf package guidance used by Cypress for dnf-based Linux environments. I updated the package list to `xorg-x11-server-Xvfb`, `gtk3-devel`, `nss`, and `alsa-lib`.
- The fixture example was fenced as JSON but included a `//` comment, which is invalid JSON. I removed the comment from the JSON block.
- The manual parallel execution example selected two specs in a single Cypress run, which does not by itself create parallel execution. I changed it to show separate CI jobs running separate specs.
- The GitHub Actions example used `cypress-io/github-action@v6`; Cypress currently recommends the latest major version, `v7`, so I updated the action version.

## Review Notes
- Cypress's official operating-system support list does not explicitly list RHEL, though it documents dnf-based prerequisites for Amazon Linux 2023 and supports Fedora. RHEL users should verify the package set in their subscribed repositories.
