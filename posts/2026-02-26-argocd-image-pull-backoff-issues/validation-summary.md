# Validation Summary: How to Handle Image Pull Backoff Issues with ArgoCD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Argo CD Notifications
- Kubernetes Pods, Jobs, Events, Secrets, and image pull behavior
- External Secrets Operator
- Amazon Elastic Container Registry
- Docker Registry pull-through cache
- containerd registry mirror configuration
- GitHub Actions
- Docker CLI
- Prometheus Operator and kube-state-metrics

## Sources Consulted
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notifications Slack service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD CLI `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Kubernetes images and image pull policy documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- External Secrets Operator ECR generator documentation: https://external-secrets.io/latest/api/generator/ecr/
- External Secrets Operator generator documentation: https://external-secrets.io/latest/guides/generator/
- AWS ECR private registry authentication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS CLI ECR `get-authorization-token` reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-authorization-token.html
- containerd registry hosts configuration documentation: https://github.com/containerd/containerd/blob/main/docs/hosts.md
- go-containerregistry `crane manifest` documentation: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Operator API documentation for `PrometheusRule`: https://github.com/prometheus-operator/prometheus-operator

## Issues Found
- The External Secrets Operator ECR example treated ECR credentials as a static remote secret and encoded a single `token` value as Docker `auth`. This is not a reliable ECR refresh pattern and the Docker config fields were incomplete. Updated it to use the official `ECRAuthorizationToken` generator and render `username`, `password`, and `auth` from the generated values.
- The External Secrets Operator example used `external-secrets.io/v1beta1`. Updated it to the current `external-secrets.io/v1` API used by the latest official examples.
- The registry mirror Deployment had a selector but no matching `spec.template.metadata.labels`, which would make the Deployment invalid. Added the `app: registry-mirror` pod template label.
- The containerd mirror example used the older `registry.mirrors` CRI configuration. Updated it to the current `config_path` plus per-registry `hosts.toml` configuration.
- The containerd mirror endpoint used a Kubernetes service DNS name from node-level containerd configuration. Node-level containerd needs an endpoint reachable from the node network, so the example now states that the mirror must be exposed through a node-reachable endpoint and uses a placeholder internal DNS name.

## Review Notes
- The recommendation to use `imagePullPolicy: IfNotPresent` is accurate for immutable, non-`latest` tags and matches Kubernetes defaults for non-`latest` tags. In environments that reuse mutable tags, `IfNotPresent` can hide updates on nodes with cached images, so immutable tags or digests are still preferred.
- The Argo CD retry configuration is syntactically valid, but sync retry does not by itself fix a pod that already exists with an unpullable image. A Git fix, secret fix, pod recreation, or later image availability is still required.
