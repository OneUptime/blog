# Validation Summary: How to Run Oxidized in Docker for Network Config Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Oxidized
- Docker and Docker Compose
- YAML configuration
- Git and SSH authentication
- Oxidized REST API and web UI
- Oxidized CSV and HTTP inventory sources
- Oxidized hooks

## Sources Consulted
- Oxidized README: https://github.com/ytti/oxidized
- Oxidized Docker documentation: https://github.com/ytti/oxidized/blob/master/docs/Docker.md
- Oxidized configuration documentation: https://github.com/ytti/oxidized/blob/master/docs/Configuration.md
- Oxidized source backend documentation: https://github.com/ytti/oxidized/blob/master/docs/Sources.md
- Oxidized output backend documentation: https://github.com/ytti/oxidized/blob/master/docs/Outputs.md
- Oxidized hook documentation: https://github.com/ytti/oxidized/blob/master/docs/Hooks.md
- Official Docker Hub image page: https://hub.docker.com/r/oxidized/oxidized/

## Issues Found
- The quick-start Docker example did not mention that the official container runs as UID 30000 and mapped config volumes need matching ownership. Added a `chown` command and clarified that the config and `router.db` must exist before starting the long-running container.
- The Docker Compose example did not mount `/home/oxidized/.ssh`, which is needed for the later remote Git push example to persist SSH keys and known hosts. Added an `./ssh` volume.
- The main Oxidized configuration used the deprecated `rest: 0.0.0.0:8888` syntax. Replaced it with the current `extensions.oxidized-web` configuration.
- The CSV source delimiter was shown as a plain string. Updated it to the documented Ruby regular expression form, `!ruby/regexp /:/`.
- The logging example used older top-level logging keys. Replaced it with the documented `logger.appenders` configuration.
- The HTTP source example combined a NetBox URL with a generic map and omitted the documented pagination key requirement. Reworked it as a generic JSON inventory API example with documented HTTP source fields and updated the section heading.
- The alert hook called the notification script directly, which would require executable file permissions that were not shown. Changed the hook command to invoke the script with `bash`.
- The remote Git SSH key command generated an Ed25519 key while the `githubrepo` hook documentation requires a legacy PEM private key. Changed it to generate an RSA PEM key and added a `known_hosts` step required by the official Docker documentation.
- The SSH key section said to update the inventory to reference SSH keys, but the example sets a global Oxidized variable. Corrected the wording.
- The device SSH key example wrote the key under `./config` while the Compose file mounts `./ssh` at `/home/oxidized/.ssh`. Updated the key path and ownership commands to match the mounted directory.
- The `/reload` API call used `PUT`, while the Oxidized documentation lists `GET /reload`. Updated the command.
- A Git log command treated a device filename as a revision because it omitted `--` before the path. Added the separator.
- The dated Git show example used `HEAD@{date}`, which depends on reflog data and is unreliable for Oxidized's bare Git repository. Replaced it with `git rev-list --before` followed by `git show`.

## Review Notes
- Docker Hub rate limiting prevented pulling and running the current image locally during review, so runtime verification was based on the official Oxidized documentation and source files.
- The post still uses `latest` for simplicity, but production deployments should pin a tested Oxidized image tag.
