# Validation Summary: How to Use MongoDB Compass with SSH Tunnel

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Compass (GUI client)
- SSH tunneling (local port forwarding via `ssh -L`)
- autossh (persistent tunnel management)
- MongoDB connection strings
- Bastion/jump host networking

## Sources Consulted
- MongoDB Compass documentation on SSH tunnel connections: https://www.mongodb.com/docs/compass/current/connect/advanced-connection-options/ssh-connection/
- OpenSSH `ssh` man page for `-N`, `-L`, `-i`, `-v` flags
- autossh documentation for `-M 0`, ServerAliveInterval/ServerAliveCountMax usage
- MongoDB connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/

## Issues Found
1. **Incorrect UI label for SSH settings tab in Compass**: Step 3 of the configuration instructions referred to "Click the SSH Tunnel section." In MongoDB Compass 1.31+, the SSH tunnel settings are located under the **Proxy / SSH** tab within Advanced Connection Options, not a standalone "SSH Tunnel section." Changed to "Click the Proxy / SSH tab."

## Review Notes
- All SSH commands (`ssh -N -L`, `ssh -v`, `nc -zv`) use correct syntax and flags.
- The autossh command correctly uses `-M 0` to disable the monitoring port in favor of OpenSSH's `ServerAliveInterval`/`ServerAliveCountMax`, which is the recommended modern approach.
- The connection string format `mongodb://appUser:password@10.0.1.50:27017/myapp?authSource=admin` is valid.
- The note about MongoDB Atlas not requiring SSH tunnels (preferring IP whitelisting or VPC peering) is accurate.
- The Compass UI labels (e.g., "Proxy / SSH" tab name, SSH field names) may vary slightly across Compass versions as the UI evolves. The current description matches Compass 1.36+ behavior.
