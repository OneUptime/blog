# Validation Summary: How to Use Portainer in Financial Services Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Docker Engine and Docker Swarm
- Docker Compose / stack files
- Microsoft Entra ID / OAuth SSO
- HashiCorp Vault
- Jira REST API
- Splunk HTTP Event Collector (HEC)
- Bash and Python automation

## Sources Consulted
- Portainer CLI configuration options — https://docs.portainer.io/advanced/cli
- Portainer authentication overview — https://docs.portainer.io/admin/settings/authentication
- Portainer OAuth authentication — https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer logs — https://docs.portainer.io/admin/logs
- Portainer SIEM log streaming — https://docs.portainer.io/sts/advanced/siem
- Portainer security and compliance note — https://docs.portainer.io/advanced/security
- Portainer API usage examples — https://docs.portainer.io/sts/api/examples
- Docker overlay network driver — https://docs.docker.com/engine/network/drivers/overlay/
- Docker `network create` CLI reference — https://docs.docker.com/reference/cli/docker/network/create/
- Docker Compose networks reference — https://docs.docker.com/reference/compose-file/networks/
- Docker Compose deploy reference — https://docs.docker.com/reference/compose-file/deploy/
- Docker image digests — https://docs.docker.com/dhi/core-concepts/digests/
- Docker `service update` CLI reference — https://docs.docker.com/reference/cli/docker/service/update/
- Docker Swarm services behavior — https://docs.docker.com/engine/swarm/services/
- Splunk HTTP Event Collector formatting — https://help.splunk.com/en/splunk-enterprise/get-data-in/get-started-with-getting-data-in/9.3/get-data-with-http-event-collector/format-events-for-http-event-collector
- Atlassian Jira Cloud REST API v2 issues — https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/
- Vault Agent Injector — https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- Vault Agent Injector vs. Vault CSI Provider — https://developer.hashicorp.com/vault/docs/platform/k8s/injector-csi

## Issues Found
- The description and compliance language overstated Portainer's role by implying the product itself makes an environment PCI-DSS compliant. I changed that wording to frame Portainer as supporting PCI-DSS and SOX control objectives, which matches Portainer's own security and compliance documentation.
- The regulation mapping table referenced unsupported or overly specific features such as Portainer "namespace isolation," "image scanning integration," and "deployment approval workflows." I replaced those with documented Portainer capabilities plus clearly external controls where Portainer is not the system of record.
- The installation example used invalid or misleading Portainer flags: `--ssl` is not a documented Portainer flag, and `--tlsverify` applies to Docker daemon connections rather than client-certificate auth to the Portainer UI or API. I removed those flags and switched the image tag from `:latest` to `:lts` for a production-oriented example.
- The SSO section described a SAML and environment-variable setup that does not match current Portainer authentication docs. I rewrote it to use the documented OAuth workflow and Entra group-to-team mapping model.
- The CDE isolation example declared `encrypted: true` directly in the Compose network and referenced secrets without defining them. I changed the flow to pre-create an encrypted internal overlay network with `docker network create`, reference it as an external network, and declare the external secrets explicitly.
- The immutable deployment example said to fetch `RepoDigests` "after build," which is unreliable until the image has been pushed or pulled from a registry. I updated the snippet to push the approved image first and then inspect the digest.
- The change-management script used the wrong Splunk HEC auth scheme and an invalid Portainer service-update request body. I corrected the Splunk header to `Authorization: Splunk ...` and changed the Portainer deployment logic to fetch the current Docker service spec through Portainer's API gateway, update the image in the spec, and POST it back with the required service version.
- The Vault section mixed Docker Swarm examples with Kubernetes-only secret injection patterns. I clarified that Vault Agent sidecar injection and the Vault CSI Provider are Kubernetes-specific, and that Swarm services should consume Docker secrets created from approved Vault-managed material.
- The compliance-monitoring script claimed to validate approved "base images" but only checked deployed image names, used unsafe JSON piping with `echo`, and left the root-user check unfinished. I corrected the terminology, switched to robust JSON handling with `printf`, and implemented the root-user inspection step against the Portainer and Docker API.

## Review Notes
- Portainer's documentation explicitly notes that Portainer itself does not hold PCI-DSS compliance because it runs on customer-managed infrastructure; compliance remains a property of the full environment and operating controls.
- The production-oriented examples now prefer the Portainer `lts` stream, which Portainer recommends for production workloads.
- The Portainer API examples assume a Docker Swarm environment managed through Portainer's Docker API gateway and that the caller has a valid Portainer API key with permission to inspect and update the target service.
- All embedded Bash blocks pass `bash -n`, and both YAML blocks parse successfully.
