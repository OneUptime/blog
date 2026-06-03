# Validation Summary: How to Configure ALB Desync Mitigation Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Application Load Balancer
- ALB desync mitigation mode
- AWS CLI
- Terraform AWS provider
- AWS CloudFormation
- ALB access logs
- Amazon CloudWatch metrics and alarms
- AWS WAF
- HTTP/1.1 and HTTP/2
- Python log parsing

## Sources Consulted
- AWS Elastic Load Balancing documentation: Application Load Balancer attributes, including `routing.http.desync_mitigation_mode` values and defaults: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- AWS Elastic Load Balancing documentation: Edit Application Load Balancer attributes and desync mitigation mode behavior matrix: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html#desync-mitigation-mode
- AWS Elastic Load Balancing documentation: Application Load Balancer access log fields, including `classification` and `classification_reason`: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html
- AWS Elastic Load Balancing documentation: Application Load Balancer CloudWatch metrics, including `DesyncMitigationMode_NonCompliant_Request_Count` and `HTTPCode_ELB_4XX_Count`: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html
- AWS Elastic Load Balancing documentation: Enable Application Load Balancer access logs and S3 bucket requirements: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
- AWS Elastic Load Balancing documentation: Target group protocol versions and default HTTP/1.1 backend behavior: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html#protocol-version
- AWS Elastic Load Balancing documentation: How Elastic Load Balancing works, including backend HTTP/1.1 defaults and HTTP header handling: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
- Terraform Registry: `aws_lb` resource argument reference for `desync_mitigation_mode`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- AWS ELB Best Practices Guide: Desync mitigation best practice and recommendation to evaluate access log classification fields: https://aws.github.io/aws-elb-best-practices/security/vulnerability_management/
- OneUptime linked guide URL checked for reachability: https://oneuptime.com/blog/post/2026-02-12-configure-cloudfront-response-headers-policy/view

## Issues Found
- The post said ambiguous requests in defensive mode are forwarded and monitored. AWS documents that ambiguous requests are routed in defensive mode but the ALB closes the client and target connections. Updated the text and diagram label to include connection closure.
- The post implied severe requests are simply blocked. AWS's behavior matrix shows severe requests are allowed in monitor mode but blocked in defensive and strictest modes. Updated the severe classification wording to be mode-specific.
- The access log section said the `classification` field tells how each request was classified and the Python example treated `Compliant` as a logged value. AWS documents that compliant requests have `-` in the `classification` field, while non-compliant requests use `Acceptable`, `Ambiguous`, or `Severe`. Updated the explanatory text and parser.
- The Python log parser split log lines on spaces and searched unquoted tokens, which would miss quoted ALB access log fields and could misparse request/user-agent fields containing spaces. Replaced it with `shlex.split()` and read the documented field 28 position.
- The post said the classification field is the last field in the log entry. AWS access logs now include fields after `classification`, including `classification_reason` and connection/transform fields. Updated the comment to identify field 28.
- The HTTP/2 section said HTTP/2 eliminates desync ambiguity and makes the front-end connection safe from desync. That was too absolute. Updated the text to say HTTP/2 reduces HTTP/1.x request-boundary ambiguity and noted that ALB backend connections use HTTP/1.1 by default unless the target group protocol version is configured otherwise.
- The performance section claimed strictest mode latency impact is typically less than 1 millisecond per request. I found no AWS-published fixed latency guarantee for that number. Replaced it with more cautious guidance to measure impact in the user's workload.

## Review Notes
AWS CLI command syntax, CloudFormation load balancer attribute usage, Terraform `desync_mitigation_mode`, CloudWatch metric names, WAF association command shape, and the external OneUptime link were reviewed and found acceptable. The AWS CLI and Terraform binaries were not installed in the local environment, so command verification was performed against official documentation rather than local `--help` output.
