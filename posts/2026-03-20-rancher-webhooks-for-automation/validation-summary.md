# Validation Summary: How to Use Rancher Webhooks for Automation - For

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- Rancher Webhook
- Kubernetes admission webhooks
- Kubernetes Ingress and Deployment resources
- Prometheus Alertmanager
- cert-manager CA injection
- kubernetes-event-exporter
- Python
- Flask

## Sources Consulted
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission API (`AdmissionReview` / `AdmissionResponse`): https://kubernetes.io/docs/reference/config-api/apiserver-admission.v1/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `kubectl create ingress` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_ingress/
- Rancher Webhook reference: https://ranchermanager.docs.rancher.com/v2.9/reference-guides/rancher-webhook
- Fleet "Using Webhooks Instead of Polling": https://fleet.rancher.io/0.14/how-tos-for-users/webhook
- Prometheus Alertmanager configuration: https://prometheus.io/docs/alerting/latest/configuration/
- cert-manager CA Injector: https://cert-manager.io/v1.9-docs/concepts/ca-injector/
- kubernetes-event-exporter README and configuration examples: https://github.com/resmoio/kubernetes-event-exporter

## Issues Found
- The introduction and description blurred Rancher's internal webhook component together with general event-driven webhook automation. I clarified the wording so it accurately distinguishes Kubernetes admission webhooks, Fleet Git/provider webhooks, and Alertmanager webhook integrations in Rancher-managed environments.
- The validating webhook Deployment manifest was not valid for `apps/v1` because it omitted the required `.spec.selector` and matching pod template labels. I added the selector and labels and also added the missing Service that `clientConfig.service` depended on.
- The validating webhook example did not fully specify the AdmissionReview success response. I updated the Python handler to return `apiVersion`, `kind`, and the copied `uid`, and added an explicit `403` status code to the deny response.
- The mutating webhook rules omitted `apiVersions`, which is required in `admissionregistration.k8s.io/v1` webhook rules. I added `apiVersions: ["v1"]`, `scope: "Namespaced"`, and an explicit service port reference.
- The Fleet section used a direct Rancher API `forceUpdate` URL as a webhook target. Fleet's documented webhook integration uses the `gitjob` service behind an Ingress plus an optional `gitjob-webhook` secret, so I replaced the unsupported flow with the documented one.
- The event-routing section used an `eventrouter` Deployment with environment variables that do not match the upstream project's documented configuration model. I replaced that with a `kubernetes-event-exporter` webhook receiver ConfigMap that matches the maintained project's README.
- The Python event handler referenced an undefined `SLACK_WEBHOOK_URL`, imported unused modules, and used brittle message matching for image-pull failures. I switched the webhook URL to an environment variable, imported `requests` explicitly, added a timeout plus `raise_for_status()`, and broadened the message match.

## Review Notes
- `kubectl` was not installed in this workspace, so the CLI example was verified against the official Kubernetes command reference instead of local `--help` output.
- The post still uses illustrative placeholder hosts and images such as `ops-automation.company.com` and `myregistry/webhook-validator:1.0.0`; these are plausible examples but not real endpoints.
- Rancher's own `rancher-webhook` component is managed by Rancher, and Rancher documents that manual edits to its webhook configurations are overwritten. The post now frames these examples as custom automation patterns for Rancher-managed clusters rather than modifications to Rancher's internal webhook.
