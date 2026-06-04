# Validation Summary: How to Configure Mirrord for Running Local Processes in the Context of K8s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- mirrord CLI
- mirrord configuration files
- VS Code debugging configuration
- JetBrains run configurations
- Kubernetes service mesh environments

## Sources Consulted
- mirrord Quick Start: https://metalbear.com/mirrord/docs/getting-started/quick-start
- mirrord configuration getting started: https://metalbear.com/mirrord/docs/config
- mirrord configuration options reference: https://metalbear.com/mirrord/docs/config/options
- mirrord environment variables reference: https://metalbear.com/mirrord/docs/reference/env
- mirrord outgoing filter guide: https://metalbear.com/mirrord/docs/using-mirrord/outgoing-filter
- mirrord architecture reference: https://metalbear.com/mirrord/docs/reference/architecture/
- mirrord limitations / service mesh FAQ: https://metalbear.com/mirrord/docs/faq/limitations

## Issues Found
- Corrected the default `mirrord exec node app.js` explanation. The current documentation describes no-target runs as targetless, not as selecting the first pod in the default namespace.
- Replaced `--config-file` and `--config` examples with the documented `-f <CONFIG_PATH>` flag.
- Removed `//` filename comments from JSON code blocks and moved the filenames into surrounding prose so the fenced `json` examples are syntactically valid.
- Corrected filesystem mode names from the non-documented `remote` mode to the documented `read` and `write` modes.
- Changed the local-only profile from `"env": { "include": "none" }` to `"env": false`, since `none` would be interpreted as an include pattern rather than disabling environment import.
- Clarified the production data example so the read-only safety claim depends on the application honoring the read-only setting.
- Replaced the service mesh claim that the local process automatically gets mesh identity and mTLS with a more accurate statement that mirrord can use cluster networking through the remote pod in mesh-enabled clusters.
- Updated RBAC troubleshooting commands to use valid `kubectl auth can-i` resource syntax.
- Corrected the performance example so frequently accessed paths are explicitly local while remote file reads remain enabled, and changed outgoing filter values to documented address/port filter syntax.

## Review Notes
Validated all fenced JSON snippets with Node.js `JSON.parse` after edits. Some IDE-specific examples, especially the JetBrains XML run configuration, may vary by IDE version and project type, but the mirrord CLI invocation embedded in them now matches the official documentation.
