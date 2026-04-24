# Validation Summary: How to Configure the App Templates URL in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- JSON app templates
- GitHub and GitHub Pages
- Python `http.server`
- Nginx

## Sources Consulted
- Portainer admin settings documentation: https://docs.portainer.io/admin/settings/general
- Portainer application templates documentation: https://docs.portainer.io/sts/user/docker/templates/application
- Portainer app template JSON format documentation: https://docs.portainer.io/advanced/app-templates/format
- Portainer app template hosting documentation: https://docs.portainer.io/sts/advanced/app-templates/build
- Official Portainer templates repository: https://github.com/portainer/templates
- Official Portainer v3 templates catalog: https://raw.githubusercontent.com/portainer/templates/v3/templates.json
- Portainer source for the current default templates URL: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source for the v2-to-v3 templates migration logic: https://github.com/portainer/portainer/blob/develop/api/datastore/migrator/migrate_dbversion110.go
- Docker CLI reference for `docker run`: https://docs.docker.com/reference/cli/docker/container/run/
- Python `http.server` documentation: https://docs.python.org/3/library/http.server.html
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The post used the old default Portainer catalog URL `https://raw.githubusercontent.com/portainer/templates/master/templates-2.0.json`. Current Portainer source defaults to `https://raw.githubusercontent.com/portainer/templates/v3/templates.json`, so I updated the default, reset, and download examples to the v3 URL.
- The JSON examples used the older version `2` format and the opening example was not valid JSON because it contained `...`. I updated the examples to version `3`, added `id` fields to match the current official catalog shape, and made the opening example valid JSON.
- The verification steps referred to `App Templates` inside an environment. Current Portainer documentation uses `Templates > Application`, so I updated the navigation steps accordingly.
- The environment verification steps were too broad for current Portainer behavior. I clarified that the environment must match the template type in the JSON file.
- The Swarm stack example used `type: 2` with a `docker-compose.yml` path. I updated it to `docker-stack.yml` to align with the current official Portainer template conventions for Swarm stack templates.
- The prerequisites did not mention that the template URL must be reachable by the Portainer Server instance. I added that clarification based on the official hosting guidance.

## Review Notes
- Portainer's current documentation still documents the older v2 app template format at `advanced/app-templates/format`, while the current Portainer source and default templates catalog use the v3 URL and v3 catalog format. The post was updated to reflect current Portainer behavior.
- `python3 -m http.server --directory` and `curl -o` were also checked locally with `--help`. Docker was not installed in the review environment, so the Nginx container example was verified against Docker's official CLI reference instead of local command output.
