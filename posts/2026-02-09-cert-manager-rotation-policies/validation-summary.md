# Validation Summary: How to Configure cert-manager Certificate Rotation Policies and Grace Periods

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- cert-manager Certificate resources
- cert-manager CertificateRequest resources
- cert-manager private key rotation policies
- Kubernetes Secrets and Deployments
- kubectl and cmctl commands
- Prometheus alerting rules
- Python file watching with watchdog

## Sources Consulted
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager FAQ: https://cert-manager.io/docs/faq/
- cert-manager cmctl documentation: https://cert-manager.io/docs/reference/cmctl/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager metrics package reference: https://pkg.go.dev/github.com/cert-manager/cert-manager/pkg/metrics
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/

## Issues Found
- The post said cert-manager supports three private key rotation policies. cert-manager supports two values, Never and Always. Updated the text to say two policies.
- The post did not mention the cert-manager v1.18 default change for private key rotation. Added a short note that Always is the default in v1.18.0 and later, while Never was the default in earlier versions.
- The default renewal calculation was described as renewBefore being 2/3 of the certificate duration. cert-manager schedules renewal 2/3 of the way through the certificate duration by default, which leaves about 1/3 of the duration before expiry. Corrected the example comments and explanatory text.
- The ACME grace-period guidance described longer grace periods as essential. This was too absolute, so it was changed to "useful" while preserving the guidance.
- The CertificateInGracePeriod Prometheus expression compared expiration and renewal timestamps in the wrong direction. Replaced it with a check that current time is after the renewal timestamp and before expiration.
- The CertificateRenewalFailed Prometheus expression used increase() on a timestamp gauge, which is misleading. Replaced it with a check for certificates expiring within seven days whose renewal timestamp has passed.
- The manual renewal section recommended deleting the Secret or setting cert-manager.io/issue-temporary-certificate. Deleting the Secret is not the recommended manual renewal path, and the temporary-certificate annotation does not trigger renewal. Replaced both with cmctl renew.
- The Python certificate reload example referenced ssl_context without showing initialization or a safe context swap. Added ssl.SSLContext initialization and replaced the context after loading the renewed certificate and key.

## Review Notes
The examples assume cert-manager v1 APIs and a Prometheus Operator installation for PrometheusRule. kubectl was not installed in the local workspace, so command validation was performed against official Kubernetes and cert-manager documentation instead of local --help output.
