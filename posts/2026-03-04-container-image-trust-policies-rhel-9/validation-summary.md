# Validation Summary: How to Configure Container Image Trust Policies on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- containers-policy.json
- containers-registries.d signature storage configuration
- GPG-based container image signatures
- Sigstore/cosign container image signatures
- auditd
- containers-registries.conf

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using Podman, Buildah, and Skopeo on Red Hat Enterprise Linux 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Red Hat Customer Portal: Verifying image signing for Red Hat Container Registry: https://access.redhat.com/articles/3116561
- Podman documentation: podman-image-trust: https://docs.podman.io/en/v3.0/markdown/podman-image-trust.1.html
- Podman documentation: podman-events: https://docs.podman.io/en/v5.6.1/markdown/podman-events.1.html
- containers-policy.json man page: https://www.mankier.com/5/containers-policy.json
- containers-registries.conf man page: https://www.mankier.com/5/containers-registries.conf

## Issues Found
- The heredoc examples used `sudo cat > file`, which would not reliably write to root-owned files because shell redirection happens before `sudo` runs. Changed those examples to `sudo tee ... > /dev/null << 'EOF'`.
- The signature storage example used deprecated `sigstore` and `sigstore-staging` keys for simple-signing storage. Updated them to `lookaside` and `lookaside-staging`, and clarified that these are for simple-signing signatures.
- The GPG export command used `sudo gpg --export`, which would export from root's keyring rather than the user's keyring in the common case. Changed it to run `gpg --export` as the current user and pipe the output through `sudo tee`.
- The user policy section said user policies can only be more restrictive than system policy. Corrected this to state that `~/.config/containers/policy.json`, if present, is read instead of `/etc/containers/policy.json` for that user.
- The sample error message for a missing signature had a typo. Corrected it to a plausible Podman-style error.
- The `podman events` audit example would continue streaming by default. Added `--stream=false` so the command checks recent pull events and exits.
- The auditd heading claimed it logs all container operations. Adjusted it to say it logs Podman executions, which is what the `auditctl -w /usr/bin/podman -p x` rule actually records.

## Review Notes
Local `podman` and the relevant container man pages were not installed in this workspace, so command and configuration validation was performed against official Red Hat documentation, Podman documentation, and authoritative upstream man page mirrors. The article still intentionally uses simple-signing examples for Red Hat registry verification; the sigstore/cosign section is separate and reflects the `sigstoreSigned` policy type documented for RHEL 9.
