# Validation Summary: How to Configure RKE2 Token for Node Registration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- Rancher
- RKE2 server and agent configuration
- RKE2 token management
- systemd service environment files

## Sources Consulted
- RKE2 Token Management documentation: https://docs.rke2.io/security/token
- RKE2 Quick Start documentation: https://docs.rke2.io/install/quickstart
- RKE2 Configuration Options documentation: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- RKE2 Linux install script source: https://github.com/rancher/rke2/blob/master/install.sh
- RKE2 agent systemd unit source: https://github.com/rancher/rke2/blob/master/bundle/lib/systemd/system/rke2-agent.service

## Issues Found
- The post described the token as if all token forms verify both sides of the connection. Updated the explanation to distinguish node authentication from secure-format token CA verification, and to note that short tokens do not include the CA hash check.
- The post said the token is stored only at `/var/lib/rancher/rke2/server/node-token`. Updated the text to distinguish the server token at `/var/lib/rancher/rke2/server/token` from the registration token file at `/var/lib/rancher/rke2/server/node-token`.
- The agent install command placed `INSTALL_RKE2_TYPE="agent"` before `sudo`, which can prevent the install script from receiving the variable. Updated it to use `sudo env INSTALL_RKE2_TYPE="agent" sh -`.
- The environment variable example claimed to pass the token via environment variable but then wrote a config file instead. Replaced it with `RKE2_URL` and `RKE2_TOKEN` in the systemd environment file used by the RKE2 agent unit.
- The token rotation procedure was incorrect. Replaced the config-only approach with the documented `rke2 token rotate --token ... --new-token ...` flow, followed by updating server and agent configs and restarting services.
- The post omitted that the server token encrypts bootstrap data persisted to the datastore. Added that technical detail to the token overview.

## Review Notes
- The custom token examples use short token format, which is valid for starting the first server with RKE2-generated CAs. Secure-format tokens provide CA hash verification for joining nodes after the CA exists.
- RKE2 documentation states the config file is the primary configuration method for systemd installs; the environment variable example is valid through the unit's documented/source-defined environment files but is less convenient operationally.
