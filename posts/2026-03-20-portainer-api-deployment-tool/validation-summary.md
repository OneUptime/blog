# Validation Summary: How to Create a Custom Deployment Tool Using the Portainer API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer API
- Docker standalone stacks
- Python 3
- Click
- Requests
- PyYAML
- Rich
- GitHub Actions

## Sources Consulted
- Portainer Documentation, "Accessing the Portainer API": https://docs.portainer.io/api/access
- Portainer Documentation, "API documentation": https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 API specification: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Click Documentation, "Basic Commands, Groups, Context": https://click.palletsprojects.com/en/stable/commands-and-groups/
- Requests Documentation, "Quickstart": https://requests.readthedocs.io/en/latest/user/quickstart/
- PyYAML Documentation: https://pyyaml.org/wiki/PyYAMLDocumentation
- Rich Documentation, "Progress Display": https://rich.readthedocs.io/en/latest/progress.html

## Issues Found
- The sample used `GET /api/stacks?endpointId=...` to scope stacks to an environment. Portainer's documented API uses the `filters` query parameter with JSON such as `{"EndpointID":"1"}`. I updated `get_stacks()` to use the documented filter format.
- The sample sent `Prune: True` when updating a standalone compose stack. In the Portainer API specification, `Prune` is documented as a Swarm-only option for stack updates. I removed `Prune` from the update payload.
- The GitHub Actions example exported `PORTAINER_API_KEY`, but the CLI only read `config.yaml`, so the CI example would not work as written. I updated the CLI to read `PORTAINER_API_KEY` first and fall back to `config.yaml`, and clarified that in the config snippet.
- The stack status mapping labeled non-`1` states as `Stopped`. Portainer documents stack status as active/inactive values. I updated the output mapping to `Active`, `Inactive`, and `Unknown`.

## Review Notes
- Validated against Portainer CE 2.39.1 documentation and API specification.
- The tutorial is specifically aligned with Docker standalone compose stacks. Portainer uses different stack creation endpoints for Swarm and Kubernetes environments.
