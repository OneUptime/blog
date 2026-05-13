# Validation Summary: How to Configure Custom Health Checks for CronJobs in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux kustomize-controller health checks
- Kubernetes CronJob and Job resources
- Kubernetes RBAC, ServiceAccounts, Secrets, and ConfigMaps
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux kstatus implementation for built-in resource health checks: https://raw.githubusercontent.com/kubernetes-sigs/cli-utils/master/pkg/kstatus/status/core.go
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes well-known labels, annotations, and taints reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post overstated what Flux CronJob health checks validate. Flux lists CronJob as a supported health check kind, but the underlying kstatus implementation treats `batch/CronJob` as always ready after it is present. Updated the explanation to say CronJob health checks verify that the resource is applied and found, not that future Jobs, pods, image pulls, referenced Secrets, or RBAC behavior will work.
- The post implied `wait: true` validates all CronJob dependencies at runtime. Updated the relevant wording to clarify that Flux applies and health-checks reconciled resources, while CronJob execution problems must be diagnosed from Jobs and Pods.
- The debugging section listed missing referenced Secrets, CronJob ServiceAccount RBAC, and missing container images as Flux CronJob health-check failures. Updated the list to focus on apply, namespace, health check target, and Flux permission issues, and moved execution-time failures to Job/Pod troubleshooting.
- The command `kubectl get jobs -n production -l job-name=database-backup` used an unsuitable label selector because Jobs created by a CronJob are not named exactly like the CronJob, and the unprefixed `job-name` label is deprecated in Kubernetes 1.27 and newer. Replaced it with a creation-time sorted Job list filtered by the CronJob name prefix.

## Review Notes
The Kubernetes manifests use current `batch/v1` CronJob and `kustomize.toolkit.fluxcd.io/v1` Kustomization APIs. The local environment did not have `flux` or `kubectl` installed, so CLI behavior was checked against official documentation rather than local `--help` output.
