# Validation Summary: How to Install Node.js 20 LTS on RHEL Using AppStream

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- AppStream modules
- DNF
- Node.js
- npm
- nvm

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Installing modular content": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 documentation, "Switching to a later stream": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_managing-versions-of-application-stream-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux Application Streams Life Cycle: https://access.redhat.com/support/policy/updates/rhel-app-streams-life-cycle
- RHEL 8.9 Release Notes, Node.js 20 module stream: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/8.9_release_notes/new-features
- Node.js Release Working Group schedule: https://github.com/nodejs/Release
- npm documentation for configuration and prefix behavior: https://docs.npmjs.com/cli/v11/using-npm/config
- nvm official GitHub releases: https://github.com/nvm-sh/nvm/releases
- Node.js HTTP API documentation: https://nodejs.org/api/http.html

## Issues Found
- The post described Node.js 20 LTS as a currently supported and maintained RHEL AppStream runtime. As of this validation date, Red Hat lists Node.js 20 as retired in April 2026 for both RHEL 8 and RHEL 9, and upstream Node.js 20 reached end-of-life on April 30, 2026. I updated the title, tags, description, introduction, and closing recommendation to avoid claiming current LTS/support status and to point new production deployments toward a supported stream such as Node.js 22.
- The installation sequence enabled `nodejs:20` and then installed the `nodejs` package. Red Hat's documented modular installation flow is `dnf module install nodejs:<stream>`, which installs the stream's default profile and associated packages such as npm. I changed the command to `sudo dnf module install nodejs:20 -y`.
- The module list example showed Node.js 18 as a default stream. Red Hat documents that RHEL 9 has no predefined default module streams, though module profiles can have defaults. I updated the example output to show streams with profile information instead.
- The version switching example reset the module and switched from Node.js 20 to Node.js 18. Red Hat documents `dnf module switch-to` for switching to later streams, and Node.js 18 is already retired. I changed the example to switch from Node.js 20 to Node.js 22 using `sudo dnf module switch-to nodejs:22 -y`.

## Review Notes
The quick HTTP server example uses the stable Node.js HTTP API and is syntactically valid. The nvm install command uses an older but still plausible nvm release; future maintenance should update it to the latest nvm release tag from the official repository.
