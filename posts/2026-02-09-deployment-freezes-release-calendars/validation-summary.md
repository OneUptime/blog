# Validation Summary: How to Implement Deployment Freezes and Release Calendars in Kubernetes CI/CD

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes admission webhooks
- Kubernetes Deployments, Services, ConfigMaps, and CronJobs
- Go HTTP services and Kubernetes API types
- GitHub Actions workflows
- FullCalendar
- Slack incoming webhooks
- Python notification script

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes AdmissionReview API reference: https://kubernetes.io/docs/reference/config-api/apiserver-admission.v1
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- GitHub Actions workflow syntax and job outputs documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- FullCalendar Event Object documentation: https://fullcalendar.io/docs/event_data/Event_Object
- Slack incoming webhooks documentation: https://docs.slack.dev/tools/java-slack-sdk/guides/incoming-webhooks/

## Issues Found
- The initial Go webhook example was not buildable because it used `fmt.Sprintf` without importing `fmt`, referenced helper functions that were not defined, and did not start an HTTPS server even though the Kubernetes webhook configuration targets port 443. Added the missing imports, helper functions, nil request handling, response content type, UTC time comparison, and a TLS server using the mounted certificate paths.
- The webhook name used the Kubernetes-owned `k8s.io` domain. Changed it to `freeze.company.com`, matching the rest of the example's company-owned annotation namespace.
- The emergency override Deployment snippet was not a valid `apps/v1` Deployment because it omitted the required `spec.selector` and pod template. Added a minimal valid Deployment spec while preserving the annotation example.
- The override helper ignored JSON unmarshal errors, depended on an undeclared `appsv1` import, and called an undefined `logOverride` function. Updated it to parse object metadata with `metav1.PartialObjectMetadata`, check the unmarshal error, and log with `log.Printf`.
- The text said the webhook should honor override annotations, but the example did not show where to call the helper. Added the required check before `respondDenied`.
- The CronJob comment said "9 AM and 5 PM daily" without specifying the timezone. Added `.spec.timeZone: "Etc/UTC"` and updated the comment to "9 AM and 5 PM UTC daily".

## Review Notes
The Kubernetes admission webhook rule only covers `apps/v1` Deployment create and update requests in namespaces selected by `freeze-enforcement: enabled`; other workload resources such as StatefulSets, DaemonSets, Jobs, or custom rollout resources would need additional rules if the organization deploys those directly.
