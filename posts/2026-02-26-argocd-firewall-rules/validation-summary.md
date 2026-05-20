# Validation Summary: How to Handle Firewall Rules for ArgoCD Operations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes NetworkPolicy
- Kubernetes API server networking
- AWS EC2 security groups and AWS CLI
- Google Cloud VPC firewall rules and gcloud CLI
- GitHub, GitLab, Bitbucket webhooks
- OIDC, Dex, LDAP, Git, Helm

## Sources Consulted
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD argocd-application-controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD argocd-repo-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD Git webhook configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/webhook/
- Argo CD official install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes API server access documentation: https://kubernetes.io/docs/concepts/security/controlling-access/
- AWS CLI authorize-security-group-ingress documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Google Cloud gcloud compute firewall-rules create documentation: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- GitHub REST API meta endpoint documentation: https://docs.github.com/rest/reference/meta
- GitHub live meta endpoint for hook CIDRs: https://api.github.com/meta
- GitLab.com IP range documentation: https://docs.gitlab.com/user/gitlab_com/#ip-range

## Issues Found
- The internal communication table and diagram omitted the repo server to Redis connection. Added that flow because Argo CD's official install manifest allows repo-server ingress to Redis and repo-server command options include Redis configuration.
- The API server to Dex row listed only port 5557 as gRPC. Updated it to 5556/5557 HTTP/gRPC because Argo CD's server default Dex address is `argocd-dex-server:5556`, while the Dex service also exposes gRPC on 5557.
- The NetworkPolicy examples were described as a complete set but omitted Dex ingress from the API server. Added a scoped Dex ingress policy for ports 5556 and 5557.
- The Redis NetworkPolicy allowed only the API server and application controller. Added repo server as an allowed source, matching Argo CD's official install manifest and avoiding blocked cache access under default-deny ingress.
- The GitHub webhook CIDR examples were missing the current `143.55.64.0/20` IPv4 hook range. Added it to the NetworkPolicy examples and clarified that the static examples cover IPv4 ranges.
- The AWS security group example used `sg-argocd` as a group ID after creating a security group. Changed the command to capture the actual `GroupId` into `ARGOCD_SG_ID` and use it in later commands.

## Review Notes
The firewall examples still use broad egress ranges such as `0.0.0.0/0` for Git, Helm, and Kubernetes API access. This is technically valid for a general guide, but production environments should replace those ranges with provider-specific IP ranges, private endpoints, NAT egress controls, or organization-approved destinations where practical. GitHub and GitLab webhook IP ranges can change, so generated firewall rules should be refreshed from provider metadata rather than copied permanently from the article.
