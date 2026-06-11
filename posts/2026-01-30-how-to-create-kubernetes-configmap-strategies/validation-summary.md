# Validation Summary: How to Create Kubernetes ConfigMap Strategies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes ConfigMaps
- Kubernetes Secrets
- Kubernetes volumes and environment variables
- Kustomize
- Helm templates
- Stakater Reloader
- kubectl

## Sources Consulted
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Kubernetes Configure a Pod to Use a ConfigMap task: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Helm Chart Development Tips and Tricks: https://helm.sh/docs/howto/charts_tips_and_tricks/
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/main/reference/annotations.html
- Stakater Reloader install manifest URL: https://raw.githubusercontent.com/stakater/Reloader/master/deployments/kubernetes/reloader.yaml

## Issues Found
- The post stated that volume-mounted ConfigMaps update automatically. Kubernetes updates mounted ConfigMap content eventually, not instantly, and `subPath` mounts do not receive updates. I clarified the timing, the `subPath` exception, and that applications must reread mounted files to apply runtime changes.
- The post stated that immutable ConfigMaps must be updated by creating a differently named ConfigMap. Kubernetes also allows deleting and recreating an immutable ConfigMap, with affected pods restarted. I changed the wording to describe both the versioned ConfigMap approach and the delete/recreate plus pod restart approach.

## Review Notes
The `kubectl` binary is not installed in this environment, so command validation was performed against the official Kubernetes CLI reference instead of local `kubectl --help` output. The Reloader raw manifest URL returned HTTP 200 on 2026-06-11.
