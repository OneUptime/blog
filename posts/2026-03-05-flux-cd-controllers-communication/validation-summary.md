# Validation Summary: How Flux CD Controllers Communicate with Each Other

## Status
validated

## Post Type
Technical architecture guide

## Technologies Covered
- Flux CD
- Kubernetes controllers and custom resources
- Flux source-controller
- Flux kustomize-controller
- Flux helm-controller
- Flux notification-controller
- GitRepository, Kustomization, HelmRelease, HelmChart, Alert, and Receiver resources

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification-controller documentation: https://fluxcd.io/flux/components/notification/
- Flux notification Events documentation: https://fluxcd.io/flux/components/notification/events/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receivers guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The post described notification forwarding as Kubernetes `Event` resources watched through the Kubernetes API server. Current Flux documentation describes Flux controllers pushing Flux event payloads to the notification-controller event API. I changed the section title, explanation, diagram, and sample event payload to use Flux events instead of a core Kubernetes `Event` manifest.

## Review Notes
The artifact URL, GitRepository artifact status fields, source-controller storage server port, Kustomization `sourceRef`, Receiver API version, Alert API version, and HelmChart creation behavior are consistent with the current Flux documentation. The post remains a high-level architecture explanation; several examples use simplified names and revisions, which is appropriate for the article.
