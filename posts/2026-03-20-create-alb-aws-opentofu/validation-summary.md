# Validation Summary: How to Create an Application Load Balancer with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- AWS Application Load Balancer (ALB / Elastic Load Balancing v2)
- AWS Security Groups (VPC)
- AWS Certificate Manager (ACM) — referenced via `certificate_arn`
- AWS S3 (referenced for ALB access logs bucket)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- AWS provider docs for `aws_lb`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- AWS provider docs for `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- AWS provider docs for `aws_lb_listener`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- AWS provider docs for `aws_lb_listener_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_rule
- AWS provider docs for `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS ELB security policies reference: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- AWS ELB target group health check docs: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html

## Issues Found
No technical issues found.

All resource arguments are valid for the current AWS provider:
- `aws_lb` with `load_balancer_type = "application"`, `access_logs` block fields (`bucket`, `prefix`, `enabled`), and `enable_deletion_protection` are correct.
- `aws_lb_target_group` `target_type = "ip"` is valid; the inline comment correctly notes "ip" for ECS Fargate and "instance" for EC2. Health check `port = "traffic-port"` and `matcher = "200-299"` (range syntax) are both supported.
- `ssl_policy = "ELBSecurityPolicy-TLS13-1-2-2021-06"` is a real AWS-managed SSL policy supporting TLS 1.3 (released 2021).
- HTTP→HTTPS redirect uses valid `redirect` block fields and `HTTP_301` status code.
- `aws_lb_listener_rule` with `path_pattern` condition and `forward` action is correctly structured.
- Output blocks use valid HCL one-line syntax.

## Review Notes
- The post references `aws_s3_bucket.alb_logs` and `aws_lb_target_group.api` without defining them in the snippets shown. This is a reasonable tutorial choice (focusing on the ALB itself) but readers will need to provision those resources separately. Not a technical error.
- The expression `var.environment == "prod" ? true : false` is functionally correct but could be simplified to `var.environment == "prod"`. Stylistic only — left untouched.
- Allowing `0.0.0.0/0` ingress on 80/443 is appropriate for an internet-facing ALB as described.
- Future maintenance note: AWS occasionally releases newer ELB security policies. The `TLS13-1-2-2021-06` policy is current as of the validation date but readers should check for the latest TLS 1.3 policy when deploying to production.
