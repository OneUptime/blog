# Validation Summary: How to Configure cert-manager with Step-CA for Custom ACME Certificate Authority

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- cert-manager
- ACME
- Smallstep Step-CA
- Smallstep step CLI
- Helm
- TLS/X.509 certificates
- Kubernetes NetworkPolicy

## Sources Consulted
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Smallstep step-certificates Helm chart README and values: https://github.com/smallstep/helm-charts/tree/master/step-certificates
- Smallstep `step ca init` command reference: https://smallstep.com/docs/step-cli/reference/ca/init/
- Smallstep `step ca provisioner add` command reference: https://smallstep.com/docs/step-cli/reference/ca/provisioner/add/
- Smallstep `step ca provisioner update` command reference: https://smallstep.com/docs/step-cli/reference/ca/provisioner/update/
- Smallstep Step-CA provisioners documentation: https://smallstep.com/docs/step-ca/provisioners/
- Smallstep Step-CA configuration documentation: https://smallstep.com/docs/step-ca/configuration/
- Smallstep cert-manager ACME integration tutorial: https://smallstep.com/docs/tutorials/kubernetes-acme-ca/
- Kubernetes well-known labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- The Helm install flow used chart values and a separate in-pod `step ca init` command that do not match the current chart's recommended bootstrap flow. Updated the install to generate Helm values with `step ca init --helm`, pass base64-encoded password values, set `fullnameOverride=step-ca`, and set `service.port=9000` so later service URLs and pod names are consistent.
- The ACME provisioner section attempted to add an `acme` provisioner even though the corrected `step ca init --acme` flow already creates it. Changed this section to verify the provisioner instead.
- The HTTP-01 solver used the older `class` field. Updated it to `ingressClassName`, which cert-manager documents as the recommended field.
- The HTTP-01 certificate example included Kubernetes service DNS names that would not be validated by the ingress-based HTTP-01 solver unless those names route to the solver ingress. Removed those names and kept the example to a DNS name suitable for ACME validation.
- The ECDSA certificate examples included `key encipherment`, which is not appropriate for ECDSA server/client certificates. Removed that usage from the ECDSA examples.
- The DNS-01 section did not state that the DNS provider must manage the requested zone. Added that clarification.
- The HA Helm values snippet used unsupported chart fields and `replicaCount: 3`, while the chart documents only one supported replica. Replaced it with a Step-CA `db` configuration example and a caveat about using shared PostgreSQL/MySQL with an HA deployment topology.
- The monitoring section used a chart label that would not match current chart resources and used `step ca admin list` for ACME accounts. Updated the label selector and changed the command to `step ca provisioner list`.
- The metrics check used HTTP against the HTTPS Step-CA endpoint. Updated it to `curl -k https://localhost:9000/metrics`.
- The NetworkPolicy selected pods and namespaces with labels that are not created by the chart or Kubernetes by default. Updated pod selectors to chart labels and namespace selectors to the Kubernetes `kubernetes.io/metadata.name` label.

## Review Notes
The post is now technically accurate as a general guide. Environments still need provider-specific DNS-01 credentials, ingress routing, Step-CA metrics configuration, and production-grade secret handling before using these snippets in production.
