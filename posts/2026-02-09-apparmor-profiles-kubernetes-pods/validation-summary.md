# Validation Summary: How to Configure AppArmor Profiles for Kubernetes Pod Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- AppArmor
- Linux security modules
- Kubernetes Pod and Deployment manifests
- Helm templates
- Ubuntu/Debian AppArmor utilities

## Sources Consulted
- Kubernetes documentation: Restrict a Container's Access to Resources with AppArmor - https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes blog: registry.k8s.io: faster, cheaper and Generally Available - https://kubernetes.io/blog/2022/11/28/registry-k8s-io-faster-cheaper-ga/
- Debian manpage: apparmor.d(5) profile syntax - https://manpages.debian.org/testing/apparmor/apparmor.d.5.en.html
- Ubuntu manpage: apparmor_parser(8) - https://manpages.ubuntu.com/manpages/jammy/man8/apparmor_parser.8.html
- Ubuntu manpage: aa-status(8) - https://manpages.ubuntu.com/manpages/jammy/man8/aa-status.8.html
- Ubuntu manpage: aa-complain(8) - https://manpages.ubuntu.com/manpages/bionic/man8/aa-complain.8.html

## Issues Found
- The Kubernetes examples used the deprecated AppArmor annotation format `container.apparmor.security.beta.kubernetes.io/...`. Current Kubernetes documentation says AppArmor should be configured with `securityContext.appArmorProfile`, and annotations are the pre-v1.30 deprecated API. Updated the single-container Pod, multi-container Pod, test Pod, and Helm Deployment examples to use `appArmorProfile`.
- The profile option names used annotation-style values such as `runtime/default`, `localhost/<profile-name>`, and `unconfined`. Updated them to the current API values `RuntimeDefault`, `Localhost` with `localhostProfile`, and `Unconfined`.
- The examples used the legacy Kubernetes image registry `k8s.gcr.io/pause:3.5`. Kubernetes moved release images to `registry.k8s.io`, so the DaemonSet examples now use `registry.k8s.io/pause:3.6`.
- The test Pod used `/bin/bash` and `strace`, which are not reliable assumptions for the `nginx` container image. Updated the command to use `/bin/sh` and replaced the `strace` check with verification of `/proc/1/attr/current`, which Kubernetes documents as the way to confirm the applied AppArmor profile.

## Review Notes
- AppArmor profile snippets were syntax-checked locally with `apparmor_parser -Q -K`.
- Non-template Kubernetes YAML snippets were parsed with PyYAML. Helm templates were reviewed manually against Kubernetes field documentation because they are not plain YAML until rendered.
- Kubernetes does not load custom AppArmor profiles onto nodes automatically; the DaemonSet approach remains an example of custom infrastructure, consistent with Kubernetes documentation.
