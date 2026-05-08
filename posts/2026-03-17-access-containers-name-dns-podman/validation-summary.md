# Validation Summary: How to Access Containers by Name via DNS in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman custom networks
- Netavark and aardvark-dns
- Container DNS name resolution
- Network aliases

## Sources Consulted
- Podman network documentation: https://docs.podman.io/en/stable/markdown/podman-network.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman network inspect documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman network connect documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-network-connect.1.html

## Issues Found
- The original diagnostic commands used `ping` and `nslookup` from containers based on application images. Those tools are not guaranteed to be present in images such as `nginx` and `node`. Changed the `api` diagnostic container to use `alpine`, which provides the demonstrated BusyBox networking utilities, and removed the `podman exec web ping ...` command.
- The application configuration example set `REDIS_HOST=cache` and said the app connects to `cache`, but no `cache` container was created in the tutorial. Removed the unused Redis environment variable and updated the comment to refer only to `db`.
- The multiple-network example reused container names `web` and `db` that were already created earlier in the post, which would cause `podman run --name ...` to fail. Renamed those containers to `frontend-web` and `backend-db` and updated the related commands.
- The default-network wording was made more precise for current Podman behavior, where rootful Podman uses the default `podman` bridge network while rootless Podman defaults to `pasta`.

## Review Notes
The main DNS claims are consistent with official Podman documentation: user-defined bridge networks have DNS support unless disabled, the default `podman` bridge network has `dns_enabled: false`, aliases work only on DNS-enabled networks, and `podman network connect` can attach a container to another network.
