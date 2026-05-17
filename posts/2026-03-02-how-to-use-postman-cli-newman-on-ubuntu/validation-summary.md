# Validation Summary: How to Use Postman CLI (Newman) on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Newman (Postman CLI)
- Postman Collections (v2.1 format)
- newman-reporter-htmlextra
- newman built-in junit reporter
- Node.js 20 LTS / npm
- NodeSource APT repository
- Ubuntu (apt-get)
- GitHub Actions (actions/checkout@v4, actions/setup-node@v4, actions/upload-artifact@v4)
- cron / crontab
- Newman Node.js module (programmatic API)

## Sources Consulted
- Newman GitHub repository and README: https://github.com/postmanlabs/newman
- Newman CLI options reference (npm package page): https://www.npmjs.com/package/newman
- newman-reporter-htmlextra: https://github.com/DannyDainton/newman-reporter-htmlextra
- NodeSource distribution install instructions: https://github.com/nodesource/distributions
- GitHub Actions documentation for actions/checkout, actions/setup-node, actions/upload-artifact
- Bash reference manual on line-continuation behavior (backslash-newline)

## Issues Found
1. **Broken bash line continuation with inline comments** (Timeout and Delay Settings section). The original snippet placed `# comment` after a trailing `\` on the same line:
   ```bash
   newman run ... \
     --timeout-request 10000 \   # 10 second request timeout
     --delay-request 500          # 500ms delay between requests
   ```
   In bash, a `\` is only a line-continuation when it is the very last character on the line. With `\<space># comment` the backslash escapes the space and the `#` starts a comment that consumes the rest of the line — the newline is no longer escaped, the command terminates, and `--delay-request 500` is executed as a separate (failing) command. Rewrote it as a single descriptive comment above the command with clean continuations:
   ```bash
   # Set request timeout (10 seconds) and add delay between requests (500ms)
   newman run /home/ubuntu/collections/my-api.json \
     --timeout-request 10000 \
     --delay-request 500
   ```

## Review Notes
- All Newman CLI flags used in the post (`--environment`, `--env-var`, `--reporters`, `--reporter-htmlextra-export`, `--reporter-junit-export`, `--iteration-data`, `--iterations`, `--timeout-request`, `--delay-request`, `--bail`, `--insecure`) are current and documented.
- The built-in `junit` reporter ships with Newman; no separate install is needed (correctly reflected in the post).
- `htmlextra` is a third-party reporter (`newman-reporter-htmlextra`) and must be installed alongside Newman — the post installs it correctly.
- NodeSource's `setup_20.x` script is still the supported install path for Node.js 20 LTS on Ubuntu.
- GitHub Actions third-party action versions (`checkout@v4`, `setup-node@v4`, `upload-artifact@v4`) are current as of the post date.
- The programmatic Newman example uses the documented `newman.run(options, callback)` signature, including the `reporter` object for per-reporter config and `summary.run.failures` for failure detection — all correct.
- Minor stylistic note (not changed): the Postman desktop UI for exporting environments has shifted over time from "Manage Environments" to the Environments sidebar with a per-environment export action; the described path still functions but the exact menu wording may vary by Postman version. Left as-is because it is not technically wrong, just version-dependent UI.
