# Validation Summary: Expose On-Premises APIs Through Azure Relay Without Opening Firewall Ports

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Relay Hybrid Connections
- Azure CLI
- Node.js
- hyco-https
- axios
- systemd

## Sources Consulted
- Microsoft Learn: Get started with Relay Hybrid Connections HTTP requests in Node.js - https://learn.microsoft.com/en-us/azure/azure-relay/relay-hybrid-connections-http-requests-node-get-started
- Microsoft Learn: Azure Relay Hybrid Connections protocol guide - https://learn.microsoft.com/en-us/azure/azure-relay/relay-hybrid-connections-protocol
- Microsoft Learn: Azure Relay port settings - https://learn.microsoft.com/en-us/azure/azure-relay/relay-port-settings
- Microsoft Learn: az relay hyco CLI reference - https://learn.microsoft.com/en-us/cli/azure/relay/hyco?view=azure-cli-latest
- Microsoft Learn: az relay hyco authorization-rule CLI reference - https://learn.microsoft.com/en-us/cli/azure/relay/hyco/authorization-rule?view=azure-cli-latest
- npm package documentation: hyco-https - https://www.npmjs.com/package/hyco-https
- Node.js API documentation: HTTPS - https://nodejs.org/api/https.html
- Node.js API documentation: systemd environment syntax was reviewed against systemd service file conventions - https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html

## Issues Found
- The proxy sample imported `RelayedServer` from `hyco-https` and called `RelayedServer.createRelayedServer`, but the documented HTTP package exports `createRelayedServer`, `createRelayListenUri`, and `createRelayToken` directly from `require('hyco-https')`. Updated the sample to use `const relayHttps = require('hyco-https')`.
- The proxy sample passed the namespace host as the `server` option and a separate `path` option. The `hyco-https` API expects `server` to be the fully qualified Relay listener URI, usually created with `createRelayListenUri`. Updated the proxy to create `listenUri` and pass it as `server`.
- The proxy sample created its listener token against a hand-written HTTPS URL. The `hyco-https` helper normalizes the Relay URI for SAS token generation, so the sample now uses `relayHttps.createRelayToken(listenUri, ...)`.
- The cloud client manually generated SAS tokens. The implementation did not match the `hyco-https` helper behavior used by the official Node.js examples, especially URI normalization. Updated the client to use `hyco-https` and its `createRelayHttpsUri` and `createRelayToken` helpers.
- The allowed path check used a simple prefix match on the full request URL, which allowed paths such as `/healthcheck` when only `/health` was intended. Updated the check to compare the parsed pathname and require exact matches for non-prefix entries.

## Review Notes
- The Azure CLI commands and flags in the setup section match the current Azure CLI reference, but the post assumes the resource group already exists and does not show commands for listing the generated authorization-rule keys.
- Microsoft recommends Microsoft Entra ID authentication for production Azure Relay scenarios where supported; the post's SAS-based examples remain valid for a tutorial.
- The local environment did not have Azure CLI installed, so CLI verification was performed against Microsoft Learn rather than local `az --help` output.
