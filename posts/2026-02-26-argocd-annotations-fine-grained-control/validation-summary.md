# Validation Summary: How to Use ArgoCD Annotations for Fine-Grained Control

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD sync waves, hooks, sync options, compare options, and resource tracking
- Argo CD Notifications
- Argo CD Image Updater
- Kubernetes YAML manifests

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Compare Options: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/compare-options/
- Argo CD Resource Tracking: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/
- Argo CD Annotations and Labels: https://argo-cd.readthedocs.io/en/latest/user-guide/annotations-and-labels/
- Argo CD Notification Subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD Image Updater image configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater legacy annotation configuration, release 0.15: https://argocd-image-updater.readthedocs.io/en/release-0.15/configuration/images/

## Issues Found
- Several Kubernetes examples were missing required fields such as Deployment selectors/template labels, StatefulSet `serviceName`, Application `spec`, and Job pod templates. Added minimal valid fields so the examples are structurally correct.
- The hook phase list omitted current `PreDelete` and `PostDelete` hook phases. Added both.
- The post documented a non-existent `argocd.argoproj.io/managed-by` annotation for assigning resource ownership. Replaced that section with the documented `argocd.argoproj.io/tracking-id` annotation and adjusted the explanation.
- The notification webhook example used a raw URL as the recipient. Argo CD Notifications expects the webhook subscription recipient to be the configured webhook name, so the example now uses `deploy-webhook`.
- The Image Updater example used an unsupported `app.semver-constraint` annotation and the older `latest` strategy name. Moved the semver constraint into `image-list` and changed `latest` to `newest-build`. Also clarified that Application annotations are legacy in current Image Updater versions and require `useAnnotations: true`.

## Review Notes
The core Argo CD annotations for sync waves, hooks, hook delete policies, sync options, compare options, notifications, and resource tracking match the official documentation after the fixes. Image Updater has shifted toward the `ImageUpdater` custom resource in current documentation, so future posts should prefer that API for new examples.
