# Validation Summary: How to Troubleshoot Volume Permission Denied Errors in Podman

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Podman
- Linux containers
- Podman volumes and bind mounts
- Rootless containers and user namespaces
- SELinux volume labeling
- Linux file ownership and permissions

## Sources Consulted
- Podman `podman-run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `--userns=mode` official documentation: https://docs.podman.io/en/v4.4/markdown/options/userns.container.html
- Podman `podman-volume-mount` official documentation: https://docs.podman.io/en/stable/markdown/podman-volume-mount.1.html
- GNU Coreutils `stat`, `chown`, and `chmod` command behavior: https://www.gnu.org/software/coreutils/manual/coreutils.html

## Issues Found
- The post described the `:U` volume option as "auto-map ownership." Podman documents `:U` as recursively changing the source volume's owner and group to match the container UID/GID, so the wording was corrected to "recursively adjust source ownership."
- The rootless "run as the same user that owns the files" example used `--user $(stat -c '%u:%g' /home/user/data)` without a user namespace option. In rootless Podman, numeric container UIDs do not necessarily map to the same host UIDs. The example was changed to use `--userns=keep-id:uid=1000,gid=1000` with `--user 1000:1000`, matching Podman's documented keep-id behavior.
- The rootless UID mapping check claimed that `stat` inside the container shows what UID the container user maps to on the host. It actually shows ownership as visible inside the container namespace, so the comment was corrected.
- The rootless `podman unshare chown` fix used `0:0` even though the guide's container user example is `1000:1000`. The command was changed to `podman unshare chown -R 1000:1000 /home/user/data` so the ownership matches the container user discussed in the article.

## Review Notes
The SELinux `:z` and `:Z` guidance is technically correct. Podman warns that both `:U` and SELinux relabeling can recursively walk the source tree and may be slow or invasive on large directories; the post now avoids the inaccurate `:U` wording but could add a stronger caution in a future editorial pass.
