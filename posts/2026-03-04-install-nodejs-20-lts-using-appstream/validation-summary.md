# Validation Summary: How to Install Node.js 20 LTS on RHEL 9 Using AppStream

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL AppStream
- DNF module streams
- Node.js 20
- npm
- Bash shell configuration

## Sources Consulted
- Red Hat Enterprise Linux 9.3 Release Notes: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/9.3_release_notes/index
- Red Hat Enterprise Linux 9 Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux Application Streams Life Cycle: https://access.redhat.com/support/policy/updates/rhel-app-streams-life-cycle
- npm folders documentation: https://docs.npmjs.com/cli/v11/configuring-npm/folders/
- npm package metadata: https://www.npmjs.com/package/npm
- Node.js release schedule: https://github.com/nodejs/Release

## Issues Found
- The post described Node.js 20 as an actively supported LTS AppStream without a lifecycle caveat. Red Hat lists the RHEL 9 Node.js 20 Application Stream as released in November 2023 and retired in April 2026, and upstream Node.js 20 reached end-of-life on April 30, 2026. I removed the current "LTS" wording and added a warning to use Node.js 20 only when specifically needed.
- The prerequisite said only "RHEL 9", but Red Hat introduced the `nodejs:20` module stream in RHEL 9.3. I changed the prerequisite to RHEL 9.3 or later with AppStream enabled.
- The install step used `dnf module enable nodejs:20` followed by `dnf install nodejs`. Red Hat documents `dnf module install nodejs:20` for installing the stream and default profile, so I changed the command to the documented modular install form.
- The npm update step used `npm install -g npm@latest`. That bypasses AppStream package management and can install an npm release whose engine requirements no longer match the AppStream Node.js build. I changed it to `sudo dnf upgrade -y nodejs npm`.

## Review Notes
- The npm global prefix instructions are technically valid for placing global executable links under `~/.npm-global/bin`, but users should avoid mixing distro-managed npm with manually upgraded global npm itself.
- For new RHEL 9 deployments after April 2026, Node.js 22 or a later supported RHEL Application Stream should be preferred over Node.js 20.
