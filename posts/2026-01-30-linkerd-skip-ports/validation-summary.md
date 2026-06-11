# Validation Summary: How to Build Linkerd Skip Ports

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linkerd
- Kubernetes
- Service mesh proxy injection
- Kubernetes annotations
- Kubernetes NetworkPolicy
- Prometheus scraping annotations

## Sources Consulted
- Linkerd Proxy Configuration: https://linkerd.io/2-edge/reference/proxy-configuration/
- Linkerd TCP Proxying and Protocol Detection: https://linkerd.io/2-edge/features/protocol-detection/
- Linkerd Automatic Proxy Injection: https://linkerd.io/2-edge/features/proxy-injection/
- Linkerd Adding your services: https://linkerd.io/2-edge/tasks/adding-your-service/
- Linkerd Dashboard and on-cluster metrics stack: https://linkerd.io/2-edge/features/dashboard/
- Linkerd Securing Linkerd Tap: https://linkerd.io/2-edge/tasks/securing-linkerd-tap/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The description and introduction described skip ports as excluding ports from proxy injection. Linkerd still injects the sidecar; skip ports configure traffic redirection to bypass the proxy. Updated the wording to say "proxy redirection."
- The inbound skip-port guidance presented direct inbound bypass as a normal first choice. Linkerd documentation describes `skip-inbound-ports` as a full proxy bypass and recommends opaque ports for many protocol-detection cases where traffic should stay meshed. Updated the guidance to mention opaque ports first for protocol-detection issues.
- The outbound skip-port guidance did not state that the annotation belongs on the source workload. Updated the text to match Linkerd's protocol detection documentation.
- The database guidance implied skip ports are the normal fix for database protocols. Updated it to distinguish opaque ports, which preserve mTLS and TCP metrics, from skip ports, which bypass the proxy entirely.
- The namespace-level section implied changes affect all pods immediately. Linkerd proxy configuration is applied during injection, so existing pods must be recreated. Updated the wording accordingly.
- The verification section used an unsupported proxy config file path, `/var/run/linkerd/config/proxy.json`. Replaced it with a Kubernetes annotation check against the created pod.
- The dashboard and tap commands used pre-viz command names. Updated `linkerd dashboard` to `linkerd viz dashboard` and `linkerd tap` to `linkerd viz tap`.
- The security section referred to ServiceProfiles as authorization policy. Updated it to refer to Linkerd authorization policies.

## Review Notes
The YAML examples use valid Kubernetes resource shapes for the fields shown. Some examples are illustrative and omit production details such as image tags, selectors in shorter snippets, and complete NetworkPolicy peer selectors. The local environment did not have the `linkerd` CLI installed, so CLI checks were verified against official Linkerd command documentation rather than local `--help` output.
