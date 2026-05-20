# Validation Summary: How to Rate Limit and Secure ArgoCD API Access

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- Argo CD authentication, local accounts, tokens, RBAC, logging, and metrics
- Kubernetes Ingress, NetworkPolicy, ConfigMap, Secret, and CronJob resources
- ingress-nginx rate limiting annotations
- Istio EnvoyFilter local rate limiting
- Fluent Bit log forwarding
- Prometheus PromQL

## Sources Consulted
- Argo CD user management documentation: https://argo-cd.readthedocs.io/en/release-2.7/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD security and logging documentation: https://argo-cd.readthedocs.io/en/release-2.2/operator-manual/security/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Istio rate limiting with Envoy documentation: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Fluent Bit Tail input documentation: https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit Grep filter documentation: https://docs.fluentbit.io/manual/pipeline/filters/grep
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch

## Issues Found
- The ingress-nginx snippet used `nginx.ingress.kubernetes.io/use-forwarded-headers`, but `use-forwarded-headers` is an ingress-nginx controller ConfigMap setting, not an Ingress annotation. Removed it from the Ingress and added a short note to configure it at the controller level when trusted forwarded headers are needed.
- The ingress-nginx snippet described `backend-protocol: "HTTPS"` as SSL passthrough for gRPC. Updated the comment to describe HTTPS upstream communication, and added a caveat that native Argo CD CLI gRPC may require a separate `GRPCS` ingress or SSL passthrough. Also noted that SSL passthrough bypasses HTTP-layer rate-limit annotations.
- The NetworkPolicy allowed monitoring traffic to port `8082`, but Argo CD server metrics are exposed on port `8083`. Updated the monitoring ingress rule to port `8083`.
- The audit logging section implied that `server.log.level` enables audit logging and that every API call is logged. Revised the text to say the config enables structured server logging, and clarified that Argo CD logs payloads for most API requests except sensitive requests and records Kubernetes events for application operations.
- The Fluent Bit Tail input used `Parser json` directly on Kubernetes container log files. Updated it to use `Multiline.Parser docker, cri`, matching Fluent Bit guidance for `/var/log/containers/*.log`.
- The PromQL comments said the queries grouped by user/client, but the queries grouped by `grpc_method`. Updated the comments to match the queries.

## Review Notes
The examples are generally version-neutral and use current Kubernetes API versions. The NGINX section now calls out an important operational caveat: rate limits are HTTP-layer annotations, so they do not protect traffic handled through SSL passthrough. Validate final ingress behavior in the target cluster because Argo CD UI/API, CLI gRPC, and `grpc-web` routing choices depend on the ingress design.
