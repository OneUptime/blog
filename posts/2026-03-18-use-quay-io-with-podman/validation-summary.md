# Validation Summary: How to Use Quay.io with Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Quay.io
- Red Hat Quay
- Skopeo
- `containers-registries.conf`
- Container image registries

## Sources Consulted
- Podman `podman info` documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- Podman `podman login` documentation: https://docs.podman.io/en/stable/markdown/podman-login.1.html
- Podman `podman pull` documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman `podman push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- `containers-registries.conf(5)` documentation: https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- Skopeo `inspect` documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-inspect.1.md
- Skopeo `list-tags` documentation: https://github.com/containers/skopeo/blob/main/docs/skopeo-list-tags.1.md
- Project Quay documentation, Quay.io overview and tag fetching: https://docs.projectquay.io/quay_io.html
- Red Hat Quay documentation, users and organizations: https://docs.redhat.com/en/documentation/red_hat_quay/3.11/html/about_quay_io/user-org-intro_quay-io
- Red Hat Quay documentation, robot account overview: https://docs.redhat.com/en/documentation/red_hat_quay/3.14/html/managing_access_and_permissions/allow-robot-access-user-repo
- Red Hat Trusted Application Pipeline documentation, Quay Docker CLI password flow: https://docs.redhat.com/en/documentation/red_hat_trusted_application_pipeline/1.5/html/installing_red_hat_trusted_application_pipeline/integrating-products-and-external-services_default
- Live Quay tag listing checked on 2026-05-07 for `podman/stable`: https://quay.io/api/v1/repository/podman/stable/tag/?limit=20
- Live Quay tag listing checked on 2026-05-07 for `prometheus/prometheus`: https://quay.io/api/v1/repository/prometheus/prometheus/tag/?limit=20
- Live Quay tag listing checked on 2026-05-07 for `coreos/etcd`: https://quay.io/api/v1/repository/coreos/etcd/tag/?limit=20

## Issues Found
- The `podman info --format '{{.Registries.Search}}'` example was not the documented way to extract search registries from the `Registries` map. It was changed to `podman info --format '{{index .Registries "search"}}'`.
- The search-registry configuration example overwrote `/etc/containers/registries.conf` and included an unnecessary `[[registry]]` entry for `quay.io`. It was changed to a drop-in file under `/etc/containers/registries.conf.d/` with only `unqualified-search-registries`.
- The example `quay.io/coreos/etcd:latest` tag was not a dependable current tag example. It was changed to `quay.io/coreos/etcd:v3.6.11`, which was verified in Quay’s live tag listing.
- The example `quay.io/podman/stable:v4.9` tag was stale. It was changed to `quay.io/podman/stable:v3.11.3`, which was verified in Quay’s live tag listing.
- The login-check example was reordered to `podman login --get-login quay.io` to match the documented command form.

## Review Notes
- No remaining technical issues found after the fixes.
- The post’s search-registry section is only relevant when using unqualified image names. The upstream `containers-registries.conf` documentation recommends fully qualified image references where possible.
- The Quay tag examples were validated against live registry data on 2026-05-07 and may need periodic refresh as repositories publish new tags.
- The `skopeo` examples assume Skopeo is installed on the host in addition to Podman.
