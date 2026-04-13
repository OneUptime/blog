# Validation Summary: How to Deploy MongoDB on DigitalOcean Droplets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- DigitalOcean Droplets (compute)
- DigitalOcean Block Storage Volumes
- DigitalOcean Cloud Firewalls
- doctl (DigitalOcean CLI)
- Ubuntu 22.04 (Jammy)
- XFS filesystem
- mongosh

## Sources Consulted
- DigitalOcean doctl CLI reference: https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/create/
- DigitalOcean doctl volume create reference: https://docs.digitalocean.com/reference/doctl/reference/compute/volume/create/
- DigitalOcean doctl firewall create reference: https://docs.digitalocean.com/reference/doctl/reference/compute/firewall/create/
- DigitalOcean doctl volume snapshot reference: https://docs.digitalocean.com/reference/doctl/reference/compute/volume/snapshot/
- DigitalOcean doctl volume-action attach reference: https://docs.digitalocean.com/reference/doctl/reference/compute/volume-action/attach/
- MongoDB 7.0 installation guide for Ubuntu: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB mongod.conf configuration reference: https://www.mongodb.com/docs/v7.0/reference/configuration-options/
- MongoDB localhost exception documentation: https://www.mongodb.com/docs/v7.0/core/localhost-exception/
- MongoDB db.createUser() reference: https://www.mongodb.com/docs/v7.0/reference/method/db.createUser/

## Issues Found

1. **Removed invalid `--no-wait` flag from droplet create command.** The `--no-wait` flag is not a documented doctl flag. The default behavior of `doctl compute droplet create` is already to return immediately without waiting, so the flag was both invalid and unnecessary.

2. **Moved `chown -R mongodb:mongodb /data/mongodb` to after MongoDB installation.** The original post ran `chown` in the volume preparation step before installing MongoDB. The `mongodb` user and group do not exist until the `mongodb-org` package is installed, so the command would fail. Moved it to run after `apt-get install -y mongodb-org`.

3. **Added `--droplet-ids $DROPLET_ID` to the firewall create command.** The original command created a firewall with inbound/outbound rules but did not specify which droplet(s) the firewall should be applied to. Without `--droplet-ids`, the firewall is created but not attached to any droplet, rendering it ineffective.

4. **Changed `mongosh --eval "use admin; ..."` to `mongosh admin --eval "..."`.** The `use` command is a mongosh shell helper that is unreliable in `--eval` mode. The correct approach is to pass the database name (`admin`) as a positional argument to mongosh, which directly connects to that database.

5. **Changed `roles: ['root']` to `roles: [{ role: 'root', db: 'admin' }]`.** The string shorthand form assumes the role belongs to the currently connected database. While this works when connected to `admin`, the explicit object form is more robust and avoids ambiguity.

## Review Notes
- The post correctly recommends memory-optimized Droplets (`m-4vcpu-32gb`) for production MongoDB workloads.
- The XFS filesystem choice is appropriate — MongoDB recommends XFS for WiredTiger storage engine.
- The `noatime` mount option is a good practice for database volumes to reduce unnecessary disk writes.
- The localhost exception allows creating the first user even with `authorization: enabled`, so the sequence of enabling auth before creating the user is valid.
- The post could benefit from mentioning `--vpc-uuid` in the droplet create command (it's mentioned in the summary but not in the actual command), but this is not a technical error.
