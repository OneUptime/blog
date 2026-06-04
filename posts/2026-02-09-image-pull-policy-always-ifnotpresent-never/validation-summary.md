# Validation Summary: How to Configure imagePullPolicy and Always, IfNotPresent, Never Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods and Deployments
- Kubernetes container image pull policies
- Kubernetes imagePullSecrets
- kubectl
- Docker CLI image pull/load commands
- PrometheusRule custom resources
- kube-state-metrics

## Sources Consulted
- Kubernetes Images documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- Prometheus Operator PrometheusRule CRD reference: https://doc.crds.dev/github.com/prometheus-operator/prometheus-operator/monitoring.coreos.com/PrometheusRule/v1
- Docker CLI docker image pull reference: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker CLI docker image load reference: https://docs.docker.com/reference/cli/docker/image/load/

## Issues Found
- The post incorrectly stated that images with no tag default to `IfNotPresent`. Kubernetes treats an omitted tag as `:latest` and sets `imagePullPolicy` to `Always` when the field is omitted. Updated the default behavior section and example comment.
- The post described `Always` as pulling the full image every time. Kubernetes resolves the image name to a digest every time, but reuses the cached image when that exact digest is already present. Updated the explanation and startup-time wording.
- The `Never` policy failure text named only `ImagePullBackOff`. Missing local images with `imagePullPolicy: Never` commonly surface as `ErrImageNeverPull`; updated the wording.
- The DaemonSet pre-pull example was in a `bash` fence even though it is YAML, and it used the older `gcr.io/google_containers/pause` registry. Changed the fence to `yaml` and the image to `registry.k8s.io/pause:3.10`.
- The Prometheus alert example showed only a raw `groups` block while labeling it as a `PrometheusRule`. Added the required `apiVersion`, `kind`, `metadata`, and `spec` wrapper for a Kubernetes `PrometheusRule` custom resource.

## Review Notes
Local `kubectl` was not installed in this workspace, so kubectl syntax was checked against the official generated Kubernetes CLI reference instead of local `--help` output. The examples are generally valid illustrative manifests, but several image names and registry URLs are placeholders that require replacement in a real cluster.
