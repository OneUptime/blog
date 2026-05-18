# Validation Summary: How to Set Up GRR Rapid Response on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- GRR Rapid Response (Google's remote live forensics framework)
- Ubuntu
- MySQL 8.0
- Docker / Docker Compose
- systemd
- nginx (reverse proxy)
- Python (`grr-api-client`)

## Sources Consulted
- GRR official documentation: https://grr-doc.readthedocs.io/
- GRR server install (release deb): https://grr-doc.readthedocs.io/en/stable/installing-grr-server/from-release-deb.html
- GRR Docker docs: https://grr-doc.readthedocs.io/en/latest/installing-and-running-grr/via-docker.html
- `grr_config_updater` manpage: https://manpages.debian.org/testing/grr-server/grr_config_updater.1
- `grr_api_client` source: https://github.com/google/grr/blob/master/api_client/python/grr_api_client/api.py and `hunt.py`
- Client repacking docs: https://grr-doc.readthedocs.io/en/latest/maintaining-and-tuning/repacking-clients.html
- Linux client install docs: https://grr-doc.readthedocs.io/en/latest/deploying-grr-clients/on-linux.html

## Issues Found
1. **Inconsistent claim about recommended install method.** The intro said "the recommended method for a new deployment is the server DEB" but then showed `pip install grr-response-server`. Reworded the sentence so it accurately describes what the section actually demonstrates (a pip-based virtualenv install) without overstating recommendation.
2. **Invalid `add_user --admin` flag.** Modern `grr_config_updater add_user` does not accept `--admin`; new users are admin by default and the command will fail with that flag. Removed the flag and added a short note that the command will prompt for a password.
3. **Invalid `grr_client_build` flags.** `--platform linux_deb` is not valid — `--platform` accepts `linux|windows|darwin`, and package format is selected via `--package_format`. Also the standard workflow uses the `repack` subcommand with `--template`. Updated the command to `--platform linux --package_format deb repack --template ...`. Also updated the produced filename pattern from `grr-client_x.y.z_amd64.deb` to `grr_x.y.z_amd64.deb` to match GRR's actual output naming.
4. **Wrong client systemd unit name.** The traditional GRR Linux client unit is `grr`, not `grr-client`. Updated `systemctl enable/start/status` and `journalctl -u` invocations.
5. **`hunt.urn` does not exist on the Python API hunt object.** The `grr_api_client` `Hunt` object exposes `.hunt_id` (the URN is on `.data.urn`). Also `hunt.Start()` returns the started hunt, so reassigned `hunt = hunt.Start()` to match canonical usage. Updated the print statement to use `hunt.hunt_id`.
6. **Invalid flow name `ListNetworkConnections`.** Replaced with `Netstat`, which is the actual GRR flow for enumerating open network connections.
7. **Deprecated `MemoryCollector` flow.** Replaced with `YaraProcessScan`, which is the current memory-scanning flow in modern GRR (the Rekall-based `MemoryCollector` has been removed).
8. **UI label typo.** "Manage Client" corrected to "Manage Clients" to match the other reference in the same post and the actual UI navigation.

## Review Notes
- The post follows a pip + virtualenv install path. GRR's docs actually recommend the release server DEB for production; the pip path is workable but less officially supported. The reworded intro no longer overstates the recommendation, but readers running this in production may want to consult the official "from-release-deb" install guide instead.
- The `docker-compose.yml` uses Compose v3 schema (`version: "3"`); this is harmless but the `version` field is deprecated in modern Compose. Left as-is since it still works.
- Modern GRR deployments use Fleetspeak for client/server transport; the post describes the legacy direct HTTP polling model, which is still supported but is no longer the default for new deployments built from current docker-compose templates. Not a correctness issue, but worth being aware of when adapting this guide.
- The nginx config terminates TLS at the admin UI only; the frontend port (8080) used by clients is unprotected in the example. For real deployments, GRR clients should communicate over HTTPS with a properly enrolled CA — the post does not cover the client-side enrollment / CSR signing flow.
