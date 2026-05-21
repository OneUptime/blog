# Validation Summary: How to Prepare for Istio Certification Exams

## Status
validated

## Post Type
Certification preparation guide

## Technologies Covered
- Istio
- Istio Certified Associate (ICA)
- Kubernetes
- kind
- istioctl
- Istio traffic management APIs: VirtualService, DestinationRule, Gateway
- Istio security APIs: PeerAuthentication, AuthorizationPolicy, RequestAuthentication

## Sources Consulted
- Linux Foundation ICA certification page: https://training.linuxfoundation.org/certification/istio-certified-associate-ica/
- Linux Foundation ICA FAQ: https://docs.linuxfoundation.org/tc-docs/certification/frequently-asked-questions-ica
- Linux Foundation ICA important instructions: https://docs.linuxfoundation.org/tc-docs/certification/important-instructions-ica
- Linux Foundation ICA resources allowed: https://docs.linuxfoundation.org/tc-docs/certification/certification-resources-allowed
- Istio getting started guide: https://istio.io/latest/docs/setup/getting-started/
- Istio kind platform setup: https://istio.io/latest/docs/setup/platform-setup/kind/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio canary upgrade guide: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/

## Issues Found
- The post described the ICA as validating production-environment ability. Updated this to match the Linux Foundation wording around foundational Istio principles, terminology, best practices, and setup ability.
- The exam details were outdated: passing score was listed as 75%, validity as 3 years, and the format omitted the Linux Foundation catalog's current multiple-choice note. Updated these to the current FAQ and catalog values: 68% passing score, 2-year validity, and an online proctored format with performance-based tasks and possible multiple-choice items.
- The exam domain table used an older curriculum split. Updated it to the current Linux Foundation weights: Installation, Upgrade, and Configuration 20%; Traffic Management 35%; Securing Workloads 25%; Troubleshooting 20%.
- The installation section said the demo profile includes all features. Updated this to "good defaults for practice" to match Istio's profile guidance more accurately.
- The post used removed `istioctl profile list`, `istioctl profile dump`, and `istioctl verify-install` commands. Replaced them with current `istioctl manifest generate`, `istioctl x precheck`, and `istioctl install --verify` usage.
- The canary upgrade example added `istio.io/rev` without removing the older `istio-injection` label. Updated the command to remove `istio-injection` and set `istio.io/rev`, because Istio documents that `istio-injection` takes precedence for backward compatibility.
- Updated stale revision examples from `1-22-1` to `1-29-2`, matching the current Istio 1.29 series referenced by Linux Foundation ICA instructions at review time.

## Review Notes
The Istio YAML examples for VirtualService, DestinationRule, Gateway, PeerAuthentication, AuthorizationPolicy, and RequestAuthentication validated successfully with `istioctl validate` from Istio 1.29.2. The current Linux Foundation materials emphasize Troubleshooting as a 20% domain, but the post only covers troubleshooting through validation and proxy inspection commands rather than a dedicated section.
