# Validation Summary: How to Configure Istio with AWS NLB (Network Load Balancer)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ingress gateways and IstioOperator
- Istio Gateway and EnvoyFilter resources
- Kubernetes Services of type LoadBalancer
- AWS Network Load Balancer
- AWS Load Balancer Controller
- Amazon EKS
- AWS CLI, Elastic IPs, ELBv2 target groups, and CloudWatch alarms

## Sources Consulted
- Istio Gateway configuration reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio gateway installation and selector documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- AWS Load Balancer Controller NLB service guide: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/nlb/
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v3.2/guide/service/annotations/
- AWS Network Load Balancer target group attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- AWS Network Load Balancer CloudWatch metrics: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-cloudwatch-metrics.html
- AWS CLI put-metric-alarm command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI allocate-address command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI ELBv2 examples and target health command reference: https://docs.aws.amazon.com/cli/latest/userguide/cli_elastic-load-balancing-v2_code_examples.html

## Issues Found
- The Istio `Gateway.spec.selector` example incorrectly used `matchLabels`. Istio Gateway selectors are a flat `map<string,string>`, so the selector was changed to `istio: ingressgateway`.
- The post described IP target mode as automatically preserving source IP. AWS documents client IP preservation as disabled by default for TCP/TLS IP target groups, so the guidance now explains when to enable `preserve_client_ip.enabled=true` or use proxy protocol v2.
- The source IP guidance for instance targets was too absolute. It now notes that NLB preserves client IP by default for instance target groups, but Kubernetes `externalTrafficPolicy: Cluster` can still hide it from pods.
- The internal NLB snippet included the deprecated `aws-load-balancer-internal` annotation alongside the current `aws-load-balancer-scheme` annotation. The deprecated annotation was removed.
- The CloudWatch alarm example omitted the required NLB metric dimensions for a specific `UnHealthyHostCount` alarm. The command now includes `LoadBalancer` and `TargetGroup` dimensions.
- The troubleshooting command used `--names` with a wildcard pattern, which AWS CLI does not treat as a target group name glob. It was replaced with a JMESPath `starts_with` query over described target groups.
- The troubleshooting security group note referred to the NLB IP range too generally. It now distinguishes NLB subnet CIDRs from client source CIDRs depending on client IP preservation.
- The introduction and NLB advantages overstated end-to-end mTLS and ALB latency comparisons. The wording now accurately describes NLB TCP passthrough to the Istio gateway and Layer 4 overhead.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI documentation rather than local `--help` output. The post still uses IstioOperator examples, which remain documented by Istio, but newer Istio installations may prefer Helm or the Kubernetes Gateway API depending on the environment.
