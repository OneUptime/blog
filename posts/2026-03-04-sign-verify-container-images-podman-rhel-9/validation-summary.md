# Validation Summary: How to Sign and Verify Container Images with Podman on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- GPG container image signatures
- containers/image signature policy
- `/etc/containers/policy.json`
- `/etc/containers/registries.d/`
- Sigstore and Cosign
- Skopeo-related sigstore key workflow

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Signing container images": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/assembly_signing-container-images_building-running-and-managing-containers
- Podman `podman-push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman `podman-image-trust` documentation: https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- containers-policy.json(5) manual: https://man.archlinux.org/man/containers-policy.json.5.en
- Red Hat Customer Portal, "Verifying image signing for Red Hat Container Registry": https://access.redhat.com/articles/3116561
- Sigstore Cosign installation documentation: https://docs.sigstore.dev/cosign/system_config/installation/

## Issues Found
- The post said signing "solves" registry compromise, transit tampering, and provenance risks. Updated this to a narrower claim: signing helps clients verify images against a trusted key before accepting them.
- The GPG signature storage example used deprecated `sigstore` and `sigstore-staging` names. Updated it to the RHEL 9 `lookaside` and `lookaside-staging` options.
- The GPG workflow omitted the need for a lookaside web server for detached GPG signatures. Added that prerequisite and clarified that signatures staged locally must be published to the configured lookaside server.
- Several privileged heredoc examples used `sudo cat > file`, which does not elevate the shell redirection. Replaced them with `sudo tee ... > /dev/null`.
- The Red Hat registry trust example implied policy alone was enough. Clarified that Red Hat signature lookaside locations also need to be configured under `/etc/containers/registries.d/`.
- The Cosign install command used `sudo dnf install -y cosign`, which is not the RHEL 9 procedure documented by Red Hat or Sigstore. Replaced it with the official RPM download/install pattern from Sigstore releases.
- The Podman sigstore policy example omitted `use-sigstore-attachments`, which Podman/Skopeo need to read and write sigstore signatures stored with the image in the registry. Added the registries.d configuration.
- The Cosign/Podman policy example omitted a compatible `signedIdentity`. Added `matchRepository`, matching the containers-policy guidance for Cosign-created signatures.
- The `podman image trust set` example omitted `--signature-policy /etc/containers/policy.json`, which current Podman documentation requires for setting policy.
- The troubleshooting command `skopeo inspect --raw ... | jq .` only inspects the image manifest and does not check signatures. Replaced it with a command that lists staged simple-signing signature files.

## Review Notes
The post is technically valid after edits. A future improvement would be to split the GPG lookaside workflow and Sigstore attachment workflow more clearly, because they use different storage models even though the names are easy to confuse.
