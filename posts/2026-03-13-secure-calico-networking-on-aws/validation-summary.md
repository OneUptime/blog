# Validation Summary: Secure Calico Networking on AWS

## Status
validated

## Post Type
Guide / Tutorial — defense-in-depth security hardening guide for Calico networking on AWS.

## Technologies Covered
- Calico (Project Calico v3 API)
- Kubernetes (NetworkPolicy networking.k8s.io/v1)
- AWS VPC (subnets, route tables, Internet Gateway)
- AWS Security Groups
- AWS CLI (EC2, CloudWatch Logs)
- VXLAN encapsulation
- AWS EC2 instance metadata service (IMDS)
- VPC Flow Logs / CloudWatch Logs Insights

## Sources Consulted
- AWS CLI v2 reference for `ec2 authorize-security-group-ingress`: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI v2 reference for `ec2 create-security-group`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-security-group.html
- AWS VPC Flow Logs CloudWatch Logs documentation: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-cwl.html
- AWS CLI `logs start-query` reference: https://docs.aws.amazon.com/cli/latest/reference/logs/start-query.html
- Kubernetes NetworkPolicy reference (networking.k8s.io/v1): https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico GlobalNetworkPolicy reference (projectcalico.org/v3): https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Kubernetes Service NodePort range: https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport (default 30000-32767)
- Kubelet ports: https://kubernetes.io/docs/reference/networking/ports-and-protocols/ (kubelet API on 10250)
- IANA VXLAN port assignment: UDP 4789 (RFC 7348)
- AWS IMDS endpoint: 169.254.169.254 (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html)

## Issues Found

1. **Incorrect AWS CLI syntax for `authorize-security-group-ingress` with security group sources.**
   The original commands combined `--source-group` with `--protocol` and `--port`. Per AWS CLI v2 documentation, `--source-group` cannot be combined with `--cidr`, `--ip-protocol`, `--from-port`, or `--to-port` — additionally, `--source-group` expects a security group *name* (EC2-Classic) and would not work with a security group ID in a VPC. The correct VPC syntax is to use `--ip-permissions` with `UserIdGroupPairs` referencing a GroupId. Updated both the kubelet rule and the VXLAN rule to use `--ip-permissions 'IpProtocol=...,FromPort=...,ToPort=...,UserIdGroupPairs=[{GroupId=...}]'`. The NodePort rule (which uses `--cidr 0.0.0.0/0`) was already valid and left unchanged.

## Review Notes
- The Kubernetes NetworkPolicy snippet omits `protocol: TCP` under `ports`. This is technically fine because `protocol` defaults to TCP, but specifying it explicitly is considered best practice.
- The Calico `GlobalNetworkPolicy` to block IMDS uses `selector: "all()"` and an `egress` `Deny` rule at `order: 1`. This blocks IMDSv1 and v2 access via the link-local IP. Note that this does not exempt host-networked pods that may legitimately need IMDS (e.g., aws-node, kube2iam, IRDS); operators should add an allowlist for those workloads in production.
- The VPC ID placeholder `vpc-0123456789` is a stylized placeholder shorter than current 17-character AWS VPC IDs (e.g., `vpc-0123456789abcdef0`), but this is presentational and not technically incorrect.
- The CloudWatch Logs Insights query uses `srcAddr`/`dstAddr` field names; this matches the casing used in AWS's own VPC Flow Logs documentation examples and works for VPC Flow Logs delivered to CloudWatch Logs.
- VXLAN port 4789 is the correct IANA-assigned UDP port; Calico's VXLAN overlay defaults to this port (Calico also supports IP-in-IP and WireGuard; the example assumes VXLAN mode).
