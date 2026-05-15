# Validation Summary: How to Filter Alerts by Event Reason in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Alert custom resource
- Kubernetes Events
- kubectl
- Flux CLI
- Go regular expressions

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Events monitoring documentation: https://fluxcd.io/flux/monitoring/events/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Go `regexp` package documentation: https://go.dev/pkg/regexp/

## Issues Found
- The post described filtering alerts by event reason, but Flux Alert `spec.exclusionList` matches event message content, not the `reason` field. Updated the description, explanation, and summary to clarify that reasons should be inspected but message patterns are what the Alert filter evaluates.
- The post said event messages typically contain the reason. Flux documentation shows event reason and message as separate fields, and the Alert exclusion filter is message-based. Reworded this section to avoid implying direct reason matching.
- Several exclusion examples used message patterns that do not match documented Flux event messages, such as `^Reconciliation finished.*no changes$` and `^stored artifact.*same revision$`. Replaced them with patterns matching documented messages such as successful Kustomization reconciliation, unchanged Git source checks, and up-to-date chart artifacts.
- The event inspection commands used older or less targeted `kubectl get events` forms. Updated the primary examples to use the documented `kubectl events` command and `--for` filter.
- The regex syntax note compared Go regex to POSIX extended regex. Updated it to state that Go regular expressions are based on RE2.

## Review Notes
The post remains a message-pattern filtering guide rather than direct reason filtering because Flux Alert does not expose a reason-specific exclusion field. The title was left unchanged to preserve the existing post identity, but the body now states the technical limitation clearly.
