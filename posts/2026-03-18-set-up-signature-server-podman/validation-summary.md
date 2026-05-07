# Validation Summary: How to Set Up a Signature Server for Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- containers/image registries.d configuration
- GPG/simple image signing
- Container signature lookaside storage
- Nginx
- OpenSSL
- rsync

## Sources Consulted
- Podman `podman push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman image sign` documentation: https://docs.podman.io/en/v4.3/markdown/podman-image-sign.1.html
- containers/image `containers-registries.d(5)` documentation: https://github.com/containers/image/blob/main/docs/containers-registries.d.5.md
- containers/image `containers-policy.json(5)` documentation: https://github.com/containers/image/blob/main/docs/containers-policy.json.5.md
- Red Hat Enterprise Linux container image signing documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/assembly_signing-container-images_building-running-and-managing-containers

## Issues Found
- The registries.d example used the older `sigstore` and `sigstore-staging` keys. Current containers/image documentation uses `lookaside` for reading signatures and `lookaside-staging` for writing them, so the YAML snippet and surrounding wording were updated.
- The registries.d example configured `registry.example.com`, but the tutorial signs and pushes `localhost:5000/myapp:v1.0`. The scope was changed to `localhost:5000` so the example configuration applies to the image used later in the post.
- The post described the read location as being used during `podman pull` generally. This was tightened to "when signature verification is required" because signature retrieval depends on a signature verification policy.
- The generic URL placeholder and summary referred to a `sigstore` URL. These were updated to `lookaside` terminology to match the current configuration keys.

## Review Notes
The post still assumes the user already has a suitable GPG key for `--sign-by container-signing@example.com` and an image trust policy that requires signatures. Those prerequisites are outside the scope of this signature-server-focused article, but they would be useful context in a broader image-signing guide.
